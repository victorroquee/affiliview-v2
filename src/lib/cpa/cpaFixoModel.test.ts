import { describe, it, expect } from "vitest";
import {
  computeCpaFixo,
  computeVatMix,
  aggregateAffiliateInputs,
  DEFAULT_INPUTS,
  MARGINS,
} from "./cpaFixoModel";
import type { TransactionRow } from "../transactions";

function makeRow(overrides: Partial<TransactionRow>): TransactionRow {
  return {
    date: new Date("2026-06-27"),
    orderId: "ORD-001",
    buyerId: "BUY-001",
    transactionType: "payment",
    grossAmount: 100,
    netAmount: 90,
    earnings: 20,
    affiliate: "affA",
    productName: "M3 - Slimjara - 6 Bottles",
    productGroup: "group",
    country: "DE",
    quantity: 1,
    upsellNo: 0,
    affiliateAmount: 10,
    vatAmount: 10,
    productId: "",
    ...overrides,
  };
}

describe("computeCpaFixo — porte fiel do calculate() do HTML", () => {
  it("CFX-01: defaults em modo auto — realAOV, upsellRate, sobra e sem alertas", () => {
    const o = computeCpaFixo(DEFAULT_INPUTS);
    // fePrice = .06×156 + .27×207 + .67×294 = 262,23
    expect(o.fePrice).toBeCloseTo(262.23, 2);
    // upsellRate = (300 − 262,23) / 175 = 0,2158...
    expect(o.upsellRate).toBeCloseTo(0.215829, 5);
    // realAOV volta ao próprio AOV quando aov > fePrice
    expect(o.realAOV).toBeCloseTo(300, 2);
    // effCapital = 0,10 × (60/365) × 0,20
    expect(o.effCapital).toBeCloseTo(0.0032877, 6);
    // netRevenue = 300 × (1 − 0,10)
    expect(o.netRevenue).toBeCloseTo(270, 2);
    // sobra = 270 − (VAT 19,6262 + produto 21,4844 + ship 7,58 + digi 31,02 + capital 0,9863)
    expect(o.sobra).toBeCloseTo(189.3032, 3);
    expect(o.alerts).toHaveLength(0);
  });

  it("CFX-02: tabela de margens — linha de 10% (cpa = sobra − 10%·netRevenue)", () => {
    const o = computeCpaFixo(DEFAULT_INPUTS);
    expect(MARGINS).toEqual([5, 7, 8, 10, 12, 15]);
    const row10 = o.rows[3]!;
    expect(row10.margin).toBe(10);
    expect(row10.profit).toBeCloseTo(27, 2);
    expect(row10.cpa).toBeCloseTo(162.3032, 3);
  });

  it("CFX-03: modo manual — normaliza sliders e usa upsellRate/upsellPots dos inputs", () => {
    const o = computeCpaFixo({
      ...DEFAULT_INPUTS,
      mixMode: "manual",
      mixM1: 0,
      mixM2: 0,
      mixM3: 100,
      upsellRate: 25,
      upsellPots: 7.6,
    });
    expect(o.fePrice).toBeCloseTo(294, 2);
    expect(o.mix.M3).toBeCloseTo(1, 5);
    // realAOV = 294 + 0,25×175 = 337,75
    expect(o.realAOV).toBeCloseTo(337.75, 2);
    // totalPots = 6 + 0,25×7,6 = 7,9
    expect(o.breakdown.totalPots).toBeCloseTo(7.9, 3);
  });

  it("CFX-04: alertas — AOV abaixo do FE puro (danger) e upsell alto (warning)", () => {
    const low = computeCpaFixo({ ...DEFAULT_INPUTS, aov: 200 });
    expect(low.upsellRate).toBe(0);
    expect(low.alerts.some((a) => a.type === "danger")).toBe(true);

    const high = computeCpaFixo({ ...DEFAULT_INPUTS, aov: 400 });
    expect(high.upsellRate).toBeGreaterThan(0.6);
    expect(high.alerts.some((a) => a.type === "warning")).toBe(true);
  });

  it("CFX-05: alertas — refund alto (warning) e CPA negativo a 10% (danger)", () => {
    const o = computeCpaFixo({ ...DEFAULT_INPUTS, refund: 90 });
    // netRevenue = 30 → sobra negativa → linha 10% negativa
    expect(o.rows[3]!.cpa).toBeLessThan(0);
    expect(o.alerts.some((a) => a.type === "danger")).toBe(true);
    expect(o.alerts.some((a) => a.type === "warning")).toBe(true);
  });

  it("CFX-06: simulador — lucro/venda, margem %, lucro mensal e faturamento", () => {
    const o = computeCpaFixo(DEFAULT_INPUTS); // testCPA 180, volume 300
    expect(o.simulator.profitPerSale).toBeCloseTo(9.3032, 3);
    expect(o.simulator.marginPct).toBeCloseTo(3.4456, 3);
    expect(o.simulator.monthlyProfit).toBeCloseTo(2790.95, 1);
    expect(o.simulator.monthlyRevenue).toBeCloseTo(81000, 2);
  });

  it("CFX-07: VAT mix ponderado por país (DE 7 / AT 10 / CH 2,6)", () => {
    // (85×7 + 9×10 + 5×2,6) / 99 = 7,0505...
    expect(computeVatMix(85, 9, 5)).toBeCloseTo(7.0505, 3);
    expect(computeVatMix(0, 0, 0)).toBe(0);
  });
});

describe("aggregateAffiliateInputs — auto-fill a partir das transações", () => {
  it("AGG-01: agrega AOV (gross c/ upsell por front), refundRate e mix por variante", () => {
    const rows: TransactionRow[] = [
      makeRow({ productName: "M3 - Slimjara - 6 Bottles", upsellNo: 0, grossAmount: 294 }),
      makeRow({ productName: "M2 - Slimjara - 3 Bottles", upsellNo: 0, grossAmount: 207 }),
      makeRow({ productName: "UP3 - Slimjara - 12 Bottles", upsellNo: 1, grossAmount: 100 }),
      makeRow({ transactionType: "refund", grossAmount: 60.1 }),
    ];
    const out = aggregateAffiliateInputs(rows);
    expect(out).toHaveLength(1);
    const a = out[0]!;
    expect(a.name).toBe("affA");
    expect(a.frontOrders).toBe(2);
    // aov = (294 + 207 + 100) / 2 = 300,5
    expect(a.aov).toBeCloseTo(300.5, 2);
    // refundRate = 60,1 / 601 = 0,1
    expect(a.refundRate).toBeCloseTo(0.1, 4);
    // mix em % a partir das contagens front
    expect(a.mix.M1).toBeCloseTo(0, 2);
    expect(a.mix.M2).toBeCloseTo(50, 2);
    expect(a.mix.M3).toBeCloseTo(50, 2);
  });

  it("AGG-02: exclui (direto)/Maileonardo e afiliados sem front order", () => {
    const rows: TransactionRow[] = [
      makeRow({ affiliate: "(direto)" }),
      makeRow({ affiliate: "Maileonardo" }),
      makeRow({ affiliate: "soUpsell", upsellNo: 1, productName: "UP3 - Slimjara - 12 Bottles" }),
      makeRow({ affiliate: "valido", productName: "M1 - Slimjara - 2 Bottles" }),
    ];
    const out = aggregateAffiliateInputs(rows);
    expect(out.map((a) => a.name)).toEqual(["valido"]);
  });
});
