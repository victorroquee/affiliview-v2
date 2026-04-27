---
phase: 06-dados-de-backend-e-upsell
plan: "02"
subsystem: ui-layer
tags: [upsell, backend, dashboard, affiliate-drawer, affiliates, ui]
dependency_graph:
  requires:
    - 06-01 (computeBackendProducts, computeAffiliateUpsells, computeTopProductPerAffiliate)
  provides:
    - Dashboard backend products table (Resultados de Backend)
    - AffiliateDrawer upsell breakdown section (Upsells Vendidos)
    - Affiliates table Top Produto (7d) column
  affects:
    - src/pages/Dashboard.tsx
    - src/components/AffiliateDrawer.tsx
    - src/pages/Affiliates.tsx
tech_stack:
  added: []
  patterns:
    - useMemo for derived UI data from filteredRows/allRows
    - Prop extension (filteredRows added to AffiliateDrawerProps)
    - Conditional rendering ({data.length > 0 && ...} pattern)
key_files:
  created: []
  modified:
    - src/pages/Dashboard.tsx
    - src/components/AffiliateDrawer.tsx
    - src/pages/Affiliates.tsx
decisions:
  - "filteredRows passed to AffiliateDrawer from both Dashboard and Affiliates call sites — single source of truth for period context"
  - "backendProducts table placed after BundlePerformanceTable and before footer — natural reading flow from front to backend"
  - "topProducts computed from allRows (not filteredRows) to match 7-day rolling window semantics of computeTopProductPerAffiliate"
metrics:
  duration: "~15 minutes"
  completed_date: "2026-04-27"
  tasks_completed: 2
  tasks_total: 3
  files_changed: 3
---

# Phase 06 Plan 02: Backend/Upsell UI Integration — Summary

**One-liner:** Wired computeBackendProducts, computeAffiliateUpsells, and computeTopProductPerAffiliate into Dashboard table, AffiliateDrawer section, and Affiliates column.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Add backend products table to Dashboard + upsell breakdown to AffiliateDrawer | c8821e8 | src/pages/Dashboard.tsx, src/components/AffiliateDrawer.tsx, src/pages/Affiliates.tsx |
| 2 | Add top product badge to Affiliates table | 1bbbc0b | src/pages/Affiliates.tsx |

## What Was Built

**Dashboard.tsx (BKND-01):**
- Added `computeBackendProducts` and `UpsellProductRow` imports
- `backendProducts` useMemo computed from `filteredRows`
- "Resultados de Backend (Upsells/Downsells)" table rendered after BundlePerformanceTable, showing product name, classification (up1/up2/etc.), quantity, gross, and contribution %

**AffiliateDrawer.tsx (BKND-02, BKND-03):**
- Added `filteredRows: TransactionRow[]` prop to `AffiliateDrawerProps`
- Added `computeAffiliateUpsells` and `TransactionRow` imports
- `upsellData` useMemo computes per-affiliate upsell breakdown when drawer is open
- "Upsells Vendidos" section with product table (quantity, gross, AOV+, %AOV) and summary line (AOV total, front sales count, total upsell gross)

**Affiliates.tsx (BKND-04):**
- Added `computeTopProductPerAffiliate` import
- `topProducts` useMemo computed from `allRows` (Maileonardo excluded)
- New "Top Produto (7d)" column between "Afiliado" and "Ranking"
- Badge cell per row (product name or dash)
- colSpan updated from 12 to 13

**Call site updates:**
- Dashboard.tsx: `filteredRows={filteredRows}` passed to AffiliateDrawer
- Affiliates.tsx: `filteredRows={filteredRows}` passed to AffiliateDrawer

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all three UI sections are wired to real computed data from filteredRows/allRows. No placeholder values.

## Threat Flags

None — display-only rendering of authenticated Digistore24 data. No new network endpoints or trust boundaries introduced.

## Checkpoint: Awaiting Human Verification

Tasks 1 and 2 are complete. Task 3 is a `checkpoint:human-verify` gate.

**What was built and needs visual verification:**
1. Dashboard: "Resultados de Backend (Upsells/Downsells)" table after the Bundle Performance section
2. AffiliateDrawer: "Upsells Vendidos" section with AOV contribution breakdown
3. Affiliates: "Top Produto (7d)" column with product badges

## Self-Check: PASSED

- `src/pages/Dashboard.tsx` modified with computeBackendProducts + table
- `src/components/AffiliateDrawer.tsx` modified with filteredRows prop + upsellData + Upsells Vendidos section
- `src/pages/Affiliates.tsx` modified with computeTopProductPerAffiliate + Top Produto column + colSpan 13
- Commit c8821e8 verified in git log
- Commit 1bbbc0b verified in git log
- `npx tsc --noEmit` passes with no errors
