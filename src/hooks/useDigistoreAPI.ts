import { useState, useCallback, useRef } from "react";
import type { TransactionRow } from "../lib/transactions";
import type { DigiAPIResponse } from "../utils/digiNormalizer";
import { normalizeDigiTransactions } from "../utils/digiNormalizer";
import { readRowsCache, writeRowsCache, windowKey } from "../lib/rowsCache";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FetchOptions {
  from: string;  // "YYYY-MM-DD" | "-7d" | "-30d" | "start"
  to:   string;  // "YYYY-MM-DD" | "now"
}

export interface UseDigistoreAPIReturn {
  rows:        TransactionRow[];
  loading:     boolean;   // true só quando NÃO há dados em cache para mostrar (cold start)
  refreshing:  boolean;   // true durante revalidação em background sobre dados de cache
  error:       string | null;
  lastFetched: string | null;  // ISO da última busca bem-sucedida
  fetch:       (opts: FetchOptions) => Promise<void>;
  reset:       () => void;
}

const PAGE_DELAY_MS = 300;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function useDigistoreAPI(): UseDigistoreAPIReturn {
  const [rows,        setRows]        = useState<TransactionRow[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [refreshing,  setRefreshing]  = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const fetch = useCallback(async ({ from, to }: FetchOptions) => {
    // Cancela fetch anterior em curso
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    // ── Instant-load: hidrata do cache e revalida em background ──────────────
    const key = windowKey(from, to);
    const cached = readRowsCache(key);
    if (cached) {
      setRows(cached.rows);
      setLastFetched(new Date(cached.fetchedAt).toISOString());
      setRefreshing(true);   // mostra dados salvos + indicador "atualizando"
      setLoading(false);
    } else {
      setLoading(true);      // cold start — sem dados para mostrar
    }
    setError(null);

    try {
      const all: TransactionRow[] = [];
      let page       = 1;
      let totalPages = 1;

      do {
        const params = new URLSearchParams({
          from,
          to,
          "search[role]":             "vendor",
          "search[transaction_type]": "payment,refund,chargeback",
          sort_by:    "date",
          sort_order: "asc",
          page_no:    String(page),
          page_size:  "1000",
        });

        const res = await window.fetch(`/api/digistore?${params}`, {
          signal: controller.signal,
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({})) as { error?: string; message?: string };
          throw new Error(body.message ?? body.error ?? `HTTP ${res.status}`);
        }

        const envelope = await res.json() as DigiAPIResponse;

        if (envelope.result !== "success") {
          throw new Error(envelope.message ?? "Erro desconhecido da API Digistore");
        }

        const data = envelope.data;
        totalPages = data.page_count;
        all.push(...normalizeDigiTransactions(data.transaction_list));

        if (page < totalPages) await sleep(PAGE_DELAY_MS);
        page++;

      } while (page <= totalPages);

      setRows(all);
      writeRowsCache(key, all, Date.now());
      setLastFetched(new Date().toISOString());

    } catch (err) {
      if ((err as Error).name === "AbortError") return; // fetch cancelado intencionalmente
      // Se havia cache, mantém os dados salvos e só sinaliza o erro (não apaga a tela)
      setError((err as Error).message);
    } finally {
      // Só reseta se este ainda é o fetch ativo (evita corrida com um novo fetch)
      if (abortRef.current === controller) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  const reset = useCallback(() => {
    setRows([]);
    setError(null);
    setLastFetched(null);
  }, []);

  return { rows, loading, refreshing, error, lastFetched, fetch, reset };
}
