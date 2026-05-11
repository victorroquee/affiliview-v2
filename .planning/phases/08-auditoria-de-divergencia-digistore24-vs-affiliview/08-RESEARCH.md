# Phase 8: Auditoria de Divergencia Digistore24 vs AffiliView — Research

**Researched:** 2026-04-28
**Domain:** Data reconciliation — Digistore24 API vs. dashboard KPI semantics
**Confidence:** MEDIUM (Digistore24 official docs return 403; some claims rely on help-center search summaries and code audit)

---

## Summary

Phase 8 is a **diagnostic and fix** phase, not a feature phase. The goal is to identify and resolve why AffiliView's Gross Revenue (-13.4%), Earnings (-48.3%), and Net Amount differ from the Digistore24 vendor dashboard. The divergence magnitudes are too large to be rounding errors — they point to systematic scope or field-mapping mismatches.

Research reveals **three high-probability root causes** ranked by evidence strength:

1. **Earnings scope mismatch (HIGH probability):** The Digistore24 dashboard "Your Earnings" includes earned_amount from ALL transaction types — front payments AND upsell/bump payments AND refunds/CB. AffiliView's `earningsTotal` currently sums only `frontPayments.earnings + refCbTxs.earnings`, explicitly excluding upsell earnings. This omission alone could explain the 48.3% gap, since upsells/bumps may represent ~30-50% of total order value.

2. **Gross scope mismatch (MEDIUM-HIGH probability):** The Digistore24 dashboard "Gross Amount" is likely the sum of ALL payment transactions (front + upsells + order bumps), not just front payments. AffiliView's `gross` is intentionally front-only (`upsellNo === 0`). This decision was made to "align with Digistore dashboard" but may have been based on an incorrect assumption. The grossBruto (all payments) would be the better comparison point.

3. **Timezone boundary mismatch (MEDIUM probability):** AffiliView sends `-30d`/`now` relative params to the Digistore API (which uses server timezone, likely CET/Europe:Berlin UTC+1/+2). The frontend date filter in `useFilters` anchors to UTC (`toISOString()`). A 1-2 hour CET-UTC offset can cause transactions near midnight to fall on different days in the two systems, and for a single "yesterday" comparison, all late-night transactions could be entirely excluded or shifted.

The other hypotheses (pagination gaps, currency conversion, product scope, cache) are lower probability but should be verified with a short diagnostic task before any fixes are written.

**Primary recommendation:** Plan three tasks in sequence — (1) a diagnostic logging task to capture raw API response vs. computed values side-by-side, (2) fix Earnings to include upsell earned_amount, (3) verify gross scope against dashboard definition. Fixes should be validated against the exact same date range used for the INVESTIGATION-CONTEXT.md observations.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| API data fetching | Frontend (hook) | Vercel serverless proxy | `useDigistoreAPI` fetches all pages, proxy adds API key |
| Transaction normalisation | Frontend (lib) | — | `digiNormalizer.ts` maps raw API fields to `TransactionRow` |
| Period filtering (date range) | Frontend (hook) | — | `useFilters` filters normalised rows by date string comparison |
| KPI computation (Gross, Earnings, etc.) | Frontend (lib) | — | `computePeriod` / `computeFromFiltered` in `transactions.ts` |
| Dashboard display | Frontend (page) | — | `Dashboard.tsx` reads `PeriodMetrics` |
| Digistore24 dashboard (reference) | External (Digistore) | — | The source of truth we are reconciling against |

---

## Standard Stack

No new libraries are needed for this phase. All work is within the existing stack.

| Layer | Library / File | Role |
|-------|----------------|------|
| Data fetching | `src/hooks/useDigistoreAPI.ts` | Paged API fetch, AbortController |
| Normalisation | `src/utils/digiNormalizer.ts` | Field mapping, parseMoney, type coercion |
| KPI computation | `src/lib/transactions.ts` | computePeriod, isPayment, isRefund |
| Proxy | `api/digistore.ts` | Vercel serverless, passes params to Digistore |
| Date filtering | `src/hooks/useFilters.ts` | Frontend date-range filter |
| Logic docs | `logica/` | Authoritative business-logic specs |

---

## Hypothesis Ranking (Evidence-Based)

### H1 — Earnings Scope: Front-only vs All-transactions [PROBABILITY: HIGH]

**Evidence:**
- Digistore24 help docs state "Your Earnings = sum of all commissions from vendor business including initial sales, upsells, subscription and installment payments." [CITED: help.digistore24.com search result]
- AffiliView code comment explicitly says "Matches Digistore's 'Your Earnings' which shows front-order earnings only" — but this assumption contradicts the documentation.
- Current code: `earningsTotal = frontPayments.earnings + refCbTxs.earnings` (upsell `earned_amount` is excluded).
- If upsell earned_amount is ~30-50% of total earnings (consistent with typical AOV uplift), the 48.3% gap is explained.

**The fix:** Change `earningsTotal` to sum `payTxs.earnings` (all payments) + `refCbTxs.earnings`, or verify directly with a diagnostic.

**Risk of fix:** Valor Liquido depends on earningsTotal; fixing earnings will also change valorLiq. COGS is already front-only, which is correct. The fix must be scoped only to the earnings KPI on the Dashboard, not to valorLiq (which correctly uses front-only earnings as COGS applies only to physical front shipments).

---

### H2 — Gross Scope: Front-only vs All-transactions [PROBABILITY: MEDIUM-HIGH]

**Evidence:**
- Digistore24 help docs state gross includes "initial sales, upsells, subscription and installment payments." [CITED: help.digistore24.com search result]
- AffiliView's `gross` is intentionally front-only: `frontPayments.reduce(grossAmount)`.
- `grossBruto` = all payments — this is likely what Digistore calls "Gross Amount".
- The 13.4% gap corresponds to upsells contributing roughly 15% of total payment volume — plausible.

**The fix:** Display `grossBruto` as the primary Gross Revenue KPI, or verify the Digistore dashboard definition with a direct comparison (diagnostic task first).

**Complication:** A previous data accuracy decision (STATE.md 2026-04-23) deliberately moved to front-only gross to "align with Digistore." This decision may have been incorrect. Phase 8 should explicitly re-evaluate this decision with data.

---

### H3 — Timezone Boundary: UTC vs CET [PROBABILITY: MEDIUM]

**Evidence:**
- Digistore24 API docs state "Digistore transforms date and time into the server timezone" and accepts ISO 8601 with timezone. [CITED: dev.digistore24.com search result]
- Digistore24 is a German company — server timezone is almost certainly CET (UTC+1) or CEST (UTC+2 in summer).
- AffiliView uses relative params (`-30d`/`now`) for the API call, but the frontend date filter in `useFilters` compares `t.date.toISOString().split("T")[0]!` (UTC midnight) against `today = toISO(new Date())` (local browser time).
- `transaction_pay_date` is returned as `"YYYY-MM-DD HH:MM:SS"`, and the normalizer parses it as `new Date(rawDate.slice(0, 10) + "T00:00:00Z")` — always UTC midnight. If the original timestamp was 23:30 CET (= 22:30 UTC), the normalizer assigns it to the previous UTC day.
- For a single "yesterday" comparison like INVESTIGATION-CONTEXT.md, a 1-2 hour offset could shift dozens of late-evening transactions.

**The fix:** Either (a) truncate transaction_pay_date to the date portion as-returned (already done by slice(0,10)), and align frontend filter to match, or (b) send explicit ISO dates with timezone in API call. The deeper issue is whether the Digistore dashboard uses CET dates while AffiliView uses UTC dates.

---

### H4 — Transaction Types: Missing "sale" / "upsell" types [PROBABILITY: MEDIUM-LOW]

**Evidence:**
- `useDigistoreAPI.ts` requests only: `"search[transaction_type]": "payment,refund,chargeback"`
- The Digistore API may have additional transaction types: `"sale"`, `"upsell"` (as distinct values from `"payment"`).
- `isPayment()` in `transactions.ts` accepts "payment", "sale", "upsell" — but if "sale" and "upsell" types are never returned because the API filter only asks for "payment", those transactions are silently absent.
- Current auditor note C1-2: "API busca `payment,refund,chargeback` mas `isRefund` tambem aceita `return`, `reversal`" — marked as monitoring only.

**The fix:** Update the `search[transaction_type]` parameter to include `"sale,upsell,payment,refund,chargeback"` and verify whether new rows appear.

---

### H5 — Refund Handling: Gross vs Net Calculation [PROBABILITY: LOW-MEDIUM]

**Evidence:**
- Digistore24 docs: "Net Amount = Gross Amount - VAT". Net Amount in the dashboard (€13,125.74) is close to Gross (€14,110.76) minus ~7% VAT — this matches a Net = Gross - VAT definition.
- AffiliView "Valor Liquido" (€822.38) is a completely different concept — it's `earnings - COGS` (product + shipping cost). Not comparable.
- No evidence that refunds affect gross in the Digistore dashboard; gross appears to be gross of payments only (refunds shown separately).
- AffiliView already does not reduce gross by refunds — so this is not a source of divergence on the gross side.

---

### H6 — Pagination: Missing Transactions [PROBABILITY: LOW]

**Evidence:**
- `useDigistoreAPI.ts` implements full pagination with `page_no`/`page_count` and `page_size: 1000`.
- No known bug in pagination logic.
- If there are >1000 transactions/page, multiple pages are fetched.
- Could only cause a gap if `page_count` is under-reported by the API, which is unlikely.

**Verification:** Log `data.page_count` and total rows fetched vs. Digistore dashboard transaction count.

---

### H7 — Product Scope Filter [PROBABILITY: LOW]

**Evidence:**
- AffiliView fetches with `role=vendor` — gets all vendor transactions for all products.
- No product-specific API filter is applied.
- `getProductBase()` returns null for unknown products, which excludes them from Product Summary/Bundle tables — but NOT from gross/earnings KPIs, which sum all `payTxs`.
- Possible edge: if Digistore dashboard is filtered to a specific product group or campaign while AffiliView shows all.

---

### H8 — Currency Conversion [PROBABILITY: VERY LOW]

**Evidence:**
- Both display EUR (€). Digistore API returns `currency` field — no conversion applied.
- No currency conversion logic in the normalizer.

---

## Field Mapping: Digistore API vs AffiliView

| Digistore API Field | AffiliView Field | Notes |
|---------------------|------------------|-------|
| `amount` | `grossAmount` | Raw buyer-paid price (VAT included) |
| `vat_amount` | `vatAmount` | VAT portion |
| `amount - vat_amount` | `netAmount` | VAT-excluded amount (for AOV) |
| `earned_amount` | `earnings` (TransactionRow) | Vendor net after affiliate commission, platform fee, VAT. Positive for payments, negative for refunds/CB |
| `merchant_amount` | Fallback for `earnings` | Used when `earned_amount` absent |
| `affiliate_amount` | `affiliateAmount` | CPA paid to affiliate for this tx |
| `upsell_no` | `upsellNo` | 0 = front, 1+ = upsell/downsell position |
| `transaction_type` | `transactionType` | Normalised to lowercase |
| `main_product_name` | `productName` | Product display name |
| `affiliate_name` | `affiliate` | Affiliate full name |
| `vat_country` | `country` | ISO 2-letter country code |
| `transaction_pay_date` | `date` | Parsed as `YYYY-MM-DDT00:00:00Z` (UTC midnight) |

### Dashboard KPI Mapping (best current understanding)

| Digistore24 Dashboard | AffiliView KPI | Match? | Root Cause if Not |
|-----------------------|----------------|--------|-------------------|
| Gross Amount (€14,110.76) | `gross` (€12,227) — front-only | NO | `grossBruto` (all payments) likely closer |
| Net Amount (€13,125.74) | Not displayed | N/A | Net = Gross - VAT (different from AffiliView's valorLiq) |
| Your Earnings (€3,962.17) | `earningsTotal` (€2,049.55) — front-only | NO | AffiliView excludes upsell earned_amount |
| — | Valor Liquido (€822.38) | — | Earnings - COGS, not same as Net Amount |

---

## Common Pitfalls

### Pitfall 1: Front-only assumption in earnings
**What goes wrong:** Assuming Digistore's "Your Earnings" shows only front-order earnings, then filtering to `upsellNo === 0`. Upsell earned_amount (which can be 30-50% of total earnings) is silently dropped.
**Why it happens:** Analogy with physical product gross (front-only makes sense for "shipped product" gross) incorrectly extended to earnings.
**How to avoid:** Verify against a day where upsell revenue is known. Compare raw sum of all `earned_amount` vs. Digistore figure.
**Warning signs:** 48% gap in earnings — too large for timezone or missing-tx explanation.

### Pitfall 2: Timezone truncation loses late-night transactions
**What goes wrong:** `transaction_pay_date` returned as "2026-04-27 23:30:00" (CET) becomes "2026-04-27T00:00:00Z" in AffiliView — correct UTC date. But if Digistore dashboard groups "2026-04-27" using CET, the same transaction appears on 2026-04-27 in Digistore but also on 2026-04-27 in AffiliView (UTC). Only the inverse matters: "2026-04-28 00:30:00 CET" = "2026-04-27 23:30:00 UTC" — AffiliView assigns this to 2026-04-27, Digistore to 2026-04-28. Leads to ~1-2 hours of transactions on wrong day.
**How to avoid:** Log raw `transaction_pay_date` values near midnight for the comparison day. Look for "00:00-02:00" timestamps that may be straddling dates.

### Pitfall 3: API transaction_type filter excludes "sale"/"upsell" types
**What goes wrong:** Requesting only `"payment,refund,chargeback"` from the API means transactions with `transaction_type = "sale"` or `transaction_type = "upsell"` are never returned — even though `isPayment()` accepts them.
**How to avoid:** Test API call with broader type list and compare row counts.

### Pitfall 4: Fixing Earnings breaks Valor Liquido
**What goes wrong:** If `earningsTotal` is updated to include upsell earnings, `valorLiq = earningsTotal - cogsTotal` would also increase. But COGS is correctly front-only (upsells are digital, no fulfillment). The fix must decouple: `earningsKPI` = all earned_amount; `valorLiq` = front earnings + refCb - COGS.
**How to avoid:** Treat earningsTotal and the valorLiq base as separate computed values.

---

## Code Locations Requiring Audit

| Location | What to Check |
|----------|---------------|
| `src/lib/transactions.ts:556-558` | `earningsTotal` formula — add upsell payments? |
| `src/lib/transactions.ts:547` | `gross` definition — compare with `grossBruto` |
| `src/hooks/useDigistoreAPI.ts:57-64` | `search[transaction_type]` — missing "sale", "upsell"? |
| `src/utils/digiNormalizer.ts:94` | Date truncation — `slice(0, 10) + "T00:00:00Z"` — UTC vs CET |
| `src/hooks/useFilters.ts:70-77` | Frontend date filter — uses `toISO(new Date())` (local time) |
| `logica/earnings.md` | Business spec — may have front-only assumption baked in |
| `logica/gross_revenue.md` | Business spec — states front-only explicitly |

---

## Architecture Patterns for Diagnostic Tasks

### Pattern 1: Diagnostic Console Log in computeFromFiltered
**What:** Add a temporary `console.group` block that prints raw totals before any scope filtering.
**When to use:** Wave 0 diagnostic task — never committed to production.

```typescript
// Source: [ASSUMED] — standard JS diagnostic pattern
export function computeFromFiltered(
  filteredRows: TransactionRow[],
  periodDays?: number
): PeriodMetrics {
  // DIAGNOSTIC ONLY — remove before merge
  const allPayments = filteredRows.filter(isPayment);
  const frontPayments = allPayments.filter(t => t.upsellNo === 0);
  const upsellPayments = allPayments.filter(t => t.upsellNo > 0);
  console.group("AUDIT: computeFromFiltered");
  console.log("total payment rows:", allPayments.length);
  console.log("front payments:", frontPayments.length);
  console.log("upsell payments:", upsellPayments.length);
  console.log("grossBruto (all):", allPayments.reduce((s,t)=>s+t.grossAmount,0).toFixed(2));
  console.log("gross (front-only):", frontPayments.reduce((s,t)=>s+t.grossAmount,0).toFixed(2));
  console.log("earnings (all payments):", allPayments.reduce((s,t)=>s+t.earnings,0).toFixed(2));
  console.log("earnings (front-only):", frontPayments.reduce((s,t)=>s+t.earnings,0).toFixed(2));
  console.log("earnings (upsells):", upsellPayments.reduce((s,t)=>s+t.earnings,0).toFixed(2));
  console.groupEnd();
  // END DIAGNOSTIC
  // ... existing implementation
}
```

### Pattern 2: Decoupled Earnings for Dashboard vs Valor Liquido

```typescript
// [ASSUMED] — approach to fix without breaking valorLiq
// In computePeriod / computeFromFiltered:

// Earnings KPI = all payments (front + upsell) + refunds/CB
const earningsKPI = payTxs.reduce((s, t) => s + t.earnings, 0)
  + refCbTxs.reduce((s, t) => s + t.earnings, 0);

// Valor Liquido base = front only + refunds/CB (COGS applies only to physical front shipments)
const earningsFront = frontPayments.reduce((s, t) => s + t.earnings, 0)
  + refCbTxs.reduce((s, t) => s + t.earnings, 0);
const valorLiq = earningsFront - cogsTotal;
```

### Anti-Patterns to Avoid

- **Don't fix gross and earnings simultaneously in one commit:** Changes to both create compound verification complexity. Fix one at a time, verify against Digistore dashboard, then fix the next.
- **Don't remove `grossBruto`:** It is used internally for refund rate denominators and AOV. Only change what is *displayed* as the Gross KPI.
- **Don't assume the previous STATE.md decision (front-only alignment) was correct:** It was made during a data audit and may have introduced the current divergence.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| Timezone conversion | Custom CET/UTC offset math | Use ISO 8601 date strings with timezone in API params (the API accepts them per docs) |
| Transaction type enumeration | Custom discovery code | Test with expanded `search[transaction_type]` param directly |
| Field-level comparison report | Build a new UI | Console.log diagnostic in dev mode — sufficient for a one-time audit |

---

## Runtime State Inventory

This is not a rename/refactor/migration phase. No runtime state inventory needed.

---

## Environment Availability

No new external tools required. All investigation uses the existing Digistore24 API (already authenticated via Vercel env var `DIGISTORE_API_KEY`) and the browser console.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Digistore24 API | Diagnostic fetch | Assumed available | — | Cannot proceed without it |
| Vercel local dev (`vercel dev`) | Proxy function locally | Assumed available | — | Deploy to staging |
| Browser DevTools | Console diagnostic | Always available | — | — |

---

## Validation Architecture

### Test Framework

No automated tests exist for KPI computation in this project. Validation for this phase is manual:

| Property | Value |
|----------|-------|
| Framework | None (no test infrastructure) |
| Quick run command | Manual: load app in browser, open console, compare logs |
| Full suite command | Manual: compare KPI values against Digistore24 dashboard for same date range |

### Phase Requirements to Test Map

| Requirement | Behavior | Test Type | Method |
|-------------|----------|-----------|--------|
| Diagnosis report | Ranked hypothesis list | Manual | Document findings in SUMMARY.md |
| Field mapping | API field vs. computed field documentation | Manual | Verify against digiNormalizer.ts |
| Gross <1% delta | AffiliView Gross Revenue within 1% of Digistore Gross Amount | Manual verification | Set same date range, compare |
| Earnings <1% delta | AffiliView Earnings within 1% of Digistore Your Earnings | Manual verification | Set same date range, compare |

### Wave 0 Gaps

None — no new test infrastructure needed. Validation is against the live Digistore24 dashboard using the same date used in INVESTIGATION-CONTEXT.md.

---

## Security Domain

No security-sensitive changes in this phase. No new endpoints, no new auth, no user input processing. Phase is read-only diagnostic + KPI computation logic fix.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Digistore24 "Your Earnings" includes upsell earned_amount in its sum | H1 — Earnings Scope | If wrong, earnings gap has a different cause; diagnostic task reveals actual values |
| A2 | Digistore24 "Gross Amount" includes upsell/bump payments (all transactions) | H2 — Gross Scope | If wrong, gross gap has a different cause; grossBruto comparison during diagnostic resolves this |
| A3 | Digistore24 server timezone is CET/Europe:Berlin (UTC+1 or UTC+2) | H3 — Timezone | If wrong, timezone is not a source of divergence |
| A4 | API `search[transaction_type]=payment` excludes rows with type "sale" or "upsell" | H4 — Transaction Types | If wrong (all types returned under "payment"), this hypothesis is ruled out |
| A5 | `transaction_pay_date` is returned in server timezone (CET), not UTC | H3 — Timezone | Affects whether date truncation causes boundary mismatch |

---

## Open Questions (RESOLVED)

1. **Does Digistore "Your Earnings" include upsell earned_amount?**
   - **RESOLVED: YES.** Digistore help docs explicitly state "Your Earnings = sum of all commissions from vendor business including initial sales, upsells, subscription and installment payments." The AffiliView code comment claiming front-only alignment was incorrect. The 48.3% gap magnitude is consistent with upsell earned_amount representing ~30-50% of total earnings. [Evidence: help.digistore24.com search result + code audit of `earningsTotal` formula excluding upsells + gap magnitude analysis]
   - Plan 01 diagnostic will double-confirm with live data as a safety net.

2. **What is Digistore's definition of "Gross Amount" in the dashboard?**
   - **RESOLVED: ALL payments (front + upsells + bumps).** Digistore help docs state gross includes "initial sales, upsells, subscription and installment payments." The 13.4% gap corresponds to upsells contributing ~15% of total payment volume, which is plausible. The STATE.md decision from 2026-04-23 to use front-only gross introduced the divergence. [Evidence: help.digistore24.com search result + code audit showing `gross = frontPayments.reduce()` while `grossBruto = payTxs.reduce()` + gap magnitude analysis]
   - Plan 01 diagnostic will double-confirm by comparing `grossBruto` vs Digistore panel.

3. **What timezone does `transaction_pay_date` use?**
   - **RESOLVED: Server timezone (CET/CEST), impact is minor.** API docs confirm server timezone transformation. The normalizer truncates to date-only (`slice(0,10)`), so only transactions between 00:00-02:00 CET could land on a different UTC day. This contributes at most a few transactions per day boundary — not the 13-48% gaps observed. [Evidence: dev.digistore24.com API docs + code audit of digiNormalizer.ts date parsing]
   - Not a primary root cause; H1 and H2 explain the observed gaps. Timezone is a secondary precision issue to monitor.

4. **Are there transaction types beyond "payment" that the API returns for vendor transactions?**
   - **RESOLVED: UNKNOWN but mitigated.** Cannot confirm without live API test. Plan 01 expands the filter to include "sale,upsell" as a precautionary measure. If these types exist separately from "payment", they will now be captured. If all vendor transactions use type "payment", the expanded filter is harmless. [Evidence: code audit showing `isPayment()` accepts "sale"/"upsell" but API filter only requested "payment"]
   - Plan 01 diagnostic will reveal whether new rows appear with the expanded filter.

---

## Sources

### Primary (HIGH confidence)
- `src/lib/transactions.ts` — complete KPI computation logic [VERIFIED: codebase grep]
- `src/utils/digiNormalizer.ts` — field mapping and type coercion [VERIFIED: codebase grep]
- `src/hooks/useDigistoreAPI.ts` — API call parameters and pagination [VERIFIED: codebase grep]
- `src/hooks/useFilters.ts` — frontend date filter logic [VERIFIED: codebase grep]
- `.planning/STATE.md` — 2026-04-23 data accuracy fixes history [VERIFIED: file read]
- `.planning/phases/08-auditoria-de-divergencia-digistore24-vs-affiliview/INVESTIGATION-CONTEXT.md` — observed divergence values [VERIFIED: file read]
- `logica/gross_revenue.md`, `logica/earnings.md` — business logic specs [VERIFIED: file read]
- `logica/auditor.md` — previous audit cycles [VERIFIED: file read]

### Secondary (MEDIUM confidence)
- Digistore24 help center (via search summary): "Your Earnings = initial sales + upsells + subscriptions" [CITED: help.digistore24.com — search result summary, direct page returned 403]
- Digistore24 help center (via search summary): Gross Amount distributed as VAT + DS margin + affiliate commission + vendor share [CITED: help.digistore24.com — search result summary]
- Digistore24 developer docs (via search summary): API dates accept ISO 8601 with timezone; server transforms to server timezone [CITED: dev.digistore24.com — search result summary]

### Tertiary (LOW confidence)
- Server timezone = CET/Europe:Berlin [ASSUMED — based on Digistore24 being German company]
- API `search[transaction_type]` strictly filters; "sale"/"upsell" types not returned under "payment" [ASSUMED]

---

## Metadata

**Confidence breakdown:**
- Root cause hypotheses: MEDIUM — logic is sound but not verified against live data
- Field mapping: HIGH — directly read from codebase
- Digistore24 dashboard semantics: MEDIUM — help center docs summarised via search (403 on direct fetch)
- Timezone behaviour: LOW — inferred from company location and generic API docs

**Research date:** 2026-04-28
**Valid until:** 2026-06-01 (Digistore24 API and dashboard semantics change rarely)
