import { getFulfillmentBreakdown, getFulfillmentCost } from "./costTable";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface TransactionRow {
  date: Date;
  orderId: string;
  buyerId: string;
  transactionType: string;
  grossAmount: number;    // amount for payments; 0 for refunds/CB (API returns positive for refunds)
  netAmount: number;      // grossAmount - vatAmount (payments only)
  earnings: number;       // earned_amount — negative for refunds/CB
  affiliate: string;
  productName: string;
  productGroup: string;
  country: string;
  quantity: number;
  // ── Fields from Digistore API (logica2.md) ──────────────────────────────
  upsellNo: number;         // 0 = front offer, 1+ = upsell/downsell
  affiliateAmount: number;  // actual CPA paid to affiliate (exact, not estimated)
  vatAmount: number;        // VAT amount (for net revenue calculation)
}

export interface PeriodMetrics {
  gross: number;        // = grossBruto (payments only — refunds don't affect gross)
  grossBruto: number;   // alias of gross, kept for backward compat
  earnings: number;     // SUM(earned_amount for all types) — refunds reduce this
  valorLiq: number;
  productCost: number;
  shippingCost: number;
  aov: number;
  sales: number;
  refundPct: number;
  chargebackPct: number;
  refundCbPct: number;
  refundAmt: number;    // ABS(SUM(earnings for refunds))
  cbAmt: number;        // ABS(SUM(earnings for CB))
  activated: number;
  novosQualificados: number;
  affiliatesSelling: string[];
  dailyGross: { date: string; value: number }[];
  productMix: { name: string; value: number }[];
  refundByProduct: { name: string; refundPct: number; refundAmt: number }[];
  productSummary: ProductSummaryRow[];
  bundlePerformance: BundleRow[];
  topAffiliates: AffiliateRow[];
}

export interface ProductSummaryRow {
  product: string;
  grossRevenue: number;
  netRevenue: number;
  earnings: number;
  aov: number;
  frontSales: number;
  totalSales: number;
  returnPct: number;
  cbPct: number;
}

export interface BundleRow {
  bundle: string;
  product: string;
  vendas: number;
  gross: number;
  netRevenue: number;
  valorLiq: number;
  reembolsos: number;
  chargebacks: number;
  refundPct: number;
}

export interface AffiliateRow {
  name: string;
  gross: number;
  earnings: number;
  valorLiq: number;
  sales: number;
  refundCbPct: number;
  status: "Scale" | "Watch" | "Probation";
  aov: number;
  cpa: number;
  margem: number;
}

export interface AffiliateDetail {
  gross: number;
  grossBruto: number;
  frontGross: number;     // SUM(grossAmount WHERE upsellNo === 0) — for AOV calculation
  net: number;            // SUM(netAmount) all payments — VAT-excluded, used for AOV
  earnings: number;
  liq: number;
  sales: number;
  refundAmt: number;
  cbAmt: number;
  totalTx: number;
  affiliateAmt: number;   // sum of affiliate_amount paid (for CPA calculation)
}

// ─── Affiliate Ranking ────────────────────────────────────────────────────────

export type AffiliateRanking = "Tier 1" | "Tier 2" | "Tier 3" | "Ativo" | "Em Rampa" | "Inativo";

export interface AffiliateDayDetail {
  date: string;        // "2026-04-01"
  gross: number;       // gross total do dia (pagamentos)
  frontSales: number;  // vendas front neste dia
  t1: boolean;         // gross >= 15000
  t2: boolean;         // gross >= 5000
  t3: boolean;         // gross >= 1000
}

export interface AffiliateRankingInfo {
  ranking: AffiliateRanking;
  days: AffiliateDayDetail[];     // 7 dias, mais antigo primeiro
  frontSalesInWindow: number;     // total vendas front na janela de 7 dias
  windowStart: string;            // data ISO do primeiro dia da janela
  windowEnd: string;              // data ISO do último dia da janela
  lastFrontSaleDate: string | null;  // ISO date of most recent front sale across allRows
}

const TIER_THRESHOLDS: { tier: AffiliateRanking; min: number }[] = [
  { tier: "Tier 1", min: 15000 },
  { tier: "Tier 2", min: 5000 },
  { tier: "Tier 3", min: 1000 },
];

export const TIER_MIN: Record<string, number> = {
  "Tier 1": 15000,
  "Tier 2": 5000,
  "Tier 3": 1000,
};

const ATIVO_MIN_SALES = 10; // front sales em 7 dias

/**
 * Verifica se os 7 valores diários atendem à regra de consistência do tier:
 *   - Os 3 primeiros dias devem estar TODOS acima do threshold.
 *   - Dos 4 dias seguintes, pelo menos 3 devem estar acima (aceita 1 dia ruim).
 * dailyValues: ordenado do dia mais antigo para o mais recente (7 elementos).
 */
function isTierConsistent(dailyValues: number[], threshold: number): boolean {
  if (dailyValues.length < 7) return false;
  const first3OK = dailyValues[0]! >= threshold &&
                   dailyValues[1]! >= threshold &&
                   dailyValues[2]! >= threshold;
  if (!first3OK) return false;
  const last4Above = dailyValues.slice(3, 7).filter((v) => v >= threshold).length;
  return last4Above >= 3;
}

/**
 * Calcula o ranking atual de cada afiliado com base nos últimos 7 dias disponíveis
 * no conjunto de dados (independente do filtro de período selecionado).
 * Retorna dados detalhados para cada afiliado (breakdown diário + tier).
 */
export function computeAffiliateRankings(
  allRows: TransactionRow[]
): Map<string, AffiliateRankingInfo> {
  const payRows = allRows.filter(isPayment);
  if (payRows.length === 0) return new Map();

  // Data mais recente no dataset
  let maxDate = payRows[0]!.date;
  for (const t of payRows) {
    if (t.date > maxDate) maxDate = t.date;
  }

  // Janela de 7 dias: de maxDate-6 até maxDate
  const windowStart = new Date(Date.UTC(
    maxDate.getUTCFullYear(), maxDate.getUTCMonth(), maxDate.getUTCDate() - 6,
    0, 0, 0, 0
  ));

  // Gera as 7 chaves de data em ordem cronológica
  const dateKeys: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(windowStart);
    d.setUTCDate(d.getUTCDate() + i);
    dateKeys.push(d.toISOString().split("T")[0]!);
  }

  // Acumula gross diário e vendas front por afiliado dentro da janela
  const affData = new Map<string, {
    dailyGross: Map<string, number>;
    dailyFrontSales: Map<string, number>;
    frontSales: number;
  }>();
  for (const t of payRows) {
    const dateKey = t.date.toISOString().split("T")[0]!;
    if (dateKey < dateKeys[0]! || dateKey > dateKeys[6]!) continue;
    const name = t.affiliate.trim();
    if (!name) continue;
    const d = affData.get(name) ?? {
      dailyGross: new Map(), dailyFrontSales: new Map(), frontSales: 0,
    };
    d.dailyGross.set(dateKey, (d.dailyGross.get(dateKey) ?? 0) + t.grossAmount);
    if (t.upsellNo === 0) {
      d.dailyFrontSales.set(dateKey, (d.dailyFrontSales.get(dateKey) ?? 0) + 1);
      d.frontSales += 1;
    }
    affData.set(name, d);
  }

  // Track last front sale date per affiliate across ALL data
  const lastSaleMap = new Map<string, string>();
  for (const t of payRows) {
    if (t.upsellNo !== 0) continue;
    const name = t.affiliate.trim();
    if (!name) continue;
    const dateKey = t.date.toISOString().split("T")[0]!;
    const prev = lastSaleMap.get(name);
    if (!prev || dateKey > prev) {
      lastSaleMap.set(name, dateKey);
    }
  }

  // Determina o ranking e monta o breakdown diário de cada afiliado
  const rankings = new Map<string, AffiliateRankingInfo>();
  for (const [name, data] of affData) {
    const dailyValues = dateKeys.map((dk) => data.dailyGross.get(dk) ?? 0);
    let assigned: AffiliateRanking | null = null;
    for (const { tier, min } of TIER_THRESHOLDS) {
      if (isTierConsistent(dailyValues, min)) {
        assigned = tier;
        break;
      }
    }
    if (!assigned) {
      if (data.frontSales >= ATIVO_MIN_SALES) {
        assigned = "Ativo";
      } else if (data.frontSales >= 1) {
        assigned = "Em Rampa";
      } else {
        assigned = "Inativo";
      }
    }

    const days: AffiliateDayDetail[] = dateKeys.map((dk) => {
      const gross = data.dailyGross.get(dk) ?? 0;
      return {
        date: dk,
        gross,
        frontSales: data.dailyFrontSales.get(dk) ?? 0,
        t1: gross >= 15000,
        t2: gross >= 5000,
        t3: gross >= 1000,
      };
    });

    rankings.set(name, {
      ranking: assigned,
      days,
      frontSalesInWindow: data.frontSales,
      windowStart: dateKeys[0]!,
      windowEnd: dateKeys[6]!,
      lastFrontSaleDate: lastSaleMap.get(name) ?? null,
    });
  }

  // Add affiliates with historical sales but 0 in window as Inativo
  for (const [name, lastDate] of lastSaleMap) {
    if (rankings.has(name)) continue;
    const emptyDays: AffiliateDayDetail[] = dateKeys.map((dk) => ({
      date: dk, gross: 0, frontSales: 0, t1: false, t2: false, t3: false,
    }));
    rankings.set(name, {
      ranking: "Inativo",
      days: emptyDays,
      frontSalesInWindow: 0,
      windowStart: dateKeys[0]!,
      windowEnd: dateKeys[6]!,
      lastFrontSaleDate: lastDate,
    });
  }

  return rankings;
}

// ─── Classification Functions ─────────────────────────────────────────────────

export function isUpsellByName(productName: string): boolean {
  const n = productName.toLowerCase().trim();
  return /^(up\d|up\(|up |order bump|bump|down\s?\d|down )/.test(n);
}

export function isPayment(t: TransactionRow): boolean {
  // Strict whitelist — only known payment types. The catch-all was causing
  // refunds/CB with non-standard casing or unknown types to be classified as
  // payments, inflating gross revenue and transaction counts.
  return (
    t.transactionType === "payment" ||
    t.transactionType === "sale" ||
    t.transactionType === "upsell"
  );
}

export function isRefund(t: TransactionRow): boolean {
  return ["return", "refund", "reversal"].includes(t.transactionType);
}

export function isChargeback(t: TransactionRow): boolean {
  return t.transactionType === "chargeback";
}

export function isMaileonardo(affiliate: string): boolean {
  return affiliate.toLowerCase().includes("maileonardo");
}

/**
 * Returns true if this is a front (non-upsell) payment.
 * Uses upsellNo (0 = front) from the API; falls back to name-based detection for CSV data.
 */
export function isFrontSale(t: TransactionRow): boolean {
  if (!isPayment(t)) return false;
  // upsellNo is set by the API normalizer (0 = front)
  return t.upsellNo === 0;
}

export function statusFromPct(pct: number): "Scale" | "Watch" | "Probation" {
  return pct > 10 ? "Probation" : pct > 5 ? "Watch" : "Scale";
}

// ─── Product base name detection ──────────────────────────────────────────────
// Retorna o nome base do produto principal (Slimjara, Erectus X, Memoguard).
// Retorna null para upsells, downsells ou produtos não reconhecidos —
// esses são excluídos do Mix, Reembolso, Product Summary e Bundle.
export function getProductBase(productName: string): string | null {
  const n = productName.toLowerCase().trim();
  if (n.includes("erectus")) return "Erectus X";
  if (n.includes("slimjara")) return "Slimjara";
  if (n.includes("memoguard")) return "Memoguard";
  return null;
}

// ─── Period Computation ───────────────────────────────────────────────────────
export function computePeriod(
  transactions: TransactionRow[],
  startDate: Date,
  endDate: Date,
  periodDays?: number
): PeriodMetrics {
  // Filter by date range
  const filtered = transactions.filter(
    (t) => t.date >= startDate && t.date <= endDate
  );

  const payTxs   = filtered.filter(isPayment);
  const refCbTxs = filtered.filter((t) => isRefund(t) || isChargeback(t));

  // ── Refund & Chargeback (calculados primeiro para uso no Gross líquido) ────
  // Amounts: SUM(grossAmount) de refunds/CB — a API retorna o valor bruto revertido
  const refundRows = refCbTxs.filter(isRefund);
  const cbRows     = refCbTxs.filter(isChargeback);

  const refundAmt = refundRows.reduce((s, t) => s + t.grossAmount, 0);
  const cbAmt     = cbRows.reduce((s, t)     => s + t.grossAmount, 0);

  // ── Front sales (upsellNo === 0) ───────────────────────────────────────────
  const frontPayments = payTxs.filter((t) => t.upsellNo === 0);
  const frontSales    = frontPayments.length;

  // ── Gross ──────────────────────────────────────────────────────────────────
  // grossBruto = soma de TODOS os pagamentos (front + upsells + bumps) — usado
  // internamente para taxas de reembolso/CB e AOV.
  // gross = soma apenas dos pagamentos frontais (upsellNo === 0) — alinhado com
  // o dashboard da Digistore24 que mostra gross por pedido único.
  const grossBruto = payTxs.reduce((s, t) => s + t.grossAmount, 0);
  const gross = frontPayments.reduce((s, t) => s + t.grossAmount, 0);

  // Rates: value-based (gross do reembolso/CB ÷ gross frontal × 100)
  const rPct = gross > 0 ? (refundAmt / gross) * 100 : 0;
  const cPct = gross > 0 ? (cbAmt     / gross) * 100 : 0;

  // ── Earnings ───────────────────────────────────────────────────────────────
  // Front-only payment earnings + refund/CB deductions (negative).
  // Matches Digistore's "Your Earnings" which shows front-order earnings only.
  const earningsTotal =
    frontPayments.reduce((s, t) => s + t.earnings, 0) +
    refCbTxs.reduce((s, t) => s + t.earnings, 0);

  // ── AOV ────────────────────────────────────────────────────────────────────
  // Average order value per unique order (front + upsells + bumps), VAT-excluded.
  // Numerator: total net of all payments (amount − VAT); Denominator: front sales (unique orders)
  // Uses netAmount (amount − vat_amount) because grossAmount includes VAT which
  // inflates AOV vs. the real business metric (Digistore amount field = VAT-inclusive).
  const netTotal = payTxs.reduce((s, t) => s + t.netAmount, 0);
  const aov = frontSales > 0 ? netTotal / frontSales : 0;

  // ── Valor Líquido ──────────────────────────────────────────────────────────
  // valorLiq = front earnings − front COGS (consistent with front-only metrics)
  // COGS applied only to front payments (product shipped; upsells are digital/no fulfillment)
  let productCostTotal = 0;
  let shippingCostTotal = 0;
  let cogsTotal = 0;
  for (const t of frontPayments) {
    const b = getFulfillmentBreakdown(t.productName, t.country, true);
    productCostTotal  += b.product;
    shippingCostTotal += b.shipping;
    cogsTotal         += b.total;
  }
  const valorLiq = earningsTotal - cogsTotal;

  // ── Activated 2K ──────────────────────────────────────────────────────────
  // Affiliates whose total affiliate_amount (CPA received) >= €2000 in the period.
  // Falls back to gross-based when affiliateAmount = 0.
  const affCpa   = new Map<string, number>();
  const affGross = new Map<string, number>();
  for (const t of payTxs) {
    const n = t.affiliate.trim();
    if (!n || n === "(direto)") continue;
    affCpa.set(n,   (affCpa.get(n)   ?? 0) + t.affiliateAmount);
    affGross.set(n, (affGross.get(n) ?? 0) + t.grossAmount);
  }
  // If affiliateAmount data available, use it; otherwise fall back to gross
  const hasAffiliateAmt = Array.from(affCpa.values()).some((v) => v > 0);
  const activated = hasAffiliateAmt
    ? Array.from(affCpa.values()).filter((v) => v >= 2000).length
    : Array.from(affGross.values()).filter((v) => v >= 2000).length;

  // ── Novos Qualificados ─────────────────────────────────────────────────────
  let days = periodDays ?? 30;
  if (!periodDays && payTxs.length > 1) {
    // Evita spread operator em arrays grandes (stack overflow com 65k+ args no V8)
    let minT = payTxs[0]!.date.getTime();
    let maxT = minT;
    for (const t of payTxs) {
      const ms = t.date.getTime();
      if (ms < minT) minT = ms;
      if (ms > maxT) maxT = ms;
    }
    days = Math.max(1, Math.ceil((maxT - minT) / 86400000));
  }
  const novos = Array.from(affGross.values()).filter(
    (v) => v / days >= 1000
  ).length;

  // ── Affiliates selling ────────────────────────────────────────────────────
  const affiliatesSelling = Array.from(
    new Set(payTxs.map((t) => t.affiliate.trim()).filter((n) => Boolean(n) && n !== "(direto)"))
  );

  // ── Daily Gross ───────────────────────────────────────────────────────────
  // Front-only payment rows — aligned with gross KPI (Digistore definition)
  const dailyMap = new Map<string, number>();
  for (const t of frontPayments) {
    const dateKey = t.date.toISOString().split("T")[0]!;
    dailyMap.set(dateKey, (dailyMap.get(dateKey) ?? 0) + t.grossAmount);
  }
  const dailyGross = Array.from(dailyMap.entries())
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Front-only transactions for product-level charts/tables
  const frontPayTxs  = payTxs.filter((t) => t.upsellNo === 0);
  const frontRefCbTxs = refCbTxs.filter((t) => t.upsellNo === 0);

  // ── Product Mix (produtos principais front only) ──────────────────────────
  const prodMix = new Map<string, number>();
  for (const t of frontPayTxs) {
    const base = getProductBase(t.productName);
    if (!base) continue; // ignora UPS, DW e produtos não reconhecidos
    prodMix.set(base, (prodMix.get(base) ?? 0) + t.grossAmount);
  }
  const productMix = Array.from(prodMix.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // ── Refund by Product (produtos principais front only) ────────────────────
  const refByProd = new Map<string, { refAmt: number; grossB: number }>();
  for (const t of frontPayTxs) {
    const base = getProductBase(t.productName);
    if (!base) continue;
    const e = refByProd.get(base) ?? { refAmt: 0, grossB: 0 };
    e.grossB += t.grossAmount;
    refByProd.set(base, e);
  }
  for (const t of frontRefCbTxs) {
    const base = getProductBase(t.productName);
    if (!base) continue;
    const e = refByProd.get(base) ?? { refAmt: 0, grossB: 0 };
    e.refAmt += t.grossAmount;  // gross do reembolso/CB (não earned_amount)
    refByProd.set(base, e);
  }
  const refundByProduct = Array.from(refByProd.entries())
    .map(([name, d]) => ({
      name,
      refundPct: d.grossB > 0 ? (d.refAmt / d.grossB) * 100 : 0,
      refundAmt: d.refAmt,
    }))
    .sort((a, b) => b.refundPct - a.refundPct);

  // ── Product Summary Table (front products only) ───────────────────────────
  const prodSumMap = new Map<
    string,
    {
      gross: number;
      grossBruto: number;
      net: number;
      earnings: number;
      frontSales: number;
      totalSales: number;
      refAmt: number;
      cbAmt: number;
    }
  >();
  for (const t of frontPayTxs) {
    const base = getProductBase(t.productName);
    if (!base) continue; // ignora UPS, DW e produtos não reconhecidos
    const e = prodSumMap.get(base) ?? {
      gross: 0, grossBruto: 0, net: 0, earnings: 0, frontSales: 0, totalSales: 0, refAmt: 0, cbAmt: 0,
    };
    e.grossBruto += t.grossAmount;
    e.gross      += t.grossAmount;
    e.net        += t.netAmount;
    e.earnings   += t.earnings;
    e.totalSales += 1;
    e.frontSales += 1;
    prodSumMap.set(base, e);
  }
  // totalSales += upsells por produto e acumula gross de upsells para AOV
  for (const t of payTxs) {
    if (t.upsellNo === 0) continue; // fronts já foram contados
    const base = getProductBase(t.productName);
    if (!base) continue;
    const e = prodSumMap.get(base);
    if (!e) continue; // só conta upsells de produtos que tiveram front no período
    e.totalSales += 1;
    e.gross      += t.grossAmount; // upsell/bump gross included in gross totals
    e.net        += t.netAmount;   // upsell/bump net included in AOV numerator
  }

  for (const t of frontRefCbTxs) {
    const base = getProductBase(t.productName);
    if (!base) continue;
    const e = prodSumMap.get(base) ?? {
      gross: 0, grossBruto: 0, net: 0, earnings: 0, frontSales: 0, totalSales: 0, refAmt: 0, cbAmt: 0,
    };
    e.earnings += t.earnings;
    if (isRefund(t))     e.refAmt += t.grossAmount;  // gross revertido (não earned_amount)
    if (isChargeback(t)) e.cbAmt  += t.grossAmount;
    prodSumMap.set(base, e);
  }
  const productSummary: ProductSummaryRow[] = Array.from(prodSumMap.entries())
    .map(([product, d]) => ({
      product,
      grossRevenue: d.gross,
      netRevenue:   d.gross - d.refAmt - d.cbAmt,  // gross − valor de reembolsos e CB (o que foi efetivamente retido)
      earnings:     d.earnings,
      aov:          d.frontSales > 0 ? d.net / d.frontSales : 0,
      frontSales:   d.frontSales,
      totalSales:   d.totalSales,
      returnPct:    d.grossBruto > 0 ? (d.refAmt / d.grossBruto) * 100 : 0,
      cbPct:        d.grossBruto > 0 ? (d.cbAmt  / d.grossBruto) * 100 : 0,
    }))
    .sort((a, b) => b.grossRevenue - a.grossRevenue);

  // ── Bundle Performance (front bundles only) ───────────────────────────────
  const bundleMap = new Map<
    string,
    {
      product: string;
      vendas: number;
      gross: number;
      refundAmt: number;   // ABS(SUM earnings) de reembolsos — para netRevenue e valorLiq
      cbAmt: number;       // ABS(SUM earnings) de chargebacks — para netRevenue e valorLiq
      valorLiq: number;
      reembolsos: number;
      chargebacks: number;
    }
  >();
  for (const t of frontPayTxs) {
    const name = t.productName;
    const base = getProductBase(name);
    if (!base) continue; // ignora UPS, DW e produtos não reconhecidos
    const e = bundleMap.get(name) ?? {
      product: base, vendas: 0, gross: 0, refundAmt: 0, cbAmt: 0, valorLiq: 0, reembolsos: 0, chargebacks: 0,
    };
    e.vendas   += 1;
    e.gross    += t.grossAmount;
    e.valorLiq += t.earnings - getFulfillmentCost(t.productName, t.country, true);
    bundleMap.set(name, e);
  }
  for (const t of frontRefCbTxs) {
    const name = t.productName;
    const base = getProductBase(name);
    if (!base) continue;
    const e = bundleMap.get(name) ?? {
      product: base, vendas: 0, gross: 0, refundAmt: 0, cbAmt: 0, valorLiq: 0, reembolsos: 0, chargebacks: 0,
    };
    e.valorLiq += t.earnings;  // earnings negativo — reduz o lucro do bundle (fulfillment é sunk cost)
    if (isRefund(t)) {
      e.reembolsos += 1;
      e.refundAmt  += t.grossAmount;  // gross revertido para netRevenue
    }
    if (isChargeback(t)) {
      e.chargebacks += 1;
      e.cbAmt       += t.grossAmount;
    }
    bundleMap.set(name, e);
  }
  const bundlePerformance: BundleRow[] = Array.from(bundleMap.entries())
    .map(([bundle, d]) => ({
      bundle,
      product:     d.product,
      vendas:      d.vendas,
      gross:       d.gross,
      netRevenue:  d.gross - d.refundAmt - d.cbAmt,  // gross − valor de reembolsos e CB retidos
      valorLiq:    d.valorLiq,
      reembolsos:  d.reembolsos,
      chargebacks: d.chargebacks,
      refundPct:   d.vendas > 0 ? (d.reembolsos / d.vendas) * 100 : 0,
    }))
    .sort((a, b) => b.gross - a.gross);

  // ── Top Affiliates ────────────────────────────────────────────────────────
  const affMap = new Map<string, AffiliateDetail>();
  for (const t of payTxs) {
    const n = t.affiliate.trim();
    if (!n) continue;
    const e = affMap.get(n) ?? {
      gross: 0, grossBruto: 0, frontGross: 0, net: 0, earnings: 0, liq: 0, sales: 0,
      refundAmt: 0, cbAmt: 0, totalTx: 0, affiliateAmt: 0,
    };
    e.gross          += t.grossAmount;
    e.grossBruto     += t.grossAmount;
    e.net            += t.netAmount;    // VAT-excluded amount for AOV
    e.earnings       += t.earnings;
    e.affiliateAmt   += t.affiliateAmount;
    e.totalTx        += 1;
    if (t.upsellNo === 0) {
      e.sales      += 1;               // count only front orders as "sales"
      e.frontGross += t.grossAmount;   // AOV numerator: only upsell_no === 0 gross
    }
    e.liq += t.earnings - getFulfillmentCost(t.productName, t.country, t.upsellNo === 0);
    affMap.set(n, e);
  }
  for (const t of refCbTxs) {
    const n = t.affiliate.trim();
    if (!n) continue;
    const e = affMap.get(n) ?? {
      gross: 0, grossBruto: 0, frontGross: 0, net: 0, earnings: 0, liq: 0, sales: 0,
      refundAmt: 0, cbAmt: 0, totalTx: 0, affiliateAmt: 0,
    };
    e.earnings += t.earnings;  // negative — reduces earnings
    e.liq      += t.earnings;  // refund: only earnings returned (fulfillment is sunk cost)
    if (isRefund(t))     e.refundAmt += t.grossAmount;  // gross revertido para taxa de reembolso
    if (isChargeback(t)) e.cbAmt     += t.grossAmount;
    affMap.set(n, e);
  }
  const topAffiliates: AffiliateRow[] = Array.from(affMap.entries())
    .filter(([, d]) => d.grossBruto > 0)  // exclui afiliados criados apenas por reembolsos sem pagamentos
    .map(([name, d]) => {
      const rcPct = d.grossBruto > 0
        ? ((d.refundAmt + d.cbAmt) / d.grossBruto) * 100
        : 0;
      // CPA: use actual affiliate_amount if available; else estimate from gross-earnings spread
      const cpa = d.sales > 0
        ? (d.affiliateAmt > 0 ? d.affiliateAmt / d.sales : (d.gross - d.earnings) / d.sales)
        : 0;
      return {
        name,
        gross:        d.gross,
        earnings:     d.earnings,
        valorLiq:     d.liq,
        sales:        d.sales,
        refundCbPct:  rcPct,
        status:       statusFromPct(rcPct),
        aov:          d.sales > 0 ? d.net / d.sales : 0,
        cpa,
        margem:       d.gross > 0 ? (d.liq / d.gross) * 100 : 0,
      };
    })
    .sort((a, b) => b.gross - a.gross);

  return {
    gross,
    grossBruto,
    earnings: earningsTotal,
    valorLiq,
    productCost:  productCostTotal,
    shippingCost: shippingCostTotal,
    aov,
    sales: frontSales,
    refundPct:    rPct,
    chargebackPct: cPct,
    refundCbPct:  rPct + cPct,
    refundAmt,
    cbAmt,
    activated,
    novosQualificados: novos,
    affiliatesSelling,
    dailyGross,
    productMix,
    refundByProduct,
    productSummary,
    bundlePerformance,
    topAffiliates,
  };
}

// ─── Compute from pre-filtered rows (no internal date filter) ─────────────────
export function computeFromFiltered(
  filteredRows: TransactionRow[],
  periodDays?: number
): PeriodMetrics {
  // Use a dummy date range that includes everything
  const minDate = new Date(0);
  const maxDate = new Date(Date.UTC(9999, 11, 31));
  return computePeriod(filteredRows, minDate, maxDate, periodDays);
}

// ─── Format helpers ───────────────────────────────────────────────────────────
export function formatEur(value: number): string {
  return `€${value.toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatPct(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function formatInt(value: number): string {
  return value.toLocaleString("de-DE");
}
