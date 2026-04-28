---
phase: 08-auditoria-de-divergencia
plan: "01"
subsystem: data-pipeline
tags: [audit, diagnostic, api, transactions]
dependency_graph:
  requires: []
  provides: [AUDIT-console-block, expanded-transaction-type-filter]
  affects: [src/hooks/useDigistoreAPI.ts, src/lib/transactions.ts]
tech_stack:
  added: []
  patterns: [diagnostic-console-group, api-filter-expansion]
key_files:
  created: []
  modified:
    - src/hooks/useDigistoreAPI.ts
    - src/lib/transactions.ts
decisions:
  - "Expanded transaction_type filter to include sale and upsell alongside payment to address H4 hypothesis"
  - "Diagnostic console.group block inserted after earningsTotal in computePeriod with no computation changes"
metrics:
  duration: "10 minutes"
  completed: "2026-04-28"
requirements:
  - AUDIT-01
  - AUDIT-02
  - AUDIT-03
---

# Phase 08 Plan 01: Diagnostic Audit — Expand Filter + Console Logging Summary

Expanded Digistore24 API transaction_type filter to include sale/upsell and added a temporary console.group audit block in computePeriod to surface front-only vs all-payment gross and earnings for divergence root-cause analysis.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Expand API transaction_type filter | 6120606 | src/hooks/useDigistoreAPI.ts |
| 2 | Add temporary AUDIT console logging to computePeriod | dd91ca9 | src/lib/transactions.ts |

## What Was Built

### Task 1: Expanded API Filter (6120606)
Changed `search[transaction_type]` in `useDigistoreAPI.ts` from `"payment,refund,chargeback"` to `"payment,sale,upsell,refund,chargeback"`. This addresses H4 from RESEARCH.md — the Digistore24 API may return "sale" and "upsell" as distinct transaction_type values not previously included in the filter. The `isPayment()` function already accepts all three types, so no downstream normalization changes were needed.

### Task 2: AUDIT Console Block (dd91ca9)
Inserted a temporary diagnostic `console.group("AUDIT: computePeriod")` block in `src/lib/transactions.ts` immediately after `earningsTotal` is computed and before the AOV section. The block prints:
- Total payment rows, front payments (upsellNo=0), upsell payments (upsellNo>0)
- Refund/CB row count
- grossBruto (ALL payments) vs gross (front-only) with DELTA
- Earnings ALL payments vs front-only vs upsells vs refund/CB
- Current earningsTotal (front + refCb) vs proposed earningsAll (ALL payments + refCb)
- Digistore reference values: Gross 14110.76, Earnings 3962.17

No computation logic was changed — purely diagnostic output.

## Deviations from Plan

None — plan executed exactly as written.

## Verification

- `grep -c "payment,sale,upsell,refund,chargeback" src/hooks/useDigistoreAPI.ts` returns 1
- `grep -c 'console.group("AUDIT: computePeriod")' src/lib/transactions.ts` returns 1
- `npx tsc --noEmit` — no TypeScript errors

## Self-Check: PASSED

Files exist:
- src/hooks/useDigistoreAPI.ts — FOUND
- src/lib/transactions.ts — FOUND

Commits:
- 6120606 — FOUND
- dd91ca9 — FOUND
