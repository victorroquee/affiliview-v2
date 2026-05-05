---
gsd_state_version: 1.0
milestone: v1.2
milestone_name: Melhorias Afiliados & Upsell
status: planning
last_updated: "2026-05-05T03:05:05.732Z"
last_activity: 2026-05-05
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
Last activity: 2026-05-05 — Milestone v1.2 started

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-22)

**Core value:** Know exactly how much margin each affiliate generates per product variant, so CPA can be optimized per-affiliate to maximize profitability.
**Current focus:** Phase 08 — auditoria-de-divergencia-digistore24-vs-affiliview

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
