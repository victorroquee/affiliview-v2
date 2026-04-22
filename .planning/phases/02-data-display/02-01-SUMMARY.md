---
phase: 02-data-display
plan: "01"
subsystem: data-layer
tags: [cpa, hook, types, analyzeCPA, aovGross, kpi]
dependency_graph:
  requires: []
  provides: [useCpaVariavel, aovGross-on-VariantResult]
  affects: [src/lib/cpa/types.ts, src/lib/cpa/analyzeCPA.ts, src/hooks/useCpaVariavel.ts]
tech_stack:
  added: []
  patterns: [useMemo-hook-wrapping-analyzeCPA, optional-field-extension-for-backwards-compat]
key_files:
  created:
    - src/hooks/useCpaVariavel.ts
  modified:
    - src/lib/cpa/types.ts
    - src/lib/cpa/analyzeCPA.ts
decisions:
  - aovGross added as optional field on VariantResult to avoid breaking existing consumers (CPATable, AffiliateDetail)
  - gross: number added to AffiliateAccumulator fronts/upsells buckets — AOV computed as (frontGross + upsellGross) / frontCount (full-funnel definition consistent with CpaFixo)
  - marginTarget=0 passed to analyzeCPA in useCpaVariavel — stable ltvProfit, no simulation in Phase 2
  - KPI aggregates use dominant variant per affiliate for avgMargin and avgAov
metrics:
  duration: 78s
  completed_date: "2026-04-22"
  tasks_completed: 2
  files_changed: 3
---

# Phase 2 Plan 1: CPA Data Layer Extension Summary

Per-variant gross accumulation added to analyzeCPA and aovGross exposed on VariantResult; useCpaVariavel hook wraps analyzeCPA with Maileonardo exclusion, KPI aggregation, search filtering, and selection state.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Extend types and analyzeCPA with per-variant gross tracking and aovGross | 35c18cd | src/lib/cpa/types.ts, src/lib/cpa/analyzeCPA.ts |
| 2 | Create useCpaVariavel hook with KPI aggregates, search, and selection state | c1f5b29 | src/hooks/useCpaVariavel.ts |

## What Was Built

### Task 1 — types.ts + analyzeCPA.ts

- `AffiliateAccumulator.fronts` and `.upsells` bucket type extended with `gross: number`
- `VariantResult` extended with optional `aovGross?: number` (full-funnel: front gross + upsell gross / front count)
- `analyzeCPA` accumulates `r.grossAmount` into `fronts[v].gross` and `upsells[v].gross`
- Result construction computes `aovGross = (f.gross + ups.gross) / f.count` and pushes it to `variants`
- All existing consumers unaffected — field is optional, no breaking type changes

### Task 2 — useCpaVariavel.ts

- Calls `analyzeCPA(filtered, 0)` after excluding Maileonardo rows via `isMaileonardo`
- `kpis` computed from results: `{ totalAffiliates, avgMargin, avgAov }` using dominant variant per affiliate
- `displayResults` is case-insensitive search-filtered view of results
- `selectedAff` resolved from `displayResults` by name
- Exports `CpaVariavelKpis` and `UseCpaVariavelReturn` interfaces

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — this plan is a data layer only (no UI rendering). No placeholder values.

## Threat Flags

No new trust boundaries introduced. All computation is client-side over already-fetched data.

## Self-Check: PASSED
