# AffiliView — State

## Current Position

Phase: Phase 1 (not started)
Plan: --
Status: Roadmap defined — ready to plan Phase 1
Last activity: 2026-04-22 — Roadmap created for v1.0 CPA Variavel

```
Progress: [----------] 0% — Phase 1 of 3
```

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-22)

**Core value:** Know exactly how much margin each affiliate generates per product variant, so CPA can be optimized per-affiliate to maximize profitability.
**Current focus:** CPA Variavel — nova aba com CPA personalizado por pote por afiliado

## Performance Metrics

- Phases complete: 0 / 3
- Requirements mapped: 9 / 9
- Requirements complete: 0 / 9

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

### Active Todos

- (none yet — start with `/gsd-plan-phase 1`)

### Blockers

- (none)

## Session Continuity

**To resume:** Run `/gsd-plan-phase 1` to plan Phase 1: Page Scaffold.

**Roadmap:** .planning/ROADMAP.md
**Requirements:** .planning/REQUIREMENTS.md
