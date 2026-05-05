---
phase: 11-data-accuracy-drawer-hardening
plan: 01
subsystem: data-calculations, storage-resilience
tags: [bugfix, tdd, correctness, hardening]
dependency_graph:
  requires: []
  provides: [correct-aov-contribution, safe-regex-classification, resilient-localstorage]
  affects: [AffiliateDrawer-upsell-display, tag-persistence]
tech_stack:
  added: []
  patterns: [negative-lookahead-regex, try-catch-silent-failure]
key_files:
  created: []
  modified:
    - src/lib/transactions.ts
    - src/lib/transactions.test.ts
    - src/hooks/useAffiliateTags.ts
    - src/hooks/useAffiliateTags.test.ts
decisions:
  - "AOV contribution uses net/net (e.net / frontSalesCount) instead of gross/net"
  - "Regex uses (?!\\d) negative lookahead instead of \\b for digit-boundary safety"
  - "localStorage quota errors silently ignored (tags non-critical)"
metrics:
  duration_seconds: 214
  completed: "2026-05-05T11:59:01Z"
  tasks_completed: 2
  tasks_total: 2
  tests_added: 8
  tests_total_passing: 22
---

# Phase 11 Plan 01: Data Accuracy & localStorage Hardening Summary

AOV contribution fixed to use netAmount for both numerator and denominator; classifyUpsellProduct regex hardened with negative lookahead to prevent multi-digit cross-matching; localStorage.setItem wrapped in try/catch to prevent QuotaExceededError crashes.

## Tasks Completed

| Task | Name | Commit | Key Changes |
|------|------|--------|-------------|
| 1 | Fix AOV contribution gross/net mismatch and regex classification | 48b9aa2, e1e8012 | TDD: failing test then fix. Net accumulator added to upsellMap, aovContribution uses e.net. Regex patterns use (?!\d) instead of \b |
| 2 | Harden localStorage writes with try/catch | 58ad5bf | writeTagsToStorage wrapped in try/catch, test for QuotaExceededError resilience |

## TDD Gate Compliance

- RED: `48b9aa2` test(11-01) - failing AOV test committed
- GREEN: `e1e8012` feat(11-01) - implementation passes all tests
- Task 2 was not TDD-gated (simple defensive fix)

## Deviations from Plan

### Observations (not deviations)

**1. Regex was already correct for test cases**
- The existing `\b` word boundary already prevented "down10" from matching "down1" in all tested inputs
- Applied `(?!\d)` hardening anyway per plan mandate for defensive safety
- No behavioral change for current inputs, but protects against edge cases like "down1a" (unlikely but possible)

## Verification

```
npx vitest run src/lib/transactions.test.ts src/hooks/useAffiliateTags.test.ts
Test Files  2 passed (2)
Tests  22 passed (22)
```

Acceptance criteria met:
- `grep -c "e.net / frontSalesCount" src/lib/transactions.ts` = 1
- `grep -c "(?!\d)" src/lib/transactions.ts` = 6
- `grep -c "try" src/hooks/useAffiliateTags.ts` = 2
- `grep -c "catch" src/hooks/useAffiliateTags.ts` = 2

## Known Stubs

None.

## Self-Check: PASSED

- [x] src/lib/transactions.ts exists and contains fixes
- [x] src/lib/transactions.test.ts exists with new tests
- [x] src/hooks/useAffiliateTags.ts exists with try/catch
- [x] src/hooks/useAffiliateTags.test.ts exists with quota test
- [x] Commit 48b9aa2 exists
- [x] Commit e1e8012 exists
- [x] Commit 58ad5bf exists
