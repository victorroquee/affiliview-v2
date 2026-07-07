import { describe, it, expect } from "vitest";
import { computeFromFiltered, computeIntradayGross } from "./transactions";
import type { TransactionRow } from "./transactions";

function row(o: Partial<TransactionRow>): TransactionRow {
  return {
    date: new Date("2026-05-04T10:00:00Z"), // ≥ 2025-12-01 → Tier 2
    orderId: "O1", buyerId: "B1", transactionType: "payment",
    grossAmount: 100, netAmount: 90, earnings: 20,
    affiliate: "aff", productName: "Slimjara 1 Bottle", productGroup: "",
    country: "DE", quantity: 1, upsellNo: 0, affiliateAmount: 0, vatAmount: 10, productId: "",
    ...o,
  };
}

// Cenário base: 1 front 6-frascos DE + 1 upsell 12-frascos (mesmo pedido) + 1 front 3-frascos PT (outro dia)
const scenario: TransactionRow[] = [
  row({ orderId: "O1", upsellNo: 0, productName: "M3 - Slimjara - 6 Bottles", country: "DE", earnings: 40, grossAmount: 294, date: new Date("2026-05-04T10:00:00Z") }),
  row({ orderId: "O1", upsellNo: 1, productName: "UP3 - Slimjara - 12 Bottles", earnings: 100, grossAmount: 288, date: new Date("2026-05-04T12:00:00Z") }),
  row({ orderId: "O2", upsellNo: 0, productName: "M1 - Slimjara - 3 Bottles", country: "PT", earnings: 30, grossAmount: 150, date: new Date("2026-05-05T09:00:00Z") }),
];

describe("Custos Operacionais — potes vendidos", () => {
  it("COST-01: bottlesSold soma frascos físicos de front + upsell", () => {
    const m = computeFromFiltered(scenario);
    expect(m.bottlesSold).toBe(6 + 12 + 3);
  });

  it("COST-01b: bundle 3+3 conta 6 frascos físicos", () => {
    const m = computeFromFiltered([row({ productName: "UP4 - LipoGandha 3+3 Kostenlos", upsellNo: 1 })]);
    expect(m.bottlesSold).toBe(6);
  });
});

describe("Custos Operacionais — pedidos únicos (frete pago)", () => {
  it("COST-02: uniqueShippedOrders conta orderIds distintos só de front", () => {
    const m = computeFromFiltered(scenario);
    expect(m.uniqueShippedOrders).toBe(2); // O1, O2 (upsell não conta)
  });

  it("COST-02b: dois fronts do mesmo orderId contam como 1 pedido", () => {
    const m = computeFromFiltered([
      row({ orderId: "OX", upsellNo: 0, productName: "Slimjara 1 Bottle" }),
      row({ orderId: "OX", upsellNo: 0, productName: "Slimjara 1 Bottle" }),
    ]);
    expect(m.uniqueShippedOrders).toBe(1);
  });
});

describe("Custos Operacionais — taxas de fulfillment (Tier 2)", () => {
  it("COST-03: fulfillmentFees = embalagem + processing só de fronts", () => {
    const m = computeFromFiltered(scenario);
    // front 6-frascos: 0,35 + 0,47 = 0,82 ; front 3-frascos: 0,23 + 0,47 = 0,70 ; upsell: 0
    expect(m.packagingCost).toBeCloseTo(0.35 + 0.23, 2);
    expect(m.processingCost).toBeCloseTo(0.47 + 0.47, 2);
    expect(m.fulfillmentFees).toBeCloseTo(1.52, 2);
  });

  it("COST-03b: antes de 2025-12-01 não há taxas de fulfillment", () => {
    const legacy = scenario.map((t) => ({ ...t, date: new Date("2025-06-15T10:00:00Z") }));
    const m = computeFromFiltered(legacy);
    expect(m.fulfillmentFees).toBe(0);
    expect(m.packagingCost).toBe(0);
    expect(m.processingCost).toBe(0);
  });
});

describe("Custos Operacionais — reconciliação do Valor Líquido com taxas", () => {
  it("COST-04: valorLiq = earnings − produto − frete − taxas − capital", () => {
    const m = computeFromFiltered(scenario);
    expect(m.valorLiq).toBeCloseTo(
      m.earnings - m.productCost - m.shippingCost - m.fulfillmentFees - m.capitalCost,
      6
    );
  });
});

describe("Timeline intradiária (gross por hora)", () => {
  const at = (hour: number) => new Date(Date.UTC(2026, 4, 4, hour, 30, 0)); // 2026-05-04 HH:30

  it("INTRA-01: dia passado → 24 horas (00h..23h) com valores nas horas certas", () => {
    const rows = [
      row({ grossAmount: 100, timestamp: at(8) }),
      row({ grossAmount: 250, timestamp: at(14) }),
    ];
    const s = computeIntradayGross(rows, new Date("2026-06-01T09:00:00Z")); // outro dia → não é hoje
    expect(s).toHaveLength(24);
    expect(s.find((x) => x.date === "08h")!.value).toBe(100);
    expect(s.find((x) => x.date === "14h")!.value).toBe(250);
    expect(s.find((x) => x.date === "09h")!.value).toBe(0);
  });

  it("INTRA-02: hoje → estende até a hora atual", () => {
    const rows = [row({ grossAmount: 50, timestamp: at(3) })];
    const s = computeIntradayGross(rows, new Date("2026-05-04T10:00:00Z")); // hoje, hora 10
    expect(s).toHaveLength(11); // 00h..10h
    expect(s[s.length - 1]!.date).toBe("10h");
    expect(s.find((x) => x.date === "03h")!.value).toBe(50);
  });

  it("INTRA-03: hoje → nunca trunca dados além da hora atual", () => {
    const rows = [row({ grossAmount: 70, timestamp: at(20) })];
    const s = computeIntradayGross(rows, new Date("2026-05-04T10:00:00Z")); // hora 10, mas há dado às 20h
    expect(s).toHaveLength(21); // 00h..20h
    expect(s.find((x) => x.date === "20h")!.value).toBe(70);
  });

  it("INTRA-04: refunds não entram; fallback para date quando sem timestamp", () => {
    const rows = [
      row({ grossAmount: 100, transactionType: "refund", timestamp: at(8) }),
      row({ grossAmount: 40, date: new Date("2026-05-04T00:00:00Z") }), // sem timestamp → hora 0
    ];
    const s = computeIntradayGross(rows, new Date("2026-06-01T00:00:00Z"));
    expect(s.find((x) => x.date === "08h")!.value).toBe(0);   // refund ignorado
    expect(s.find((x) => x.date === "00h")!.value).toBe(40);  // fallback date → 00h
  });
});

describe("Custos Operacionais — breakdown diário", () => {
  it("COST-05: dailyCosts agrega por dia (pedidos, potes, COGS, frete, taxas, total)", () => {
    const m = computeFromFiltered(scenario);
    const d0504 = m.dailyCosts.find((d) => d.date === "2026-05-04")!;
    const d0505 = m.dailyCosts.find((d) => d.date === "2026-05-05")!;

    expect(d0504.orders).toBe(1);
    expect(d0504.bottles).toBe(6 + 12);
    expect(d0504.productCost).toBeCloseTo(19.56 + 39.12, 2);
    expect(d0504.shipping).toBeCloseTo(8.60, 2);       // z1@6 Tier 2
    expect(d0504.fulfillmentFees).toBeCloseTo(0.82, 2);
    expect(d0504.totalCost).toBeCloseTo(19.56 + 39.12 + 8.60 + 0.82, 2);

    expect(d0505.orders).toBe(1);
    expect(d0505.bottles).toBe(3);
    expect(d0505.shipping).toBeCloseTo(9.44, 2);        // z2@3 Tier 2
  });

  it("COST-05b: Σ dailyCosts reconcilia com os totais do período", () => {
    const m = computeFromFiltered(scenario);
    const sum = (k: "totalCost" | "shipping" | "fulfillmentFees" | "productCost" | "bottles" | "orders") =>
      m.dailyCosts.reduce((s, d) => s + d[k], 0);
    expect(sum("shipping")).toBeCloseTo(m.shippingCost, 6);
    expect(sum("fulfillmentFees")).toBeCloseTo(m.fulfillmentFees, 6);
    expect(sum("productCost")).toBeCloseTo(m.productCost, 6);
    expect(sum("bottles")).toBe(m.bottlesSold);
    expect(sum("orders")).toBe(m.uniqueShippedOrders);
    expect(sum("totalCost")).toBeCloseTo(m.productCost + m.shippingCost + m.fulfillmentFees, 6);
  });
});
