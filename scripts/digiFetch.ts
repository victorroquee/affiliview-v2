import { readFileSync } from "node:fs";
import { normalizeDigiTransactions } from "../src/utils/digiNormalizer";
import type { TransactionRow } from "../src/lib/transactions";

/** Lê a DIGISTORE_API_KEY do .env.local (mesma chave usada pelo proxy serverless). */
function loadKey(): string {
  const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  const m = raw.match(/^DIGISTORE_API_KEY=(.+)$/m);
  if (!m || !m[1]!.trim()) throw new Error("DIGISTORE_API_KEY não encontrado em .env.local");
  return m[1]!.trim();
}

/** Busca todas as páginas de transações (vendor: payment,refund,chargeback) e normaliza. */
export async function fetchRows(from: string, to: string): Promise<TransactionRow[]> {
  const key = loadKey();
  const all: unknown[] = [];
  let page = 1;
  let totalPages = 1;
  do {
    const params = new URLSearchParams({
      from, to,
      "search[role]": "vendor",
      "search[transaction_type]": "payment,refund,chargeback",
      sort_by: "date", sort_order: "asc",
      page_no: String(page), page_size: "1000",
    });
    const url = `https://www.digistore24.com/api/call/listTransactions?${params.toString()}`;
    const res = await fetch(url, { headers: { "X-DS-API-KEY": key, Accept: "application/json" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    const env = (await res.json()) as {
      result: string; message?: string;
      data: { page_count: number; transaction_list: unknown[] };
    };
    if (env.result !== "success") throw new Error(env.message ?? "Erro da API Digistore");
    totalPages = env.data.page_count;
    all.push(...env.data.transaction_list);
    page++;
    if (page <= totalPages) await new Promise((r) => setTimeout(r, 300));
  } while (page <= totalPages);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return normalizeDigiTransactions(all as any);
}
