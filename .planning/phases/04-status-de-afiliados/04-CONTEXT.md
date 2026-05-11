# Phase 4: Status de Afiliados - Context

**Gathered:** 2026-04-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can see affiliates correctly classified by activity status (Tier 1/2/3, Ativo, Em Rampa, Inativo) with consistent counts across Dashboard and Affiliates views. The 7-day rolling window is the single source of truth for all status calculations.

</domain>

<decisions>
## Implementation Decisions

### Status Hierarchy & Labels
- Priority order: Tier 1 > Tier 2 > Tier 3 > Ativo (>=10 sales/7d) > Em Rampa (1-9 sales/7d) > Inativo (0 sales/7d)
- Badge color for "Em Rampa": amber/yellow — visually between green (Ativo) and grey (Inativo)
- Em Rampa affiliates appear in the same ranking table, sorted after Ativos, with Em Rampa badge
- Em Rampa does NOT count in "Afiliados Ativos" on Dashboard — only Tier + Ativo (10+ sales)

### Inactive Definition & Period
- Inativo = 0 front sales in the 7-day ranking window (same calculation as Ativo/Em Rampa)
- New KPI card in Dashboard Atividade section: "Inativos no Periodo" showing count
- Inactive list: filter tab/badge on Affiliates page — click "Inativo" to see only inactives
- Show "Ultima venda: X dias atras" for each inactive affiliate

### Dashboard Count Fix (21 vs 4)
- Dashboard "Afiliados Ativos" must count only Tier 1/2/3 + Ativo (10+ sales in 7d) — match ranking logic
- Add status breakdown in tooltip or sub-text: "X Ativos . Y Em Rampa . Z Inativos"
- Affiliates page header shows summary badges: "4 Ativos . 8 Em Rampa . 9 Inativos" above table

### Claude's Discretion
No items deferred to Claude's discretion — all decisions captured.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `computeAffiliateRankings()` in `src/lib/transactions.ts` — main ranking logic, already computes 7-day window
- `AffiliateRanking` type at line 101 — needs "Em Rampa" added
- `ATIVO_MIN_SALES = 10` constant at line 132
- `isTierConsistent()` helper for tier calculation
- `RANKING_LABEL` and `RANKING_CLASS` maps in `Affiliates.tsx` — need Em Rampa entries
- `KPICard` component for Dashboard cards
- `AffiliateDrawer` component for detail panel

### Established Patterns
- Rankings computed from `allRows` (full dataset), not filtered period
- Dashboard metrics computed from `filteredRows` via `computeFromFiltered()`
- Status badges use CSS classes: `tier-1`, `tier-2`, `tier-3`, `tier-ativo`, `tier-inativo`
- KPI cards in Dashboard use `kpi-grid-4` layout in Atividade section

### Integration Points
- `AffiliateRanking` type union in transactions.ts — add "Em Rampa"
- `computeAffiliateRankings()` — modify the assignment logic after tier check
- Dashboard.tsx line 153 — replace `affiliatesSelling.filter(...)` with ranking-based count
- Affiliates.tsx — add status filter UI and summary badges

</code_context>

<specifics>
## Specific Ideas

- Root cause of 21 vs 4: Dashboard counts any affiliate with 1+ payment in period, while ranking uses 7-day tier/sales logic. Fix by using ranking data for Dashboard count.
- "Em Rampa" is a new intermediate status — the current binary Ativo/Inativo splits at 10 sales. Em Rampa fills the 1-9 gap.
- User wants to quickly identify WHO is inactive and for how long — "Ultima venda" date is critical.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>
