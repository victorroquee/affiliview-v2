# Architecture Patterns: v1.2 Integration

**Project:** AffiliView v1.2 — Melhorias Afiliados & Upsell
**Researched:** 2026-05-04
**Based on:** Full codebase read (src/lib/, src/hooks/, src/pages/, src/components/)

---

## Current Architecture (Confirmed from Code)

The system has a clean three-layer pattern:

```
API Layer          Data Layer              UI Layer
─────────────      ─────────────────────   ──────────────────────
useDigistoreAPI    transactions.ts         Dashboard.tsx
(fetch + cache)    analyzeCPA.ts           Affiliates.tsx
                   useAffiliateTags.ts     AffiliateDrawer.tsx
                   useFilters.ts           CpaVariavel.tsx
                   useCPACalculator.ts     CpaFixo.tsx
```

Data flows top-down: `App.tsx` holds raw `rows` (TransactionRow[]) and `filteredRows`, passes both down as props. No global state manager — pure prop drilling from App.

### Key Confirmed Facts

**Status tiers — already fully implemented (v1.1):**
- `AffiliateRanking` type: `"Tier 1" | "Tier 2" | "Tier 3" | "Ativo" | "Em Rampa" | "Inativo"`
- `computeAffiliateRankings(allRows)` in `transactions.ts` — 7-day rolling window, T1/T2/T3 consistency rule, Ativo ≥10 sales, Em Rampa 1–9 sales
- `AffiliateRankingInfo` carries `days[]`, `frontSalesInWindow`, `windowStart/End`, `lastFrontSaleDate`
- Full tier UI in `AffiliateDrawer.tsx` (day squares, progress bars, next-tier prompt)
- `Affiliates.tsx` shows status filter tabs (all / Ativo / Em Rampa / Inativo) + summary badges

**Upsell breakdowns — already fully implemented (v1.1):**
- `computeBackendProducts(rows)` → `UpsellProductRow[]` — aggregates up1-3/down1-3 by product name
- `computeAffiliateUpsells(filteredRows, affiliateName)` → `AffiliateUpsellBreakdown` — per-affiliate upsell table with AOV contribution
- `AffiliateDrawer.tsx` renders the "Upsells Vendidos" section using `computeAffiliateUpsells`
- `computeTopProductPerAffiliate(allRows)` → `Map<string, string>` — top front product per affiliate in 7-day window, shown in `Affiliates.tsx` table

**Tags with localStorage — already fully implemented (v1.1):**
- `useAffiliateTags` hook: `readTagsFromStorage`, `writeTagsToStorage`, `addTagToMap`, `removeTagFromMap`, `getTagsFor`, `allTagsFromMap`
- localStorage key: `"affiliview-affiliate-tags"`, format: `Record<string, string[]>`
- Tag display on rows in `Affiliates.tsx`, tag filter bar (product-tabs style)
- Tag assignment in `AffiliateDrawer.tsx` (chip + input + Enter key)

**What is NOT yet done for v1.2** (delta from PROJECT.md Active requirements):
1. `"Ativo"` logic audit — suspicion of 21 vs 4 discrepancy (bug or stale state)
2. Margin color thresholds — `>10% green, 5-10% yellow, <5% red` (current: different threshold in `Affiliates.tsx`)
3. Refund % with colors (orange ≤8%, red >8%) in more places
4. Refund % column in Performance por kit (Front) table in Dashboard
5. Inactive affiliates listing with count (currently exists but verify completeness)

> Most of the v1.2 feature surface was built in v1.1. v1.2 is primarily bug-fixes, threshold corrections, and visual polish — not new data infrastructure.

---

## Component Boundaries

| Component | File | Responsibility | Receives | Emits |
|-----------|------|---------------|----------|-------|
| App | src/App.tsx | Routing, data fetch orchestration | — | filteredRows, allRows, periodDays to pages |
| AffiliatesPage | src/pages/Affiliates.tsx | Affiliate list with filters, status badges | filteredRows, allRows, periodDays | opens AffiliateDrawer |
| AffiliateDrawer | src/components/AffiliateDrawer.tsx | Per-affiliate detail: tags, metrics, tier analysis, upsell breakdown | AffiliateRow, AffiliateRankingInfo, filteredRows | — |
| Dashboard | src/pages/Dashboard.tsx | Global KPI cards, charts, tables, mini affiliate table | filteredRows, allRows, periodDays | opens AffiliateDrawer |
| transactions.ts | src/lib/transactions.ts | All pure computation: rankings, upsell aggregation, period metrics | TransactionRow[] | typed result objects |
| useAffiliateTags | src/hooks/useAffiliateTags.ts | localStorage tag CRUD | — | tags map, addTag, removeTag |

---

## Data Flow for New Features

### Status Tiers (already in transactions.ts)

```
allRows (TransactionRow[])
  → computeAffiliateRankings(allRows)        [transactions.ts]
  → Map<string, AffiliateRankingInfo>
  → Affiliates.tsx: statusFilter, badges     [UI display]
  → AffiliateDrawer: tier analysis section   [detail view]
```

The `allRows` (not `filteredRows`) is intentionally used for rankings because tier status is based on the rolling 7-day window from the most recent data point, independent of the period filter selected by the user.

### Upsell Breakdowns (already in transactions.ts)

```
filteredRows (TransactionRow[])
  → computeBackendProducts(filteredRows)     [transactions.ts] → Dashboard "Backend" table
  → computeAffiliateUpsells(filteredRows, name) → AffiliateDrawer "Upsells Vendidos" section
  → computeTopProductPerAffiliate(allRows)   → Affiliates.tsx "Top Produto (7d)" column
```

`computeAffiliateUpsells` is called lazily inside `AffiliateDrawer` using `useMemo` on `filteredRows` — only triggers when drawer opens.

### Tags (already in useAffiliateTags)

```
localStorage["affiliview-affiliate-tags"]
  → useAffiliateTags() hook (useState initialized from localStorage)
  → tags: Record<string, string[]>
  → Affiliates.tsx: tagFilter state, tag chips on rows, tag filter bar
  → AffiliateDrawer: tag chip display + inline add/remove input
```

Both `Affiliates.tsx` and `AffiliateDrawer.tsx` call `useAffiliateTags()` independently. They share state via localStorage — React state is separate instances but both read/write the same key. This is safe because the only mutation path is `addTag`/`removeTag` which call `writeTagsToStorage` synchronously before setting state.

---

## What Remains for v1.2

### Bug Fix: "Ativo" Discrepancy (21 vs 4)

**Location:** `computeAffiliateRankings` in `transactions.ts`

The v1.1 audit notes a "21 vs 4 active affiliates" discrepancy was addressed (STAT-02 marked satisfied), but PROJECT.md still lists "Auditoria e correção da lógica 'Ativo'" as Active. The actual bug path to investigate:

- The Dashboard's `activosCount` is derived from `computeAffiliateRankings(allRows)` counting Tier 1/2/3 + Ativo
- `Affiliates.tsx` computes the same count from the same function
- If counts still differ, the suspect is `isMaileonardo` filtering — Dashboard filters `allRows` before passing to rankings, but there may be inconsistency in how Maileonardo is filtered between the two pages
- Specifically check: `allRows.filter((r) => !isMaileonardo(r.affiliate))` is applied in both Dashboard.tsx:66 and Affiliates.tsx:71

**No new data model needed.** Fix is in filtering consistency, not in ranking logic.

### Visual Fix: Margin Color Thresholds

**Location:** `Affiliates.tsx` line ~230 and `AffiliateDrawer.tsx` line ~97

Current code in `Affiliates.tsx`:
```typescript
const margemColor = a.margem >= 10 ? "green" : a.margem >= 5 ? "orange" : "red";
```

This is already correct (≥10 green, 5–10 orange/yellow, <5 red). Verify this matches what's actually rendered — the CSS class `orange` must map to a yellow/amber color in `index.css`. Check that `AffiliateDrawer.tsx` uses the same exact thresholds.

**No data model change needed.** CSS class name and threshold verification only.

### Visual Fix: Refund % Colors

**Location:** `AffiliateDrawer.tsx` line ~198 and `Affiliates.tsx` line ~283

Current drawer code:
```typescript
cls: affiliate.refundCbPct > 8 ? "red" : affiliate.refundCbPct > 0 ? "orange" : ""
```

PROJECT.md specifies: orange ≤8%, red >8%. The current code shows orange for any non-zero value ≤8%, which is correct. Verify whether the Affiliates table row also applies this correctly at line 283.

**No data model change needed.**

### New Column: Refund % in Performance por Kit Table

**Location:** `src/components/ProductTable.tsx` — `BundlePerformanceTable` component

`BundleRow` type in `transactions.ts` already has `refundPct` field. The `BundlePerformanceTable` just needs an additional column header and cell rendering `refundPct` with the same orange/red color logic.

**Data model:** Already exists. UI change only — add `<th>` and `<td>` to `BundlePerformanceTable`.

### Inactive Affiliates Listing with Count

Already implemented in `Affiliates.tsx`:
- `inativoCount` badge is shown
- The `statusFilter === "Inativo"` tab filters to inactive affiliates
- `lastFrontSaleDate` shows "Última venda: X dias atrás"

Verify the inactive count shown in Dashboard's KPI card (`inativoCount`) matches what appears in the Affiliates page filter. If not, the same Maileonardo filtering inconsistency applies.

---

## Integration Points: New vs Modified

### Modified Files (no new files needed)

| File | Change Type | What Changes |
|------|-------------|-------------|
| `src/lib/transactions.ts` | Bug fix | Verify `computeAffiliateRankings` filtering is consistent; add `refundPct` to `BundleRow` if missing (already present) |
| `src/components/ProductTable.tsx` | UI addition | Add Refund % column to `BundlePerformanceTable` |
| `src/pages/Affiliates.tsx` | Bug fix + verify | Confirm Maileonardo filter applied consistently for ranking counts |
| `src/pages/Dashboard.tsx` | Bug fix + verify | Confirm Maileonardo filter applied consistently for ranking counts |
| `src/components/AffiliateDrawer.tsx` | Verify | Confirm margin and refund color thresholds match spec |
| `src/index.css` | Verify/fix | Confirm `orange` CSS class renders as amber/yellow (not literally orange-hue) for margin display |

### No New Files Required

All data infrastructure for v1.2 features exists. The new features are:
- Threshold corrections (CSS/logic, not new types)
- One additional table column (data field exists, just not rendered)
- Bug investigation on count discrepancy (filtering, not new logic)

---

## Suggested Build Order

### Phase 1 (Foundation Audit): Ativo Logic Fix
**Why first:** The Ativo discrepancy is a correctness bug. Everything else builds on correct counts. If the bug is in Maileonardo filtering, fixing it once in transactions.ts or in consistent filter application fixes all downstream counts simultaneously.

Tasks:
1. Add `console.log` in development to compare `rankings.size` before/after Maileonardo filter in both Dashboard and Affiliates
2. Verify `computeAffiliateRankings` receives the same filtered `allRows` in both pages
3. If discrepancy persists, trace whether some affiliate names pass `isMaileonardo()` in one context but not another (e.g., whitespace or casing in affiliate names from the API)

### Phase 2 (Visual Corrections): Color Thresholds + Refund Column
**Why second:** Visual changes are low-risk and independently testable. No data model impact.

Tasks:
1. Audit `margemColor` computation in `Affiliates.tsx` and `AffiliateDrawer.tsx` — confirm both use `>= 10 / >= 5` not `> 10 / > 5`
2. Audit refund color logic in both files — confirm `> 8` red vs `> 0` orange
3. Add Refund % column to `BundlePerformanceTable` in `ProductTable.tsx`:
   - Header: `<th style={{ textAlign: "right" }}>Refund %</th>`
   - Cell: `<td className={...colorClass}>{formatPct(row.refundPct)}</td>` with same orange/red logic

### Phase 3 (Verification): End-to-End Check
**Why last:** Validates all pieces connect correctly after fixes.

Tasks:
1. Verify inactive count on Dashboard matches inactive count tab in Affiliates
2. Verify tier badges on Affiliates page match drawer tier analysis
3. Verify tag filter survives page navigation (localStorage persistence)
4. Verify upsell table in drawer shows data for affiliates with known upsell activity

---

## Architecture Invariants (Do Not Break)

1. **allRows vs filteredRows distinction is intentional.** Rankings use `allRows` because they are period-independent (7-day window from latest data point). Never replace `allRows` with `filteredRows` in ranking calls.

2. **useAffiliateTags is called independently in Affiliates.tsx and AffiliateDrawer.tsx.** This is correct by design — both share localStorage state. Do not lift tags to App.tsx props to avoid prop drilling; the hook pattern is the right abstraction here.

3. **analyzeCPA (in cpa/) and computeFromFiltered (in transactions.ts) are separate pipelines.** The CPA pages use `analyzeCPA` which has its own upsell accumulation keyed by front variant. The Affiliates/Dashboard pages use `computeFromFiltered` + `computeAffiliateUpsells`. Do not merge these — they serve different purposes (LTV margin simulation vs period performance display).

4. **Maileonardo is always filtered out before aggregation.** The pattern is `allRows.filter((r) => !isMaileonardo(r.affiliate))`. Apply this filter consistently before any `compute*` call that feeds the Affiliates page.

5. **Upsell detection is dual-mode.** `upsellNo === 0` from the API is the authoritative front/upsell discriminator. Name-based detection (`isUpsellByName`) is a legacy fallback for CSV data. New code must use `upsellNo`, not name-based detection.

---

## Risk Areas

| Risk | Severity | Notes |
|------|----------|-------|
| Maileonardo filter inconsistency | Medium | Most likely cause of count discrepancy; affects Dashboard vs Affiliates parity |
| `BundleRow.refundPct` semantics | Low | Field exists; confirm it's count-based (reembolsos/vendas) not amount-based — matches KPI semantics in the kit table context |
| `orange` CSS class vs amber | Low | Check `index.css` — if the class is purely orange-hue it may look off for "margin warning" context; may need a separate `yellow` or `amber` class |
| Em Rampa progress bar at exactly 10 sales | Low | v1.1 audit flagged this as needing human testing; edge case in `passes = sales >= 1 && sales < 10` boundary |

---

## Sources

- `src/lib/transactions.ts` — full read; all compute functions confirmed
- `src/lib/cpa/analyzeCPA.ts` — full read; separate CPA pipeline confirmed
- `src/components/AffiliateDrawer.tsx` — full read; all sections confirmed implemented
- `src/pages/Affiliates.tsx` — full read; filter logic, tag display, ranking counts confirmed
- `src/pages/Dashboard.tsx` — partial read; compute calls and counts confirmed
- `src/hooks/useAffiliateTags.ts` — full read; localStorage pattern confirmed
- `.planning/PROJECT.md` — v1.2 active requirements
- `.planning/milestones/v1.1-MILESTONE-AUDIT.md` — what was shipped, what is tech debt
- `.planning/milestones/v1.1-REQUIREMENTS.md` — requirement IDs and traceability
