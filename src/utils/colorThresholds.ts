/**
 * Centralized color threshold helpers.
 * Single source of truth for margin and refund color coding.
 */

/** Margin: >=10% green, 5-10% yellow, <5% red (per D-01) */
export function getMarginColor(pct: number): "green" | "yellow" | "red" {
  if (pct >= 10) return "green";
  if (pct >= 5) return "yellow";
  return "red";
}

/** Refund: <=8% orange, >8% red, 0% no color (per D-02) */
export function getRefundColor(pct: number): "orange" | "red" | "" {
  if (pct <= 0) return "";
  if (pct > 8) return "red";
  return "orange";
}
