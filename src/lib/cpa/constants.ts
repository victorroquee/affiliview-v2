// COGS/COUNTRY_ZONE removidos — eram espelhos manuais do costTable.ts e haviam
// drifted (frete de 1-3 frascos desatualizado vs ShipOffers May 2026).
// O CPA agora usa costTable.ts diretamente como fonte única (ver analyzeCPA.ts).

// ─── CPA padrão por número de potes do kit frontal ────────────────────────────
export const CPA_DEFAULTS: Record<number, number> = {
  2: 100,
  3: 130,
  6: 185,
};

// ─── Benchmarks históricos da operação ────────────────────────────────────────
export const OP_AVG: Record<number, { ltvProfit: number; upsellConv: number; frontEarn: number }> = {
  1: { ltvProfit: 28.55, upsellConv: 17.7, frontEarn: 33.37 }, // M1 — 2 potes
  2: { ltvProfit: 43.34, upsellConv: 14.3, frontEarn: 46.36 }, // M2 — 3 potes
  3: { ltvProfit: 67.44, upsellConv: 14.0, frontEarn: 73.07 }, // M3 — 6 potes
};

// ─── Potes por variante de kit ────────────────────────────────────────────────
export const VARIANT_BOTTLES: Record<number, number> = { 1: 2, 2: 3, 3: 6 };

// Desconto Z6 (LU/CH, front-only) agora vem de costTable.ts
// (CUSTOMER_SHIPPING_AMOUNT/CUSTOMER_SHIPPING_COUNTRIES, aplicado em getFulfillmentBreakdown).
