---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: Melhorias Dashboard
status: ready_to_plan
stopped_at: Roadmap created for v1.1 — ready to plan Phase 4
last_updated: "2026-04-22"
last_activity: 2026-04-22
progress:
  total_phases: 4
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# AffiliView — State

## Current Position

Phase: 4 of 7 (Status de Afiliados) — Not started
Plan: —
Status: Ready to plan
Last activity: 2026-04-22 — Roadmap created for v1.1 (4 phases, 16 requirements)

Progress: [░░░░░░░░░░] 0%

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-22)

**Core value:** Know exactly how much margin each affiliate generates per product variant, so CPA can be optimized per-affiliate to maximize profitability.
**Current focus:** Milestone v1.1 — Phase 4: Status de Afiliados

## Performance Metrics

- Phases complete: 0 / 4 (v1.1)
- Requirements mapped: 16 / 16
- Requirements complete: 0 / 16

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

### Open Questions (v1.1)

- Origem dos dados up1-3/down1-3 (Digistore24 API ou outro sistema?) — blocks BKND-01
- Persistencia das tags de afiliados (localStorage vs backend?) — blocks TAG-01
- Causa da discrepancia 21 vs 4 afiliados ativos (bug a investigar) — blocks STAT-02

### Blockers

- Pre-existing: `src/pages/MailSales.tsx` line 46 unused variable `frontGross` causes `npm run build` (tsc -b) to fail. Does not affect `tsc --noEmit`. Logged in deferred-items.md.

## Session Continuity

Last completed: Roadmap v1.1 created (4 phases, 16 requirements mapped)
Stopped at: Ready to plan Phase 4
To resume: `/gsd-plan-phase 4`
