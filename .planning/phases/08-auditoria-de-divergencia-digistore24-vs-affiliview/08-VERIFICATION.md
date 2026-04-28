---
phase: 08-auditoria-de-divergencia-digistore24-vs-affiliview
verified: 2026-04-28T12:00:00Z
status: human_needed
score: 8/10 must-haves verified
overrides_applied: 0
gaps:
  - truth: "Gross Revenue is within 1% of Digistore24 Gross Amount"
    status: failed
    reason: "Cannot verify programmatically — requires live browser comparison against Digistore24 dashboard for the same date range. Code fix is correct (gross = grossBruto) but actual runtime alignment is unknown. Additionally, CR-01 from code review notes that 'return' and 'reversal' transaction types are excluded from the API request — if Digistore uses these types for any refunds, the gap would persist."
    artifacts:
      - path: "src/hooks/useDigistoreAPI.ts"
        issue: "search[transaction_type] is 'payment,sale,upsell,refund,chargeback' — missing 'return' and 'reversal' types that the normalizer handles. If Digistore24 uses these for some refunds, they are silently absent from the dataset."
    missing:
      - "Human verification: load same date range in AffiliView and compare Gross Revenue to Digistore24 dashboard Gross Amount — confirm delta < 1%"
      - "Consider adding 'return,reversal' to search[transaction_type] if gap persists after visual check"
  - truth: "Earnings is within 1% of Digistore24 Your Earnings"
    status: failed
    reason: "Cannot verify programmatically — requires live browser comparison. Code fix is correct (earningsKPI = all payments + refCb) but actual runtime alignment is unknown. Same CR-01 concern applies: missing 'return'/'reversal' types may cause refund under-count. CR-02 also notes earningsFront (used for valorLiq) incorrectly deducts all refCbTxs without filtering to upsellNo===0."
    artifacts:
      - path: "src/lib/transactions.ts"
        issue: "earningsFront at line 560-562 deducts full refCbTxs (all upsell_no values) from front-only earnings — upsell refunds reduce valorLiq even though upsell earnings were never included in earningsFront. This is a logic error in the valorLiq path (does not affect earningsKPI displayed on dashboard)."
    missing:
      - "Human verification: load same date range in AffiliView and compare Earnings KPI to Digistore24 Your Earnings — confirm delta < 1%"
      - "Fix CR-02: filter refCbTxs to upsellNo === 0 when computing earningsFront"
human_verification:
  - test: "Gross Revenue alignment check"
    expected: "AffiliView Gross Revenue within 1% of Digistore24 Gross Amount for the same date range (reference: 2026-04-27, Digistore value €14,110.76)"
    why_human: "Requires live Digistore24 dashboard access and running AffiliView instance to compare actual rendered values. Cannot verify with static code analysis."
  - test: "Earnings alignment check"
    expected: "AffiliView Earnings KPI within 1% of Digistore24 Your Earnings for the same date range (reference: 2026-04-27, Digistore value €3,962.17)"
    why_human: "Requires live Digistore24 dashboard access and running AffiliView instance to compare actual rendered values."
  - test: "Valor Liquido unchanged after fix"
    expected: "Valor Liquido should remain at approximately €822.38 (or consistent with pre-fix value) — decoupling must not inflate it with upsell earnings"
    why_human: "Requires runtime comparison. Also note CR-02: earningsFront may be understated if upsell refunds exist, making valorLiq slightly more negative than expected."
---

# Phase 8: Auditoria de Divergencia Digistore24 vs AffiliView — Verification Report

**Phase Goal:** Identificar e corrigir as causas raiz da divergencia entre Gross (-13.4%), Earnings (-48.3%) e Net Amount exibidos no painel Digistore24 vs AffiliView
**Verified:** 2026-04-28T12:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | Diagnostic report with ranked hypotheses exists (AUDIT-01) | VERIFIED | `08-RESEARCH.md` — four ranked hypotheses H1-H4 with HIGH/MEDIUM-HIGH/MEDIUM probability ratings and evidence strength |
| 2 | Field mapping of Digistore24 API fields vs AffiliView documented (AUDIT-02) | VERIFIED | `08-RESEARCH.md` lines 154-161 — table maps `amount`→`grossAmount`, `earned_amount`→`earnings`, `transaction_type`→`transactionType`, `upsell_no`→`upsellNo` |
| 3 | Filters causing divergence identified (AUDIT-03) | VERIFIED | Root causes confirmed: (1) scope mismatch — gross/earnings used front-only; (2) transaction_type filter excluded `sale`/`upsell`. Both documented in RESEARCH.md and fixed in Plans 01-02. |
| 4 | API request includes sale,upsell in transaction_type filter (Plan 01) | VERIFIED | `src/hooks/useDigistoreAPI.ts:59` — `"search[transaction_type]": "payment,sale,upsell,refund,chargeback"` confirmed. Old value `"payment,refund,chargeback"` is gone. |
| 5 | AUDIT diagnostic block added then removed (Plans 01+02) | VERIFIED | `grep 'console.group("AUDIT'` returns 0 matches — block added in 08-01 (commit dd91ca9) and removed in 08-02 (commit 970f2ca) as intended |
| 6 | Dashboard Gross Revenue KPI uses all payments (gross = grossBruto) | VERIFIED | `src/lib/transactions.ts:544-545` — `const gross = grossBruto` confirmed. Old `const gross = frontPayments.reduce` pattern is gone. earningsKPI and earningsFront variables both present (3 matches each). |
| 7 | Valor Liquido decoupled to use front-only earnings | VERIFIED | `src/lib/transactions.ts:585` — `const valorLiq = earningsFront - cogsTotal` confirmed. earningsFront is computed from frontPayments only (line 560-562). |
| 8 | Dashboard KPI tooltips reflect corrected scope | VERIFIED | `src/pages/Dashboard.tsx:136,143` — Gross says "todos os pagamentos (front + upsells + bumps). Alinhado com Gross Amount do dashboard Digistore24." Old "pedidos frontais (upsell_no=0)" text is absent (0 matches). |
| 9 | Gross Revenue within 1% of Digistore24 Gross Amount (AUDIT-04) | UNCERTAIN | Code path is correct but runtime alignment cannot be verified without live browser comparison. CR-01 also notes missing `return`/`reversal` API types that could widen the gap. |
| 10 | Earnings within 1% of Digistore24 Your Earnings (AUDIT-05) | UNCERTAIN | Code path is correct but runtime alignment cannot be verified without live browser comparison. CR-02 notes earningsFront has a logic error affecting valorLiq (does not affect the displayed Earnings KPI itself). |

**Score:** 8/10 truths verified (2 require human verification)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/hooks/useDigistoreAPI.ts` | Expanded transaction_type filter | VERIFIED | `payment,sale,upsell,refund,chargeback` at line 59. Commit 6120606. |
| `src/lib/transactions.ts` | Fixed KPI computation with earningsKPI | VERIFIED | earningsKPI (3 matches), earningsFront (3 matches), `gross = grossBruto` (1 match), `valorLiq = earningsFront - cogsTotal` (1 match). TypeScript compiles clean. Commit 970f2ca. |
| `logica/earnings.md` | Updated spec with front + upsells | VERIFIED | "front + upsells" (3 matches), "Phase 8 correcao" (1 match), earningsKPI code example present. |
| `logica/gross_revenue.md` | Updated spec with all-payment gross | VERIFIED | "front + upsells" (4 matches), "Phase 8 correcao" (1 match), `const gross = grossBruto` (1 match). |
| `src/pages/Dashboard.tsx` | Updated KPI tooltip text | VERIFIED | "front + upsells" (3 matches), "Gross Amount do dashboard Digistore24" (1 match), old "pedidos frontais (upsell_no=0)" text absent. Commit e99287e. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/hooks/useDigistoreAPI.ts` | Digistore24 API | `search[transaction_type]` param | WIRED | Value `"payment,sale,upsell,refund,chargeback"` confirmed at line 59 |
| `src/lib/transactions.ts` | `PeriodMetrics.gross` | `const gross = grossBruto` | WIRED | line 545: `const gross = grossBruto` — all payments, not front-only |
| `src/lib/transactions.ts` | `PeriodMetrics.earnings` | `earningsKPI` variable | WIRED | line 862: `earnings: earningsKPI` in return object |
| `src/lib/transactions.ts` | `PeriodMetrics.valorLiq` | `earningsFront` variable (decoupled) | WIRED | line 585: `const valorLiq = earningsFront - cogsTotal` |
| `src/pages/Dashboard.tsx` | `PeriodMetrics.gross` display | `metrics.gross` | WIRED | Dashboard reads metrics.gross for Gross Revenue KPI card |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `src/lib/transactions.ts:computePeriod` | earningsKPI | `payTxs.reduce(earnings) + refCbTxs.reduce(earnings)` | Yes — reduces over real API transaction rows | FLOWING |
| `src/lib/transactions.ts:computePeriod` | gross (= grossBruto) | `payTxs.reduce(grossAmount)` | Yes — reduces over real API transaction rows | FLOWING |
| `src/lib/transactions.ts:computePeriod` | valorLiq | `earningsFront - cogsTotal` | Yes — earningsFront from frontPayments, cogsTotal from COGS table | FLOWING (note: CR-02 — earningsFront deducts all refCbTxs, not just front refunds) |
| `src/pages/Dashboard.tsx` | KPI card display | `metrics.gross`, `metrics.earnings` from computePeriod | Yes | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| TypeScript compiles without errors | `npx tsc --noEmit` | Exit code 0, no output | PASS |
| API filter includes sale+upsell | `grep -c "payment,sale,upsell,refund,chargeback" src/hooks/useDigistoreAPI.ts` | 1 | PASS |
| Old front-only gross pattern absent | `grep -c "const gross = frontPayments.reduce" src/lib/transactions.ts` | 0 | PASS |
| Old earningsTotal pattern absent | `grep -c "const earningsTotal =" src/lib/transactions.ts` | 0 | PASS |
| Audit diagnostic console.group absent | `grep -c 'console.group("AUDIT' src/lib/transactions.ts` | 0 | PASS |
| earningsKPI wired to PeriodMetrics.earnings | `grep -n "earnings: earningsKPI" src/lib/transactions.ts` | line 862 match | PASS |
| Daily Gross uses payTxs (not frontPayments) | `grep -n "for (const t of payTxs)" + context line 629` | Confirmed at line 629 in Daily Gross section | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| AUDIT-01 | 08-01-PLAN | Diagnostic report with ranked hypotheses | SATISFIED | `08-RESEARCH.md` — ranked H1-H4, probability ratings, evidence strength |
| AUDIT-02 | 08-01-PLAN | Field mapping Digistore24 API vs AffiliView | SATISFIED | `08-RESEARCH.md` lines 154-161 — API field → TransactionRow field table |
| AUDIT-03 | 08-01-PLAN | Identification of divergence-causing filters | SATISFIED | Root causes confirmed in RESEARCH.md + console audit (Plan 01); fixes verified in Plan 02 code |
| AUDIT-04 | 08-02-PLAN + 08-03-PLAN | Gross Revenue aligned with Digistore24 Gross Amount (<1%) | NEEDS HUMAN | Code formula is correct; runtime alignment unverifiable without live data |
| AUDIT-05 | 08-02-PLAN + 08-03-PLAN | Earnings aligned with Digistore24 Your Earnings (<1%) | NEEDS HUMAN | Code formula is correct; runtime alignment unverifiable without live data |

All 5 requirement IDs declared in plan frontmatter (AUDIT-01 through AUDIT-05) map to entries in REQUIREMENTS.md. No orphaned requirements found — all 5 are listed under "Auditoria de Divergencia" section. REQUIREMENTS.md Traceability table confirms all 5 are mapped to Phase 8.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/hooks/useDigistoreAPI.ts` | 59 | Missing `return,reversal` transaction types in API filter | Warning | If Digistore uses these types for any refunds, those transactions are never fetched — silently under-counts refunds, could widen Earnings gap (CR-01 from code review) |
| `src/lib/transactions.ts` | 560-562 | earningsFront deducts all refCbTxs (not filtered to upsellNo===0) | Warning | Valor Liquido understated when upsell refunds exist — does NOT affect earningsKPI dashboard display (CR-02 from code review) |
| `logica/gross_revenue.md` | 12-14 | "Origem/Filtro" section still says "upsell_no === 0 — nao entram no Gross" | Warning | Contradicts Phase 8 correction; "Exemplo Pratico" also shows old front-only calculation — misleading for future maintainers (CR-03 from code review) |
| `logica/earnings.md` | 63-65 | "Exemplo Pratico" excludes upsell earned_amount and says "(upsell de €34 nao incluido)" | Warning | Contradicts the corrected formula at top of same file — misleading for future maintainers (WR-01 from code review) |

### Human Verification Required

### 1. Gross Revenue Alignment (AUDIT-04)

**Test:** Open AffiliView in a browser with Vercel Dev running. Set the date filter to 2026-04-27 (or the same "yesterday" reference date from INVESTIGATION-CONTEXT.md). Record the Gross Revenue KPI value. Open Digistore24 vendor dashboard, filter to the same date, and record Gross Amount.

**Expected:** `|AffiliView_Gross - 14110.76| / 14110.76 < 0.01` (less than 1% delta)

**Why human:** Requires live data from both systems at runtime. The code formula is correct but actual alignment depends on whether Digistore24 returns `sale`/`upsell` type transactions for this date range. If delta >= 1%, investigate whether CR-01 (`return`/`reversal` types missing from API request) is contributing.

---

### 2. Earnings Alignment (AUDIT-05)

**Test:** Same browser session as above. Record the Earnings KPI value. Compare against Digistore24 Your Earnings for the same date.

**Expected:** `|AffiliView_Earnings - 3962.17| / 3962.17 < 0.01` (less than 1% delta)

**Why human:** Requires live data comparison. If delta >= 1%, check whether `return`/`reversal` type refunds are missing from the dataset (add them to `search[transaction_type]` and retest).

---

### 3. Valor Liquido Unchanged

**Test:** Same browser session. Record Valor Liquido. Compare against pre-fix reference value of €822.38.

**Expected:** Valor Liquido should be approximately €822.38 (within rounding). It should NOT have increased by the upsell earnings amount because earningsFront is correctly front-only.

**Why human:** Requires runtime value. Also worth verifying: if upsell refunds exist in the dataset, Valor Liquido may be slightly more negative than expected due to CR-02 (earningsFront incorrectly deducts all refCbTxs). This is a known logic error documented in 08-REVIEW.md and should be noted if confirmed.

---

### Gaps Summary

Two ROADMAP success criteria (AUDIT-04 and AUDIT-05) cannot be verified programmatically. The code changes implementing them are correct and complete — `gross = grossBruto` (all payments), `earningsKPI` includes all payments plus refCb — but the actual sub-1% alignment with Digistore24's live dashboard values requires a human to compare both systems against the same date range.

An open code review (08-REVIEW.md, filed same day) identifies two additional issues that may affect the runtime alignment check:
- **CR-01:** `return` and `reversal` transaction types are excluded from the Digistore24 API request. If any refunds in the reference date range use these type names, they are silently missing.
- **CR-02:** `earningsFront` (Valor Liquido base) incorrectly deducts all refCbTxs without filtering to front-only — Valor Liquido is understated when upsell refunds exist.

These issues do not block the human verification steps but should be addressed before the phase is closed as fully complete.

---

_Verified: 2026-04-28T12:00:00Z_
_Verifier: Claude (gsd-verifier)_
