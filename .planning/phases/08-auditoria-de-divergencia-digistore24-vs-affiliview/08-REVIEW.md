---
phase: 08-auditoria-de-divergencia-digistore24-vs-affiliview
reviewed: 2026-04-28T00:00:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - src/hooks/useDigistoreAPI.ts
  - src/lib/transactions.ts
  - src/pages/Dashboard.tsx
  - logica/earnings.md
  - logica/gross_revenue.md
findings:
  critical: 3
  warning: 3
  info: 2
  total: 8
status: issues_found
---

# Phase 08: Code Review Report

**Reviewed:** 2026-04-28T00:00:00Z
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

This review covers the Phase 8 audit implementation: the reconciliation of Gross Revenue and Earnings KPIs between AffiliView and the Digistore24 dashboard. The code changes correctly extend both metrics to include upsells (fixing the -13.4% and -48.3% divergences documented in INVESTIGATION-CONTEXT.md). However, the implementation introduces a new logic error in how refunds/chargebacks are allocated to the front-only earnings base used for Valor Liquido, and the API request layer silently drops entire transaction types ("return", "reversal") that the normalizer is designed to handle. The specification documents (logica/) are internally contradictory and will cause confusion for future maintainers.

---

## Critical Issues

### CR-01: API request omits "return" and "reversal" transaction types — those refunds are never fetched

**File:** `src/hooks/useDigistoreAPI.ts:59`

**Issue:** The `search[transaction_type]` parameter sent to the Digistore API is `"payment,sale,upsell,refund,chargeback"`. The normalizer (`digiNormalizer.ts:106-110`) and the `isRefund()` function (`src/lib/transactions.ts:477`) both explicitly handle `"return"` and `"reversal"` as valid refund transaction types. If Digistore24 uses either of these type names for any refund records, those transactions are never requested from the API at all — they simply do not appear in the dataset. This silently under-counts refunds and over-states Earnings and the effective Gross.

This is particularly relevant to the divergence investigation: if Digistore's dashboard counts "return"/"reversal" type transactions as deductions but AffiliView never fetches them, the Earnings gap could persist after the upsell fix.

**Fix:**
```typescript
"search[transaction_type]": "payment,sale,upsell,refund,return,reversal,chargeback",
```

---

### CR-02: `earningsFront` deducts refunds/CB for ALL upsell_no values, not just front transactions — Valor Liquido is understated when upsell refunds exist

**File:** `src/lib/transactions.ts:559-563`

**Issue:** `earningsFront` is intended to be the "front-only earnings base" that feeds `valorLiq = earningsFront - cogsTotal`. It correctly sums only `frontPayments` (upsellNo === 0) for positive earnings. However, the refund/CB deduction uses the full `refCbTxs` array — which contains refunds for **both** front and upsell transactions — without filtering to `upsellNo === 0`:

```typescript
// Current (incorrect):
const earningsFront =
  frontPayments.reduce((s, t) => s + t.earnings, 0) +
  refCbTxs.reduce((s, t) => s + t.earnings, 0);  // <-- includes upsell refunds
```

A refund for an upsell (upsellNo = 1, 2, …) has a negative `earnings` value. That negative is deducted from `earningsFront` even though the corresponding positive upsell earnings were never included in `earningsFront`. The net effect is that `earningsFront` goes more negative than it should, which causes `valorLiq` to be understated when upsell refunds are present.

`earningsKPI` (the displayed "Earnings" KPI) is correct because it adds all payment earnings to all refund/CB deductions — all signs are consistent. The bug is isolated to the `valorLiq` calculation path.

**Fix:**
```typescript
const frontRefCbTxs = refCbTxs.filter((t) => t.upsellNo === 0);

const earningsFront =
  frontPayments.reduce((s, t) => s + t.earnings, 0) +
  frontRefCbTxs.reduce((s, t) => s + t.earnings, 0);
```

Note: `frontRefCbTxs` is already computed later at line 639 for the product-level charts. The variable can be hoisted to before the `earningsFront` computation, or the filter can be inlined.

---

### CR-03: `gross_revenue.md` "Origem e Extracao" section contradicts the actual implementation and the "Formula" section

**File:** `logica/gross_revenue.md:12-14`

**Issue:** The "Filtro" entry in the Origem section says:
```
Filtro: somente transacoes com transaction_type === "payment" e upsell_no === 0
Upsells e bumps (upsell_no >= 1) nao entram no Gross Revenue — sao contabilizados no AOV
```

This is the **pre-Phase-8** definition and is factually wrong today. The "Formula" section of the same file correctly states `payTxs.reduce(grossAmount)` (all payment types, all upsell_no values), and the "Nota (Phase 8 correcao)" section explicitly states that upsells are now included.

The "Exemplo Pratico" table compounds this: it shows the Upsell row (upsell_no=1, €80,00) as "Nao (upsell)" and computes `Gross = €150 + €90 = €240` — which is the old front-only behaviour.

Any developer reading only the top sections of this document will implement the wrong formula. The practical example and the filtro entry must be updated to reflect the Phase 8 correction.

**Fix:** Update `logica/gross_revenue.md` Origem/Filtro section and Exemplo Pratico to show that all upsell_no values are included, consistent with the Phase 8 note and the actual code.

---

## Warnings

### WR-01: `earnings.md` example contradicts the stated formula — upsell excluded in example but included in formula

**File:** `logica/earnings.md:63-65`

**Issue:** The "Formula" section at the top of `earnings.md` correctly states:
```
Earnings = SUM(earned_amount WHERE payment — ALL upsell_no values)
         + SUM(earned_amount WHERE refund/chargeback)
```

But the "Exemplo Pratico" at the bottom shows the upsell row (earned_amount=+€34,00) and then computes:
```
Earnings = €65 + €39 + (-€65) = €39,00
(upsell de €34 nao incluido — contabilizado apenas no AOV)
```

This is the exact opposite of the Phase 8 correction: the example still uses the pre-fix logic. A developer maintaining the codebase will find the document contradicts itself.

**Fix:** Update the `earnings.md` example to include the upsell:
```
Earnings = €65 + €34 + €39 + (-€65) = €73,00
```
And remove the "(upsell de €34 nao incluido)" note, or replace it with the correct Phase 8 behaviour.

---

### WR-02: Refund rate denominator in `productSummary.returnPct` uses `grossBruto` (front-only gross) even though `refAmt` can contain upsell refunds via product name match

**File:** `src/lib/transactions.ts:736`

**Issue:** For `ProductSummaryRow`, `returnPct` is:
```typescript
returnPct: d.grossBruto > 0 ? (d.refAmt / d.grossBruto) * 100 : 0,
```

`d.grossBruto` is accumulated only from `frontPayTxs` (line 693-702), so it represents front-only gross for this product. However, `d.refAmt` is populated from `frontRefCbTxs` (lines 716-726), which is filtered with `t.upsellNo === 0`. So in this particular context the denominator and numerator are consistently front-only and the calculation is defensible.

The risk is in the **comment on the struct field** at line 748-749: `refundAmt: number; // ABS(SUM earnings) de reembolsos` — the comment says "earnings" but the code stores `grossAmount` (not earnings). This comment is misleading and could cause a future developer to assume the wrong sign/value is stored, especially given the `ABS()` notation when the actual values are positive unsigned amounts. The same misleading comment appears in the top-level `PeriodMetrics` interface at lines 35-36.

**Fix:** Correct the comment on `BundleRow.refundAmt` (line 748) and `PeriodMetrics.refundAmt` (line 35) to:
```typescript
refundAmt: number;  // SUM(grossAmount for refund transactions) — positive unsigned value
cbAmt: number;      // SUM(grossAmount for chargeback transactions) — positive unsigned value
```

---

### WR-03: `novosQualificados` uses per-affiliate gross including upsells for the €1,000/day threshold — metric inflates qualifying count post-Phase-8

**File:** `src/lib/transactions.ts:617-619`

**Issue:** After the Phase 8 fix, `payTxs` now includes upsell rows. The `affGross` map accumulates gross from all `payTxs` (line 595-597), which includes upsell transactions. The "Novos Qualificados" threshold is described as affiliates with "media diaria de gross ≥ €1.000/dia" — gross here now includes upsell revenue per affiliate, which was not the case before Phase 8.

This is not necessarily wrong (if the intent is total affiliate-driven gross), but it is a silent semantic change that was not documented. Before Phase 8, `payTxs` was implicitly front-only because the gross filter excluded upsells. If the business intent is to measure an affiliate's daily front-sale contribution, using full gross (including upsells) inflates the count.

**Fix:** Add a comment clarifying that `affGross` intentionally includes upsells, or filter to `frontPayments` if the metric is intended to reflect front-sale volume only:
```typescript
// affGross includes ALL payments (front + upsells) per affiliate — intentional post-Phase-8
// If front-only qualification is needed, replace payTxs with frontPayments here.
```

---

## Info

### IN-01: Dead alias field `PeriodMetrics.grossBruto` exported but never distinct from `gross`

**File:** `src/lib/transactions.ts:25`

**Issue:** `PeriodMetrics.grossBruto` is declared in the interface and always set to the same value as `gross` (line 544-545). The comment says "alias of gross, kept for backward compat." No consumer should be depending on a distinction that no longer exists. Keeping this field permanently risks a future developer expecting it to mean "front-only gross" (its pre-Phase-8 meaning) and using it incorrectly.

**Fix:** Either remove `grossBruto` from `PeriodMetrics` and its callers (preferred), or add a `@deprecated` JSDoc annotation and a lint rule to flag new usages.

---

### IN-02: `TransactionRow` interface comment for `grossAmount` is stale and misleading

**File:** `src/lib/transactions.ts:9`

**Issue:** The comment reads:
```typescript
grossAmount: number;  // amount for payments; 0 for refunds/CB (API returns positive for refunds)
```

The first part says "0 for refunds/CB" but the normalizer (`digiNormalizer.ts:117-119`) actually stores `rawAmount` (the full positive `amount` from the API) in `grossAmount` for all transaction types including refunds and chargebacks. The value is NOT zero for refunds — it is the gross amount reversed, and the code uses it as the numerator for refund rate calculations throughout `computePeriod`. The comment is the exact opposite of the actual behaviour and will mislead developers inspecting the type definition.

**Fix:**
```typescript
grossAmount: number;  // raw `amount` from API — positive for all types.
                      // For payments: sale price paid by buyer (VAT included).
                      // For refunds/CB: the gross amount reversed (used as refund rate numerator).
```

---

_Reviewed: 2026-04-28T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
