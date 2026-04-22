import { useMemo, useState } from "react";
import type { TransactionRow } from "../lib/transactions";
import { isMaileonardo } from "../lib/transactions";
import type { AffiliateResult } from "../lib/cpa/types";
import { analyzeCPA } from "../lib/cpa/analyzeCPA";

export interface CpaVariavelKpis {
  totalAffiliates: number;
  avgMargin: number;    // average ltvProfit of dominant variant across all affiliates
  avgAov: number;       // average aovGross of dominant variant across all affiliates
}

export interface UseCpaVariavelReturn {
  results: AffiliateResult[] | null;
  kpis: CpaVariavelKpis | null;
  search: string;
  setSearch: (v: string) => void;
  displayResults: AffiliateResult[];
  selectedAff: AffiliateResult | null;
  setSelected: (name: string | null) => void;
}

export function useCpaVariavel(rows: TransactionRow[]): UseCpaVariavelReturn {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

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

  // Search filter — case-insensitive name match
  const displayResults = useMemo(() => {
    if (!results) return [];
    return results.filter(aff =>
      !search || aff.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [results, search]);

  // Selected affiliate lookup
  const selectedAff = useMemo(() => {
    if (!selected) return null;
    return displayResults.find(a => a.name === selected) ?? null;
  }, [displayResults, selected]);

  return { results, kpis, search, setSearch, displayResults, selectedAff, setSelected };
}
