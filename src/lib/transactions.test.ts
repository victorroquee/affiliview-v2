import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { computeAffiliateRankings } from "./transactions";
import type { TransactionRow } from "./transactions";

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
    // Create 7 rows for tierAffiliate, one per day from 2026-04-22 to 2026-04-28
    // (all > 5 days ago from pinned today 2026-05-04)
    // Each with grossAmount=16000 to qualify for Tier 1 (>=15000 per day, 7 consecutive)
    const rows: TransactionRow[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(Date.UTC(2026, 3, 22 + i, 10, 0, 0));
      rows.push(makeRow({
        date: d,
        affiliate: "tierAffiliate",
        grossAmount: 16000,
        upsellNo: 0,
      }));
    }
    const rankings = computeAffiliateRankings(rows);
    const info = rankings.get("tierAffiliate")!;
    // Tier 1 should NOT be overridden to Inativo despite last sale being > 5 days ago
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
