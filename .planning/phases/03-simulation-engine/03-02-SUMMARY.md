---
phase: "03-simulation-engine"
plan: "02"
subsystem: simulation-ui
tags: [simulation, ui, slider, custom-cpa, delta, typescript]
dependency_graph:
  requires: [useCpaVariavel-simulation-state, SimulatedVariant, SimulatedAffiliateResult]
  provides: [margin-target-slider, sim-columns-in-table, custom-cpa-input-in-variant-card]
  affects: [src/pages/CpaVariavel.tsx, src/components/cpa/CpaVariavelTable.tsx, src/components/cpa/AffiliateDetail.tsx, src/components/cpa/VariantCard.tsx]
tech_stack:
  added: []
  patterns: [conditional-column-rendering, controlled-number-input, prop-drilling-simulation-handlers]
key_files:
  created: []
  modified:
    - src/pages/CpaVariavel.tsx
    - src/components/cpa/CpaVariavelTable.tsx
    - src/components/cpa/AffiliateDetail.tsx
    - src/components/cpa/VariantCard.tsx
decisions:
  - "VariantCard always shows vc-sim-box — no conditional hide — so the UI is always ready for simulation input regardless of marginTarget"
  - "simMaxCpa row inside vc-sim-box only visible when simMaxCpa > 0 (marginTarget-driven)"
  - "Reset button visibility: marginTarget > 0 OR any customCpas entry — covers both simulation modes independently"
metrics:
  duration: "231s"
  completed_date: "2026-04-22"
  tasks_completed: 2
  files_modified: 4
---

# Phase 03 Plan 02: Simulation Engine UI Summary

Bidirectional CPA/margin simulation controls wired into the CpaVariavel page, table, and detail view — margin target slider with simMaxCpa columns in the table, per-variant custom CPA input with resulting margin and delta in each VariantCard.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | Add margin target slider and sim columns to CpaVariavel page and table | 4f83fd9 | src/pages/CpaVariavel.tsx, src/components/cpa/CpaVariavelTable.tsx |
| 2 | Add per-variant custom CPA input with margin and delta to VariantCard | a6a145e | src/components/cpa/AffiliateDetail.tsx, src/components/cpa/VariantCard.tsx |
| 3 | Visual verification checkpoint | — | (human-verify; auto-approved per orchestrator) |

## What Was Built

### CpaVariavel.tsx

- Hook destructuring extended: `marginTarget`, `setMarginTarget`, `customCpas`, `setCustomCpa`, `clearSimulation`
- `RotateCcw` imported from lucide-react for reset button icon
- Margin target slider group added to `.cpa-controls` area (0–50%, step 1, min=0 means simulation off)
- Reset button appears when `marginTarget > 0` OR any `customCpas` entries exist; calls `clearSimulation`
- `AffiliateDetail` now receives `marginTarget` (live value) and `setCustomCpa` handler
- `CpaVariavelTable` now receives `displayResults` (typed `SimulatedAffiliateResult[]`) and `marginTarget`

### CpaVariavelTable.tsx

- Props updated to `SimulatedAffiliateResult[]` with `marginTarget: number`
- `showSim = marginTarget > 0` flag drives conditional column rendering
- Two new `<th>` columns: "CPA max (sim)" and "Status" — only rendered when `showSim`
- Corresponding `<td>` cells per row using `domSV.simMaxCpa` (formatted EUR) and `<StatusBadge status={domSV.simCpaStatus} compact />`

### AffiliateDetail.tsx

- Props updated to `SimulatedAffiliateResult` with `setCustomCpa` handler
- `setCustomCpa` threaded through to each `VariantCard` along with `affName`
- `marginTarget` badge now displays the live value (was already `{marginTarget}%` — now wired to real state)

### VariantCard.tsx

- Props updated to `SimulatedVariant`, `affName: string`, `setCustomCpa` handler
- `BORDER_COLOR` keyed on `SimulatedVariant["cpaStatus"]` (compatible since SimulatedVariant extends VariantResult)
- New `vc-sim-box` section added after `.vc-cpa-box`:
  - Controlled `<input type="number">` for custom CPA — calls `setCustomCpa(affName, v.variant, value | null)`
  - "limpar" button clears override when `v.customCpa !== undefined`
  - Resultante margin row (EUR, green/red) and cpaDelta row (`<Delta unit="€" />`) when customCpa is set
  - simMaxCpa row shown when `v.simMaxCpa > 0` with color based on `simCpaStatus`

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all fields are computed from real simulation state. No hardcoded placeholders.

## Threat Flags

None — all simulation is client-side state with no persistence or network calls, consistent with the plan's threat model (T-03-03, T-03-04 both accepted).

## Self-Check

- [x] src/pages/CpaVariavel.tsx exists and contains marginTarget, clearSimulation, cpa-margin-slider, setCustomCpa
- [x] src/components/cpa/CpaVariavelTable.tsx exists and contains SimulatedAffiliateResult, simMaxCpa, simCpaStatus, showSim
- [x] src/components/cpa/AffiliateDetail.tsx exists and contains SimulatedAffiliateResult, setCustomCpa
- [x] src/components/cpa/VariantCard.tsx exists and contains customCpa, customMargin, cpaDelta, simMaxCpa, vc-sim-box
- [x] Commit 4f83fd9 exists (Task 1)
- [x] Commit a6a145e exists (Task 2)
- [x] npx tsc --noEmit exits 0

## Self-Check: PASSED
