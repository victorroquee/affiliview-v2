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
  rcb: number;
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
  earnings: number;
  liq: number;
  sales: number;
  refundAmt: number;
  cbAmt: number;
  totalTx: number;
  affiliateAmt: number;   // sum of affiliate_amount paid (for CPA calculation)
}

// ─── Classification Functions ─────────────────────────────────────────────────

export function isUpsellByName(productName: string): boolean {
  const n = productName.toLowerCase().trim();
  return /^(up\d|up\(|up |order bump|bump|down\s?\d|down )/.test(n);
}

export function isPayment(t: TransactionRow): boolean {
  return (
    t.transactionType === "payment" ||
    t.transactionType === "sale" ||
    t.transactionType === "upsell" ||
    t.transactionType === "" ||
    (t.grossAmount > 0 &&
      !["return", "refund", "chargeback", "reversal"].includes(t.transactionType))
  );
}

export function isRefund(t: TransactionRow): boolean {
  return ["return", "refund", "reversal"].includes(t.transactionType);
}

export function isChargeback(t: TransactionRow): boolean {
  return t.transactionType === "chargeback";
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
function getProductBase(productName: string): string | null {
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

  // ── Gross ──────────────────────────────────────────────────────────────────
  // grossRevenue = SUM(amount WHERE transaction_type === "payment")
  // Refunds/CB are NOT subtracted from gross — their impact is captured in earnings.
  // (API returns `amount` as positive for refunds; normalizer sets grossAmount=0 for non-payments)
  const grossBruto = payTxs.reduce((s, t) => s + t.grossAmount, 0);
  const gross = grossBruto;  // gross === grossBruto per logica2.md

  // ── Earnings ───────────────────────────────────────────────────────────────
  // SUM(earned_amount) for ALL transaction types.
  // earned_amount is negative for refunds/CB — they naturally reduce earnings.
  const earningsTotal =
    payTxs.reduce((s, t) => s + t.earnings, 0) +
    refCbTxs.reduce((s, t) => s + t.earnings, 0);

  // ── Front sales (upsellNo === 0) ───────────────────────────────────────────
  const frontPayments = payTxs.filter((t) => t.upsellNo === 0);
  const frontSales    = frontPayments.length;

  // ── AOV ────────────────────────────────────────────────────────────────────
  // Average order value of front offers (upsell_no === 0)
  const frontGross = frontPayments.reduce((s, t) => s + t.grossAmount, 0);
  const aov = frontSales > 0 ? frontGross / frontSales : 0;

  // ── Valor Líquido ──────────────────────────────────────────────────────────
  // valorLiq = SUM(earned_amount all types) − SUM(COGS for payments)
  // COGS applied only to payments (product already shipped; refunds don't incur new COGS)
  let productCostTotal = 0;
  let shippingCostTotal = 0;
  let cogsTotal = 0;
  for (const t of payTxs) {
    const front = t.upsellNo === 0;
    const b = getFulfillmentBreakdown(t.productName, t.country, front);
    productCostTotal  += b.product;
    shippingCostTotal += b.shipping;
    cogsTotal         += b.total;
  }
  const valorLiq = earningsTotal - cogsTotal;

  // ── Refund & Chargeback ────────────────────────────────────────────────────
  // Rates: count-based per logica2.md (COUNT refunds / COUNT payments)
  // Amounts: ABS(SUM(earned_amount)) for display purposes
  const refundRows = refCbTxs.filter(isRefund);
  const cbRows     = refCbTxs.filter(isChargeback);
  const payCount   = payTxs.length;

  const rPct = payCount > 0 ? (refundRows.length / payCount) * 100 : 0;
  const cPct = payCount > 0 ? (cbRows.length   / payCount) * 100 : 0;

  // Use |earnings| for amount display (earned_amount is negative for refunds/CB)
  const refundAmt = refundRows.reduce((s, t) => s + Math.abs(t.earnings), 0);
  const cbAmt     = cbRows.reduce((s, t)     => s + Math.abs(t.earnings), 0);

  // ── Activated 2K ──────────────────────────────────────────────────────────
  // Affiliates whose total affiliate_amount (CPA received) >= €2000 in the period.
  // Falls back to gross-based when affiliateAmount = 0.
  const affCpa   = new Map<string, number>();
  const affGross = new Map<string, number>();
  for (const t of payTxs) {
    const n = t.affiliate.trim();
    if (!n) continue;
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
    new Set(payTxs.map((t) => t.affiliate.trim()).filter(Boolean))
  );

  // ── Daily Gross ───────────────────────────────────────────────────────────
  // Only payment rows — gross is not affected by refund/CB per logica2.md
  const dailyMap = new Map<string, number>();
  for (const t of payTxs) {
    const dateKey = t.date.toISOString().split("T")[0];
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
    e.refAmt += Math.abs(t.earnings);
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
  // totalSales += upsells por produto (fronts já foram incrementados acima)
  for (const t of payTxs) {
    if (t.upsellNo === 0) continue; // fronts já foram contados
    const base = getProductBase(t.productName);
    if (!base) continue;
    const e = prodSumMap.get(base);
    if (!e) continue; // só conta upsells de produtos que tiveram front no período
    e.totalSales += 1;
  }

  for (const t of frontRefCbTxs) {
    const base = getProductBase(t.productName);
    if (!base) continue;
    const e = prodSumMap.get(base) ?? {
      gross: 0, grossBruto: 0, net: 0, earnings: 0, frontSales: 0, totalSales: 0, refAmt: 0, cbAmt: 0,
    };
    e.earnings += t.earnings;
    if (isRefund(t))     e.refAmt += Math.abs(t.earnings);
    if (isChargeback(t)) e.cbAmt  += Math.abs(t.earnings);
    prodSumMap.set(base, e);
  }
  const productSummary: ProductSummaryRow[] = Array.from(prodSumMap.entries())
    .map(([product, d]) => ({
      product,
      grossRevenue: d.gross,
      netRevenue:   d.net,
      earnings:     d.earnings,
      aov:          d.frontSales > 0 ? d.grossBruto / d.frontSales : 0,
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
      netRevenue: number;
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
      product: base, vendas: 0, gross: 0, netRevenue: 0, valorLiq: 0, reembolsos: 0, chargebacks: 0,
    };
    e.vendas     += 1;
    e.gross      += t.grossAmount;
    e.netRevenue += t.netAmount;  // gross − VAT (não earnings, que inclui deduções Digistore)
    e.valorLiq   += t.earnings - getFulfillmentCost(t.productName, t.country, true);
    bundleMap.set(name, e);
  }
  for (const t of frontRefCbTxs) {
    const name = t.productName;
    const base = getProductBase(name);
    if (!base) continue;
    const e = bundleMap.get(name) ?? {
      product: base, vendas: 0, gross: 0, netRevenue: 0, valorLiq: 0, reembolsos: 0, chargebacks: 0,
    };
    if (isRefund(t))     e.reembolsos  += 1;
    if (isChargeback(t)) e.chargebacks += 1;
    bundleMap.set(name, e);
  }
  const bundlePerformance: BundleRow[] = Array.from(bundleMap.entries())
    .map(([bundle, d]) => ({
      bundle,
      product:     d.product,
      vendas:      d.vendas,
      gross:       d.gross,
      netRevenue:  d.netRevenue,
      valorLiq:    d.valorLiq,
      reembolsos:  d.reembolsos,
      chargebacks: d.chargebacks,
      rcb:         d.reembolsos + d.chargebacks,
    }))
    .sort((a, b) => b.gross - a.gross);

  // ── Top Affiliates ────────────────────────────────────────────────────────
  const affMap = new Map<string, AffiliateDetail>();
  for (const t of payTxs) {
    const n = t.affiliate.trim();
    if (!n) continue;
    const e = affMap.get(n) ?? {
      gross: 0, grossBruto: 0, frontGross: 0, earnings: 0, liq: 0, sales: 0,
      refundAmt: 0, cbAmt: 0, totalTx: 0, affiliateAmt: 0,
    };
    e.gross          += t.grossAmount;
    e.grossBruto     += t.grossAmount;
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
      gross: 0, grossBruto: 0, earnings: 0, liq: 0, sales: 0,
      refundAmt: 0, cbAmt: 0, totalTx: 0, affiliateAmt: 0, frontGross: 0,
    };
    e.earnings += t.earnings;  // negative — reduces earnings
    e.liq      += t.earnings;  // refund: only earnings returned (fulfillment is sunk cost)
    if (isRefund(t))     e.refundAmt += Math.abs(t.earnings);
    if (isChargeback(t)) e.cbAmt     += Math.abs(t.earnings);
    affMap.set(n, e);
  }
  const topAffiliates: AffiliateRow[] = Array.from(affMap.entries())
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
        aov:          d.sales > 0 ? d.frontGross / d.sales : 0,
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
