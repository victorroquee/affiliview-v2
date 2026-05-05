---
phase: "09"
plan: "01"
subsystem: core-ranking-logic
tags: [api-proxy, ranking-fix, wall-clock, inativo, tdd]
dependency_graph:
  requires: []
  provides: [working-api-proxy, correct-ranking-window, recency-inativo]
  affects: [Dashboard.tsx, Affiliates.tsx]
tech_stack:
  added: []
  patterns: [wall-clock-anchor, recency-classification, never-sold-inclusion]
key_files:
  created:
    - api/digistore.ts
    - src/lib/transactions.test.ts
  modified:
    - src/lib/transactions.ts
decisions:
  - "D-01: Wall-clock anchor chosen over maxDate — Date.now() is the correct reference for 'current status' display"
  - "D-04: Inativo = last front sale > 5 days ago, Tiers immune"
  - "D-05: Refund-only affiliates included as Inativo via allRows scan"
  - "api/digistore.ts recreated from project patterns (git blob corrupted)"
metrics:
  duration: "4m 35s"
  completed: "2026-05-05T03:59:06Z"
  tasks_completed: 2
  tasks_total: 2
  files_created: 2
  files_modified: 1
---

# Phase 09 Plan 01: Infrastructure & Count Correctness Summary

Recreated Vercel serverless API proxy and fixed computeAffiliateRankings with wall-clock window anchor, 5-day recency-based Inativo classification (Tier-immune), and never-sold affiliate inclusion.

## Commits

| # | Hash | Type | Message |
|---|------|------|---------|
| 1 | cc818c9 | test | Restore API proxy and create ranking test scaffold |
| 2 | b66e897 | feat | Fix computeAffiliateRankings wall-clock anchor + recency Inativo |

## Task Results

### Task 1: Restore API proxy and create test scaffold
- **Status:** Complete
- **Commit:** cc818c9
- **Key actions:**
  - Recreated `api/digistore.ts` from project patterns (git blob 9de1e86 was corrupted/missing)
  - Created `src/lib/transactions.test.ts` with 6 test cases covering STAT-01, STAT-02, STAT-03
  - Tests used `vi.useFakeTimers()` pinned to 2026-05-04T12:00:00Z

### Task 2: Fix computeAffiliateRankings
- **Status:** Complete
- **Commit:** b66e897
- **Key actions:**
  - Replaced `maxDate` dataset anchor with `const todayUTC = new Date()` wall-clock
  - Added recency-based Inativo: `daysSinceLast > 5` triggers Inativo for non-Tier affiliates
  - Added never-sold affiliate pass scanning `allRows` for refund-only names
  - All 6 tests pass, TypeScript compiles cleanly

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Git blob corrupted — recreated api/digistore.ts**
- **Found during:** Task 1
- **Issue:** `git restore api/digistore.ts` failed with "unable to read sha1 file" and `git cat-file -p` also failed (blob 9de1e8665720b2b6dee86f30f9abff9f9f1dd368 not a valid object)
- **Fix:** Recreated the file from project context (vite proxy config, useDigistoreAPI hook, vercel.json routing, @vercel/node types)
- **Files modified:** api/digistore.ts
- **Commit:** cc818c9

**2. [Rule 1 - Bug] Tier 1 test data needed window-aware dates**
- **Found during:** Task 2
- **Issue:** Plan's Tier 1 test used dates Apr 22-28 (all outside the new wall-clock window Apr 28 - May 4), so affiliate had 0 gross in window and couldn't qualify for Tier 1
- **Fix:** Restructured test to place 1 front sale on Apr 28 (6 days ago) + 6 upsell-only days (Apr 29 - May 4) each with gross >= 15000. This correctly tests Tier immunity: affiliate qualifies for Tier 1 via daily gross but last FRONT sale is > 5 days ago
- **Files modified:** src/lib/transactions.test.ts
- **Commit:** b66e897

## Verification Results

| Check | Result |
|-------|--------|
| `api/digistore.ts` exists | PASS |
| Contains `import type { VercelRequest, VercelResponse }` | PASS |
| `npx tsc --noEmit` exits 0 | PASS |
| All 6 tests pass | PASS |
| `todayUTC = new Date()` present | PASS |
| `maxDate` removed from computeAffiliateRankings | PASS |
| `INATIVO_DAYS = 5` present | PASS |
| `daysSinceLast > INATIVO_DAYS` present | PASS |
| `allAffiliateNames = new Set<string>()` present | PASS |

## Self-Check: PASSED
