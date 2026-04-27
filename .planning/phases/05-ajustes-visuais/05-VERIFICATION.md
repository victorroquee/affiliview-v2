---
phase: 05-ajustes-visuais
verified: 2026-04-27T00:00:00Z
status: gaps_found
score: 0/5 must-haves verified
overrides_applied: 0
gaps:
  - truth: "Refund percentage shows orange when <= 8% and red when > 8% across Dashboard, Affiliates table, and AffiliateDrawer"
    status: failed
    reason: "All three files still use old thresholds: refundCbPct > 10 (red) / refundCbPct > 5 (orange). The new threshold (> 8 red, > 0 orange) was never applied."
    artifacts:
      - path: "src/pages/Dashboard.tsx"
        issue: "Line 156: still uses `refundCbPct > 10 ? \"red\" : refundCbPct > 5 ? \"orange\" : \"\"`"
      - path: "src/pages/Affiliates.tsx"
        issue: "Line 223: still uses `a.refundCbPct > 10 ? \"red\" : a.refundCbPct > 5 ? \"orange\" : \"\"`"
      - path: "src/components/AffiliateDrawer.tsx"
        issue: "Line 119: still uses `affiliate.refundCbPct > 10 ? \"red\" : affiliate.refundCbPct > 5 ? \"orange\" : \"\"`"
    missing:
      - "Change all three expressions to: `refundCbPct > 8 ? \"red\" : refundCbPct > 0 ? \"orange\" : \"\"`"
      - "Update Dashboard.tsx info tooltip text from 'laranja >5%, vermelho >10%' to 'laranja <=8%, vermelho >8%'"

  - truth: "Margin shows green when >= 10%, yellow/orange when 5-10%, red when < 5% on Affiliates table and AffiliateDrawer"
    status: failed
    reason: "Both files still use old thresholds: margem > 30 (green) / margem > 15 (orange) / else red. The new thresholds (>= 10, >= 5) were never applied."
    artifacts:
      - path: "src/pages/Affiliates.tsx"
        issue: "Line 191: `const margemColor = a.margem > 30 ? \"green\" : a.margem > 15 ? \"orange\" : \"red\"`"
      - path: "src/components/AffiliateDrawer.tsx"
        issue: "Line 83: `const margemColor = affiliate.margem > 30 ? \"green\" : affiliate.margem > 15 ? \"orange\" : \"red\"`"
    missing:
      - "Change both expressions to: `margem >= 10 ? \"green\" : margem >= 5 ? \"orange\" : \"red\"`"

  - truth: "User no longer sees R+CB (total) column in the BundlePerformanceTable"
    status: failed
    reason: "R+CB column still fully present in ProductTable.tsx (th at line 83, td at lines 103-105). BundleRow.rcb field still exists in transactions.ts (line 69) and is still computed (line 611)."
    artifacts:
      - path: "src/components/ProductTable.tsx"
        issue: "Line 83: <th>R+CB (total)</th> still present. Lines 103-105: row.rcb td still rendered."
      - path: "src/lib/transactions.ts"
        issue: "Line 69: `rcb: number` field still in BundleRow interface. Line 611: `rcb: d.reembolsos + d.chargebacks` still computed."
    missing:
      - "Remove R+CB <th> header from BundlePerformanceTable"
      - "Remove row.rcb <td> from BundlePerformanceTable row rendering"
      - "Remove `rcb: number` from BundleRow interface in transactions.ts"
      - "Remove `rcb: d.reembolsos + d.chargebacks` from bundlePerformance map construction"

  - truth: "User no longer sees M3/M2/M1 prefix text before SKU names in the Kit/SKU column"
    status: failed
    reason: "ProductTable.tsx line 89 renders `{row.bundle}` with no .replace() transform. No M-prefix stripping is applied anywhere."
    artifacts:
      - path: "src/components/ProductTable.tsx"
        issue: "Line 89: `<td style={{ fontWeight: 600 }}>{row.bundle}</td>` — no prefix strip applied"
    missing:
      - "Change to: `{row.bundle.replace(/^M\\d+\\s*/i, \"\")}`"

  - truth: "User can see a Reembolso % column in the Performance por Kit (Front) table with orange <=8% and red >8% coloring"
    status: failed
    reason: "BundlePerformanceTable has no Reembolso % column. BundleRow interface has no refundPct field (the refundPct at transactions.ts line 32 belongs to TransactionRow, not BundleRow). No column header, no td rendering."
    artifacts:
      - path: "src/components/ProductTable.tsx"
        issue: "No Reembolso % column header or cell rendering exists in BundlePerformanceTable"
      - path: "src/lib/transactions.ts"
        issue: "BundleRow interface (lines 60-70) has no refundPct field. rcb is still the last field."
    missing:
      - "Add `refundPct: number` to BundleRow interface in transactions.ts"
      - "Add `refundPct: d.vendas > 0 ? (d.reembolsos / d.vendas) * 100 : 0` to bundlePerformance map construction (replacing rcb line)"
      - "Add Reembolso % <th> header in BundlePerformanceTable after Chargebacks"
      - "Add Reembolso % <td> with color logic: `row.refundPct > 8 ? \"red\" : row.refundPct > 0 ? \"orange\" : \"\"`"
---

# Phase 5: Ajustes Visuais Verification Report

**Phase Goal:** Users see data presented with correct visual encoding (colors, columns, labels) that matches business thresholds
**Verified:** 2026-04-27
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Refund % shows orange <= 8% and red > 8% across Dashboard, Affiliates, AffiliateDrawer | FAILED | All 3 files still use old thresholds: `> 10` (red) / `> 5` (orange). New `> 8` threshold never applied. |
| 2 | Margin shows green >= 10%, orange 5-10%, red < 5% on Affiliates and AffiliateDrawer | FAILED | Both files still use old thresholds: `> 30` (green), `> 15` (orange). New `>= 10` / `>= 5` thresholds never applied. |
| 3 | User no longer sees R+CB (total) column in BundlePerformanceTable | FAILED | Column fully present in ProductTable.tsx (th + td). rcb field and computation still exist in transactions.ts. |
| 4 | User no longer sees M3/M2/M1 prefix before SKU names | FAILED | ProductTable.tsx line 89 renders `{row.bundle}` raw — no `.replace()` applied. |
| 5 | User can see a Reembolso % column in Performance por Kit (Front) table | FAILED | No column in BundlePerformanceTable. BundleRow has no refundPct field. |

**Score:** 0/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/pages/Dashboard.tsx` | refund threshold `> 8` | STUB | Still has `> 10 ? "red" : > 5 ? "orange"` at line 156 |
| `src/pages/Affiliates.tsx` | margin `>= 10`, refund `> 8` | STUB | margin: `> 30`/`> 15` at line 191; refund: `> 10`/`> 5` at line 223 |
| `src/components/AffiliateDrawer.tsx` | margin `>= 10`, refund `> 8` | STUB | margin: `> 30`/`> 15` at line 83; refund: `> 10`/`> 5` at line 119 |
| `src/components/ProductTable.tsx` | No R+CB col, M-prefix stripped, Reembolso % col | STUB | R+CB col at lines 83/103-105; raw `{row.bundle}` at line 89; no refundPct col |
| `src/lib/transactions.ts` | BundleRow with refundPct, without rcb | STUB | rcb: number still at line 69; BundleRow has no refundPct field |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/pages/Affiliates.tsx` | AffiliateRow.margem | ternary color expression | NOT_WIRED | Expression uses old `> 30`/`> 15` thresholds |
| `src/components/ProductTable.tsx` | BundleRow.refundPct | column rendering | NOT_WIRED | refundPct does not exist on BundleRow; no column rendering |
| `src/lib/transactions.ts` | BundleRow interface | rcb removed, refundPct added | NOT_WIRED | rcb still present (line 69); no refundPct field on BundleRow |

### Data-Flow Trace (Level 4)

Not applicable — phase is pure presentation-layer: color threshold ternaries and column visibility. No new data sources introduced. The data variables already flow from real DB-backed API calls established in earlier phases. The only concern is whether the display layer correctly encodes that data — which is verified at Levels 1-3 above.

### Behavioral Spot-Checks

Step 7b: SKIPPED — changes are presentation-layer only (CSS class selection, column visibility). No runnable logic to spot-check without a browser.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| VIS-01 | 05-01-PLAN.md | Refund % orange <=8%, red >8% | BLOCKED | Old thresholds still in Dashboard.tsx, Affiliates.tsx, AffiliateDrawer.tsx |
| VIS-02 | 05-01-PLAN.md | Margin green >=10%, yellow 5-10%, red <5% | BLOCKED | Old thresholds still in Affiliates.tsx, AffiliateDrawer.tsx |
| VIS-03 | 05-02-PLAN.md | Remove R+CB (TOTAL) column | BLOCKED | Column still present in ProductTable.tsx and BundleRow |
| VIS-04 | 05-02-PLAN.md | Remove M3/M2/M1 prefix from SKU names | BLOCKED | row.bundle rendered raw in ProductTable.tsx line 89 |
| VIS-05 | 05-02-PLAN.md | Add Reembolso % column to Kit (Front) table | BLOCKED | No column in ProductTable.tsx; no refundPct field on BundleRow |

No orphaned requirements: all VIS-01 through VIS-05 are mapped to Phase 5 in REQUIREMENTS.md traceability table and both plans claim them explicitly.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/pages/Dashboard.tsx` | 156 | `refundCbPct > 10 ? "red" : refundCbPct > 5 ? "orange"` | Blocker | Wrong color threshold — users see orange at >5% instead of <=8% |
| `src/pages/Affiliates.tsx` | 191 | `a.margem > 30 ? "green" : a.margem > 15 ? "orange"` | Blocker | Wrong margin color — affiliates with 5-29% margin shown as red instead of yellow/green |
| `src/pages/Affiliates.tsx` | 223 | `a.refundCbPct > 10 ? "red" : a.refundCbPct > 5 ? "orange"` | Blocker | Wrong refund color threshold |
| `src/components/AffiliateDrawer.tsx` | 83 | `affiliate.margem > 30 ? "green" : affiliate.margem > 15 ? "orange"` | Blocker | Wrong margin color in drawer |
| `src/components/AffiliateDrawer.tsx` | 119 | `affiliate.refundCbPct > 10 ? "red" : affiliate.refundCbPct > 5 ? "orange"` | Blocker | Wrong refund color in drawer |
| `src/components/ProductTable.tsx` | 83-105 | R+CB (total) column still present | Blocker | Column specified for removal still visible to users |
| `src/components/ProductTable.tsx` | 89 | `{row.bundle}` with no prefix strip | Blocker | M1/M2/M3 prefixes still visible in SKU column |
| `src/lib/transactions.ts` | 69 | `rcb: number` in BundleRow interface | Blocker | Obsolete field driving obsolete column |

### Human Verification Required

None. All failures are deterministic code checks — no visual inspection needed to confirm that old threshold values remain untouched.

### Gaps Summary

Phase 5 was planned but never executed. Both plans (05-01 and 05-02) have no SUMMARY files, and direct inspection of all target files confirms the codebase is unchanged from its pre-phase state.

**Root cause:** All 5 gaps share the same root cause — neither plan was executed. This is a single execution gap, not 5 separate implementation defects. Running both plans in sequence (05-01 then 05-02) will close all 5 gaps in one pass.

**05-01 fixes:** VIS-01 (refund thresholds in 3 files) + VIS-02 (margin thresholds in 2 files) — 6 threshold expression changes and 1 tooltip text update.

**05-02 fixes:** VIS-03 (remove rcb field + column) + VIS-04 (add .replace() for M-prefix) + VIS-05 (add refundPct field + column) — changes to transactions.ts and ProductTable.tsx.

---

_Verified: 2026-04-27_
_Verifier: Claude (gsd-verifier)_
