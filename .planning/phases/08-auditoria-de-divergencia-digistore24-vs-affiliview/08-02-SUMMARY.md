---
phase: 08-auditoria-de-divergencia
plan: "02"
subsystem: data-pipeline
tags: [kpi-fix, gross, earnings, valor-liquido, audit, digistore24]
dependency_graph:
  requires: [08-01]
  provides: [corrected-gross-kpi, corrected-earnings-kpi, decoupled-valor-liquido]
  affects: [src/lib/transactions.ts, logica/earnings.md, logica/gross_revenue.md]
tech_stack:
  added: []
  patterns: [decoupled-kpi-variables, earningsKPI-earningsFront-split]
key_files:
  created: []
  modified:
    - src/lib/transactions.ts
    - logica/earnings.md
    - logica/gross_revenue.md
decisions:
  - "gross = grossBruto (all payments) — aligned with Digistore24 Gross Amount that includes upsells"
  - "earningsKPI introduced for dashboard display (all payments + refCb); earningsFront for Valor Liquido (front-only COGS)"
  - "Daily Gross chart updated to use payTxs (all payments) to match new Gross KPI"
metrics:
  duration: "8 minutes"
  completed: "2026-04-28"
requirements:
  - AUDIT-04
  - AUDIT-05
---

# Phase 08 Plan 02: Fix Gross and Earnings KPIs — Align with Digistore24 Summary

Fixed Gross Revenue and Earnings KPIs to include all payment types (front + upsells + bumps) closing the -13.4% Gross gap and -48.3% Earnings gap versus Digistore24, while decoupling Valor Liquido to retain front-only COGS logic.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Fix Gross and Earnings KPIs in computePeriod and decouple Valor Liquido | 970f2ca | src/lib/transactions.ts |
| 2 | Update business logic documentation to reflect corrected formulas | c55c599 | logica/earnings.md, logica/gross_revenue.md |

## What Was Built

### Task 1: KPI Fix in transactions.ts (970f2ca)

**Change 1 — Gross:** `gross = grossBruto` (all payments: front + upsells + bumps). Previously gross was front-only (`frontPayments.reduce(grossAmount)`), causing a -13.4% gap vs Digistore24.

**Change 2 — Earnings (split):** Introduced two earnings variables:
- `earningsKPI` = `payTxs.reduce(earnings) + refCbTxs.reduce(earnings)` — ALL payments, used for dashboard display
- `earningsFront` = `frontPayments.reduce(earnings) + refCbTxs.reduce(earnings)` — front-only, used for Valor Liquido base

Previously `earningsTotal` used front-only, causing a -48.3% gap vs Digistore24 "Your Earnings".

**Change 3 — Valor Liquido decoupled:** `valorLiq = earningsFront - cogsTotal`. COGS applies only to physical front shipments; upsells are digital with no fulfillment cost. By using `earningsFront` instead of `earningsKPI`, Valor Liquido remains correct and does not inflate by upsell earnings.

**Change 4 — Daily Gross chart:** Updated to iterate `payTxs` (all payments) instead of `frontPayments`, so the chart totals align with the new Gross KPI.

**Change 5 — AUDIT diagnostic removed:** The temporary `console.group("AUDIT: computePeriod")` block added in Plan 01 was removed.

**Change 6 — PeriodMetrics interface comments:** Updated to reflect new semantics for `gross` and `earnings` fields.

**Rates (Change 7):** Refund and chargeback rate denominators now use the all-payments `gross` (which equals `grossBruto`), giving slightly lower rates — which is correct since the denominator is now larger.

### Task 2: Business Logic Documentation (c55c599)

Updated `logica/earnings.md` and `logica/gross_revenue.md` to reflect the corrected formulas:
- Both files updated "O que e" section, Formula section, and Regras section
- Added Phase 8 correction notes explaining what changed and the previous divergence percentages
- `gross_revenue.md` gross vs grossBruto table updated to reflect they are now equal
- `earnings.md` code example updated to show `earningsKPI` + `earningsFront` split pattern

## Deviations from Plan

None — plan executed exactly as written. All 8 specified changes were applied in the correct order and the TypeScript compiler reports no errors.

## Threat Mitigations Applied

| Threat ID | Mitigation Applied |
|-----------|-------------------|
| T-08-03 (Tampering — valorLiq) | Decoupled `earningsFront` from `earningsKPI`; valorLiq = earningsFront - cogsTotal (front-only COGS preserved) |
| T-08-04 (Repudiation — formula change) | Phase 8 correction notes added to both logica/*.md files explaining what changed and why |

## Verification

- `grep -c "earningsKPI" src/lib/transactions.ts` → 3 (declaration + return + comment)
- `grep -c "earningsFront" src/lib/transactions.ts` → 3 (declaration + valorLiq usage + comment)
- `grep -c "const gross = grossBruto" src/lib/transactions.ts` → 1
- `grep -c "const valorLiq = earningsFront - cogsTotal" src/lib/transactions.ts` → 1
- `grep -c 'console.group("AUDIT' src/lib/transactions.ts` → 0 (diagnostic removed)
- `npx tsc --noEmit` → no errors
- Old patterns `const gross = frontPayments.reduce` and `const earningsTotal =` → 0 matches each

## Self-Check: PASSED

Files exist:
- src/lib/transactions.ts — FOUND
- logica/earnings.md — FOUND
- logica/gross_revenue.md — FOUND

Commits:
- 970f2ca — FOUND (fix(08-02): fix Gross and Earnings KPIs to include all payment types)
- c55c599 — FOUND (docs(08-02): update business logic docs to reflect corrected KPI formulas)
