import { useMemo, useState } from "react";
import type { TransactionRow } from "../lib/transactions";
import { isMaileonardo } from "../lib/transactions";
import type { AffiliateResult, VariantResult } from "../lib/cpa/types";
import { analyzeCPA } from "../lib/cpa/analyzeCPA";

interface UseCPACalculatorReturn {
  results:         AffiliateResult[] | null;
  marginTarget:    number;
  setMarginTarget: (v: number) => void;
}

export function useCPACalculator(rows: TransactionRow[]): UseCPACalculatorReturn {
  const [marginTarget, setMarginTarget] = useState(30);

  // rawResults: computed once quando rows mudam (marginTarget=0 preserva ltvProfit estável)
  // Maileonardo é excluído — ele é recuperador de carrinho e tem sua própria página
  const rawResults = useMemo<AffiliateResult[] | null>(() => {
    if (rows.length === 0) return null;
    const filteredRows = rows.filter((r) => !isMaileonardo(r.affiliate));
    return analyzeCPA(filteredRows, 0);
  }, [rows]);

  // results: reaplica maxCpa/cpaStatus quando marginTarget muda — sem re-parsear
  const results = useMemo<AffiliateResult[] | null>(() => {
    if (!rawResults) return null;
    return rawResults.map(aff => ({
      ...aff,
      variants: aff.variants.map((v): VariantResult => {
        const maxCpaRaw      = Math.max(0, v.cpaDefault + v.ltvProfit - marginTarget);
        const cpaStatus: VariantResult["cpaStatus"] =
          maxCpaRaw < v.cpaDefault       ? "reduce"   :
          maxCpaRaw > v.cpaDefault + 10  ? "increase" : "ok";
        return {
          ...v,
          maxCpa:           Math.round(maxCpaRaw),
          cpaStatus,
          roomAboveCurrent: Math.round(maxCpaRaw - v.cpaDefault),
        };
      }),
    }));
  }, [rawResults, marginTarget]);

  return { results, marginTarget, setMarginTarget };
}
