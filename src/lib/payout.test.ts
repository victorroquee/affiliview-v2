import { describe, it, expect } from "vitest";
import { buildPayoutEvents, listPayoutFridays, computePayoutSchedule } from "./payout";
import type { TransactionRow } from "./transactions";

function row(o: Partial<TransactionRow>): TransactionRow {
  return {
    date: new Date("2026-03-02T10:00:00Z"),
    orderId: "O1", buyerId: "B1", transactionType: "payment",
    grossAmount: 100, netAmount: 90, earnings: 100,
    affiliate: "aff", productName: "Slimjara 1 Bottle", productGroup: "",
    country: "DE", quantity: 1, upsellNo: 0, affiliateAmount: 0, vatAmount: 10, productId: "",
    ...o,
  };
}

describe("payout — geração de eventos (D+14 90%, D+60 10%)", () => {
  it("PAY-01: pagamento gera clear (90% em D+14) e reserve (10% em D+60)", () => {
    const evs = buildPayoutEvents([row({ earnings: 1000, date: new Date("2026-03-02T10:00:00Z") })]);
    const clear = evs.find((e) => e.kind === "clear")!;
    const reserve = evs.find((e) => e.kind === "reserve")!;
    expect(clear.amount).toBeCloseTo(900, 6);
    expect(clear.date.toISOString().slice(0, 10)).toBe("2026-03-16"); // +14
    expect(reserve.amount).toBeCloseTo(100, 6);
    expect(reserve.date.toISOString().slice(0, 10)).toBe("2026-05-01"); // +60
  });

  it("PAY-02: refund gera 1 evento negativo na própria data (sem clear/reserve)", () => {
    const evs = buildPayoutEvents([
      row({ transactionType: "refund", earnings: -30, date: new Date("2026-02-10T10:00:00Z") }),
    ]);
    expect(evs).toHaveLength(1);
    expect(evs[0]!.kind).toBe("refund");
    expect(evs[0]!.amount).toBeCloseTo(-30, 6);
    expect(evs[0]!.date.toISOString().slice(0, 10)).toBe("2026-02-10");
  });

  it("PAY-03: upsell também gera clear+reserve (base é earned_amount, não front/upsell)", () => {
    const evs = buildPayoutEvents([row({ upsellNo: 1, earnings: 200 })]);
    expect(evs.filter((e) => e.kind === "clear")[0]!.amount).toBeCloseTo(180, 6);
    expect(evs.filter((e) => e.kind === "reserve")[0]!.amount).toBeCloseTo(20, 6);
  });
});

describe("payout — sextas de saque com cap de 4/mês", () => {
  it("PAY-CAP: maio/2026 tem 5 sextas; a 5ª (29) é pulada", () => {
    const fris = listPayoutFridays(new Date("2026-05-01T00:00:00Z"), new Date("2026-05-31T00:00:00Z"));
    const may = fris.filter((f) => f.date.startsWith("2026-05"));
    expect(may.map((f) => f.date)).toEqual([
      "2026-05-01", "2026-05-08", "2026-05-15", "2026-05-22", "2026-05-29",
    ]);
    expect(may.map((f) => f.active)).toEqual([true, true, true, true, false]);
  });
});

describe("payout — varredura semanal (sexta), sem mínimo", () => {
  it("PAY-10: 90% cai na 1ª sexta ≥ D+14; 10% na sexta = D+60", () => {
    const s = computePayoutSchedule([row({ earnings: 1000, date: new Date("2026-03-02T10:00:00Z") })], {
      asOf: new Date("2026-06-01T00:00:00Z"),
    });
    expect(s.totalExpected).toBeCloseTo(1000, 6);
    const wClear = s.weeks.find((w) => w.cleared > 0)!;
    expect(wClear.payoutDate).toBe("2026-03-20");
    expect(wClear.cleared).toBeCloseTo(900, 6);
    const wRes = s.weeks.find((w) => w.reserveReleased > 0)!;
    expect(wRes.payoutDate).toBe("2026-05-01");
    expect(wRes.reserveReleased).toBeCloseTo(100, 6);
  });

  it("PAY-11: evento numa sexta pulada rola para a próxima sexta ativa", () => {
    // earned 500 em 2026-05-11 → D+14 = 2026-05-25 → 1ª sexta ≥ é 05-29 (pulada) → rola p/ 06-05
    const s = computePayoutSchedule([row({ earnings: 500, date: new Date("2026-05-11T10:00:00Z") })], {
      asOf: new Date("2026-07-01T00:00:00Z"),
    });
    expect(s.weeks.some((w) => w.payoutDate === "2026-05-29")).toBe(false);
    const w = s.weeks.find((w) => w.cleared > 0)!;
    expect(w.payoutDate).toBe("2026-06-05");
    expect(w.cleared).toBeCloseTo(450, 6);
    expect(s.skippedFridays).toContain("2026-05-29");
  });

  it("PAY-12: refund reduz o payout da sexta em que ocorre", () => {
    const s = computePayoutSchedule([
      row({ earnings: 1000, date: new Date("2026-03-02T10:00:00Z") }),
      row({ transactionType: "refund", earnings: -200, date: new Date("2026-03-18T10:00:00Z") }),
    ], { asOf: new Date("2026-06-01T00:00:00Z") });
    // refund 03-18 → 1ª sexta ≥ é 03-20, mesma do clear 900 → 900 − 200 = 700
    const w = s.weeks.find((w) => w.payoutDate === "2026-03-20")!;
    expect(w.refunds).toBeCloseTo(-200, 6);
    expect(w.expectedPayout).toBeCloseTo(700, 6);
  });

  it("PAY-13: pendingReserve e nextPayoutDate respeitam o asOf", () => {
    const s = computePayoutSchedule([row({ earnings: 1000, date: new Date("2026-03-02T10:00:00Z") })], {
      asOf: new Date("2026-04-01T00:00:00Z"),
    });
    // reserve (10% = 100) libera em 2026-05-01 > asOf → ainda retida
    expect(s.pendingReserve).toBeCloseTo(100, 6);
    // próxima sexta ativa após 2026-04-01
    expect(s.nextPayoutDate).toBe("2026-04-03");
  });

  it("PAY-14: expectedPayout = cleared + reserveReleased + refunds por semana", () => {
    const s = computePayoutSchedule([row({ earnings: 1000, date: new Date("2026-03-02T10:00:00Z") })], {
      asOf: new Date("2026-06-01T00:00:00Z"),
    });
    for (const w of s.weeks) {
      expect(w.expectedPayout).toBeCloseTo(w.cleared + w.reserveReleased + w.refunds, 6);
    }
  });
});
