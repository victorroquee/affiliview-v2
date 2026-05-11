---
phase: 08-auditoria-de-divergencia-digistore24-vs-affiliview
fixed_at: 2026-04-28T00:00:00Z
review_path: .planning/phases/08-auditoria-de-divergencia-digistore24-vs-affiliview/08-REVIEW.md
iteration: 1
findings_in_scope: 6
fixed: 6
skipped: 0
status: all_fixed
---

# Phase 08: Code Review Fix Report

**Fixed at:** 2026-04-28T00:00:00Z
**Source review:** .planning/phases/08-auditoria-de-divergencia-digistore24-vs-affiliview/08-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 6
- Fixed: 6
- Skipped: 0

## Fixed Issues

### CR-01: API request omits "return" and "reversal" transaction types

**Files modified:** `src/hooks/useDigistoreAPI.ts`
**Commit:** 0910e6f
**Applied fix:** Added `return` and `reversal` to the `search[transaction_type]` parameter string. The value changed from `"payment,sale,upsell,refund,chargeback"` to `"payment,sale,upsell,refund,return,reversal,chargeback"`. This ensures all refund-class transaction types that the normalizer handles are actually fetched from the API.

---

### CR-02: `earningsFront` deducts refunds/CB for ALL upsell_no values — Valor Liquido understated

**Files modified:** `src/lib/transactions.ts`
**Commit:** 226ddda
**Applied fix:** Introduced `frontRefCbForEarnings = refCbTxs.filter((t) => t.upsellNo === 0)` before the `earningsFront` computation and used it in place of the full `refCbTxs`. Upsell refunds (upsellNo >= 1) no longer reduce a base that never included upsell earnings, correcting the understatement of `valorLiq` when upsell refunds exist. `earningsKPI` was already correct and is unchanged.

---

### CR-03: `gross_revenue.md` "Origem e Extracao" contradicts the implementation

**Files modified:** `logica/gross_revenue.md`
**Commit:** ad45576
**Applied fix:** Updated the Filtro line to state that all upsell_no values are included (Phase 8 correction). Updated the Exemplo Pratico table to mark the Upsell row as "Sim (Phase 8 correcao)" and recalculated the example: `Gross Revenue = €150 + €80 + €90 = €320,00`. The document is now internally consistent.

---

### WR-01: `earnings.md` example contradicts the stated formula — upsell excluded in example

**Files modified:** `logica/earnings.md`
**Commit:** ef7cdef
**Applied fix:** Updated the Exemplo Pratico calculation from `€65 + €39 + (-€65) = €39,00` to `€65 + €34 + €39 + (-€65) = €73,00` and replaced the "(upsell de €34 nao incluido)" note with a Phase 8 clarification. The example now matches the formula and the actual code behavior.

---

### WR-02: Misleading `refundAmt` comments in `PeriodMetrics` and `BundleRow`

**Files modified:** `src/lib/transactions.ts`
**Commit:** e3f078f
**Applied fix:** Corrected all four `refundAmt`/`cbAmt` comment instances that said `ABS(SUM earnings)` to accurately read `SUM(grossAmount for refund/chargeback transactions) — positive unsigned value`. Affected locations: `PeriodMetrics.refundAmt` (line 35), `PeriodMetrics.cbAmt` (line 36), and the inline type inside `bundleMap` (lines 751-752).

---

### WR-03: `novosQualificados` uses upsell-inclusive gross after Phase 8 — undocumented semantic change

**Files modified:** `src/lib/transactions.ts`
**Commit:** 1a7b321
**Applied fix:** Added a two-line comment above the `affGross` map declaration documenting that it intentionally includes all payments (front + upsells) post-Phase-8, and pointing future maintainers to the `frontPayments` alternative if front-only qualification is needed.

---

_Fixed: 2026-04-28T00:00:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
