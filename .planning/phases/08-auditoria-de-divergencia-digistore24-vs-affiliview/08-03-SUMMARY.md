---
phase: 08-auditoria-de-divergencia
plan: "03"
subsystem: ui-display
tags: [tooltip, kpi-text, gross, earnings, dashboard, audit, digistore24]
dependency_graph:
  requires: [08-02]
  provides: [updated-kpi-tooltips]
  affects: [src/pages/Dashboard.tsx]
tech_stack:
  added: []
  patterns: []
key_files:
  created: []
  modified:
    - src/pages/Dashboard.tsx
decisions:
  - "Gross Revenue tooltip updated to describe all-payments scope (front + upsells + bumps)"
  - "Earnings tooltip updated to describe all-payments scope minus refund/CB deductions"
metrics:
  duration: "3 minutes"
  completed: "2026-04-28"
requirements:
  - AUDIT-04
  - AUDIT-05
---

# Phase 08 Plan 03: Update Dashboard KPI Tooltip Text Summary

Updated Dashboard KPI tooltip strings for Gross Revenue and Earnings to reflect the corrected all-payments scope introduced in Plan 02, replacing stale front-only (upsell_no=0) descriptions with accurate definitions aligned with Digistore24 Gross Amount and Your Earnings.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Update Gross Revenue and Earnings KPI tooltip text | e99287e | src/pages/Dashboard.tsx |

## What Was Built

### Task 1: Tooltip Text Update (e99287e)

**Change 1 — Gross Revenue tooltip:** Replaced "Receita bruta dos pedidos frontais (upsell_no=0). Alinhado com o gross do dashboard Digistore24. Upsells e bumps sao contabilizados no AOV mas nao inflam este KPI." with "Receita bruta de todos os pagamentos (front + upsells + bumps). Alinhado com Gross Amount do dashboard Digistore24."

**Change 2 — Earnings tooltip:** Replaced "Earned amount dos pedidos frontais (upsell_no=0) + estornos de reembolsos/chargebacks. Alinhado com 'Your Earnings' do Digistore24." with "Ganhos do produtor de todos os pagamentos (front + upsells) menos deducoes de reembolsos e chargebacks. Alinhado com Your Earnings do dashboard Digistore24."

Both tooltips now accurately describe the corrected KPI scope from Plan 02 — users hovering over the KPI cards will receive correct information about what each number represents.

## Deviations from Plan

None — plan executed exactly as written. Both tooltip strings updated, TypeScript compiler reports no errors.

## Verification

- `grep -c "front + upsells" src/pages/Dashboard.tsx` → 3 (at least 1 match confirmed)
- `grep -c "pedidos frontais (upsell_no=0)" src/pages/Dashboard.tsx` → 0 (old text removed)
- `grep -c "Gross Amount do dashboard Digistore24" src/pages/Dashboard.tsx` → 1
- `npx tsc --noEmit` → no errors

## Threat Mitigations Applied

| Threat ID | Mitigation Applied |
|-----------|-------------------|
| T-08-05 (Information Disclosure — tooltip text) | Tooltip text is user-facing informational only; no secrets or sensitive data exposed |

## Self-Check: PASSED

Files exist:
- src/pages/Dashboard.tsx — FOUND

Commits:
- e99287e — FOUND (feat(08-03): update KPI tooltip text to reflect all-payments scope)
