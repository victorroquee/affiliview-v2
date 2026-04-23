---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: Melhorias Dashboard
status: defining_requirements
stopped_at: Defining requirements for v1.1
last_updated: "2026-04-22"
last_activity: 2026-04-22
progress:
  total_phases: 0
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# AffiliView — State

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-04-22 — Milestone v1.1 started

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-22)

**Core value:** Know exactly how much margin each affiliate generates per product variant, so CPA can be optimized per-affiliate to maximize profitability.
**Current focus:** Milestone v1.1 — Melhorias Dashboard

## Performance Metrics

- Phases complete: 0 / TBD
- Requirements mapped: 0 / TBD
- Requirements complete: 0 / TBD

## Accumulated Context

### Codebase Facts

- Existing CPA logic lives in `src/lib/cpa/` (analyzeCPA.ts, types.ts, constants.ts, parseHelpers.ts)
- Hook `useCPACalculator` already computes LTV profit per variant per affiliate
- COGS table and CPA defaults are in `src/lib/cpa/constants.ts`
- Upsell data is already parsed per affiliate/variant in analyzeCPA.ts
- Existing pages: Dashboard, Affiliates, CpaCalculator, CpaFixo, CpaVariavel, MailSales
- Sidebar navigation: `src/components/Sidebar.tsx`
- Page routing managed via state in `App.tsx`
- Stack: React 19 + TypeScript + Vite 5 + Recharts + Tailwind-style CSS
- Deploy: Vercel serverless functions for Digistore24 API proxy

### Open Questions (v1.1)

- Origem dos dados up1-3/down1-3 (Digistore24 API ou outro sistema?)
- Persistencia das tags de afiliados (localStorage vs backend?)
- Causa da discrepancia 21 vs 4 afiliados ativos (bug a investigar)

### Blockers

- Pre-existing: `src/pages/MailSales.tsx` line 46 unused variable `frontGross` causes `npm run build` (tsc -b) to fail. Does not affect `tsc --noEmit`. Logged in deferred-items.md.

## Session Continuity

**Last completed:** Milestone v1.0 — all 3 phases complete
**Stopped at:** Defining requirements for v1.1
**To resume:** `/gsd-plan-phase [N]` after roadmap is created
