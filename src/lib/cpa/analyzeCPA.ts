import type { TransactionRow } from "../transactions";
import type { AffiliateAccumulator, AffiliateResult, VariantResult } from "./types";
import { CPA_DEFAULTS, OP_AVG, VARIANT_BOTTLES } from "./constants";
import { getFrontVariant } from "./parseHelpers";
import { isPayment, isRefund, isChargeback } from "../transactions";
import { getFulfillmentCost, detectBottles, getProductCostPerBottle } from "../costTable";

function makeAcc(name: string): AffiliateAccumulator {
  return {
    name,
    fronts: {},
    upsells: {},
    refundEarn: 0,
    cbEarn: 0,
    allOrders: 0,
    refundOrders: 0,
    cbOrders: 0,
    grossBruto: 0,
    refundAmt: 0,
    cbAmt: 0,
    buyers: new Set(),
    buyersWithUpsell: new Set(),
  };
}

/**
 * Analisa as rows filtradas e retorna resultados por afiliado, ordenados por netProfit DESC.
 *
 * DETALHE CRÍTICO: upsellEarnPer e upsellCogsPer são divididos pelo nº de front orders,
 * não de upsell orders — o LTV reflete o uplift médio por pedido de entrada,
 * absorvendo implicitamente a taxa de conversão de upsell.
 *
 * Front/Upsell detection: uses upsellNo === 0 (from API).
 */
export function analyzeCPA(
  rows: TransactionRow[],
  marginTarget: number
): AffiliateResult[] {
  // Use isPayment() para alinhar com a lógica do dashboard (captura "sale", "upsell", "" e grossAmount > 0)
  const payments   = rows.filter(isPayment);
  const refunds    = rows.filter(isRefund);
  const cbs        = rows.filter(isChargeback);

  // ── 1. Mapear buyerId → variant (para atribuir upsells ao funil correto) ──
  const buyerFront: Record<string, number> = {};
  for (const r of payments) {
    // Front = upsellNo === 0 (API) — also verify it has a known M-variant
    if (r.upsellNo === 0 && r.buyerId) {
      const v = getFrontVariant(r.productName);
      if (v !== null) buyerFront[r.buyerId] = v;
    }
  }

  // ── 2. Acumular por afiliado ──────────────────────────────────────────────
  const affMap = new Map<string, AffiliateAccumulator>();

  const getAcc = (raw: string): AffiliateAccumulator => {
    const name = raw.trim() || "(direto)";
    if (!affMap.has(name)) affMap.set(name, makeAcc(name));
    return affMap.get(name)!;
  };

  for (const r of payments) {
    const acc = getAcc(r.affiliate);
    acc.allOrders++;
    if (r.buyerId) acc.buyers.add(r.buyerId);

    if (r.upsellNo === 0) {
      // Front offer — determine M-variant from product name
      const v = getFrontVariant(r.productName);
      if (v === null || v === 4) continue; // ignorar M4 e produtos sem variante
      if (!acc.fronts[v]) acc.fronts[v] = { count: 0, earn: 0, cogs: 0, gross: 0 };
      acc.fronts[v].count++;
      acc.fronts[v].earn += r.earnings;
      // Front: fulfillment completo (produto + frete) via costTable — fonte única
      acc.fronts[v].cogs += getFulfillmentCost(r.productName, r.country, true);
      acc.fronts[v].gross += r.grossAmount;
      acc.grossBruto += r.grossAmount;  // grossAmount is correctly set for payments

    } else {
      // Upsell (upsellNo > 0)
      const v = r.buyerId ? buyerFront[r.buyerId] : undefined;
      if (!v) continue;
      if (!acc.upsells[v]) acc.upsells[v] = { count: 0, earn: 0, cogs: 0, gross: 0 };
      acc.upsells[v].count++;
      acc.upsells[v].earn += r.earnings;
      // Upsell: só custo de produto — sem frete (mesmo pacote do front, como no dashboard)
      acc.upsells[v].cogs += detectBottles(r.productName) * getProductCostPerBottle(r.productName);
      acc.upsells[v].gross += r.grossAmount;
      acc.grossBruto += r.grossAmount;
      if (r.buyerId) acc.buyersWithUpsell.add(r.buyerId);
    }
  }

  for (const r of refunds) {
    const acc = getAcc(r.affiliate);
    acc.refundEarn += r.earnings;     // negative — reduces earnings (profit calc)
    acc.refundOrders++;
    acc.refundAmt += r.grossAmount;   // gross revertido (para taxa de reembolso)
  }

  for (const r of cbs) {
    const acc = getAcc(r.affiliate);
    acc.cbEarn += r.earnings;         // negative
    acc.cbOrders++;
    acc.cbAmt += r.grossAmount;       // gross revertido (para taxa de CB)
  }

  // ── 3. Calcular resultados por afiliado ──────────────────────────────────
  const results: AffiliateResult[] = [];

  for (const [, acc] of affMap) {
    const frontTotal = Object.values(acc.fronts).reduce((s, f) => s + f.count, 0);
    if (frontTotal === 0) continue;

    // Variante dominante (maior contagem de fronts)
    let domVariant = 1;
    let domCount = 0;
    for (const [vStr, f] of Object.entries(acc.fronts)) {
      if (f.count > domCount) {
        domCount = f.count;
        domVariant = Number(vStr);
      }
    }

    // ── Variantes ──
    const variants: VariantResult[] = [];
    for (const [vStr, f] of Object.entries(acc.fronts)) {
      const v = Number(vStr);
      if (f.count === 0) continue;

      const bottles       = VARIANT_BOTTLES[v] ?? 2;
      const ups           = acc.upsells[v] ?? { count: 0, earn: 0, cogs: 0, gross: 0 };
      const frontEarnPer  = f.earn / f.count;
      const frontCogsPer  = f.cogs / f.count;
      const upsellEarnPer = ups.earn / f.count; // ← divide por fronts
      const upsellCogsPer = ups.cogs / f.count; // ← divide por fronts
      const ltvEarn       = frontEarnPer + upsellEarnPer;
      const ltvProfit     = ltvEarn - frontCogsPer - upsellCogsPer;
      const upsellConv    = (ups.count / f.count) * 100;
      const aovGross      = (f.gross + (ups.gross ?? 0)) / f.count;
      const cpaDefault    = CPA_DEFAULTS[bottles] ?? 0;
      const maxCpaRaw     = Math.max(0, cpaDefault + ltvProfit - marginTarget);
      const cpaStatus: VariantResult["cpaStatus"] =
        maxCpaRaw < cpaDefault       ? "reduce"   :
        maxCpaRaw > cpaDefault + 10  ? "increase" : "ok";
      const opAvg = OP_AVG[v];

      variants.push({
        variant:          v,
        bottles,
        count:            f.count,
        frontEarnPer,
        frontCogsPer,
        upsellEarnPer,
        upsellCogsPer,
        ltvEarn,
        ltvProfit,
        upsellConv,
        aovGross,
        cpaDefault,
        maxCpa:           Math.round(maxCpaRaw),
        cpaStatus,
        roomAboveCurrent: Math.round(maxCpaRaw - cpaDefault),
        vsOpLtvProfit:    opAvg ? ltvProfit - opAvg.ltvProfit : 0,
        vsOpUpsellConv:   opAvg ? upsellConv - opAvg.upsellConv : 0,
      });
    }

    // ── Totais ──
    const totalEarn = Object.values(acc.fronts).reduce((s, f) => s + f.earn, 0)
                    + Object.values(acc.upsells).reduce((s, u) => s + u.earn, 0);
    const totalCogs = Object.values(acc.fronts).reduce((s, f) => s + f.cogs, 0)
                    + Object.values(acc.upsells).reduce((s, u) => s + u.cogs, 0);
    const refundEarnTotal = acc.refundEarn + acc.cbEarn;
    const netProfit       = totalEarn + refundEarnTotal - totalCogs;
    // Refund rate: amount-based (value of refunds / gross) for CPA quality analysis
    const refundRate      = acc.grossBruto > 0
      ? ((acc.refundAmt + acc.cbAmt) / acc.grossBruto) * 100
      : 0;
    const upsellConvOverall = acc.buyers.size > 0
      ? (acc.buyersWithUpsell.size / acc.buyers.size) * 100
      : 0;  // guard: evita NaN quando não há buyers com buyerId

    results.push({
      name: acc.name,
      frontTotal,
      domVariant,
      variants,
      totalEarn,
      totalCogs,
      refundEarn: refundEarnTotal,
      netProfit,
      refundRate,
      upsellConvOverall,
    });
  }

  return results.sort((a, b) => b.netProfit - a.netProfit);
}
