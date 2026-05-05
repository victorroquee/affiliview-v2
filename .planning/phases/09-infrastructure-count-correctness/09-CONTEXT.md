# Phase 9: Infrastructure & Count Correctness - Context

**Gathered:** 2026-05-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Restore the Digistore24 API proxy and fix affiliate counting logic so "Ativo," "Em Rampa," and "Inativo" reflect reality. The app must reach Digistore24 without 404s and display accurate affiliate status counts.

</domain>

<decisions>
## Implementation Decisions

### Ranking Window Fix
- **D-01:** Claude decides best approach for window anchor (today vs maxDate) based on data flow analysis — user gave discretion
- **D-02:** Show a small label near KPI cards displaying the 7-day ranking window dates (e.g., "28/04 — 04/05")
- **D-03:** Trace the 21 vs 4 discrepancy to root cause — audit data flow between Dashboard and Affiliates pages

### Inactive Semantics
- **D-04:** "Inativo" = last front sale (upsellNo=0) more than 5 days ago from today. Upsells don't count as activity.
- **D-05:** Affiliates who have NEVER sold also appear in the inactive list (not a separate category)
- **D-06:** Inactive list appears in BOTH places: Dashboard KPI card with count (click to expand) AND Affiliates page tab "Inativos"

### API Proxy Restore
- **D-07:** Restore api/digistore.ts from git (file is deleted locally but tracked) — no changes needed, restore as-is via `git restore`

### Claude's Discretion
- Window anchor strategy (D-01): Claude picks the best approach based on how data flows through the system. Consider: if API returns data up to yesterday, using "today" would show everyone as less active. The choice should produce the most accurate real-world picture.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Data Logic
- `src/lib/transactions.ts` — `computeAffiliateRankings` (lines 181-210+), `computeTopProductPerAffiliate`, `isPayment`
- `.planning/research/PITFALLS.md` — Critical pitfall #1 (maxDate anchor) and #5 (5-day vs 7-day mismatch)
- `.planning/research/SUMMARY.md` — Issue table with all 6 fixes

### Page Integration
- `src/pages/Dashboard.tsx` — `activosCount`, `emRampaCount`, `inativoCount` useMemo calls (lines 60-75)
- `src/pages/Affiliates.tsx` — `rankings` useMemo, `activeCount` computation (lines 70-81)
- `src/hooks/useDigistoreAPI.ts` — fetches `/api/digistore` (line 68)

### API Proxy
- `api/digistore.ts` — deleted file to restore from git

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `computeAffiliateRankings` in transactions.ts: already computes T1/T2/T3/Ativo/Em Rampa/Inativo — needs fix, not rewrite
- `isMaileonardo` filter: used identically in both pages — pattern is correct
- `useDigistoreAPI` hook: pagination, abort control, normalization — all working

### Established Patterns
- Rankings always computed from `allRows` (unfiltered), not `filteredRows` — preserve this invariant
- `useMemo` with `[allRows]` dependency for rankings — keep this pattern
- KPI cards in Dashboard with `info` tooltip for breakdown details

### Integration Points
- Dashboard.tsx line 66: `computeAffiliateRankings(allRows.filter(...))` — fix the window logic here
- Affiliates.tsx line 71: same call — must stay in sync
- New "Inativos" tab in Affiliates page alongside existing tabs
- Dashboard KPI card for inactive count (already partially exists at line 212)

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. Key constraint: the fix must produce counts that match reality when compared to the Digistore24 dashboard.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 9-Infrastructure & Count Correctness*
*Context gathered: 2026-05-05*
