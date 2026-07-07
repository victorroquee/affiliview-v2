import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { computeAffiliateRankings, computeAffiliateUpsells, classifyUpsellProduct, computeFromFiltered } from "./transactions";
import type { TransactionRow } from "./transactions";
import { detectBottles } from "./costTable";

function makeRow(overrides: Partial<TransactionRow>): TransactionRow {
  return {
    date: new Date("2026-05-04"),
    orderId: "ORD-001",
    buyerId: "BUY-001",
    transactionType: "payment",
    grossAmount: 100,
    netAmount: 90,
    earnings: 20,
    affiliate: "testAffiliate",
    productName: "Slimjara",
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

describe("computeAffiliateRankings", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-04T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("STAT-01: window anchored to wall clock (today), not dataset maxDate", () => {
    const row = makeRow({
      date: new Date("2026-04-30T10:00:00Z"),
      affiliate: "testAffiliate",
      upsellNo: 0,
    });
    const rankings = computeAffiliateRankings([row]);
    const info = rankings.get("testAffiliate")!;
    expect(info.windowEnd).toBe("2026-05-04");
  });

  it("STAT-01: affiliate who sold yesterday is not Inativo", () => {
    const row = makeRow({
      date: new Date("2026-05-03T10:00:00Z"),
      affiliate: "testAffiliate",
      upsellNo: 0,
    });
    const rankings = computeAffiliateRankings([row]);
    const info = rankings.get("testAffiliate")!;
    expect(info.ranking).toBe("Em Rampa");
  });

  it("STAT-02: affiliate with last front sale 6 days ago is Inativo", () => {
    const row = makeRow({
      date: new Date("2026-04-28T10:00:00Z"),
      affiliate: "testAffiliate",
      upsellNo: 0,
    });
    const rankings = computeAffiliateRankings([row]);
    const info = rankings.get("testAffiliate")!;
    expect(info.ranking).toBe("Inativo");
  });

  it("STAT-02: affiliate with last front sale 4 days ago is Em Rampa", () => {
    const row = makeRow({
      date: new Date("2026-04-30T10:00:00Z"),
      affiliate: "testAffiliate",
      upsellNo: 0,
    });
    const rankings = computeAffiliateRankings([row]);
    const info = rankings.get("testAffiliate")!;
    expect(info.ranking).toBe("Em Rampa");
  });

  it("STAT-02: Tier 1 affiliate immune to 5-day rule", () => {
    // Window is 2026-04-28 to 2026-05-04 (pinned today = 2026-05-04)
    // Tier 1 requires gross >= 15000 on all 7 window days
    // Last FRONT sale (upsellNo=0) is on 2026-04-28 (6 days ago, > 5 days)
    // Days 2026-04-29 to 2026-05-04 have upsell-only sales (upsellNo=1)
    const rows: TransactionRow[] = [];
    // Day 1 (Apr 28): front sale with high gross
    rows.push(makeRow({
      date: new Date(Date.UTC(2026, 3, 28, 10, 0, 0)),
      affiliate: "tierAffiliate",
      grossAmount: 16000,
      upsellNo: 0,
    }));
    // Days 2-7 (Apr 29 - May 4): upsell sales with high gross
    for (let i = 1; i < 7; i++) {
      rows.push(makeRow({
        date: new Date(Date.UTC(2026, 3, 28 + i, 10, 0, 0)),
        affiliate: "tierAffiliate",
        grossAmount: 16000,
        upsellNo: 1, // upsell — does NOT count as front sale
      }));
    }
    const rankings = computeAffiliateRankings(rows);
    const info = rankings.get("tierAffiliate")!;
    // Tier 1 should NOT be overridden to Inativo despite last front sale being > 5 days ago
    expect(info.ranking).toBe("Tier 1");
  });

  it("STAT-03: refund-only affiliate appears as Inativo", () => {
    const refundRow = makeRow({
      date: new Date("2026-05-01T10:00:00Z"),
      affiliate: "refundOnly",
      transactionType: "refund",
      upsellNo: 0,
    });
    // Need at least one payment row for another affiliate so payRows is non-empty
    const paymentRow = makeRow({
      date: new Date("2026-05-03T10:00:00Z"),
      affiliate: "normalAffiliate",
      transactionType: "payment",
      upsellNo: 0,
    });
    const rankings = computeAffiliateRankings([refundRow, paymentRow]);
    expect(rankings.has("refundOnly")).toBe(true);
    expect(rankings.get("refundOnly")!.ranking).toBe("Inativo");
  });
});

describe("classifyUpsellProduct", () => {
  it("DATA-03: 'down10 Slimjara' returns 'other' not 'down1'", () => {
    expect(classifyUpsellProduct("down10 Slimjara")).toBe("other");
  });

  it("DATA-03: 'down1 Slimjara' still returns 'down1'", () => {
    expect(classifyUpsellProduct("down1 Slimjara")).toBe("down1");
  });

  it("DATA-03: 'down 1 Slimjara' still returns 'down1'", () => {
    expect(classifyUpsellProduct("down 1 Slimjara")).toBe("down1");
  });

  it("DATA-03: 'up10' returns 'other' not 'up1'", () => {
    expect(classifyUpsellProduct("up10")).toBe("other");
  });

  it("DATA-03: 'up1 Slimjara' still returns 'up1'", () => {
    expect(classifyUpsellProduct("up1 Slimjara")).toBe("up1");
  });

  it("DATA-03: 'up 2 Slimjara' returns 'up2'", () => {
    expect(classifyUpsellProduct("up 2 Slimjara")).toBe("up2");
  });
});

describe("computeAffiliateUpsells — AOV contribution", () => {
  it("DATA-02: aovContribution uses grossAmount (VAT-inclusive) to match Digistore24", () => {
    const rows: TransactionRow[] = [
      // Front sale
      makeRow({ affiliate: "aff1", upsellNo: 0, grossAmount: 100, netAmount: 80 }),
      // Upsell
      makeRow({ affiliate: "aff1", upsellNo: 1, grossAmount: 50, netAmount: 40, productName: "Up1 Slimjara" }),
    ];
    const result = computeAffiliateUpsells(rows, "aff1");
    // aovContribution should be gross(50) / frontSalesCount(1) = 50 (VAT-inclusive, aligned with Digistore24)
    expect(result.upsells[0].aovContribution).toBe(50);
  });
});

describe("computePeriod — Valor Líquido por kit (bundle: front + upsells mergeado)", () => {
  // Custo de capital (§8.1): grossAmount × 0,10 × (60/365) × 0,20 ≈ 0,3288% por pagamento
  // front 294 → −0,9666 · upsell 288 → −0,9468 · upsell 90 → −0,2959
  it("BND-01: lucro de upsell é atribuído ao kit front via orderId (3 colunas)", () => {
    const rows: TransactionRow[] = [
      makeRow({ orderId: "O1", upsellNo: 0, productName: "M3 - Slimjara - 6 Bottles", country: "DE", earnings: 40, grossAmount: 294 }),
      makeRow({ orderId: "O1", upsellNo: 1, productName: "UP3 - Slimjara - 12 Bottles", earnings: 100, grossAmount: 288 }),
    ];
    const m = computeFromFiltered(rows);
    const kit = m.bundlePerformance.find((b) => b.bundle === "M3 - Slimjara - 6 Bottles")!;
    // front: 40 − (6×3,26 + frete z1@6 9,42) − capital 0,9666 = 10,0534
    expect(kit.valorLiq).toBeCloseTo(10.05, 2);
    // upsell: 100 − (12×3,26) − capital 0,9468 = 59,9332 (sem frete — mesmo pacote)
    expect(kit.valorLiqUpsell).toBeCloseTo(59.93, 2);
    // total mergeado = front + upsell
    expect(kit.valorLiqTotal).toBeCloseTo(69.99, 2);
    expect(m.bundleUpsellUnattributed).toBeCloseTo(0, 2);
  });

  it("BND-02: upsell sem front reconhecido no período vai para o bucket não-atribuído", () => {
    const rows: TransactionRow[] = [
      makeRow({ orderId: "O9", upsellNo: 1, productName: "UP1 Slimjara 3 Bottles", earnings: 50, grossAmount: 90 }),
    ];
    const m = computeFromFiltered(rows);
    // sem front → nenhuma linha de kit
    expect(m.bundlePerformance.length).toBe(0);
    // 50 − (3×3,26) − capital 0,2959 = 39,9241
    expect(m.bundleUpsellUnattributed).toBeCloseTo(39.92, 2);
  });

  it("BND-03: refund de upsell reduz o valorLiqUpsell do kit atribuído (sem reverter capital)", () => {
    const rows: TransactionRow[] = [
      makeRow({ orderId: "O1", upsellNo: 0, productName: "M3 - Slimjara - 6 Bottles", country: "DE", earnings: 40, grossAmount: 294 }),
      makeRow({ orderId: "O1", upsellNo: 1, productName: "UP3 - Slimjara - 12 Bottles", earnings: 100, grossAmount: 288 }),
      makeRow({ orderId: "O1", upsellNo: 1, productName: "UP3 - Slimjara - 12 Bottles", transactionType: "refund", earnings: -30, grossAmount: 30 }),
    ];
    const m = computeFromFiltered(rows);
    const kit = m.bundlePerformance.find((b) => b.bundle === "M3 - Slimjara - 6 Bottles")!;
    // upsell: (100 − 39,12 − 0,9468) + (−30) = 29,9332
    expect(kit.valorLiqUpsell).toBeCloseTo(29.93, 2);
    // total: 10,0534 + 29,9332 = 39,9866
    expect(kit.valorLiqTotal).toBeCloseTo(39.99, 2);
  });

  it("BND-04: orderId vazio NÃO atribui upsell a um front de orderId vazio (evita misatribuição)", () => {
    const rows: TransactionRow[] = [
      makeRow({ orderId: "", upsellNo: 0, productName: "M3 - Slimjara - 6 Bottles", country: "DE", earnings: 40, grossAmount: 294 }),
      makeRow({ orderId: "", upsellNo: 1, productName: "UP3 - Slimjara - 12 Bottles", earnings: 100, grossAmount: 288 }),
    ];
    const m = computeFromFiltered(rows);
    const kit = m.bundlePerformance.find((b) => b.bundle === "M3 - Slimjara - 6 Bottles")!;
    // kit front existe normalmente
    expect(kit.valorLiq).toBeCloseTo(10.05, 2);
    // upsell de orderId vazio NÃO é atribuído ao kit — vai para o bucket
    expect(kit.valorLiqUpsell).toBeCloseTo(0, 2);
    expect(m.bundleUpsellUnattributed).toBeCloseTo(59.93, 2);
  });
});

describe("computePeriod — Custo de capital + provisão (§8.1)", () => {
  it("CAP-01: valorLiq global desconta capital sobre o gross de cada pagamento", () => {
    const rows: TransactionRow[] = [
      makeRow({ upsellNo: 0, productName: "M3 - Slimjara - 6 Bottles", country: "DE", earnings: 40, grossAmount: 294 }),
    ];
    const m = computeFromFiltered(rows);
    // capitalCost = 294 × 0,10 × (60/365) × 0,20 = 0,9666
    expect(m.capitalCost).toBeCloseTo(0.97, 2);
    // Tier 2 (data 2026-05-04): valorLiq = 40 − 19,56 (produto) − 8,60 (frete) − 0,82 (taxas) − 0,9666 (capital) = 10,0534
    expect(m.valorLiq).toBeCloseTo(10.05, 2);
    // reconciliação exata do breakdown (inclui taxas de fulfillment)
    expect(m.valorLiq).toBeCloseTo(m.earnings - m.productCost - m.shippingCost - m.fulfillmentFees - m.capitalCost, 6);
  });

  it("CAP-02: por afiliado desconta capital e reconcilia com o global", () => {
    const rows: TransactionRow[] = [
      makeRow({ affiliate: "affX", upsellNo: 0, productName: "M3 - Slimjara - 6 Bottles", country: "DE", earnings: 40, grossAmount: 294 }),
      makeRow({ affiliate: "affX", upsellNo: 1, productName: "UP3 - Slimjara - 12 Bottles", earnings: 100, grossAmount: 288 }),
    ];
    const m = computeFromFiltered(rows);
    const aff = m.topAffiliates.find((a) => a.name === "affX")!;
    // front 10,0534 + upsell 59,9332 = 69,9866
    expect(aff.valorLiq).toBeCloseTo(69.99, 2);
    expect(aff.valorLiq).toBeCloseTo(m.valorLiq, 6);
  });

  it("CAP-03: refund/CB não gera nem reverte custo de capital", () => {
    const rows: TransactionRow[] = [
      makeRow({ upsellNo: 0, productName: "M3 - Slimjara - 6 Bottles", country: "DE", earnings: 40, grossAmount: 294 }),
      makeRow({ transactionType: "refund", upsellNo: 0, productName: "M3 - Slimjara - 6 Bottles", country: "DE", earnings: -40, grossAmount: 294 }),
    ];
    const m = computeFromFiltered(rows);
    // capital só do pagamento (294), não do refund
    expect(m.capitalCost).toBeCloseTo(0.97, 2);
  });
});

describe("detectBottles — bundles 'N+M' (LipoGandha/LipoSkin Kostenlos)", () => {
  it("BOT-01: '3+3 Kostenlos' soma para 6 frascos", () => {
    expect(detectBottles("UP4 - LipoGandha 3+3 Kostenlos")).toBe(6);
    expect(detectBottles("DW3 - LipoSkin 3+3 Kostenlos")).toBe(6);
  });

  it("BOT-02: '2F+1K' soma para 3 frascos", () => {
    expect(detectBottles("UP5 - LipoGandha 2F+1K")).toBe(3);
  });

  it("BOT-03: nomes sem '+' continuam corretos (regressão)", () => {
    expect(detectBottles("UP3 - Slimjara 12 Bottles")).toBe(12);
    expect(detectBottles("UP1(2) - Slimjara 6 Bottles")).toBe(6);
    expect(detectBottles("M3 - Slimjara 6B")).toBe(6);
    expect(detectBottles("UP8 - LipoGandha 2 Bottles")).toBe(2);
    expect(detectBottles("UP_3 - LipoSkin 2 Flaschen")).toBe(2);
    expect(detectBottles("Slimjara")).toBe(1);
  });
});
