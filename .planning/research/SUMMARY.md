# Research Summary: AffiliView v1.2

## Executive Summary

All 4 researchers converge: **v1.2 is not a feature build — it's a correctness and polish milestone.** Every major capability (status tiers, Em Rampa, tag filtering, upsell breakdown, top-product, inactive listing) was already shipped in v1.1 code. No new dependencies needed.

## What Actually Needs Work

| # | Issue | Severity | Location |
|---|-------|----------|----------|
| 1 | 21 vs 4 affiliate count — ranking window anchored to dataset maxDate, not wall clock | Critical | `computeAffiliateRankings` in transactions.ts |
| 2 | Refund % colors inconsistent (ProductTable: >5 orange/>10 red vs spec: ≤8 orange/>8 red) | Moderate | ProductTable.tsx, Affiliates.tsx |
| 3 | AOV contribution gross/net mismatch (grossAmount numerator, netAmount denominator) | Moderate | `computeAffiliateUpsells` |
| 4 | `topProducts` Map not passed as prop to AffiliateDrawer | Low | Affiliates.tsx → AffiliateDrawer |
| 5 | api/digistore.ts deleted — production 404s | Critical | api/ directory |
| 6 | "5 days inactive" (spec) vs "0 in 7-day window" (code) mismatch | Moderate | Business decision needed |

## Stack Additions

**None.** No new libraries, no new state management. Everything is built.

## Feature Status

| Feature | Status |
|---------|--------|
| Status tiers (T1/T2/T3/Ativo/Em Rampa/Inativo) | BUILT |
| Tag hook + filter + drawer UI | BUILT |
| Upsell drawer table + AOV contribution | BUILT |
| Refund % and margin % in affiliate table | BUILT |
| Tier analysis in drawer | BUILT |
| Top product per affiliate | BUILT (not wired to drawer) |
| Refund % colors | PARTIAL (thresholds inconsistent) |
| "Ativo" count accuracy | BROKEN (21 vs 4) |

## Watch Out For

1. **Never recompute rankings from filtered data** — tag/period filters must not alter `allRows` input to `computeAffiliateRankings`
2. **`upsellNo === 0` is the authoritative front discriminator** — not product name
3. **Drawer stale data** — changing date filter while drawer open shows mixed periods
4. **Regex fragility** — `classifyUpsellProduct` "down10" matches "down1" pattern

## Suggested Phase Structure

1. Infrastructure (restore API proxy)
2. Count Correctness (21 vs 4 bug + inactive semantics)
3. Color Threshold Corrections
4. AOV Fix + Drawer Wiring
5. Hardening (regex, localStorage safety, drawer lifecycle)

---
*Synthesized: 2026-05-05*
