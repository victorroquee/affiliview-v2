import { describe, it, expect } from "vitest";
import { buildValorLiqBreakdown } from "./reconcile";
import { computeFromFiltered } from "./transactions";
import type { TransactionRow } from "./transactions";

function makeRow(overrides: Partial<TransactionRow>): TransactionRow {
  return {
    date: new Date("2026-06-27"),
    orderId: "ORD-001",
    buyerId: "BUY-001",
    transactionType: "payment",
    grossAmount: 294,
    netAmount: 274,
    earnings: 40,
    affiliate: "supaff24",
    productName: "M3 - Slimjara - 6 Bottles",
    productGroup: "group",
    country: "DE",
    quantity: 1,
    upsellNo: 0,
    affiliateAmount: 185,
    vatAmount: 20,
    productId: "",
    ...overrides,
  };
}

// Instrumento de diagnóstico do gap supaff24 (correcoes.md §6/§10):
// quando o export chegar, montar TransactionRow[] e conferir linha a linha.
describe("buildValorLiqBreakdown — reconciliação transação a transação", () => {
  const rows: TransactionRow[] = [
    makeRow({ orderId: "O1", upsellNo: 0 }),
    makeRow({ orderId: "O1", upsellNo: 1, productName: "UP3 - Slimjara - 12 Bottles", grossAmount: 288, earnings: 100 }),
    makeRow({ orderId: "O2", upsellNo: 0, productName: "M2 - LipoGandha - 3 Bottles", country: "CH", grossAmount: 207, earnings: 30 }),
    makeRow({ orderId: "O2", transactionType: "refund", grossAmount: 207, earnings: -30, productName: "M2 - LipoGandha - 3 Bottles", country: "CH" }),
  ];

  it("REC-01: totais do breakdown reconciliam EXATAMENTE com computePeriod", () => {
    const b = buildValorLiqBreakdown(rows);
    const m = computeFromFiltered(rows);
    expect(b.totals.earningsKPI).toBeCloseTo(m.earnings, 9);
    expect(b.totals.productCost).toBeCloseTo(m.productCost, 9);
    expect(b.totals.shippingCost).toBeCloseTo(m.shippingCost, 9);
    expect(b.totals.capitalCost).toBeCloseTo(m.capitalCost, 9);
    expect(b.totals.valorLiq).toBeCloseTo(m.valorLiq, 9);
  });

  it("REC-02: uma linha por transação com parcelas individuais", () => {
    const b = buildValorLiqBreakdown(rows);
    expect(b.lines).toHaveLength(4);
    const front = b.lines[0]!;
    expect(front.kind).toBe("front");
    expect(front.bottles).toBe(6);
    expect(front.productCost).toBeCloseTo(19.56, 2);
    expect(front.shippingCost).toBeCloseTo(9.42, 2);
    const upsell = b.lines[1]!;
    expect(upsell.kind).toBe("upsell");
    expect(upsell.shippingCost).toBe(0); // mesmo pacote
    expect(upsell.productCost).toBeCloseTo(39.12, 2);
    const refund = b.lines[3]!;
    expect(refund.kind).toBe("refund/cb");
    expect(refund.productCost).toBe(0); // sunk cost — sem novo COGS
    expect(refund.capitalCost).toBe(0); // não reverte
    expect(refund.liq).toBeCloseTo(-30, 2);
  });

  it("REC-03: contagens e filtro por afiliado", () => {
    const b = buildValorLiqBreakdown(rows, "supaff24");
    expect(b.totals.frontCount).toBe(2);
    expect(b.totals.txCount).toBe(4);
    const empty = buildValorLiqBreakdown(rows, "outro");
    expect(empty.lines).toHaveLength(0);
  });
});
