---
phase: 04-status-de-afiliados
verified: 2026-04-27T00:00:00Z
status: human_needed
score: 10/11 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Confirm STAT-03 inactivity threshold interpretation is acceptable"
    expected: "Inativo KPI shows affiliates with 0 front sales in the full 7-day ranking window. STAT-03 requires '5 dias sem vendas'. Verify that the 7-day-zero-sales definition is acceptable in place of the literal 5-consecutive-days threshold."
    why_human: "An affiliate who sold once on day 7 (6 days ago) is classified as Em Rampa, not Inativo — they would have 5+ days without a sale but do not appear in the Inativo count. This may or may not match business intent. Cannot resolve programmatically."
  - test: "Visual correctness of Affiliates page status UI"
    expected: "Summary badges show correct colors (green Ativos, amber Em Rampa, grey Inativos). Filter tabs switch table content correctly. Inativo rows show 'Ultima venda: X dias atras' below name. Sort order Tier 1 > Tier 2 > Tier 3 > Ativo > Em Rampa > Inativo."
    why_human: "Visual rendering and interactive tab behavior cannot be verified programmatically."
  - test: "Dashboard count consistency"
    expected: "Dashboard 'Afiliados Ativos' count matches Affiliates page 'Ativos' badge count. Dashboard 'Inativos no Periodo' count matches Affiliates page 'Inativos' badge count."
    why_human: "Requires running the app with real data to compare numbers across views."
  - test: "AffiliateDrawer Em Rampa tier bar rendering"
    expected: "Clicking an Em Rampa affiliate opens drawer showing amber 'Em Rampa' badge, tier bar with '1-9 vendas' threshold, and progress bar scaled to 9. Inativo affiliates show 'Ultima venda: X dias atras'."
    why_human: "Interactive drawer behavior requires running the app."
---

# Phase 4: Status de Afiliados — Verification Report

**Phase Goal:** Users can see affiliates correctly classified by activity status with consistent counts across all views
**Verified:** 2026-04-27
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | AffiliateRanking type includes 'Em Rampa' as a valid union member | VERIFIED | `src/lib/transactions.ts` line 101: `"Tier 1" \| "Tier 2" \| "Tier 3" \| "Ativo" \| "Em Rampa" \| "Inativo"` |
| 2 | Affiliates with 1-9 front sales in 7-day window are assigned 'Em Rampa' ranking | VERIFIED | `transactions.ts` lines 231-232: `else if (data.frontSales >= 1) { assigned = "Em Rampa"; }` |
| 3 | Affiliates with 0 front sales in 7-day window are assigned 'Inativo' ranking | VERIFIED | `transactions.ts` lines 233-235: `else { assigned = "Inativo"; }` + historical affiliates loop lines 261-274 |
| 4 | Each affiliate ranking info includes lastFrontSaleDate (ISO string or null) | VERIFIED | `transactions.ts` line 118: `lastFrontSaleDate: string \| null` in `AffiliateRankingInfo`; populated via `lastSaleMap` at lines 205-215, used at lines 256 and 272 |
| 5 | CSS class tier-em-rampa exists with amber color tokens | VERIFIED | `src/index.css` line 838: `.tier-badge.tier-em-rampa { background: var(--amber-bg); color: var(--amber); border: 1px solid var(--amber-bd); }` |
| 6 | CSS class kpi-grid-5 exists with 5-column grid | VERIFIED | `src/index.css` lines 487-490: 5-column grid; line 2715 responsive 3-column override |
| 7 | CSS class aff-summary-badges exists with flex layout | VERIFIED | `src/index.css` lines 842-846: `display: flex; gap: 8px; align-items: center; margin-bottom: 12px;` |
| 8 | Dashboard 'Afiliados Ativos' KPI derives count from rankings (Tier 1/2/3 + Ativo only), not affiliatesSelling | VERIFIED | `src/pages/Dashboard.tsx` lines 66-69: `activosCount` filters `rankings.values()` for Tier 1/2/3/Ativo; used as KPICard `value` at line 171 |
| 9 | Dashboard shows breakdown text and has 'Inativos no Periodo' KPI card with UserX icon | VERIFIED | `Dashboard.tsx` lines 172, 174-179: info prop contains `${activosCount} Ativos · ${emRampaCount} Em Rampa · ${inativoCount} Inativos`; `UserX` imported (line 12) and used on "Inativos no Período" card (lines 174-179) |
| 10 | Affiliates page has status filter tabs (Todos, Ativos, Em Rampa, Inativos) wired to filteredAffiliates | VERIFIED | `src/pages/Affiliates.tsx` lines 148-159: `product-tabs` with 4 tab values; lines 94-107: `filteredAffiliates` useMemo applies `statusFilter`; line 190: table renders `filteredAffiliates` |
| 11 | Count of affiliates with 0 sales in 7-day window equals STAT-03 intent (5 dias sem vendas) | UNCERTAIN | Inativo count = affiliates with 0 front sales across full 7-day window. STAT-03 requires "5 dias sem vendas". An affiliate with 1 sale on day 7 is Em Rampa, not Inativo — they have 6 consecutive days without a sale but are excluded from the Inativo count. Threshold interpretation needs human decision. |

**Score:** 10/11 truths verified (1 uncertain — human needed)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/transactions.ts` | Em Rampa ranking logic + lastFrontSaleDate field | VERIFIED | Type union expanded; three-way split logic at lines 228-236; `lastSaleMap` at 205-215; `lastFrontSaleDate` in both rankings.set calls |
| `src/index.css` | tier-em-rampa badge, kpi-grid-5 grid, aff-summary-badges layout | VERIFIED | All 5 CSS classes present: tier-em-rampa (line 838), kpi-grid-5 (487), aff-summary-badges (842), aff-last-sale (849), aff-filter-empty (856) |
| `src/pages/Dashboard.tsx` | Fixed Afiliados Ativos count + Inativos KPI card | VERIFIED | `activosCount` useMemo at line 66; `inativoCount` at 76; Inativos KPI card at lines 174-179; kpi-grid-5 at line 164 |
| `src/components/AffiliateDrawer.tsx` | Em Rampa tier bar + Ultima venda display | VERIFIED | RANKING_LABEL/CLASS/TIER_ORDER include "Em Rampa" (lines 13-21); Em Rampa tier bar IIFE at lines 218-241; Ultima venda conditional at lines 256-260 |
| `src/pages/Affiliates.tsx` | Status filter UI, summary badges, Em Rampa maps, sort order, Ultima venda | VERIFIED | All 13 acceptance criteria verified: statusFilter (line 58), filteredAffiliates (line 94), sortedAffiliates (line 84), RANKING_SORT_ORDER (line 35), summary badges (lines 135-139), filter tabs (lines 148-159), Ultima venda (lines 205-209), legend (lines 242-244) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `src/lib/transactions.ts` | `src/pages/Affiliates.tsx` | AffiliateRanking type consumed by RANKING_LABEL/RANKING_CLASS maps | WIRED | `AffiliateRanking` imported at line 5; RANKING_LABEL and RANKING_CLASS both use full 6-member type |
| `src/lib/transactions.ts` | `src/pages/Dashboard.tsx` | rankings Map from computeAffiliateRankings consumed for count derivation | WIRED | `computeAffiliateRankings` imported (line 24); `rankings` useMemo at line 61; `activosCount`, `emRampaCount`, `inativoCount` all derived from `rankings.values()` |
| `src/pages/Dashboard.tsx` | `src/lib/transactions.ts` | rankings Map consumed | WIRED | `computeAffiliateRankings(allRows.filter(...))` at line 62 |
| `src/components/AffiliateDrawer.tsx` | `src/lib/transactions.ts` | AffiliateRankingInfo.lastFrontSaleDate | WIRED | `lastFrontSaleDate` referenced at line 257 in Inativo conditional; `formatDaysAgo` applied at line 259 |
| `src/pages/Affiliates.tsx statusFilter` | table tbody rendering | filteredAffiliates derived from statusFilter state | WIRED | `filteredAffiliates` useMemo at line 94 reads `statusFilter`; table body at line 190 maps `filteredAffiliates` |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `Dashboard.tsx` activosCount KPI | `activosCount` | `rankings.values()` filtered from `computeAffiliateRankings(allRows)` | Yes — allRows is real transaction data from API | FLOWING |
| `Affiliates.tsx` summary badges | `activeCount`, `emRampaCount`, `inativoCount` | `rankings.values()` from `computeAffiliateRankings(allRows)` | Yes — same live data source | FLOWING |
| `Affiliates.tsx` table | `filteredAffiliates` | `sortedAffiliates` filtered by `statusFilter` state; `sortedAffiliates` from `affiliates` (period-filtered data) | Yes — `affiliates` derives from `computeFromFiltered(filteredRows)` | FLOWING |
| `Affiliates.tsx` Ultima venda | `rankingInfo.lastFrontSaleDate` | `lastSaleMap` in `computeAffiliateRankings` scanning all payRows | Yes — scans all historical transaction rows | FLOWING |

### Behavioral Spot-Checks

TypeScript compiles clean: `npx tsc --noEmit` exits 0 with no output.

No runnable behavioral spot-checks without running the dev server (React SPA). Interactive and visual behaviors deferred to human verification.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| STAT-01 | 04-01, 04-03 | User can see affiliates correctly classified as "Ativo" (10+ vendas em 7 dias) with verified logic | SATISFIED | Three-way split at `transactions.ts` lines 228-236: `>= 10` = Ativo; Affiliates page renders ranking badge per affiliate |
| STAT-02 | 04-02 | User can see consistent active affiliate count between activity menu and ranking views | SATISFIED | Dashboard `activosCount` and Affiliates `activeCount` both derive from `computeAffiliateRankings(allRows)` — same source of truth |
| STAT-03 | 04-02, 04-03 | User can see how many affiliates became inactive in the selected period (5 dias sem vendas) | NEEDS HUMAN | Inativo count = 0 sales in full 7-day window; STAT-03 says "5 dias sem vendas". These are different thresholds — human must confirm 7-day-zero definition is acceptable |
| STAT-04 | 04-03 | User can see which specific affiliates are inactive in the selected period | SATISFIED | "Inativos" filter tab shows all Inativo affiliates; each row shows "Ultima venda: X dias atras" |
| STAT-05 | 04-01, 04-02, 04-03 | User can see affiliates classified as "Em Rampa" (1-9 vendas em 7 dias) | SATISFIED | Em Rampa classification at transactions.ts line 231; Em Rampa filter tab in Affiliates page; amber badge styling throughout |

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| None found | — | — | — |

Scanned all 5 modified files for TODO/FIXME, empty returns, hardcoded empty data, and stub indicators. No anti-patterns found. All state variables (`filteredAffiliates`, `sortedAffiliates`, `activosCount`, etc.) are populated by real data flows — none are hardcoded empty.

### Human Verification Required

#### 1. STAT-03 Inactivity Threshold Interpretation

**Test:** Compare the STAT-03 requirement wording "5 dias sem vendas" against the implementation where Inativo = 0 front sales in the full 7-day ranking window.

**Expected:** Business confirms one of:
- (a) "0 sales in 7 days" is an acceptable and stricter proxy for "5 dias sem vendas" — STAT-03 is considered satisfied, or
- (b) The requirement means affiliates with ANY 5+ consecutive days without a sale should be counted — implementation needs a separate day-streak calculation

**Why human:** An affiliate who sold once on day 6-7 ago has 5+ days with no sale but is classified as Em Rampa (not Inativo) because they have 1 sale in the 7-day window. The implementation's definition is stricter in some ways and looser in others. Business intent cannot be determined programmatically.

#### 2. Visual Correctness — Affiliates Status UI

**Test:** Start dev server (`npm run dev`), navigate to Affiliates page. Verify:
1. Summary badges appear above table with green, amber, and grey colors for Ativos, Em Rampa, and Inativos
2. Click "Em Rampa" tab — table shows only Em Rampa affiliates
3. Click "Inativos" tab — table shows Inativo affiliates with "Ultima venda: X dias atras" below name
4. Click "Ativos" — shows Tier 1/2/3 + Ativo affiliates
5. Table sort order is Tier 1 > Tier 2 > Tier 3 > Ativo > Em Rampa > Inativo
6. Legend includes "Em Rampa: 1–9 vendas em 7 dias"

**Expected:** All filters work; colors are correct; sort order is correct
**Why human:** Interactive tab state and visual rendering cannot be verified programmatically

#### 3. Dashboard Count Consistency

**Test:** With real data loaded: check "Afiliados Ativos" number on Dashboard matches the Ativos badge count on Affiliates page. Check "Inativos no Período" on Dashboard matches Inativos badge count on Affiliates page.

**Expected:** Both pairs of counts are equal (derived from same data source)
**Why human:** Requires running the app with real API data

#### 4. AffiliateDrawer Em Rampa Support

**Test:** Click an Em Rampa affiliate row. Verify drawer shows amber "Em Rampa" badge, tier bar with "1-9 vendas" threshold, and scaled progress bar. Click an Inativo affiliate and verify "Ultima venda: X dias atras" appears.

**Expected:** Drawer renders new Em Rampa tier bar and Inativo last-sale display correctly
**Why human:** Interactive drawer rendering cannot be verified programmatically

### Gaps Summary

No hard gaps. All code artifacts are substantive, wired, and data-flowing. TypeScript compiles clean. The only uncertainty is a business semantics question: whether the Inativo classification (0 sales in 7 days) satisfies STAT-03's "5 dias sem vendas" threshold. This requires a human decision, not a code fix.

---

_Verified: 2026-04-27_
_Verifier: Claude (gsd-verifier)_
