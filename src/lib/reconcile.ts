import type { TransactionRow } from "./transactions";
import { isPayment, isRefund, isChargeback } from "./transactions";
import {
  getFulfillmentBreakdown,
  detectBottles,
  getProductCostPerBottle,
  resolveCountryCode,
  COUNTRY_ZONE,
  CAPITAL_COST_FACTOR,
} from "./costTable";

// ─── Instrumento de diagnóstico do Valor Líquido ─────────────────────────────
// Produz o breakdown transação a transação no formato do correcoes.md §10,
// para reconciliar o valorLiq do sistema com um cálculo manual (ex.: supaff24
// 27/06/2026). As parcelas replicam exatamente o computePeriod() — o teste
// REC-01 trava essa equivalência.
//
// Uso: montar TransactionRow[] a partir do export da Digistore e chamar
// buildValorLiqBreakdown(rows, "supaff24"); inspecionar lines e totals.

export interface BreakdownLine {
  date: string;
  orderId: string;
  kind: "front" | "upsell" | "refund/cb";
  transactionType: string;
  upsellNo: number;
  product: string;
  country: string;
  zone: string;
  bottles: number;
  grossAmount: number;
  earnings: number;
  productCost: number;
  shippingCost: number;
  capitalCost: number;
  liq: number; // contribuição desta transação ao Valor Líquido
}

export interface BreakdownTotals {
  txCount: number;
  frontCount: number;
  upsellCount: number;
  refundCbCount: number;
  grossTotal: number;
  earningsKPI: number;
  productCost: number;
  shippingCost: number;
  capitalCost: number;
  cogsTotal: number;
  valorLiq: number;
}

export interface ValorLiqBreakdown {
  lines: BreakdownLine[];
  totals: BreakdownTotals;
}

export function buildValorLiqBreakdown(
  rows: TransactionRow[],
  affiliate?: string
): ValorLiqBreakdown {
  const filtered = affiliate
    ? rows.filter((t) => t.affiliate.trim() === affiliate)
    : rows;

  const lines: BreakdownLine[] = [];
  const totals: BreakdownTotals = {
    txCount: 0, frontCount: 0, upsellCount: 0, refundCbCount: 0,
    grossTotal: 0, earningsKPI: 0,
    productCost: 0, shippingCost: 0, capitalCost: 0, cogsTotal: 0, valorLiq: 0,
  };

  for (const t of filtered) {
    const pay = isPayment(t);
    const refCb = isRefund(t) || isChargeback(t);
    if (!pay && !refCb) continue;

    const zone = COUNTRY_ZONE[resolveCountryCode(t.country)] ?? "—";
    let kind: BreakdownLine["kind"];
    let productCost = 0;
    let shippingCost = 0;
    let capitalCost = 0;
    let bottles = detectBottles(t.productName);

    if (pay && t.upsellNo === 0) {
      kind = "front";
      const b = getFulfillmentBreakdown(t.productName, t.country, true);
      productCost = b.product;
      shippingCost = b.shipping;
      capitalCost = t.grossAmount * CAPITAL_COST_FACTOR;
      totals.frontCount += 1;
    } else if (pay) {
      kind = "upsell";
      productCost = bottles * getProductCostPerBottle(t.productName);
      capitalCost = t.grossAmount * CAPITAL_COST_FACTOR;
      totals.upsellCount += 1;
    } else {
      kind = "refund/cb";
      bottles = 0; // sunk cost — sem novo COGS, sem reversão de capital
      totals.refundCbCount += 1;
    }

    const liq = t.earnings - productCost - shippingCost - capitalCost;

    lines.push({
      date: t.date.toISOString().slice(0, 10),
      orderId: t.orderId,
      kind,
      transactionType: t.transactionType,
      upsellNo: t.upsellNo,
      product: t.productName,
      country: t.country,
      zone,
      bottles,
      grossAmount: t.grossAmount,
      earnings: t.earnings,
      productCost,
      shippingCost,
      capitalCost,
      liq,
    });

    totals.txCount += 1;
    if (pay) totals.grossTotal += t.grossAmount;
    totals.earningsKPI += t.earnings;
    totals.productCost += productCost;
    totals.shippingCost += shippingCost;
    totals.capitalCost += capitalCost;
    totals.valorLiq += liq;
  }

  totals.cogsTotal = totals.productCost + totals.shippingCost;
  return { lines, totals };
}
