import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { Users } from "lucide-react";
import EmptyState from "./EmptyState";
import HeroStat from "./HeroStat";
import RefreshStatus from "./RefreshStatus";
import HeaderClock from "./HeaderClock";
import DateRangePicker from "./DateRangePicker";
import Payout from "../pages/Payout";
import ConferenciaVL from "../pages/ConferenciaVL";
import ConferenciaCPA from "../pages/ConferenciaCPA";
import type { PayoutSchedule } from "../lib/payout";
import type { TransactionRow } from "../lib/transactions";

afterEach(cleanup);

const noop = () => {};
const row = (o: Partial<TransactionRow>): TransactionRow => ({
  date: new Date("2026-05-04T10:00:00Z"), orderId: "O1", buyerId: "B1", transactionType: "payment",
  grossAmount: 294, netAmount: 274, earnings: 40, affiliate: "aff", productName: "M3 - Slimjara - 6 Bottles",
  productGroup: "", country: "DE", quantity: 1, upsellNo: 0, affiliateAmount: 20, vatAmount: 20, productId: "", ...o,
});

describe("smoke: componentes novos renderizam sem crash", () => {
  it("componentes leaf", () => {
    expect(() => render(<EmptyState loading={false} />)).not.toThrow();
    expect(() => render(<HeroStat icon={Users} label="X" value="1" sub="s" color="green" />)).not.toThrow();
    expect(() => render(<RefreshStatus refreshing={false} lastFetched={null} error={null} onRefresh={noop} />)).not.toThrow();
    expect(() => render(<HeaderClock nextPayoutDate="2026-07-10" nextPayoutAmount={100} pendingReserve={1} pendingClearing={2} onOpenPayout={noop} />)).not.toThrow();
    expect(() => render(<DateRangePicker from="" to="" onApply={noop} onAll={noop} onClose={noop} />)).not.toThrow();
  });

  it("HeaderClock com payout nulo não quebra", () => {
    expect(() => render(<HeaderClock nextPayoutDate={null} nextPayoutAmount={0} pendingReserve={0} pendingClearing={0} onOpenPayout={noop} />)).not.toThrow();
  });

  it("Payout: schedule vazio → estado vazio; com semana → tabela", () => {
    const empty: PayoutSchedule = { weeks: [], pendingReserve: 0, pendingClearing: 0, skippedFridays: [], nextPayoutDate: null, nextPayoutAmount: 0, totalExpected: 0, asOf: "2026-07-07" };
    expect(() => render(<Payout schedule={empty} loading={false} />)).not.toThrow();
    cleanup();
    const withWeek: PayoutSchedule = { ...empty, weeks: [{ payoutDate: "2026-07-10", windowStart: "2026-07-04", cleared: 900, reserveReleased: 100, refunds: -50, expectedPayout: 950, salesCleared: 12 }], nextPayoutDate: "2026-07-10", nextPayoutAmount: 950, totalExpected: 950 };
    expect(() => render(<Payout schedule={withWeek} loading={false} />)).not.toThrow();
  });

  it("Conferências renderizam com dados", () => {
    const rows = [row({}), row({ orderId: "O1", upsellNo: 1, productName: "UP3 - Slimjara - 12 Bottles", earnings: 100, grossAmount: 288 })];
    expect(() => render(<ConferenciaVL filteredRows={rows} loading={false} />)).not.toThrow();
    cleanup();
    // silencia console de libs durante render
    const spy = vi.spyOn(console, "warn").mockImplementation(noop);
    expect(() => render(<ConferenciaCPA filteredRows={rows} loading={false} />)).not.toThrow();
    spy.mockRestore();
  });
});
