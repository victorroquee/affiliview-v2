import { useMemo } from "react";
import type { TransactionRow } from "../lib/transactions";

// ─── Types ────────────────────────────────────────────────────────────────────
export type PresetKey = "today" | "last7" | "last30";

export interface PeriodFilter {
  mode: "preset" | "custom";
  preset?: PresetKey;
  dateFrom: string; // 'YYYY-MM-DD' or ''
  dateTo: string;   // 'YYYY-MM-DD' or ''
}

export const INITIAL_PERIOD: PeriodFilter = {
  mode:   "preset",
  preset: "last30",
  dateFrom: "",
  dateTo:   "",
};

export const PRESET_LABELS: Record<PresetKey, string> = {
  today:  "Hoje",
  last7:  "7d",
  last30: "30d",
};

// ─── Date Helpers ─────────────────────────────────────────────────────────────

export function offsetDate(isoDate: string, days: number): string {
  const d = new Date(isoDate + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return toISO(d);
}

function toISO(d: Date): string {
  return d.toISOString().split("T")[0]!;
}

function txDateStr(t: TransactionRow): string {
  return t.date.toISOString().split("T")[0]!;
}

// ─── useFilters Hook ──────────────────────────────────────────────────────────

export function useFilters(rows: TransactionRow[], period: PeriodFilter) {
  const { dataMaxDate, dataMinDate } = useMemo(() => {
    if (rows.length === 0) return { dataMaxDate: "", dataMinDate: "" };
    return rows.reduce(
      (acc, r) => {
        const d = txDateStr(r);
        return {
          dataMinDate: !acc.dataMinDate || d < acc.dataMinDate ? d : acc.dataMinDate,
          dataMaxDate: !acc.dataMaxDate || d > acc.dataMaxDate ? d : acc.dataMaxDate,
        };
      },
      { dataMinDate: "", dataMaxDate: "" }
    );
  }, [rows]);

  const { dateFrom, dateTo } = useMemo(() => {
    if (period.mode === "custom") {
      return { dateFrom: period.dateFrom, dateTo: period.dateTo };
    }

    // preset mode — âncora em hoje (alinhado com o dashboard da Digistore)
    if (!dataMaxDate) return { dateFrom: "", dateTo: "" };
    const today = toISO(new Date());

    switch (period.preset) {
      case "today":
        return { dateFrom: today, dateTo: today };
      case "last7":
        return { dateFrom: offsetDate(today, -6), dateTo: today };
      case "last30":
      default:
        return { dateFrom: offsetDate(today, -29), dateTo: today };
    }
  }, [period, dataMaxDate]);

  const isDateRangeValid = useMemo(() => {
    if (!dateFrom || !dateTo) return true;
    return dateFrom <= dateTo;
  }, [dateFrom, dateTo]);

  const filteredRows = useMemo(() => {
    if (!isDateRangeValid) return rows;
    return rows.filter((row) => {
      const rowDate = txDateStr(row);
      if (dateFrom && rowDate < dateFrom) return false;
      if (dateTo   && rowDate > dateTo)   return false;
      return true;
    });
  }, [rows, dateFrom, dateTo, isDateRangeValid]);

  const periodDays = useMemo(() => {
    if (!dateFrom || !dateTo) return undefined;
    const from = new Date(dateFrom + "T00:00:00Z");
    const to   = new Date(dateTo   + "T00:00:00Z");
    return Math.max(1, Math.ceil((to.getTime() - from.getTime()) / 86400000) + 1);
  }, [dateFrom, dateTo]);

  return {
    filteredRows,
    dataMaxDate,
    dataMinDate,
    activeDateFrom: dateFrom,
    activeDateTo:   dateTo,
    isDateRangeValid,
    periodDays,
  };
}
