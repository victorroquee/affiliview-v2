import { COUNTRY_ZONE, COGS, Z6_FRONT_DISCOUNT, Z6_FRONT_COUNTRIES } from "./constants";

/**
 * Extrai número de potes do nome do produto.
 * 1º: regex com keyword (e.g. "6 Bottles", "3 Garrafas") — evita falso match de M3 como "3 potes".
 * 2º: fallback numérico em ordem decrescente para evitar "1" dentro de "12".
 * Default: 1 (alinhado com costTable.ts detectBottles).
 */
export function getBottles(name: string): number {
  const n = name.toLowerCase();
  const m = n.match(/(\d+)\s*(bottle|garrafa|frasco|b\b|pack|un|capsule|flasche)/i);
  if (m) return parseInt(m[1], 10);
  for (const b of [12, 9, 6, 3, 2, 1]) {
    if (n.includes(String(b))) return b;
  }
  return 1;
}

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

/**
 * Retorna o custo de fulfillment (produto + frete) para uma combinação de potes e país.
 * isFrontSale: se true e o país for Z6 com desconto (LU/CH), aplica desconto de €20.
 * Fallback: se a combinação exata não existir, tenta z1.
 */
export function getCogs(bottles: number, country: string, isFrontSale = false): number {
  const zone = COUNTRY_ZONE[country.toUpperCase()] ?? "z1";
  const base = COGS[`${bottles}-${zone}`] ?? COGS[`${bottles}-z1`] ?? 0;
  if (isFrontSale && zone === "z6" && Z6_FRONT_COUNTRIES.has(country.toUpperCase())) {
    return base - Z6_FRONT_DISCOUNT;
  }
  return base;
}
