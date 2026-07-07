import { describe, it, expect } from "vitest";
import { analyzeCPA } from "./analyzeCPA";
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
    affiliate: "affX",
    productName: "M2 - Slimjara - 3 Bottles",
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

describe("analyzeCPA — COGS alinhado com costTable (fonte única)", () => {
  it("CPA-01: front 3 frascos usa Tier 2 da costTable (frete 8,60 z1 + taxas)", () => {
    const rows = [makeRow({ productName: "M2 - Slimjara - 3 Bottles", country: "DE" })];
    const r = analyzeCPA(rows, 0);
    const v = r[0]!.variants.find((x) => x.variant === 2)!;
    // Tier 2 (fonte única, tarifas atuais): 3 × 3,26 + 8,60 + 0,23 + 0,47 = 19,08
    expect(v.frontCogsPer).toBeCloseTo(19.08, 2);
  });

  it("CPA-02: front usa custo por produto (Liposkin 3,64/frasco) + Tier 2", () => {
    const rows = [makeRow({ productName: "M2 - Liposkin - 3 Bottles", country: "DE" })];
    const r = analyzeCPA(rows, 0);
    const v = r[0]!.variants.find((x) => x.variant === 2)!;
    // Tier 2: 3 × 3,64 + 8,60 + 0,23 + 0,47 = 20,22
    expect(v.frontCogsPer).toBeCloseTo(20.22, 2);
  });

  it("CPA-03: upsell tem COGS só de produto — sem frete (mesmo pacote do front)", () => {
    const rows = [
      makeRow({ productName: "M3 - Slimjara - 6 Bottles", upsellNo: 0 }),
      makeRow({ productName: "UP3 - Slimjara - 12 Bottles", upsellNo: 1 }),
    ];
    const r = analyzeCPA(rows, 0);
    const v = r[0]!.variants.find((x) => x.variant === 3)!;
    // 12 × 3,26 = 39,12 (antes: 48,72 com frete embutido)
    expect(v.upsellCogsPer).toBeCloseTo(39.12, 2);
  });

  it("CPA-04: upsell 'N+M Kostenlos' conta frascos pagos + grátis", () => {
    const rows = [
      makeRow({ productName: "M3 - Slimjara - 6 Bottles", upsellNo: 0 }),
      makeRow({ productName: "UP4 - LipoGandha 3+3 Kostenlos", upsellNo: 1 }),
    ];
    const r = analyzeCPA(rows, 0);
    const v = r[0]!.variants.find((x) => x.variant === 3)!;
    // 6 × 3,26 = 19,56 (antes: 3 frascos detectados → 19,08 com frete)
    expect(v.upsellCogsPer).toBeCloseTo(19.56, 2);
  });
});
