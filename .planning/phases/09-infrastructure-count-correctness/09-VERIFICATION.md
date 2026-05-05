---
phase: 09-infrastructure-count-correctness
verified: 2026-05-05T01:10:00Z
status: human_needed
score: 6/6 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Load Dashboard in browser and verify window label (e.g., '29/04 — 05/05') appears next to 'Atividade' heading"
    expected: "A date range in DD/MM — DD/MM format displays in lighter text next to the Atividade KPI group label"
    why_human: "Visual rendering and positioning cannot be verified programmatically without running the dev server"
  - test: "Deploy to Vercel (or test with vercel dev) and confirm /api/digistore returns live Digistore24 data (not 404)"
    expected: "HTTP 200 with JSON transaction data from Digistore24"
    why_human: "Requires DIGISTORE_API_KEY environment variable and network access to Digistore24 API — cannot test locally without credentials"
  - test: "Compare the Inativos count on the Dashboard with the count on the Affiliates page Inativos tab"
    expected: "Both show the same number of inactive affiliates"
    why_human: "Requires live data loaded in both pages to verify count consistency"
---

# Phase 9: Infrastructure & Count Correctness Verification Report

**Phase Goal:** The application reaches Digistore24 successfully and affiliate counts are accurate
**Verified:** 2026-05-05T01:10:00Z
**Status:** human_needed
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Production requests to /api/digistore no longer return 404 | VERIFIED | `api/digistore.ts` exists with proper Vercel serverless handler, imports `VercelRequest/VercelResponse`, forwards to Digistore24 API with key injection |
| 2 | The 7-day ranking window is anchored to today's date, not dataset maxDate | VERIFIED | `src/lib/transactions.ts:188` uses `const todayUTC = new Date()` for window anchor; old `let maxDate = payRows[0]!.date` removed from `computeAffiliateRankings`; test "STAT-01: window anchored to wall clock" passes |
| 3 | An affiliate whose last front sale was 6 days ago is classified Inativo | VERIFIED | `daysSinceLast > INATIVO_DAYS` (5) at line 257; test "STAT-02: affiliate with last front sale 6 days ago is Inativo" passes |
| 4 | An affiliate whose last front sale was 4 days ago is classified Em Rampa | VERIFIED | Same logic: 4 days not > 5, so falls to `data.frontSales >= 1` path; test "STAT-02: affiliate with last front sale 4 days ago is Em Rampa" passes |
| 5 | Tier affiliates are immune to the 5-day Inativo rule | VERIFIED | Recency check only runs inside `if (!assigned)` block (line 256), so Tier assignments from lines 242-247 are never overridden; test "STAT-02: Tier 1 affiliate immune to 5-day rule" passes |
| 6 | Affiliates appearing only in refund rows are classified Inativo | VERIFIED | `allAffiliateNames` scan at line 308 catches refund-only affiliates not in `rankings`; test "STAT-03: refund-only affiliate appears as Inativo" passes |

**Score:** 6/6 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `api/digistore.ts` | Vercel serverless proxy to Digistore24 API | VERIFIED | 44 lines, proper handler with env var injection, error handling, upstream fetch |
| `src/lib/transactions.ts` | Fixed computeAffiliateRankings with wall-clock anchor and recency-based Inativo | VERIFIED | Wall-clock anchor at line 188, INATIVO_DAYS=5 at line 250, never-sold pass at line 308 |
| `src/lib/transactions.test.ts` | Unit tests covering STAT-01, STAT-02, STAT-03 | VERIFIED | 127 lines, 6 test cases, vi.useFakeTimers with pinned date, all passing |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| src/lib/transactions.ts | src/pages/Dashboard.tsx | computeAffiliateRankings import | WIRED | Line 26: import, Line 66: useMemo call |
| src/lib/transactions.ts | src/pages/Affiliates.tsx | computeAffiliateRankings import | WIRED | Line 8: import, Line 71: useMemo call |
| src/pages/Dashboard.tsx | src/lib/transactions.ts | rankingWindowLabel from rankings | WIRED | Lines 84-90: useMemo derives label from rankings.values()[0].windowStart/windowEnd |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| Dashboard.tsx | rankings | computeAffiliateRankings(allRows) | Yes -- allRows from useDigistoreAPI hook (live fetch) | FLOWING |
| Dashboard.tsx | rankingWindowLabel | rankings.values()[0].windowStart/End | Yes -- derived from rankings Map | FLOWING |
| Dashboard.tsx | inativoCount | rankings.values().filter(Inativo) | Yes -- count from live rankings | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| All 6 unit tests pass | `npx vitest run src/lib/transactions.test.ts` | 6 passed (6) | PASS |
| TypeScript compiles cleanly | `npx tsc --noEmit` | Exit 0, no output | PASS |
| Wall-clock anchor present | grep "todayUTC = new Date()" in computeAffiliateRankings | Found at line 188 | PASS |
| Old maxDate anchor removed from ranking fn | grep "let maxDate = payRows" in fn range 181-330 | Not found (only in separate computeTopProductPerAffiliate fn at line 438) | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-----------|-------------|--------|----------|
| DATA-01 | 09-01 | Restaurar api/digistore.ts (proxy Vercel deletado) | SATISFIED | File exists at `api/digistore.ts` with proper Vercel handler |
| STAT-01 | 09-01 | Logica "Ativo" auditada -- corrigir discrepancia 21 vs 4 | SATISFIED | Wall-clock anchor replaces maxDate; window ends at today; test passes |
| STAT-02 | 09-01 | "Inativo" definido como ultima venda front ha mais de 5 dias | SATISFIED | `INATIVO_DAYS = 5` + `daysSinceLast > INATIVO_DAYS` + Tier immunity; 3 tests pass |
| STAT-03 | 09-01, 09-02 | Listagem de afiliados inativos com contagem visivel no dashboard | SATISFIED | inativoCount KPI on Dashboard + never-sold inclusion via allAffiliateNames scan + updated info text ("mais de 5 dias") |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (none) | - | - | - | No anti-patterns detected in phase artifacts |

### Human Verification Required

### 1. Window Label Visual Check

**Test:** Load Dashboard in browser and verify window label appears next to "Atividade" heading
**Expected:** A date range in DD/MM -- DD/MM format displays in lighter text (e.g., "29/04 -- 05/05")
**Why human:** Visual rendering and positioning cannot be verified programmatically without running the dev server

### 2. Production API Proxy Connectivity

**Test:** Deploy to Vercel (or test with `vercel dev`) and confirm `/api/digistore` returns live Digistore24 data
**Expected:** HTTP 200 with JSON transaction data
**Why human:** Requires DIGISTORE_API_KEY environment variable and network access to Digistore24 API

### 3. Inactive Count Consistency

**Test:** Compare the Inativos count on the Dashboard with the count on the Affiliates page Inativos tab
**Expected:** Both show the same number of inactive affiliates
**Why human:** Requires live data loaded in both pages to verify end-to-end count consistency

### Gaps Summary

No gaps found. All automated verification checks pass:
- API proxy file exists and is well-formed
- `computeAffiliateRankings` uses wall-clock anchor (Date.now())
- 5-day recency-based Inativo classification works (Tier-immune)
- Never-sold/refund-only affiliates included as Inativo
- Dashboard displays window label and updated info text
- All 6 unit tests pass
- TypeScript compiles cleanly

Three items require human verification: visual rendering of the window label, production API connectivity, and inactive count consistency between pages.

---

_Verified: 2026-05-05T01:10:00Z_
_Verifier: Claude (gsd-verifier)_
