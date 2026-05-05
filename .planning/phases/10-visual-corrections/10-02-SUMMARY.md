---
phase: 10-visual-corrections
plan: 02
subsystem: ui-color-consistency
tags: [color-thresholds, refactoring, consistency]
dependency_graph:
  requires: [colorThresholds-helper, yellow-css-class]
  provides: [consistent-margin-colors, consistent-refund-colors]
  affects: [Affiliates, Dashboard, ProductTable, AffiliateDetail, CPATable]
tech_stack:
  added: []
  patterns: [centralized-color-helper-consumption]
key_files:
  created: []
  modified:
    - src/components/KPICard.tsx
    - src/pages/Affiliates.tsx
    - src/pages/Dashboard.tsx
    - src/components/ProductTable.tsx
    - src/components/cpa/AffiliateDetail.tsx
    - src/components/cpa/CPATable.tsx
decisions:
  - "KPICard color prop extended with 'yellow' for margin 5-10% range"
  - "CPA components preserve var() inline style pattern but derive from getRefundColor"
metrics:
  duration: "3 min"
  completed: "2026-05-05T11:39:00Z"
---

# Phase 10 Plan 02: Apply Color Helpers Across All Surfaces Summary

Replaced all inline color ternaries with centralized getMarginColor/getRefundColor calls across 5 components, corrected refund thresholds from >5%/>10% to <=8%/>8%, and updated tooltip text to match.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Update KPICard type and apply helpers to Affiliates.tsx and Dashboard.tsx | 0dad044 | src/components/KPICard.tsx, src/pages/Affiliates.tsx, src/pages/Dashboard.tsx |
| 2 | Update ProductTable, AffiliateDetail, CPATable with helpers and corrected thresholds | c540e8f | src/components/ProductTable.tsx, src/components/cpa/AffiliateDetail.tsx, src/components/cpa/CPATable.tsx |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Tooltip text in AffiliateDetail and CPATable also referenced wrong thresholds**
- **Found during:** Task 2
- **Issue:** AffiliateDetail info text said "Laranja >5%, vermelho >10%" and CPATable had same
- **Fix:** Updated both tooltips to "Laranja <=8%, vermelho >8%"
- **Files modified:** src/components/cpa/AffiliateDetail.tsx, src/components/cpa/CPATable.tsx
- **Commit:** c540e8f

## Verification Results

- `npx tsc --noEmit` passes cleanly
- 11 total getMarginColor/getRefundColor references across .tsx files
- No remaining `> 10.*"red"` or `> 5.*"orange"` inline ternaries for refund (excluding cbPct which is unrelated)
- BundlePerformanceTable Reembolso % column present with getRefundColor
- ProductTable tooltip corrected to "<=8%, >8%"

## Known Stubs

None - all helpers are fully wired with production logic.

## Self-Check: PASSED
