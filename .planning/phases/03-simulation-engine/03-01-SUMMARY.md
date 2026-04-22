---
phase: "03-simulation-engine"
plan: "01"
subsystem: simulation
tags: [hook, types, simulation, cpa, typescript]
dependency_graph:
  requires: []
  provides: [SimulatedVariant, SimulatedAffiliateResult, useCpaVariavel-simulation-state]
  affects: [src/pages/CpaVariavel.tsx]
tech_stack:
  added: []
  patterns: [useMemo, useCallback, satisfies-operator, record-state]
key_files:
  created: []
  modified:
    - src/lib/cpa/types.ts
    - src/hooks/useCpaVariavel.ts
decisions:
  - "SimulatedVariant extends VariantResult rather than replacing it — preserves backward compatibility with existing consumers of VariantResult"
  - "marginTarget defaults to 0 — simulation is opt-in, stable ltvProfit at rest"
  - "customCpas keyed by affiliate name then variant number — matches data shape already used in displayResults loop"
metrics:
  duration: "79s"
  completed_date: "2026-04-22"
  tasks_completed: 2
  files_modified: 2
---

# Phase 03 Plan 01: Simulation Engine Data Layer Summary

Bidirectional CPA/margin simulation state layer added to useCpaVariavel hook with SimulatedVariant and SimulatedAffiliateResult types in types.ts.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | Add SimulatedVariant and SimulatedAffiliateResult types | 493d67b | src/lib/cpa/types.ts |
| 2 | Extend useCpaVariavel with simulation state and computed values | 541e39c | src/hooks/useCpaVariavel.ts |

## What Was Built

### New Types (src/lib/cpa/types.ts)

`SimulatedVariant` extends `VariantResult` with six new fields:
- `simMaxCpa` — max CPA computed from marginTarget using the same formula as useCPACalculator
- `simCpaStatus` — 'increase' | 'ok' | 'reduce' based on simMaxCpa vs cpaDefault
- `simRoom` — simMaxCpa minus cpaDefault (how much headroom exists at the target margin)
- `customCpa?` — user-entered CPA override (undefined = not overridden)
- `customMargin?` — resulting margin when customCpa is set: ltvProfit + cpaDefault - customCpa
- `cpaDelta` — difference between customCpa and cpaDefault (0 when no override)

`SimulatedAffiliateResult` extends `AffiliateResult` narrowing `variants` to `SimulatedVariant[]`.

### Hook Extensions (src/hooks/useCpaVariavel.ts)

New state:
- `marginTarget: number` (default 0) — global margin target for simMaxCpa computation
- `customCpas: Record<string, Record<number, number>>` — per-affiliate per-variant CPA overrides

New helpers:
- `setCustomCpa(affName, variant, value | null)` — set or clear a single variant's custom CPA
- `clearSimulation()` — reset marginTarget to 0 and clear all customCpas

New computed value:
- `simulatedResults: SimulatedAffiliateResult[] | null` — useMemo over results + marginTarget + customCpas

Updated to use SimulatedAffiliateResult:
- `displayResults` now filtered from simulatedResults (includes simulation data in search results)
- `selectedAff` derived from displayResults (SimulatedAffiliateResult type)

## Formulas Implemented

```
simMaxCpa  = Math.max(0, cpaDefault + ltvProfit - marginTarget)
simRoom    = Math.round(simMaxCpa - cpaDefault)
customMargin = ltvProfit + cpaDefault - customCpa   (when customCpa set)
cpaDelta   = customCpa - cpaDefault                 (0 when not overridden)
```

These match exactly the formulas in `useCPACalculator.ts`.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all fields are computed from real data. No hardcoded placeholders.

## Threat Flags

None — all simulation is client-side state with no persistence or network calls, consistent with the plan's threat model.

## Self-Check

- [x] src/lib/cpa/types.ts exists and contains SimulatedVariant
- [x] src/hooks/useCpaVariavel.ts exists and contains all simulation fields
- [x] Commit 493d67b exists (Task 1)
- [x] Commit 541e39c exists (Task 2)
- [x] npx tsc --noEmit exits 0

## Self-Check: PASSED
