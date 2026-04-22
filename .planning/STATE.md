# AffiliView — State

## Current Position

Phase: Not started (defining requirements)
Plan: --
Status: Defining requirements
Last activity: 2026-04-22 — Milestone v1.0 started

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-22)

**Core value:** Know exactly how much margin each affiliate generates per product variant, so CPA can be optimized per-affiliate to maximize profitability.
**Current focus:** CPA Variavel — nova aba com CPA personalizado por pote por afiliado

## Accumulated Context

- Existing CPA logic lives in `src/lib/cpa/` (analyzeCPA.ts, types.ts, constants.ts, parseHelpers.ts)
- Hook `useCPACalculator` already computes LTV profit per variant per affiliate
- COGS table and CPA defaults are in constants.ts
- Upsell data is already parsed per affiliate/variant
