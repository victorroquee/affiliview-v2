---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: ready_to_plan
stopped_at: "Paused at checkpoint — Task 3: Visual verification of CPA Variavel page"
last_updated: "2026-04-22T21:00:00.000Z"
last_activity: 2026-04-22
progress:
  total_phases: 3
  completed_phases: 3
  total_plans: 3
  completed_plans: 3
  percent: 100
---

# AffiliView — State

## Current Position

Phase: 3
Plan: Not started
Status: Ready to plan
Last activity: 2026-04-22

```
Progress: [█████████░] 90%
```

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-22)

**Core value:** Know exactly how much margin each affiliate generates per product variant, so CPA can be optimized per-affiliate to maximize profitability.
**Current focus:** Phase 02 — CPA Variavel table and simulation UI

## Performance Metrics

- Phases complete: 1 / 3
- Requirements mapped: 9 / 9
- Requirements complete: 1 / 9

## Accumulated Context

### Codebase Facts

- Existing CPA logic lives in `src/lib/cpa/` (analyzeCPA.ts, types.ts, constants.ts, parseHelpers.ts)
- Hook `useCPACalculator` already computes LTV profit per variant per affiliate
- COGS table and CPA defaults are in `src/lib/cpa/constants.ts`
- Upsell data is already parsed per affiliate/variant in analyzeCPA.ts
- Existing pages: Dashboard, Affiliates, CpaCalculator, CpaFixo, MailSales
- Sidebar navigation: `src/components/Sidebar.tsx`
- Page routing managed via state in `App.tsx`
- Stack: React 19 + TypeScript + Vite 5 + Recharts + Tailwind-style CSS
- Deploy: Vercel serverless functions for Digistore24 API proxy

### Key Decisions (Pending Confirmation)

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Nova aba separada (nao substituir) | Calculator e CPA Fixo servem propositos diferentes | Pending |
| Simulacao session-only | Simplicidade, sem backend adicional | Pending |
| LTV completo para margem | Front + upsells da imagem real de rentabilidade | Pending |
| Dados reais Digistore (sem input manual) | Precisao e automatizacao | Pending |
| Phase 02-data-display P01 | 78s | 2 tasks | 3 files |

### Key Decisions (Confirmed)

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Placeholder page body minimal | Phase 2 replaces content — scaffold only needed for routing | Confirmed 01-01 |
| Calculator icon on sidebar button | Matches original locked button design intent | Confirmed 01-01 |
| New page Props: filteredRows + loading | Consistent with CpaFixo pattern — all pages receive filtered data | Confirmed 01-01 |
| marginTarget=0 passed to AffiliateDetail | Phase 2 shows real margins, no simulation — Phase 3 will add slider | Confirmed 02-02 |
| Variant badges use inline styles | Avoids adding new CSS classes; reuses existing bg-secondary variable | Confirmed 02-02 |
| No CPAShell wrapper on CpaVariavel | Phase 2 has no margin slider or CPA status filter — header inlined | Confirmed 02-02 |

### Active Todos

- Execute Phase 02 — CPA Variavel table and simulation UI

### Blockers

- Pre-existing: `src/pages/MailSales.tsx` line 46 unused variable `frontGross` causes `npm run build` (tsc -b) to fail. Does not affect `tsc --noEmit`. Logged in deferred-items.md.

## Session Continuity

**Last completed:** Phase 02-data-display Plan 02 tasks 1-2 — 2026-04-22
**Stopped at:** Checkpoint — Task 3: Visual verification of CPA Variavel page
**To resume:** Approve or describe issues at the checkpoint prompt, then run `/gsd-execute-phase 02` to continue.

**Roadmap:** .planning/ROADMAP.md
**Requirements:** .planning/REQUIREMENTS.md
**Summary:** .planning/phases/01-page-scaffold/01-01-SUMMARY.md

**Planned Phase:** 2 (Data Display) — 2 plans — 2026-04-22T20:24:02.785Z
