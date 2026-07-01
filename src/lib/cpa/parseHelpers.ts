/**
 * Retorna 1, 2, 3, 4 ou null com base no prefixo M1/M2/M3/M4 (case-insensitive).
 */
export function getFrontVariant(name: string): number | null {
  const n = name.toLowerCase().trim();
  if (/^m4\b/.test(n)) return 4;
  if (/^m3\b/.test(n)) return 3;
  if (/^m2\b/.test(n)) return 2;
  if (/^m1\b/.test(n)) return 1;
  return null;
}

/** true se o produto é uma venda frontal (M1/M2/M3/M4) */
export function isFront(name: string): boolean {
  return getFrontVariant(name) !== null;
}

/** true se o produto é upsell/downsell (UP, DW ou DOWN) */
export function isUpsell(name: string): boolean {
  return /^(up|dw|down)\b/i.test(name.trim());
}

// getBottles/getCogs removidos — o CPA usa costTable.ts como fonte única de COGS
// (getFulfillmentCost, detectBottles, getProductCostPerBottle em analyzeCPA.ts).
