// ─── Constants ────────────────────────────────────────────────────────────────
export const PRODUCT_COST_PER_BOTTLE = 3.26;
export const CUSTOMER_SHIPPING_AMOUNT = 20;
export const CUSTOMER_SHIPPING_COUNTRIES = new Set(["LU", "CH"]);

// ─── Zone Types ───────────────────────────────────────────────────────────────
export type ZoneKey = "z1" | "z2" | "z3" | "z4" | "z5" | "z6" | "z7" | "uk";

// ─── Shipping Table (€ per zone × bottle count) ──────────────────────────────
export const SHIPPING_TABLE: Record<number, Record<ZoneKey, number>> = {
  1:  { z1: 9.30, z2: 10.14, z3: 11.82, z4: 13.66, z5: 17.81, z6: 25.19, z7: 51.03, uk: 10.14 },
  2:  { z1: 9.30, z2: 10.14, z3: 11.82, z4: 13.66, z5: 17.81, z6: 25.19, z7: 51.03, uk: 10.14 },
  3:  { z1: 9.30, z2: 10.14, z3: 11.82, z4: 13.66, z5: 17.81, z6: 25.19, z7: 51.03, uk: 10.14 },
  6:  { z1: 9.42, z2: 10.26, z3: 11.94, z4: 13.78, z5: 17.93, z6: 25.31, z7: 51.15, uk: 10.26 },
  9:  { z1: 9.60, z2: 10.59, z3: 12.77, z4: 14.13, z5: 18.30, z6: 26.66, z7: 52.56, uk: 10.59 },
  12: { z1: 9.60, z2: 10.59, z3: 12.77, z4: 14.13, z5: 18.30, z6: 26.66, z7: 52.56, uk: 10.59 },
};

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
  // Z6
  CY: "z6", LU: "z6", MT: "z6", CH: "z6", LI: "z6", AE: "z6", GA: "z6",
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
  liechtenstein: "LI", "united arab emirates": "AE", gabon: "GA",
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

  // 1st: keyword match (e.g. "6 Bottles", "3 Garrafas")
  const m = n.match(/(\d+)\s*(bottle|garrafa|frasco|b\b|pack|un|capsule|flasche)/i);
  if (m) return parseInt(m[1], 10);

  // 2nd: fallback known counts in descending order
  if (n.includes("12")) return 12;
  if (n.includes("9")) return 9;
  if (n.includes("6")) return 6;
  if (n.includes("3")) return 3;
  if (n.includes("2")) return 2;

  // Default
  return 1;
}

// ─── Fulfillment Breakdown ───────────────────────────────────────────────────
export interface FulfillmentBreakdown {
  product: number;
  shipping: number;
  total: number;
}

export function getFulfillmentBreakdown(
  productName: string,
  countryCode: string,
  isFrontSale = true
): FulfillmentBreakdown {
  const cc = resolveCountryCode(countryCode);
  const zone = COUNTRY_ZONE[cc];
  if (!zone) {
    console.warn(`[costTable] País sem zona de envio mapeada: "${cc}" — COGS zerado para esta transação.`);
    return { product: 0, shipping: 0, total: 0 };
  }

  const bottles = detectBottles(productName);
  const closestCount = validCounts.reduce((prev, curr) =>
    Math.abs(curr - bottles) < Math.abs(prev - bottles) ? curr : prev
  );

  const productCost = closestCount * PRODUCT_COST_PER_BOTTLE;
  let shippingCost = SHIPPING_TABLE[closestCount][zone];

  // Z6 discount: only for front sales (produto M) in LU and CH
  if (isFrontSale && CUSTOMER_SHIPPING_COUNTRIES.has(cc)) {
    shippingCost = Math.max(0, shippingCost - CUSTOMER_SHIPPING_AMOUNT);
  }

  return { product: productCost, shipping: shippingCost, total: productCost + shippingCost };
}

// Helper to get just the total cost
export function getFulfillmentCost(
  productName: string,
  countryCode: string,
  isFrontSale = true
): number {
  return getFulfillmentBreakdown(productName, countryCode, isFrontSale).total;
}
