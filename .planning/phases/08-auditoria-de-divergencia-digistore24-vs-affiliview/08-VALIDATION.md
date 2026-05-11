# Phase 8: Auditoria de Divergencia — Validation Procedure

**Created:** 2026-04-28
**Purpose:** Manual validation procedure for KPI reconciliation between AffiliView and Digistore24 dashboard.

---

## Reference Values (from INVESTIGATION-CONTEXT.md)

| Metric | Digistore24 Dashboard | AffiliView (pre-fix) | Expected Post-Fix |
|--------|----------------------|---------------------|-------------------|
| Gross Amount | 14,110.76 | 12,227.00 | Within 1% of 14,110.76 |
| Your Earnings | 3,962.17 | 2,049.55 | Within 1% of 3,962.17 |
| Net Amount | 13,125.74 | N/A (different concept) | N/A |
| Valor Liquido | N/A | 822.38 | Unchanged (front-only earnings - COGS) |

**Currency:** EUR

---

## Pass Criteria

| KPI | Pass Condition | Formula |
|-----|---------------|---------|
| Gross Revenue | Delta < 1% | `abs(affiliview_gross - 14110.76) / 14110.76 < 0.01` |
| Earnings | Delta < 1% | `abs(affiliview_earnings - 3962.17) / 3962.17 < 0.01` |
| Valor Liquido | Unchanged | `affiliview_valorliq == pre_fix_valorliq` (within rounding) |

A delta > 1% on Gross or Earnings after the fix indicates an additional root cause beyond H1/H2 (possibly timezone H3 or transaction type H4). Document the residual delta and investigate further.

---

## Date Range

Use the **exact same date range** that produced the INVESTIGATION-CONTEXT.md observations. The context says "referencia: ontem" — this was "yesterday" relative to 2026-04-28, meaning **2026-04-27**.

- **Digistore24 dashboard:** Filter to 2026-04-27
- **AffiliView:** Set date filter to show 2026-04-27 only

If the date cannot be reproduced exactly (e.g., Digistore dashboard defaults have changed), use any single complete day where both systems can be compared side-by-side.

---

## Step-by-Step Validation Procedure

### Pre-requisites

1. AffiliView running locally (`vercel dev`) or deployed to staging
2. Access to Digistore24 vendor dashboard (https://www.digistore24.com)
3. Browser DevTools console open

### Step 1: Record Digistore24 Reference Values

1. Log into Digistore24 vendor dashboard
2. Navigate to the sales/revenue overview
3. Set date filter to 2026-04-27 (or chosen comparison day)
4. Record:
   - **Gross Amount:** _______________
   - **Your Earnings:** _______________
   - **Net Amount:** _______________
5. Screenshot the dashboard for audit trail

### Step 2: Record AffiliView Values (Post-Fix)

1. Open AffiliView in browser
2. Set the date range to the same day (2026-04-27)
3. Wait for data to fully load
4. Record from the Dashboard KPI cards:
   - **Gross Revenue:** _______________
   - **Earnings:** _______________
   - **Valor Liquido:** _______________
5. Screenshot the AffiliView dashboard

### Step 3: Check Console Diagnostic (Plan 01 only)

If Plan 01 diagnostic logging is still active:

1. Open browser DevTools > Console
2. Look for "AUDIT: computePeriod" group
3. Record:
   - `grossBruto (ALL payments):` _______________
   - `gross (front-only):` _______________
   - `earnings ALL payments:` _______________
   - `earnings front-only:` _______________
   - `earnings upsells:` _______________
   - `total payment rows:` _______________
   - `front payments:` _______________
   - `upsell payments:` _______________

### Step 4: Compute Deltas

| KPI | Digistore24 | AffiliView | Delta | Delta % | Pass? |
|-----|------------|-----------|-------|---------|-------|
| Gross | ___ | ___ | ___ | ___% | < 1%? |
| Earnings | ___ | ___ | ___ | ___% | < 1%? |

### Step 5: Verify Valor Liquido Isolation

Compare Valor Liquido before and after the fix:
- **Pre-fix Valor Liquido:** 822.38 (from INVESTIGATION-CONTEXT.md)
- **Post-fix Valor Liquido:** _______________
- **Match?** Yes / No

If Valor Liquido changed significantly, the earningsKPI/earningsFront decoupling in Plan 02 may have a bug. Check that `valorLiq = earningsFront - cogsTotal` uses front-only earnings.

### Step 6: Verify Tooltip Accuracy (Plan 03)

1. Hover over Gross Revenue KPI card
2. Tooltip should say "todos os pagamentos (front + upsells + bumps)"
3. Should NOT say "pedidos frontais (upsell_no=0)"
4. Check Earnings tooltip similarly

---

## Failure Scenarios

| Scenario | Likely Cause | Next Step |
|----------|-------------|-----------|
| Gross delta > 1% but < 5% | Timezone boundary (H3) shifting a few transactions | Log `transaction_pay_date` values near midnight; consider timezone alignment fix |
| Gross delta > 5% | Transaction type filter (H4) still excluding rows | Check if expanded filter returned new rows; verify `isPayment()` classification |
| Earnings delta > 1% but < 5% | Timezone + minor rounding | Acceptable for now; document residual |
| Earnings delta > 5% | earningsKPI formula error or missing transaction types | Re-audit `computePeriod` — verify `payTxs` includes all upsell rows |
| Valor Liquido changed | earningsFront not properly decoupled | Verify `valorLiq = earningsFront - cogsTotal` uses `frontPayments` not `payTxs` |
| All deltas are 0% exactly | Both already matched (unlikely given observed gaps) | Verify date range is correct; may be comparing a day with no upsells |

---

## Validation Record

**Date validated:** _______________
**Validated by:** _______________
**Date range used:** _______________

| Check | Result | Notes |
|-------|--------|-------|
| Gross delta < 1% | PASS / FAIL | |
| Earnings delta < 1% | PASS / FAIL | |
| Valor Liquido unchanged | PASS / FAIL | |
| Tooltips accurate | PASS / FAIL | |
| No TypeScript errors | PASS / FAIL | |

**Overall:** PASS / FAIL
