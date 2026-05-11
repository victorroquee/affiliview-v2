---
phase: 05-ajustes-visuais
plan: 02
subsystem: ui
tags: [react, typescript, table-columns]

requires:
  - phase: 05-01
    provides: correct refund/margin color thresholds
provides:
  - BundlePerformanceTable without R+CB column
  - M-prefix stripped from Kit/SKU display
  - Reembolso % column with orange/red color encoding
affects: []

tech-stack:
  added: []
  patterns: [regex-display-transform, color-encoded-percentage-columns]

key-files:
  created: []
  modified:
    - src/components/ProductTable.tsx
    - src/lib/transactions.ts

key-decisions:
  - "Used regex /^M\\d+\\s*/i for M-prefix stripping — display only, data unchanged"
  - "Replaced rcb field with refundPct in BundleRow — refundPct = (reembolsos / vendas) * 100"

patterns-established:
  - "Percentage columns use >8 red / >0 orange threshold pattern"

requirements-completed: [VIS-03, VIS-04, VIS-05]

duration: 2min
completed: 2026-04-28
---

# Plan 05-02: BundlePerformanceTable Cleanup Summary

**Removed R+CB column, stripped M-prefix from SKU names, added Reembolso % column with color encoding**

## Performance

- **Duration:** 2 min
- **Completed:** 2026-04-28
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Removed obsolete R+CB (total) column from BundlePerformanceTable header and cells
- Removed `rcb: number` field from BundleRow interface and its computation
- Added `refundPct: number` to BundleRow with formula `(reembolsos / vendas) * 100`
- Added Reembolso % column with orange (<=8%) and red (>8%) color encoding
- Stripped M1/M2/M3/M4 prefix from Kit/SKU display using regex transform

## Task Commits

Changes implemented in prior execution:

1. **Task 1: Update BundleRow interface and computation** - `e139246` (feat)
2. **Task 2: Update BundlePerformanceTable columns and display** - `e139246` (feat)

## Files Created/Modified
- `src/lib/transactions.ts` - Removed rcb field, added refundPct to BundleRow interface and computation
- `src/components/ProductTable.tsx` - Removed R+CB column, added M-prefix strip, added Reembolso % column

## Decisions Made
- Used regex `/^M\d+\s*/i` for prefix stripping — affects display only, underlying data unchanged
- Replaced rcb with refundPct rather than keeping both — rcb was redundant

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All VIS requirements (VIS-01 through VIS-05) are now implemented
- Phase 5 visual adjustments complete, ready for verification

---
*Phase: 05-ajustes-visuais*
*Completed: 2026-04-28*
