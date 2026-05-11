---
phase: 04-status-de-afiliados
plan: "02"
subsystem: dashboard-affiliate-ui
tags: [typescript, dashboard, affiliate-drawer, em-rampa, kpi]
dependency_graph:
  requires:
    - AffiliateRanking type with Em Rampa (from 04-01)
    - lastFrontSaleDate field on AffiliateRankingInfo (from 04-01)
    - computeAffiliateRankings three-way status split (from 04-01)
    - tier-em-rampa CSS badge class (from 04-01)
    - kpi-grid-5 CSS grid layout class (from 04-01)
  provides:
    - Dashboard activosCount derived from rankings Map (not affiliatesSelling)
    - Dashboard emRampaCount and inativoCount derived from rankings Map
    - Dashboard "Inativos no Período" KPI card with UserX icon
    - AffiliateDrawer Em Rampa tier bar row (1-9 sales scale)
    - AffiliateDrawer daysAgo and formatDaysAgo helpers
    - AffiliateDrawer "Ultima venda" display for Inativo affiliates
  affects:
    - src/pages/Dashboard.tsx (now reads rankings for all affiliate counts)
    - src/components/AffiliateDrawer.tsx (fully covers all 6 AffiliateRanking values)
tech_stack:
  added: []
  patterns:
    - Rankings Map used as single source of truth for affiliate counts in Dashboard
    - Inline IIFE pattern for tier bar rows in AffiliateDrawer
    - Relative date formatting (daysAgo/formatDaysAgo) for last-sale display
key_files:
  created: []
  modified:
    - src/pages/Dashboard.tsx
    - src/components/AffiliateDrawer.tsx
decisions:
  - Used info prop instead of sub prop for breakdown text (KPICard does not support sub prop — kept KPICard.tsx unchanged)
  - Em Rampa tier bar uses pct = (sales / 9) * 100 with min-marker at 100% (threshold is 9, not a ratio like Tier bars)
metrics:
  duration: "~10 minutes"
  completed: "2026-04-27"
  tasks_completed: 2
  tasks_total: 2
---

# Phase 04 Plan 02: Dashboard + AffiliateDrawer Em Rampa UI Summary

Dashboard Afiliados Ativos count fixed to use ranking-derived activosCount, plus Inativos KPI card added; AffiliateDrawer gains Em Rampa tier bar and relative-date last-sale display for inactive affiliates.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | Fix Dashboard Afiliados Ativos count and add Inativos KPI card | 0025912 | src/pages/Dashboard.tsx |
| 2 | Update AffiliateDrawer maps, add Em Rampa tier bar, and Ultima venda display | eb59ad4 | src/components/AffiliateDrawer.tsx |

## What Was Built

**Task 1 — Dashboard.tsx changes:**

- `UserX` added to lucide-react import
- Three new `useMemo` hooks added after the existing `rankings` memo:
  - `activosCount` — filters rankings for Tier 1, Tier 2, Tier 3, or Ativo
  - `emRampaCount` — filters rankings for Em Rampa
  - `inativoCount` — filters rankings for Inativo
- "Afiliados Ativos" KPICard replaced: value now uses `activosCount` (previously `affiliatesSelling.filter(...).length`), info tooltip includes breakdown text (`${activosCount} Ativos · ${emRampaCount} Em Rampa · ${inativoCount} Inativos`)
- New "Inativos no Período" KPICard added with `UserX` icon
- Atividade section grid changed from `kpi-grid-4` to `kpi-grid-5`

**Task 2 — AffiliateDrawer.tsx changes:**

- `RANKING_LABEL` map: added `"Em Rampa": "Em Rampa"` entry
- `RANKING_CLASS` map: added `"Em Rampa": "tier-em-rampa"` entry
- `TIER_ORDER` array: inserted `"Em Rampa"` between `"Ativo"` and `"Inativo"` (preserving nextTier logic)
- `daysAgo(iso)` helper: computes integer days since ISO date string
- `formatDaysAgo(iso)` helper: returns "hoje", "ontem", or "{N} dias atrás"
- Em Rampa tier bar row added after Ativo row: scales sales/9, threshold label "1–9 vendas", min-marker at 100%
- "Ultima venda" display added for Inativo affiliates: shows `formatDaysAgo(rankingInfo.lastFrontSaleDate)` when lastFrontSaleDate is non-null

## Verification

- `npx tsc --noEmit` exits 0 (no TypeScript errors)
- Dashboard "Afiliados Ativos" value comes from `activosCount` (ranking-based), not `affiliatesSelling`
- Dashboard has "Inativos no Período" KPI card with `UserX` icon
- AffiliateDrawer renders Em Rampa tier bar between Ativo bar and closing section
- AffiliateDrawer shows "Ultima venda" for Inativo affiliates using lastFrontSaleDate

## Deviations from Plan

### Minor — grep count for "Em Rampa" is 4, not 5

**Found during:** Task 2 acceptance criteria check
**Issue:** The plan's acceptance criteria states `grep '"Em Rampa"' returns at least 5 matches`. Actual count is 4. The tier bar badge text `>Em Rampa<` is JSX text (not a double-quoted string literal), so `grep '"Em Rampa"'` does not capture it.
**Impact:** None — functional correctness is complete. RANKING_LABEL, RANKING_CLASS, TIER_ORDER, and isActive check all use `"Em Rampa"`. The badge renders correctly in JSX.
**Pattern:** Same as Plan 01's deviation note on grep count thresholds vs. functional correctness.

### Design — KPICard does not support `sub` prop

**Found during:** Task 1, step 6 (check KPICard component)
**Issue:** KPICard.tsx has no `sub` prop — only `icon`, `label`, `value`, `info`, `color`, `trend`, `trendDir`.
**Fix:** Breakdown text (`{activosCount} Ativos · {emRampaCount} Em Rampa · {inativoCount} Inativos`) included in `info` tooltip instead of a separate sub-line.
**Files modified:** None (KPICard.tsx kept unchanged per plan instructions)

## Self-Check: PASSED

- [x] src/pages/Dashboard.tsx — modified, committed 0025912
- [x] src/components/AffiliateDrawer.tsx — modified, committed eb59ad4
- [x] 0025912 commit exists in git log
- [x] eb59ad4 commit exists in git log
- [x] TypeScript compiles clean (tsc --noEmit exits 0)
- [x] activosCount, emRampaCount, inativoCount defined in Dashboard.tsx
- [x] UserX imported and used in Dashboard.tsx
- [x] kpi-grid-5 class used in Dashboard.tsx
- [x] "Em Rampa" in RANKING_LABEL, RANKING_CLASS, TIER_ORDER in AffiliateDrawer.tsx
- [x] Em Rampa tier bar row present with "1–9 vendas" threshold label
- [x] daysAgo and formatDaysAgo helper functions defined
- [x] "Ultima venda" conditional rendering present for Inativo affiliates
