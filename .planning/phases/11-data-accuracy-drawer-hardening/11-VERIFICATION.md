---
phase: 11-data-accuracy-drawer-hardening
verified: 2026-05-05T09:05:00Z
status: passed
score: 5/5 must-haves verified
overrides_applied: 0
---

# Phase 11: Data Accuracy, Drawer & Hardening Verification Report

**Phase Goal:** AOV contribution is numerically correct, the affiliate drawer shows top product and closes on filter change, and the app survives localStorage quota errors
**Verified:** 2026-05-05T09:05:00Z
**Status:** passed
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | AOV contribution values use net amounts for both numerator and denominator | VERIFIED | `src/lib/transactions.ts:409` — `e.net / frontSalesCount`; upsellMap accumulates `e.net += t.netAmount` at line 403; test "DATA-02: aovContribution uses netAmount not grossAmount" passes |
| 2 | A product slug like "down10" is classified correctly — not matched to "down1" | VERIFIED | `src/lib/transactions.ts:340` — uses `(?!\d)` negative lookahead; 6 patterns total with lookahead; test "DATA-03: 'down10 Slimjara' returns 'other' not 'down1'" passes |
| 3 | The affiliate drawer displays the affiliate's top-selling product | VERIFIED | `src/components/AffiliateDrawer.tsx:71` — `topProduct?: string` in interface; line 113-115 renders `Top: ${topProduct}`; `src/pages/Affiliates.tsx:326` passes `topProduct={selectedAffiliate ? topProducts.get(selectedAffiliate) : undefined}` |
| 4 | Changing the date period filter while a drawer is open closes the drawer | VERIFIED | `src/pages/Affiliates.tsx:66-68` — `useEffect(() => { setSelectedAffiliate(null); }, [periodDays])` ; `src/pages/Dashboard.tsx:57-58` — equivalent `setDrawerAffiliate(null)` on `[periodDays]`; statusFilter intentionally excluded from deps |
| 5 | Saving affiliate tags when localStorage is full does not throw an uncaught error | VERIFIED | `src/hooks/useAffiliateTags.ts:18-24` — `writeTagsToStorage` wrapped in try/catch with silent catch; test "writeTagsToStorage does not throw on QuotaExceededError" passes |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/transactions.ts` | Fixed AOV contribution and regex classification | VERIFIED | `e.net / frontSalesCount` at line 409; 6x `(?!\d)` patterns in classifyUpsellProduct |
| `src/hooks/useAffiliateTags.ts` | Try/catch around localStorage.setItem | VERIFIED | Lines 18-24: try/catch with silent catch comment |
| `src/components/AffiliateDrawer.tsx` | Drawer with topProduct prop displayed in header | VERIFIED | Interface at line 71, destructured at line 74, rendered at lines 113-115 |
| `src/pages/Affiliates.tsx` | topProduct passed to drawer + useEffect closing drawer on periodDays | VERIFIED | topProduct prop at line 326; useEffect at lines 66-68 |
| `src/pages/Dashboard.tsx` | useEffect closing drawer on periodDays | VERIFIED | setDrawerAffiliate(null) in useEffect on [periodDays] at lines 57-58 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| src/lib/transactions.ts | computeAffiliateUpsells | net amount in aovContribution | WIRED | `e.net / frontSalesCount` at line 409 |
| src/hooks/useAffiliateTags.ts | localStorage.setItem | try/catch wrapper | WIRED | Lines 19-23 wrap setItem in try/catch |
| src/pages/Affiliates.tsx | AffiliateDrawer | topProduct prop | WIRED | Line 326: `topProduct={selectedAffiliate ? topProducts.get(selectedAffiliate) : undefined}` |
| src/pages/Affiliates.tsx | setSelectedAffiliate(null) | useEffect on periodDays | WIRED | Lines 66-68: useEffect deps = [periodDays] only |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| AffiliateDrawer.tsx | topProduct | topProducts Map from Affiliates.tsx (computeTopProductPerAffiliate) | Yes - computed from allRows | FLOWING |
| transactions.ts | e.net | upsellMap accumulating t.netAmount from filteredRows | Yes - from transaction data | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| AOV uses net amounts | vitest run — test DATA-02 | PASS (22/22 tests pass) | PASS |
| down10 not matched as down1 | vitest run — test DATA-03 | PASS | PASS |
| localStorage quota resilience | vitest run — QuotaExceededError test | PASS | PASS |
| TypeScript compiles | npx tsc --noEmit | Clean (no errors) | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| DATA-02 | 11-01-PLAN | Corrigir AOV contribution — usar netAmount para numerador e denominador | SATISFIED | e.net / frontSalesCount in computeAffiliateUpsells |
| DATA-03 | 11-01-PLAN | Corrigir regex classifyUpsellProduct — word boundary para evitar "down10" -> "down1" | SATISFIED | 6x (?!\d) negative lookahead patterns |
| DRAW-01 | 11-02-PLAN | Passar topProducts Map como prop para AffiliateDrawer | SATISFIED | topProduct prop wired from Affiliates.tsx to AffiliateDrawer |
| DRAW-02 | 11-02-PLAN | Fechar drawer ao mudar filtro de periodo | SATISFIED | useEffect on periodDays in both Affiliates.tsx and Dashboard.tsx |
| HARD-01 | 11-01-PLAN | localStorage try/catch para QuotaExceededError | SATISFIED | writeTagsToStorage wrapped in try/catch |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None found | - | - | - | - |

### Human Verification Required

None. All truths verifiable programmatically. Visual rendering of "Top: {product}" is the only candidate, but the prop wiring and conditional render are confirmed in code.

### Gaps Summary

No gaps found. All 5 success criteria are met with passing tests, correct wiring, and clean TypeScript compilation.

---

_Verified: 2026-05-05T09:05:00Z_
_Verifier: Claude (gsd-verifier)_
