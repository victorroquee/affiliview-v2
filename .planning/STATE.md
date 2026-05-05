---
gsd_state_version: 1.0
milestone: v1.2
milestone_name: Melhorias Afiliados & Upsell
status: planning
stopped_at: Phase 10 context gathered
last_updated: "2026-05-05T10:58:32.135Z"
last_activity: 2026-05-05
progress:
  total_phases: 3
  completed_phases: 1
  total_plans: 2
  completed_plans: 2
  percent: 100
---

# AffiliView — State

## Current Position

Phase: 10
Plan: Not started
Status: Ready to plan
Last activity: 2026-05-05

```
[░░░░░░░░░░] 0% — Phase 9 of 11 (v1.2 phases: 0/3)
```

## Project Reference

See: .planning/PROJECT.md

**Core value:** Know exactly how much margin each affiliate generates per product variant, so CPA can be optimized per-affiliate to maximize profitability.
**Current focus:** Phase 09 — Infrastructure & Count Correctness

## Performance Metrics

- v1.2 phases complete: 0 / 3
- v1.2 requirements mapped: 12 / 12
- v1.2 requirements complete: 0 / 12

## Accumulated Context

### Codebase Facts

- Existing CPA logic lives in `src/lib/cpa/` (analyzeCPA.ts, types.ts, constants.ts, parseHelpers.ts)
- Hook `useCPACalculator` already computes LTV profit per variant per affiliate
- Upsell data is already parsed per affiliate/variant in analyzeCPA.ts
- Existing pages: Dashboard, Affiliates, CpaCalculator, CpaFixo, CpaVariavel, MailSales
- Sidebar navigation: `src/components/Sidebar.tsx`
- Page routing managed via state in `App.tsx`
- Stack: React 19 + TypeScript + Vite 5 + Recharts + Tailwind-style CSS
- Deploy: Vercel serverless functions for Digistore24 API proxy

### Key Findings from v1.2 Research

- `api/digistore.ts` was deleted — production requests get 404 (critical, fix first)
- `computeAffiliateRankings` anchors ranking window to dataset maxDate instead of wall clock (Date.now()) — root cause of 21 vs 4 count bug
- "Inativo" in code = 0 sales in 7-day window; spec = last front sale > 5 days ago — semantics differ, needs business alignment then fix
- Refund color thresholds in ProductTable use >5 orange / >10 red; spec is ≤8 orange / >8 red
- AOV contribution uses grossAmount as numerator against netAmount denominator — mismatch inflates numbers
- `classifyUpsellProduct` regex matches "down10" as "down1" (missing word boundary)
- `topProducts` Map computed in Affiliates.tsx but not passed as prop to AffiliateDrawer
- No drawer-close handler on period filter change — stale mixed-period data risk
- `useAffiliateTags` has no try/catch around localStorage writes

### Research Convergence

All research confirms: v1.2 is a correctness milestone. Features are already built. No new libraries needed.

### Roadmap Decisions

- Phase 9 starts with DATA-01 (restore proxy) because production is broken without it
- STAT-01/02/03 grouped in Phase 9 — all are ranking/status logic fixes in the same file
- VIS-01/02/03 isolated in Phase 10 — pure UI color changes, no logic deps
- DATA-02/03 + DRAW-01/02 + HARD-01 in Phase 11 — data accuracy + drawer wiring + defensive coding

## Session Continuity

Last completed: Roadmap defined for v1.2
Stopped at: Phase 10 context gathered
To resume: `/gsd-plan-phase 9`
