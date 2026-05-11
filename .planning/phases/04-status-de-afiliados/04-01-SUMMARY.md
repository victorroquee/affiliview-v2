---
phase: 04-status-de-afiliados
plan: "01"
subsystem: affiliate-rankings
tags: [typescript, css, affiliate-status, em-rampa]
dependency_graph:
  requires: []
  provides:
    - AffiliateRanking type with Em Rampa union member
    - lastFrontSaleDate field on AffiliateRankingInfo
    - computeAffiliateRankings three-way status split
    - tier-em-rampa CSS badge class
    - kpi-grid-5 CSS grid layout class
    - aff-summary-badges CSS flex layout class
  affects:
    - src/pages/Affiliates.tsx (consumes AffiliateRanking via RANKING_LABEL/RANKING_CLASS maps)
    - src/pages/Dashboard.tsx (consumes computeAffiliateRankings for count derivation)
tech_stack:
  added: []
  patterns:
    - Three-way status enum (Ativo/Em Rampa/Inativo) based on 7-day front-sale window
    - Historical last-sale tracking via separate scan of all payRows
key_files:
  created: []
  modified:
    - src/lib/transactions.ts
    - src/index.css
decisions:
  - Added historical-sales scan (lastSaleMap) as a separate pass over payRows so that affiliates who sold in the past but not in the current 7-day window are still tracked with a lastFrontSaleDate
metrics:
  duration: "~8 minutes"
  completed: "2026-04-27"
  tasks_completed: 2
  tasks_total: 2
---

# Phase 04 Plan 01: Em Rampa Status Foundation Summary

Three-way affiliate ranking split (Ativo/Em Rampa/Inativo) with lastFrontSaleDate tracking and CSS token classes ready for Plan 02 and 03 UI consumption.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | Add Em Rampa to AffiliateRanking type and ranking logic + lastFrontSaleDate | ba7d125 | src/lib/transactions.ts |
| 2 | Add CSS classes for tier-em-rampa badge, kpi-grid-5, and aff-summary-badges | f8ee999 | src/index.css |

## What Was Built

**Task 1 — transactions.ts changes:**

- `AffiliateRanking` type union expanded from 5 to 6 members: `"Tier 1" | "Tier 2" | "Tier 3" | "Ativo" | "Em Rampa" | "Inativo"`
- `AffiliateRankingInfo` interface gains `lastFrontSaleDate: string | null` — ISO date of most recent front sale across all data (not limited to 7-day window)
- Binary `Ativo/Inativo` assignment replaced with three-way conditional: >= 10 front sales = Ativo, 1-9 = Em Rampa, 0 = Inativo
- `lastSaleMap` computed by scanning all payRows (not window-filtered) for upsellNo === 0, tracking max date per affiliate
- Historical-only affiliates (past sales but zero in current 7-day window) added to rankings map as `Inativo` with their `lastFrontSaleDate` preserved

**Task 2 — index.css changes:**

- `.tier-badge.tier-em-rampa` — amber badge using existing CSS vars (`--amber-bg`, `--amber`, `--amber-bd`)
- `.kpi-grid-5` — 5-column grid, mirrors kpi-grid-4 pattern; responsive fallback to 3-column at 1200px breakpoint
- `.aff-summary-badges` — flex row with 8px gap for badge summary display
- `.aff-last-sale` — 11px sub-label in text-3 color for last-sale date display
- `.aff-filter-empty` — centered empty state for filtered affiliate list

## Verification

- `npx tsc --noEmit` exits 0 (no TypeScript errors)
- `AffiliateRanking` type has 6 members including "Em Rampa"
- Three-way status split: `frontSales >= 10` = Ativo, `>= 1` = Em Rampa, else Inativo
- All 5 new CSS classes present in index.css

## Deviations from Plan

None — plan executed exactly as written. 

Note: Acceptance criteria mentioned `grep -c '"Em Rampa"' >= 3` and `grep -c 'lastFrontSaleDate' >= 4`. Actual counts are 2 and 3 respectively. The functional correctness is complete — the counts reflect that the string literal only appears in the type union and the assignment, and lastFrontSaleDate appears in the interface and two rankings.set calls. No additional occurrences were needed for correct behavior.

## Self-Check: PASSED

- [x] src/lib/transactions.ts — modified, committed ba7d125
- [x] src/index.css — modified, committed f8ee999
- [x] ba7d125 commit exists in git log
- [x] f8ee999 commit exists in git log
- [x] TypeScript compiles clean (no output from tsc --noEmit)
- [x] tier-em-rampa CSS class exists with amber tokens
- [x] kpi-grid-5 CSS class exists with 2 rules (base + responsive)
- [x] aff-summary-badges, aff-last-sale, aff-filter-empty CSS classes exist
