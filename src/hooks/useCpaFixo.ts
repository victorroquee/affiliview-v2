import { useEffect, useMemo, useState } from "react";
import type { TransactionRow } from "../lib/transactions";
import {
  computeCpaFixo,
  aggregateAffiliateInputs,
  DEFAULT_INPUTS,
  type CpaFixoInputs,
  type AffiliateInput,
} from "../lib/cpa/cpaFixoModel";

const STORAGE_KEY = "cpa_fixo_settings_v1";

// Apenas premissas globais persistem — AOV/refund/mix/testCPA/volume são por-sessão
const GLOBAL_KEYS = [
  "costPerPot", "shipping", "digi", "retention", "vat",
  "pctDE", "pctAT", "pctCH", "capitalRate", "retentionDays",
] as const;

type GlobalKey = (typeof GLOBAL_KEYS)[number];

function loadStoredGlobals(): Partial<CpaFixoInputs> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: Partial<CpaFixoInputs> = {};
    for (const k of GLOBAL_KEYS) {
      const v = parsed[k];
      if (typeof v === "number" && Number.isFinite(v)) out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

export function useCpaFixo(filteredRows: TransactionRow[]) {
  const [inputs, setInputs] = useState<CpaFixoInputs>(() => ({
    ...DEFAULT_INPUTS,
    ...loadStoredGlobals(),
  }));
  const [selected, setSelected] = useState<string | null>(null);

  // Persiste premissas globais quando mudam
  useEffect(() => {
    const globals: Partial<Record<GlobalKey, number>> = {};
    for (const k of GLOBAL_KEYS) globals[k] = inputs[k];
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(globals));
    } catch {
      // storage indisponível (modo privado etc.) — segue sem persistir
    }
  }, [inputs]);

  const affiliates: AffiliateInput[] = useMemo(
    () => aggregateAffiliateInputs(filteredRows),
    [filteredRows]
  );

  function update<K extends keyof CpaFixoInputs>(key: K, value: CpaFixoInputs[K]) {
    setInputs((prev) => ({ ...prev, [key]: value }));
  }

  /** Seleciona afiliado (merge de AOV/refund/mix reais) ou null = modo manual puro */
  function selectAffiliate(name: string | null) {
    setSelected(name);
    if (!name) return; // manual: não sobrescreve nada
    const aff = affiliates.find((a) => a.name === name);
    if (!aff) return;
    setInputs((prev) => ({
      ...prev,
      aov: Math.round(aff.aov * 100) / 100,
      refund: Math.round(aff.refundRate * 10000) / 100, // fração → %
      mixM1: Math.round(aff.mix.M1 * 100) / 100,
      mixM2: Math.round(aff.mix.M2 * 100) / 100,
      mixM3: Math.round(aff.mix.M3 * 100) / 100,
    }));
  }

  const outputs = useMemo(() => computeCpaFixo(inputs), [inputs]);

  const selectedAffiliate = selected
    ? affiliates.find((a) => a.name === selected) ?? null
    : null;

  return { inputs, update, outputs, affiliates, selected, selectedAffiliate, selectAffiliate };
}
