// ─── COUNTRY (ISO code) → Shipping Zone ──────────────────────────────────────
// Espelho do costTable.ts — mantidos em sync manualmente
export const COUNTRY_ZONE: Record<string, string> = {
  // Z1
  FR: "z1", DE: "z1", GR: "z1", ES: "z1",
  // Z2
  CZ: "z2", IE: "z2", PT: "z2", SK: "z2",
  // Z3
  AT: "z3", BE: "z3", HU: "z3", IT: "z3", NL: "z3", PL: "z3", RO: "z3",
  // Z4
  BG: "z4", HR: "z4", DK: "z4", LT: "z4", SI: "z4",
  // Z5
  EE: "z5", FI: "z5", LV: "z5", SE: "z5",
  // Z6
  CY: "z6", LU: "z6", MT: "z6", CH: "z6", LI: "z6", AE: "z6", GA: "z6",
  // Z7
  IS: "z7", GE: "z7", MX: "z7", CA: "z7", DO: "z7", CL: "z7",
  UY: "z7", PY: "z7", MC: "z7", NO: "z7",
  // UK
  GB: "uk",
};

// ─── COGS: produto + frete por "{bottles}-{zone}" ────────────────────────────
// Calculado como: bottles × €3.26  +  SHIPPING_TABLE[bottles][zone]
// Valores Z6 são SEM o desconto de €20 (front sales) — o desconto é aplicado
// em getCogs() via parâmetro isFrontSale, assim como em costTable.ts.
export const COGS: Record<string, number> = {
  // 1 frasco
  "1-z1": 12.56, "1-z2": 13.40, "1-z3": 15.08, "1-z4": 16.92,
  "1-z5": 21.07, "1-z6": 28.45, "1-z7": 54.29, "1-uk": 13.40,
  // 2 frascos
  "2-z1": 15.82, "2-z2": 16.66, "2-z3": 18.34, "2-z4": 20.18,
  "2-z5": 24.33, "2-z6": 31.71, "2-z7": 57.55, "2-uk": 16.66,
  // 3 frascos
  "3-z1": 19.08, "3-z2": 19.92, "3-z3": 21.60, "3-z4": 23.44,
  "3-z5": 27.59, "3-z6": 34.97, "3-z7": 60.81, "3-uk": 19.92,
  // 6 frascos
  "6-z1": 28.98, "6-z2": 29.82, "6-z3": 31.50, "6-z4": 33.34,
  "6-z5": 37.49, "6-z6": 44.87, "6-z7": 70.71, "6-uk": 29.82,
  // 9 frascos
  "9-z1": 38.94, "9-z2": 39.93, "9-z3": 42.11, "9-z4": 43.47,
  "9-z5": 47.64, "9-z6": 56.00, "9-z7": 81.90, "9-uk": 39.93,
  // 12 frascos
  "12-z1": 48.72, "12-z2": 49.71, "12-z3": 51.89, "12-z4": 53.25,
  "12-z5": 57.42, "12-z6": 65.78, "12-z7": 91.78, "12-uk": 49.71,
};

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

// ─── Desconto Z6 para vendas frontais (LU e CH) ───────────────────────────────
export const Z6_FRONT_DISCOUNT = 20;
export const Z6_FRONT_COUNTRIES = new Set(["LU", "CH"]);
