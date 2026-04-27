---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: Melhorias Dashboard
status: executing
stopped_at: Ready to plan Phase 4
last_updated: "2026-04-27T15:47:26.423Z"
last_activity: 2026-04-27 -- Phase 5 planning complete
progress:
  total_phases: 5
  completed_phases: 1
  total_plans: 5
  completed_plans: 3
  percent: 60
---

# AffiliView — State

## Current Position

Phase: 08
Plan: Not started
Status: Ready to execute
Last activity: 2026-04-27 -- Phase 5 planning complete

Progress: [░░░░░░░░░░] 0%

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-22)

**Core value:** Know exactly how much margin each affiliate generates per product variant, so CPA can be optimized per-affiliate to maximize profitability.
**Current focus:** Phase 04 — Status de Afiliados

## Performance Metrics

- Phases complete: 0 / 4 (v1.1)
- Requirements mapped: 16 / 16
- Requirements complete: 0 / 16

## Recent Data Accuracy Fixes (2026-04-23)

### AOV — VAT exclusion

- AOV now uses `netAmount` (amount - vat_amount) instead of `grossAmount`
- Fixes ~12% inflation from VAT inclusion

### Gross Revenue — Front-only alignment

- `gross` now sums only front payments (upsell_no=0), matching Digistore dashboard
- `grossBruto` kept as total (front + upsells) for AOV and rate calculations

### Earnings — Front-only alignment

- `earningsTotal` now sums front payment earnings + refund/CB deductions
- Matches Digistore's "Your Earnings" which shows front-order earnings

### Transaction type safety

- `transactionType` normalized to lowercase in normalizer
- `isPayment()` changed from catch-all to strict whitelist (payment, sale, upsell)
- `earned_amount` fallback enforces negative sign for refunds/CB

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

### Roadmap Evolution

- Phase 8 added: Auditoria de Divergencia Digistore24 vs AffiliView — investigar causa raiz da divergencia de Gross (-13.4%), Earnings (-48.3%) entre painel Digistore24 e AffiliView

## Session Continuity

Last completed: Data accuracy audit — AOV, Gross, Earnings aligned with Digistore24
Stopped at: Ready to plan Phase 4
To resume: `/gsd-plan-phase 4`
