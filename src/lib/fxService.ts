/*
 * fxService — cotação de câmbio EUR → BRL/USD via frankfurter.app (grátis, sem key,
 * CORS habilitado). Cache diário é decidido por `isStale`; o valor é persistido no
 * Supabase (app_settings.fx_*), então aqui só cuidamos do fetch e da regra de cache.
 */

export interface FxPair {
  brl: number;
  usd: number;
}

const FX_ENDPOINT = "https://api.frankfurter.app/latest?from=EUR&to=BRL,USD";
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/** Cotação é considerada velha se nunca foi buscada ou passou de 24h. */
export function isStale(updatedAt: string | null, now: number = Date.now()): boolean {
  if (!updatedAt) return true;
  const ts = new Date(updatedAt).getTime();
  if (Number.isNaN(ts)) return true;
  return now - ts > ONE_DAY_MS;
}

/** Busca as taxas atuais. Lança em falha de rede/payload — o chamador faz fallback. */
export async function fetchFxRates(): Promise<FxPair> {
  const res = await fetch(FX_ENDPOINT);
  if (!res.ok) throw new Error(`FX HTTP ${res.status}`);
  const data: unknown = await res.json();
  const rates = (data as { rates?: Record<string, number> })?.rates;
  const brl = rates?.BRL;
  const usd = rates?.USD;
  if (typeof brl !== "number" || typeof usd !== "number") {
    throw new Error("FX payload inválido");
  }
  return { brl, usd };
}
