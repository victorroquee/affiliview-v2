// ─── Constants ────────────────────────────────────────────────────────────────
export const CUSTOMER_SHIPPING_AMOUNT = 20;
export const CUSTOMER_SHIPPING_COUNTRIES = new Set(["LU", "CH"]);

// Custo de capital + provisão (§8.1): a Digistore retém 10% do gross por 60 dias.
// Custo de oportunidade + provisão contra chargebacks: 20% a.a. sobre a reserva.
// Fator efetivo por pagamento ≈ 0,3288% do gross. Refunds/CB não revertem.
export const CAPITAL_COST_FACTOR = 0.10 * (60 / 365) * 0.20;

// ─── Per-Product Cost (€ per bottle) ────────────────────────────────────────
export type ProductCategory = "slimjara" | "lipoGandha" | "liposkin" | "erectus" | "memoguard";

const DEFAULT_COST_PER_BOTTLE = 3.26;

export const PRODUCT_COSTS: Record<ProductCategory, number> = {
  slimjara:   3.26,
  lipoGandha: 3.26,
  liposkin:   3.64,
  erectus:    3.24,
  memoguard:  3.26,
};

/** Detect product category from product name */
export function detectProductCategory(productName: string): ProductCategory | null {
  const n = productName.toLowerCase();
  if (n.includes("slimjara"))    return "slimjara";
  if (n.includes("lipogandha"))  return "lipoGandha";
  if (n.includes("liposkin"))    return "liposkin";
  if (n.includes("erectus"))     return "erectus";
  if (n.includes("memoguard"))   return "memoguard";
  return null;
}

/** Get cost per bottle for a given product name */
export function getProductCostPerBottle(productName: string): number {
  const cat = detectProductCategory(productName);
  return cat ? PRODUCT_COSTS[cat] : DEFAULT_COST_PER_BOTTLE;
}

// ─── Zone Types ───────────────────────────────────────────────────────────────
export type ZoneKey = "z1" | "z2" | "z3" | "z4" | "z5" | "z6" | "z7" | "uk";

// ─── Shipping Tables (€ por zona × frascos) — versionadas por data ────────────
//
// Versionamento por data de vigência (ver logica/custo_frete.md):
//   • v1-legacy  → transações até 2025-11-30 (tarifas antigas, sem taxas)
//   • v2-tier2   → transações a partir de 2025-12-01 (PDF ShipOffers Tier 2)
//
// Cada transação usa a versão vigente na sua própria data → histórico não muda
// retroativamente. É a fonte ÚNICA de custo (Valor Líquido, CPA, painel de custos).

/** Tarifas de frete LEGADAS (vigentes até 2025-11-30). */
export const SHIPPING_TABLE_LEGACY: Record<number, Record<ZoneKey, number>> = {
  1:  { z1: 7.58, z2: 8.25, z3: 9.60, z4: 11.07, z5: 14.39, z6: 20.29, z7: 40.96, uk: 8.25 },
  2:  { z1: 7.58, z2: 8.25, z3: 9.60, z4: 11.07, z5: 14.39, z6: 20.29, z7: 40.96, uk: 8.25 },
  3:  { z1: 7.58, z2: 8.25, z3: 9.60, z4: 11.07, z5: 14.39, z6: 20.29, z7: 40.96, uk: 8.25 },
  6:  { z1: 9.42, z2: 10.26, z3: 11.94, z4: 13.78, z5: 17.93, z6: 25.31, z7: 51.15, uk: 10.26 },
  9:  { z1: 9.60, z2: 10.59, z3: 12.77, z4: 14.13, z5: 18.30, z6: 26.66, z7: 52.56, uk: 10.59 },
  12: { z1: 9.60, z2: 10.59, z3: 12.77, z4: 14.13, z5: 18.30, z6: 26.66, z7: 52.56, uk: 10.59 },
};

/** Tarifas de frete TIER 2 (PDF ShipOffers, vigentes a partir de 2025-12-01).
 *  Frascos {1,2,3,6} compartilham o mesmo frete; {9,12} compartilham entre si. */
export const SHIPPING_TABLE_TIER2: Record<number, Record<ZoneKey, number>> = {
  1:  { z1: 8.60, z2: 9.44, z3: 11.12, z4: 12.96, z5: 17.11, z6: 24.49, z7: 50.33, uk: 9.44 },
  2:  { z1: 8.60, z2: 9.44, z3: 11.12, z4: 12.96, z5: 17.11, z6: 24.49, z7: 50.33, uk: 9.44 },
  3:  { z1: 8.60, z2: 9.44, z3: 11.12, z4: 12.96, z5: 17.11, z6: 24.49, z7: 50.33, uk: 9.44 },
  6:  { z1: 8.60, z2: 9.44, z3: 11.12, z4: 12.96, z5: 17.11, z6: 24.49, z7: 50.33, uk: 9.44 },
  9:  { z1: 8.78, z2: 9.77, z3: 11.95, z4: 13.31, z5: 17.48, z6: 25.84, z7: 51.74, uk: 9.77 },
  12: { z1: 8.78, z2: 9.77, z3: 11.95, z4: 13.31, z5: 17.48, z6: 25.84, z7: 51.74, uk: 9.77 },
};

/** Embalagem Tier 2 por frascos: poly bag pequena (≤3) €0,23; média (≥6) €0,35. */
export const PACKAGING_TIER2: Record<number, number> = {
  1: 0.23, 2: 0.23, 3: 0.23, 6: 0.35, 9: 0.35, 12: 0.35,
};

/** Processing fee Tier 2: €0,47 flat, independente de frascos/zona. */
export const PROCESSING_FEE_TIER2 = 0.47;

/** Alias de compatibilidade: SHIPPING_TABLE aponta para a tabela legada. */
export const SHIPPING_TABLE = SHIPPING_TABLE_LEGACY;

// ─── Registro de versões (ordem decrescente por vigência) ─────────────────────
interface FulfillmentVersion {
  version: string;
  effectiveFrom: number; // timestamp UTC (ms) do início da vigência
  shipping: Record<number, Record<ZoneKey, number>>;
  packaging: Record<number, number>;
  processing: number;
}

export const TIER2_EFFECTIVE_FROM = Date.UTC(2025, 11, 1); // 2025-12-01 (mês 11 = dezembro)

const COST_VERSIONS: FulfillmentVersion[] = [
  {
    version: "v2-tier2",
    effectiveFrom: TIER2_EFFECTIVE_FROM,
    shipping: SHIPPING_TABLE_TIER2,
    packaging: PACKAGING_TIER2,
    processing: PROCESSING_FEE_TIER2,
  },
  {
    version: "v1-legacy",
    effectiveFrom: 0,
    shipping: SHIPPING_TABLE_LEGACY,
    packaging: {}, // sem taxas de embalagem no legado (→ 0)
    processing: 0,
  },
];

/** Seleciona a versão de custo vigente na data da transação.
 *  Sem data → usa a versão mais recente (Tier 2). */
function selectCostVersion(date?: Date): FulfillmentVersion {
  if (!date) return COST_VERSIONS[0]!;
  const t = date.getTime();
  for (const v of COST_VERSIONS) {
    if (t >= v.effectiveFrom) return v;
  }
  return COST_VERSIONS[COST_VERSIONS.length - 1]!;
}

const validCounts = [1, 2, 3, 6, 9, 12];

// ─── Country → Zone Mapping ──────────────────────────────────────────────────
export const COUNTRY_ZONE: Record<string, ZoneKey> = {
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
  // Z6 (AD Andorra adicionado no Tier 2)
  CY: "z6", LU: "z6", MT: "z6", CH: "z6", LI: "z6", AE: "z6", GA: "z6", AD: "z6",
  // Z7
  IS: "z7", GE: "z7", MX: "z7", CA: "z7", DO: "z7", CL: "z7", UY: "z7", PY: "z7", MC: "z7", NO: "z7",
  // UK
  GB: "uk",
};

// ─── Country Name → Code Resolution ─────────────────────────────────────────
const COUNTRY_NAME_TO_CODE: Record<string, string> = {
  france: "FR", germany: "DE", deutschland: "DE", greece: "GR", spain: "ES", españa: "ES",
  "czech republic": "CZ", czechia: "CZ", ireland: "IE", portugal: "PT", slovakia: "SK",
  austria: "AT", österreich: "AT", belgium: "BE", hungary: "HU", italy: "IT", italia: "IT",
  netherlands: "NL", holland: "NL", poland: "PL", romania: "RO",
  bulgaria: "BG", croatia: "HR", denmark: "DK", lithuania: "LT", slovenia: "SI",
  estonia: "EE", finland: "FI", latvia: "LV", sweden: "SE",
  cyprus: "CY", luxembourg: "LU", malta: "MT", switzerland: "CH", schweiz: "CH", suisse: "CH",
  liechtenstein: "LI", "united arab emirates": "AE", gabon: "GA", andorra: "AD",
  iceland: "IS", georgia: "GE", mexico: "MX", canada: "CA",
  "dominican republic": "DO", chile: "CL", uruguay: "UY", paraguay: "PY", monaco: "MC", norway: "NO",
  "united kingdom": "GB", "great britain": "GB", uk: "GB",
};

export function resolveCountryCode(raw: string): string {
  const s = raw.trim();
  if (s.length <= 3 && /^[A-Za-z]{2,3}$/.test(s)) return s.toUpperCase();
  const code = COUNTRY_NAME_TO_CODE[s.toLowerCase()];
  return code || s.toUpperCase();
}

// ─── Bottle Detection from Product Name ──────────────────────────────────────
export function detectBottles(productName: string): number {
  const n = productName.toLowerCase();

  // 0th: bundles "N+M" (ex.: "3+3 Kostenlos", "2F+1K") → soma frascos pagos + grátis
  // (as garrafas grátis são físicas e geram COGS de produto; ver custo_produto.md)
  const plus = n.match(/(\d+)\s*[a-z]*\s*\+\s*(\d+)/i);
  if (plus) return parseInt(plus[1]!, 10) + parseInt(plus[2]!, 10);

  // 1st: keyword match (e.g. "6 Bottles", "3 Garrafas")
  const m = n.match(/(\d+)\s*(bottle|garrafa|frasco|b\b|pack|un|capsule|flasche)/i);
  if (m) return parseInt(m[1]!, 10);

  // 2nd: fallback known counts in descending order
  if (n.includes("12")) return 12;
  if (n.includes("9")) return 9;
  if (n.includes("6")) return 6;
  if (n.includes("3")) return 3;
  if (n.includes("2")) return 2;

  // Default
  return 1;
}

/** Arredonda a contagem de frascos para o tier de tabela mais próximo (1/2/3/6/9/12). */
export function closestBottleTier(bottles: number): number {
  return validCounts.reduce((prev, curr) =>
    Math.abs(curr - bottles) < Math.abs(prev - bottles) ? curr : prev
  );
}

// ─── Fulfillment Breakdown ───────────────────────────────────────────────────
export interface FulfillmentBreakdown {
  product: number;
  shipping: number;
  packaging: number;
  processing: number;
  total: number;
}

/**
 * Custo de fulfillment de um pedido frontal, na versão de custo vigente na `date`.
 * total = produto + frete + embalagem + processing.
 * Desconto Z6 (€20) aplica-se só ao frete, em vendas frontais para LU/CH.
 */
export function getFulfillmentBreakdown(
  productName: string,
  countryCode: string,
  isFrontSale = true,
  date?: Date
): FulfillmentBreakdown {
  const cc = resolveCountryCode(countryCode);
  const zone = COUNTRY_ZONE[cc];
  if (!zone) {
    return { product: 0, shipping: 0, packaging: 0, processing: 0, total: 0 };
  }

  const ver = selectCostVersion(date);
  const closestCount = closestBottleTier(detectBottles(productName));

  const productCost = closestCount * getProductCostPerBottle(productName);
  let shippingCost = ver.shipping[closestCount]![zone];

  // Desconto Z6: cliente paga €20 — apenas em vendas frontais (upsell_no === 0)
  if (isFrontSale && CUSTOMER_SHIPPING_COUNTRIES.has(cc)) {
    shippingCost = Math.max(0, shippingCost - CUSTOMER_SHIPPING_AMOUNT);
  }

  const packaging = ver.packaging[closestCount] ?? 0;
  const processing = ver.processing;

  return {
    product: productCost,
    shipping: shippingCost,
    packaging,
    processing,
    total: productCost + shippingCost + packaging + processing,
  };
}

// Helper to get just the total cost
export function getFulfillmentCost(
  productName: string,
  countryCode: string,
  isFrontSale = true,
  date?: Date
): number {
  return getFulfillmentBreakdown(productName, countryCode, isFrontSale, date).total;
}
