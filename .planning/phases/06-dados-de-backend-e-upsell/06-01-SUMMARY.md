---
phase: 06-dados-de-backend-e-upsell
plan: "01"
subsystem: data-layer
tags: [upsell, backend, aggregation, transactions, types]
dependency_graph:
  requires: []
  provides:
    - UpsellProductRow
    - AffiliateUpsellBreakdown
    - computeBackendProducts
    - computeAffiliateUpsells
    - computeTopProductPerAffiliate
  affects:
    - src/lib/transactions.ts
tech_stack:
  added: []
  patterns:
    - Pure data aggregation functions operating on TransactionRow[]
    - upsellNo > 0 filter for upsell/downsell rows
    - 7-day rolling window (same as computeAffiliateRankings)
key_files:
  created: []
  modified:
    - src/lib/transactions.ts
decisions:
  - "classifyUpsellProduct kept as unexported helper; classification logic embedded in computeBackendProducts module scope"
  - "computeTopProductPerAffiliate strips M-prefix (M1/M2/M3) from product names for display consistency"
  - "totalAOV uses netAmount (VAT-excluded) across both front and upsell rows — consistent with existing AOV logic"
metrics:
  duration: "~10 minutes"
  completed_date: "2026-04-27"
  tasks_completed: 1
  tasks_total: 1
  files_changed: 1
---

# Phase 06 Plan 01: Upsell/Backend Data Aggregation Functions — Summary

**One-liner:** Pure aggregation functions over TransactionRow for upsell product breakdown, per-affiliate upsell AOV contribution, and 7-day top-product ranking.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Add upsell/backend types and aggregation functions | 372cd18 | src/lib/transactions.ts |

## What Was Built

Three new exported functions and two new exported interfaces added to `src/lib/transactions.ts`:

**Types:**
- `UpsellProductRow` — product-level upsell aggregate with classification (up1/up2/up3/down1/down2/down3/other) and contribution %
- `AffiliateUpsellBreakdown` — per-affiliate upsell breakdown with per-product AOV contribution (absolute and %)

**Functions:**
- `computeBackendProducts(rows)` — filters to upsellNo > 0 payments, groups by productName, classifies, sorts by gross desc (BKND-01)
- `computeAffiliateUpsells(filteredRows, affiliateName)` — computes per-affiliate front/upsell split, AOV, and per-product aovContribution (BKND-02, BKND-03)
- `computeTopProductPerAffiliate(allRows)` — finds the most-sold front product per affiliate in the 7-day window, strips M-prefix for display (BKND-04)

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — these are pure computation functions with no rendering; no stubs present.

## Threat Flags

None — these functions are read-only aggregations over existing TransactionRow data. No new network endpoints, auth paths, or trust boundaries introduced.

## Self-Check: PASSED

- `src/lib/transactions.ts` exists and contains all 5 new exports
- Commit 372cd18 verified in git log
- `npx tsc --noEmit` passes with no errors
