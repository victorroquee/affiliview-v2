import { useCallback, useMemo, useState } from "react";
import type { TransactionRow } from "../lib/transactions";
import { isMaileonardo } from "../lib/transactions";
import type {
  AffiliateResult,
  VariantResult,
  SimulatedVariant,
  SimulatedAffiliateResult,
} from "../lib/cpa/types";
import { analyzeCPA } from "../lib/cpa/analyzeCPA";

export interface CpaVariavelKpis {
  totalAffiliates: number;
  avgMargin: number;    // average ltvProfit of dominant variant across all affiliates
  avgAov: number;       // average aovGross of dominant variant across all affiliates
}

export interface UseCpaVariavelReturn {
  results: AffiliateResult[] | null;                        // raw, unchanged
  simulatedResults: SimulatedAffiliateResult[] | null;      // with sim overlay
  kpis: CpaVariavelKpis | null;
  search: string;
  setSearch: (v: string) => void;
  displayResults: SimulatedAffiliateResult[];               // filtered + simulated
  selectedAff: SimulatedAffiliateResult | null;
  setSelected: (name: string | null) => void;
  marginTarget: number;
  setMarginTarget: (v: number) => void;
  customCpas: Record<string, Record<number, number>>;
  setCustomCpa: (affName: string, variant: number, value: number | null) => void;
  clearSimulation: () => void;
}

export function useCpaVariavel(rows: TransactionRow[]): UseCpaVariavelReturn {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [marginTarget, setMarginTarget] = useState(0);
  // Key = affiliate name, inner key = variant number (1,2,3), value = custom CPA in EUR
  const [customCpas, setCustomCpas] = useState<Record<string, Record<number, number>>>({});

  // Compute once when rows change — marginTarget=0 for stable ltvProfit
  const results = useMemo<AffiliateResult[] | null>(() => {
    if (rows.length === 0) return null;
    const filtered = rows.filter(r => !isMaileonardo(r.affiliate));
    return analyzeCPA(filtered, 0);
  }, [rows]);

  // KPI aggregates
  const kpis = useMemo<CpaVariavelKpis | null>(() => {
    if (!results || results.length === 0) return null;
    let marginSum = 0;
    let aovSum = 0;
    let count = 0;
    for (const aff of results) {
      const domV = aff.variants.find(v => v.variant === aff.domVariant);
      if (domV) {
        marginSum += domV.ltvProfit;
        aovSum += domV.aovGross ?? 0;
        count++;
      }
    }
    return {
      totalAffiliates: results.length,
      avgMargin: count > 0 ? marginSum / count : 0,
      avgAov: count > 0 ? aovSum / count : 0,
    };
  }, [results]);

  // Helper to set a single custom CPA
  const setCustomCpa = useCallback((affName: string, variant: number, value: number | null) => {
    setCustomCpas(prev => {
      const next = { ...prev };
      if (value === null) {
        // Clear this variant's custom CPA
        if (next[affName]) {
          const inner = { ...next[affName] };
          delete inner[variant];
          if (Object.keys(inner).length === 0) delete next[affName];
          else next[affName] = inner;
        }
      } else {
        next[affName] = { ...next[affName], [variant]: value };
      }
      return next;
    });
  }, []);

  // Helper to clear all custom CPAs and reset marginTarget
  const clearSimulation = useCallback(() => {
    setMarginTarget(0);
    setCustomCpas({});
  }, []);

  // Computed simulatedResults — overlays simulation data on raw results
  const simulatedResults = useMemo<SimulatedAffiliateResult[] | null>(() => {
    if (!results) return null;
    return results.map(aff => ({
      ...aff,
      variants: aff.variants.map((v): SimulatedVariant => {
        const simMaxCpaRaw = Math.max(0, v.cpaDefault + v.ltvProfit - marginTarget);
        const simCpaStatus: VariantResult["cpaStatus"] =
          simMaxCpaRaw < v.cpaDefault      ? "reduce"   :
          simMaxCpaRaw > v.cpaDefault + 10 ? "increase" : "ok";
        const simRoom = Math.round(simMaxCpaRaw - v.cpaDefault);

        const customCpa = customCpas[aff.name]?.[v.variant];
        const customMargin = customCpa !== undefined
          ? v.ltvProfit + v.cpaDefault - customCpa
          : undefined;
        const cpaDelta = customCpa !== undefined
          ? customCpa - v.cpaDefault
          : 0;

        return {
          ...v,
          simMaxCpa: Math.round(simMaxCpaRaw),
          simCpaStatus,
          simRoom,
          customCpa,
          customMargin,
          cpaDelta,
        } satisfies SimulatedVariant;
      }),
    }));
  }, [results, marginTarget, customCpas]);

  // Search filter — case-insensitive name match on simulatedResults
  const displayResults = useMemo(() => {
    if (!simulatedResults) return [];
    return simulatedResults.filter(aff =>
      !search || aff.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [simulatedResults, search]);

  // Selected affiliate lookup from displayResults (SimulatedAffiliateResult)
  const selectedAff = useMemo(() => {
    if (!selected) return null;
    return displayResults.find(a => a.name === selected) ?? null;
  }, [displayResults, selected]);

  return {
    results,
    simulatedResults,
    kpis,
    search,
    setSearch,
    displayResults,
    selectedAff,
    setSelected,
    marginTarget,
    setMarginTarget,
    customCpas,
    setCustomCpa,
    clearSimulation,
  };
}
