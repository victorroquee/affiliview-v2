---
phase: 04-status-de-afiliados
plan: "03"
subsystem: affiliates-ui
tags: [react, tsx, affiliate-status, em-rampa, filter-tabs, status-badges]
dependency_graph:
  requires:
    - AffiliateRanking type with Em Rampa (04-01)
    - lastFrontSaleDate field on AffiliateRankingInfo (04-01)
    - tier-em-rampa CSS badge class (04-01)
    - aff-summary-badges CSS class (04-01)
    - aff-last-sale CSS class (04-01)
    - aff-filter-empty CSS class (04-01)
    - product-tabs / product-tab CSS classes (existing)
  provides:
    - statusFilter state on Affiliates page
    - Summary badges (Ativos / Em Rampa / Inativos counts)
    - Filter tabs (Todos, Ativos, Em Rampa, Inativos)
    - Ranked sort order on affiliate table
    - Ultima venda sub-label for Inativo rows
    - Em Rampa in legend and RANKING_TOOLTIP
  affects:
    - src/pages/Affiliates.tsx (primary output)
tech_stack:
  added: []
  patterns:
    - statusFilter state + filteredAffiliates useMemo pattern
    - RANKING_SORT_ORDER map for deterministic sort
    - formatDaysAgo helper for relative date display
    - filteredAffiliates.length === 0 conditional for empty state in tbody
key_files:
  created: []
  modified:
    - src/pages/Affiliates.tsx
decisions:
  - Used `statusFilter === "Ativo"` as the tab value to include Tier 1/2/3 + Ativo affiliates under one "Ativos" tab (label differs from value intentionally)
  - Summary badge counts derive from `rankings` Map (all-rows based) rather than `affiliates` array (period-filtered), ensuring counts reflect true classification not just affiliates visible in current period
  - sortedAffiliates sorts by RANKING_SORT_ORDER first, then gross descending within the same rank
metrics:
  duration: "~10 minutes"
  completed: "2026-04-27"
  tasks_completed: 1
  tasks_total: 2
---

# Phase 04 Plan 03: Affiliates Status UI Summary

Affiliates page updated with status filter tabs (Todos/Ativos/Em Rampa/Inativos), summary badge row, ranking-based sort order, Ultima venda sub-label for inactive affiliates, and Em Rampa entries in legend and tooltip. Pending human verification (Task 2).

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | Add Em Rampa to maps, filter state, summary badges, filter tabs, sort order, and Ultima venda | 6059198 | src/pages/Affiliates.tsx |

## Tasks Pending

| # | Name | Type | Status |
|---|------|------|--------|
| 2 | Verify all status views | checkpoint:human-verify | Awaiting user |

## What Was Built

**Task 1 — Affiliates.tsx changes:**

- `RANKING_LABEL` and `RANKING_CLASS` maps extended to include `"Em Rampa"` key
- `RANKING_SORT_ORDER` map added: Tier 1 (0) → Tier 2 (1) → Tier 3 (2) → Ativo (3) → Em Rampa (4) → Inativo (5)
- `RANKING_TOOLTIP` updated with Em Rampa rule: "Em Rampa: 1–9 vendas/7 dias"
- `formatDaysAgo(iso)` helper added for relative date strings
- `statusFilter` state added (`AffiliateRanking | "all"`, default `"all"`)
- `activeCount`, `emRampaCount`, `inativoCount` derived from `rankings.values()` via useMemo
- `sortedAffiliates` useMemo: sorts by RANKING_SORT_ORDER then gross descending
- `filteredAffiliates` useMemo: applies statusFilter, "Ativo" tab includes Tier 1/2/3 + Ativo
- Summary badges row inserted after section-header with correct CSS classes and colors
- Filter tabs using `product-tabs` / `product-tab` pattern with 4 options
- Table count updated to `filteredAffiliates.length`
- Table body: empty state (td colSpan=12 with aff-filter-empty) when filteredAffiliates is empty
- Table rows iterate `filteredAffiliates` (sorted + filtered) instead of `affiliates`
- Inativo name cell shows `<div className="aff-last-sale">Última venda: {formatDaysAgo(...)}</div>` when `lastFrontSaleDate` is available
- Legend: added Em Rampa entry, fixed Inativo description from "Menos de 10 vendas" to "0 vendas em 7 dias"

## Verification

All acceptance criteria passed:
- `grep -c '"Em Rampa"'` = 6 (>= 6 required)
- `grep -c 'tier-em-rampa'` = 3 (>= 2 required)
- `grep -c 'statusFilter'` = 8 (>= 4 required)
- `grep -c 'filteredAffiliates'` = 4 (>= 3 required)
- `grep -c 'sortedAffiliates'` = 5 (>= 2 required)
- `grep -c 'RANKING_SORT_ORDER'` = 2 (>= 2 required)
- `grep -c 'aff-summary-badges'` = 1
- `grep -c 'aff-last-sale'` = 1
- `grep -c 'aff-filter-empty'` = 1
- `grep -c 'formatDaysAgo'` = 2 (>= 2 required)
- `grep -c 'Em Rampa: 1–9'` = 1
- `grep -c 'product-tabs'` = 1
- `npx tsc --noEmit` exits 0

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all counts derive from live rankings data; filter logic is fully wired.

## Threat Flags

None — no new network endpoints, auth paths, or schema changes introduced. All changes are client-side UI state.

## Self-Check: PASSED

- [x] src/pages/Affiliates.tsx — modified, committed 6059198
- [x] 6059198 commit exists in git log
- [x] TypeScript compiles clean (npx tsc --noEmit exits 0)
- [x] All 13 acceptance criteria grep counts met
