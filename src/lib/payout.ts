import type { TransactionRow } from "./transactions";
import { isPayment, isRefund, isChargeback } from "./transactions";

// ─── Regras de payout Digistore24 (ver logica/payout_semanal.md) ──────────────
export const RESERVE_PCT = 0.10;          // 10% retido como reserva
export const RESERVE_DAYS = 60;           // reserva liberada em D+60
export const CLEARING_DAYS = 14;          // 90% liberado em D+14 (modelo D14)
export const PAYOUT_WEEKDAY = 5;          // sexta-feira (getUTCDay: 0=Dom .. 5=Sex)
export const MAX_PAYOUTS_PER_MONTH = 4;   // até 4 saques por mês (5ª sexta pulada)

// ─── Tipos ────────────────────────────────────────────────────────────────────
export interface PayoutEvent {
  date: Date;                       // dia (meia-noite UTC) em que o valor afeta o saldo
  amount: number;                   // + libera saldo, − reduz (refund/CB)
  kind: "clear" | "reserve" | "refund";
  orderId: string;
  sourceDate: string;               // data da transação de origem (YYYY-MM-DD)
}

export interface PayoutWeek {
  payoutDate: string;               // sexta do saque (YYYY-MM-DD)
  windowStart: string;              // início da janela varrida (info)
  cleared: number;                  // Σ liberações de 90% (D+14) na janela
  reserveReleased: number;          // Σ liberações de reserva 10% (D+60) na janela
  refunds: number;                  // Σ refunds/CB (≤ 0) na janela
  expectedPayout: number;           // cleared + reserveReleased + refunds
  salesCleared: number;             // nº de liberações de venda na janela (info)
}

export interface PayoutSchedule {
  weeks: PayoutWeek[];
  pendingReserve: number;           // reserva ainda retida (D+60 > asOf)
  pendingClearing: number;          // 90% ainda em clearing (D+14 > asOf)
  skippedFridays: string[];         // sextas puladas pelo cap de 4/mês
  nextPayoutDate: string | null;    // próxima sexta ativa > asOf
  nextPayoutAmount: number;         // payout esperado na próxima sexta
  totalExpected: number;            // Σ das semanas
  asOf: string;                     // data de referência (YYYY-MM-DD)
}

// ─── Helpers de data (UTC, granularidade de dia) ──────────────────────────────
function atMidnightUTC(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}
function addDaysUTC(d: Date, n: number): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + n));
}
function key(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// ─── Eventos de saldo ─────────────────────────────────────────────────────────
export function buildPayoutEvents(rows: TransactionRow[]): PayoutEvent[] {
  const events: PayoutEvent[] = [];
  for (const t of rows) {
    if (isPayment(t)) {
      const src = key(t.date);
      events.push({
        date: addDaysUTC(t.date, CLEARING_DAYS),
        amount: (1 - RESERVE_PCT) * t.earnings,
        kind: "clear", orderId: t.orderId, sourceDate: src,
      });
      events.push({
        date: addDaysUTC(t.date, RESERVE_DAYS),
        amount: RESERVE_PCT * t.earnings,
        kind: "reserve", orderId: t.orderId, sourceDate: src,
      });
    } else if (isRefund(t) || isChargeback(t)) {
      events.push({
        date: atMidnightUTC(t.date),
        amount: t.earnings, // negativo — reduz o saldo na data do estorno
        kind: "refund", orderId: t.orderId, sourceDate: key(t.date),
      });
    }
  }
  return events;
}

// ─── Sextas de saque com cap de 4/mês ─────────────────────────────────────────
// active = a Nª sexta do mês, com N ≤ 4. O ordinal é derivado do dia do mês
// (floor((dia−1)/7)) → independe de onde a janela começa.
export function listPayoutFridays(start: Date, end: Date): { date: string; active: boolean }[] {
  const res: { date: string; active: boolean }[] = [];
  let cur = atMidnightUTC(start);
  const endT = atMidnightUTC(end).getTime();
  while (cur.getTime() <= endT) {
    if (cur.getUTCDay() === PAYOUT_WEEKDAY) {
      const ordinal = Math.floor((cur.getUTCDate() - 1) / 7); // 0-based Nª sexta do mês
      res.push({ date: key(cur), active: ordinal < MAX_PAYOUTS_PER_MONTH });
    }
    cur = addDaysUTC(cur, 1);
  }
  return res;
}

// ─── Schedule semanal ─────────────────────────────────────────────────────────
export function computePayoutSchedule(
  rows: TransactionRow[],
  opts?: { asOf?: Date }
): PayoutSchedule {
  const asOf = opts?.asOf ?? new Date();
  const asOfKey = key(asOf);
  const events = buildPayoutEvents(rows);

  if (events.length === 0) {
    return {
      weeks: [], pendingReserve: 0, pendingClearing: 0, skippedFridays: [],
      nextPayoutDate: null, nextPayoutAmount: 0, totalExpected: 0, asOf: asOfKey,
    };
  }

  let minT = events[0]!.date.getTime();
  let maxT = minT;
  for (const e of events) {
    const t = e.date.getTime();
    if (t < minT) minT = t;
    if (t > maxT) maxT = t;
  }
  const rangeStart = new Date(minT);
  // +10 dias além do maior entre último evento e asOf → garante capturar a próxima sexta
  const rangeEnd = new Date(Math.max(maxT, asOf.getTime()) + 10 * 86400000);

  const fridays = listPayoutFridays(rangeStart, rangeEnd);
  const activeFridays = fridays.filter((f) => f.active).map((f) => f.date);
  const skippedFridays = fridays.filter((f) => !f.active).map((f) => f.date);

  // primeira sexta ATIVA ≥ dia do evento (sextas puladas rolam para a próxima ativa)
  const assignFriday = (evKey: string): string | null => {
    for (const f of activeFridays) if (f >= evKey) return f;
    return null;
  };

  const weekMap = new Map<string, PayoutWeek>();
  const getWeek = (fri: string): PayoutWeek => {
    let w = weekMap.get(fri);
    if (!w) {
      w = {
        payoutDate: fri, windowStart: key(addDaysUTC(new Date(fri + "T00:00:00Z"), -6)),
        cleared: 0, reserveReleased: 0, refunds: 0, expectedPayout: 0, salesCleared: 0,
      };
      weekMap.set(fri, w);
    }
    return w;
  };

  for (const e of events) {
    const fri = assignFriday(key(e.date));
    if (!fri) continue;
    const w = getWeek(fri);
    if (e.kind === "clear") { w.cleared += e.amount; w.salesCleared += 1; }
    else if (e.kind === "reserve") w.reserveReleased += e.amount;
    else w.refunds += e.amount;
    w.expectedPayout = w.cleared + w.reserveReleased + w.refunds;
  }

  const weeks = Array.from(weekMap.values()).sort((a, b) => a.payoutDate.localeCompare(b.payoutDate));

  let pendingReserve = 0;
  let pendingClearing = 0;
  for (const e of events) {
    if (key(e.date) > asOfKey) {
      if (e.kind === "reserve") pendingReserve += e.amount;
      else if (e.kind === "clear") pendingClearing += e.amount;
    }
  }

  const nextPayoutDate = activeFridays.find((f) => f > asOfKey) ?? null;
  const nextPayoutAmount = nextPayoutDate ? (weekMap.get(nextPayoutDate)?.expectedPayout ?? 0) : 0;
  const totalExpected = weeks.reduce((s, w) => s + w.expectedPayout, 0);

  return {
    weeks, pendingReserve, pendingClearing, skippedFridays,
    nextPayoutDate, nextPayoutAmount, totalExpected, asOf: asOfKey,
  };
}
