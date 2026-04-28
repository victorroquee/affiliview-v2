---
phase: 05-ajustes-visuais
reviewed: 2026-04-28T00:00:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - src/components/AffiliateDrawer.tsx
  - src/components/ProductTable.tsx
  - src/lib/transactions.ts
  - src/pages/Affiliates.tsx
  - src/pages/Dashboard.tsx
findings:
  critical: 1
  warning: 4
  info: 3
  total: 8
status: issues_found
---

# Phase 05: Code Review Report

**Reviewed:** 2026-04-28T00:00:00Z
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

Five files were reviewed covering the affiliate ranking system, the affiliate drawer component, the product table components, the main transactions computation library, and both dashboard and affiliates pages. The logic is generally sound and well-commented. One critical visual bug was found in `ProductTable.tsx` where a missing map key causes a broken CSS class. Four warnings cover metric inconsistency, misleading UI state, redundant non-null assertions, and a fragile product prefix regex. Three info-level items cover minor code quality patterns.

---

## Critical Issues

### CR-01: `RANKING_CLASS` in ProductTable.tsx is missing the `"Em Rampa"` key

**File:** `src/components/ProductTable.tsx:5-8`

**Issue:** The `RANKING_CLASS` map is typed as `Record<AffiliateRanking, string>`. `AffiliateRanking` has six members: `"Tier 1"`, `"Tier 2"`, `"Tier 3"`, `"Ativo"`, `"Em Rampa"`, and `"Inativo"`. However, `"Em Rampa"` is absent from the literal object. TypeScript should emit a compile error, but if the type annotation is relaxed or the tsconfig is permissive, the expression `RANKING_CLASS["Em Rampa"]` silently returns `undefined`. The `AffiliateTable` component renders `<span className={`tier-badge ${RANKING_CLASS[ranking]}`}>` — when `ranking === "Em Rampa"` this produces `class="tier-badge undefined"`, breaking styling for any affiliate in "Em Rampa" state.

**Fix:**
```typescript
const RANKING_CLASS: Record<AffiliateRanking, string> = {
  "Tier 1": "tier-1",
  "Tier 2": "tier-2",
  "Tier 3": "tier-3",
  "Ativo": "tier-ativo",
  "Em Rampa": "tier-em-rampa",   // <-- add this missing entry
  "Inativo": "tier-inativo",
};
```

---

## Warnings

### WR-01: `refundPct` in `BundleRow` is count-based while all other refund rates are value-based

**File:** `src/lib/transactions.ts:790`

**Issue:** The `bundlePerformance` calculation computes `refundPct` as a count ratio (`d.reembolsos / d.vendas * 100`). Every other refund percentage in the system — `PeriodMetrics.refundPct`, `ProductSummaryRow.returnPct`, `ProductSummaryRow.cbPct`, and the affiliate-level `refundCbPct` — are value-based (refund amount / gross amount). The `BundlePerformanceTable` renders the same "Reembolso %" label and the same threshold colors (`> 8` = red), but the number means something different. A bundle with two €10 refunds against €2,000 gross shows ~2% (value) vs a count-based rate that could be much higher if it happened to have only 5 sales.

**Fix:** Switch to value-based calculation consistent with the rest of the system:
```typescript
// Replace line 790:
refundPct: d.gross > 0 ? (d.refundAmt / d.gross) * 100 : 0,
```

### WR-02: "Em Rampa" progress bar shows 100% fill with a fail icon when affiliate has ≥10 sales

**File:** `src/components/AffiliateDrawer.tsx:298-319`

**Issue:** The "Em Rampa" tier bar calculates `pct = Math.min(Math.round((sales / 9) * 100), 100)`. When `sales >= 10`, `passes = false` (correct — affiliate is Ativo, not Em Rampa), but the bar renders at 100% width with a `✗` icon and count `{sales}/9`. For an affiliate with 15 sales, the UI shows a completely filled "Em Rampa" bar with a failure icon, which is visually confusing and contradicts the bar's purpose.

**Fix:** Cap the displayed count and percentage at the maximum meaningful value for this tier:
```typescript
const sales  = rankingInfo.frontSalesInWindow;
const displaySales = Math.min(sales, 9);  // cap display at 9
const passes = sales >= 1 && sales < 10;
const pct    = Math.min(Math.round((displaySales / 9) * 100), 100);
// ...
<span className="tier-bar-result-count">{displaySales}/9</span>
```

### WR-03: `grossRevenue` in `ProductSummaryRow` silently includes upsell gross

**File:** `src/lib/transactions.ts:692-733`

**Issue:** In `prodSumMap`, front payments increment `e.gross` (line 692), and then upsell payments for the same product also increment `e.gross` at line 707 (`e.gross += t.grossAmount`). The final `ProductSummaryRow.grossRevenue` maps to `d.gross` (line 723), so it is front + upsell gross. However:
- The column header tooltip in `ProductTable.tsx` line 26 says `"Soma de amount de todas as vendas frontais do produto. Não desconta reembolsos nem chargebacks"` — this explicitly states it is front-only.
- `returnPct` at line 731 divides by `d.grossBruto` which is front-only (only incremented at line 691), so refund rate denominator and gross revenue numerator are inconsistent. Depending on upsell volume, `grossRevenue` could be significantly overstated vs the tooltip claim.

**Fix:** Either (a) use a separate accumulator for front-only gross to keep `grossRevenue` front-only as the tooltip states, or (b) update the tooltip to accurately describe what is included. Option (a) is safer:
```typescript
// In prodSumMap accumulator, keep gross and frontGross separate:
e.frontGross += t.grossAmount;  // front-only gross (for grossRevenue)
e.gross      += t.grossAmount;  // all gross (for AOV numerator)
// ... when mapping to ProductSummaryRow:
grossRevenue: d.frontGross,
returnPct:    d.frontGross > 0 ? (d.refAmt / d.frontGross) * 100 : 0,
cbPct:        d.frontGross > 0 ? (d.cbAmt  / d.frontGross) * 100 : 0,
```

### WR-04: M-prefix strip regex in `computeTopProductPerAffiliate` is hardcoded to M1/M2/M3 only

**File:** `src/lib/transactions.ts:451`

**Issue:** `topProduct.replace(/^M[123]\s*/i, "")` only strips `M1`, `M2`, and `M3` prefixes. If a fourth (or higher-numbered) product is ever added (e.g. `M4 SomeProduct`), the prefix will not be stripped and the raw name with prefix will appear in the UI. The rest of the codebase uses `getProductBase()` for product name normalization — this one site uses a different pattern inconsistently.

**Fix:** Generalize the regex to match any M-prefix:
```typescript
result.set(affName, topProduct.replace(/^M\d+\s*/i, ""));
```

---

## Info

### IN-01: `getTagsFor(a.name)` called twice per row in Affiliates.tsx

**File:** `src/pages/Affiliates.tsx:244-246`

**Issue:** Inside the `filteredAffiliates.map()` callback, `getTagsFor(a.name)` is called at line 244 (for the conditional check) and again at line 246 (to iterate for rendering). Although the function is `O(1)` and cheap, calling it twice per row creates unnecessary duplication that becomes a maintenance risk if the function signature or semantics change.

**Fix:**
```typescript
const affiliateTags = getTagsFor(a.name);
// ...
{affiliateTags.length > 0 && (
  <div style={{ display: "flex", gap: 3, marginTop: 2, flexWrap: "wrap" }}>
    {affiliateTags.map(tag => (
```

### IN-02: Redundant non-null assertion on `affiliate` in `AffiliateDrawer.tsx`

**File:** `src/components/AffiliateDrawer.tsx:144, 169`

**Issue:** `affiliate!.name` is used inside both the tag chip `onClick` handler (line 144) and the `onKeyDown` handler (line 169). Both are event handlers that can only fire when the drawer is rendered, and the drawer only renders after the `if (!affiliate) return null;` guard at line 94. The `!` assertion is safe but redundant — it signals to readers that null is possible when it has already been excluded.

**Fix:** Remove the assertions; `affiliate` is guaranteed non-null past line 94:
```typescript
onClick={(e) => { e.stopPropagation(); removeTag(affiliate.name, tag); }}
// ...
addTag(affiliate.name, tagInput);
```

### IN-03: Magic number `9` for "Em Rampa" maximum in AffiliateDrawer does not reference a shared constant

**File:** `src/components/AffiliateDrawer.tsx:299-301`

**Issue:** The "Em Rampa" tier bar uses `9` as both the divisor and the displayed maximum (`sales / 9`, `/9`). `ATIVO_MIN_SALES = 10` is defined in `transactions.ts` but not exported. The literal `9` (= `ATIVO_MIN_SALES - 1`) appears in the component without explanation, while `TIER_MIN` is exported and used. If the Ativo threshold changes, this component will be out of sync.

**Fix:** Export `ATIVO_MIN_SALES` from `transactions.ts` and reference it:
```typescript
// In transactions.ts — change:
const ATIVO_MIN_SALES = 10;
// To:
export const ATIVO_MIN_SALES = 10;

// In AffiliateDrawer.tsx:
import { ..., ATIVO_MIN_SALES } from "../lib/transactions";
// ...
const passes = sales >= 1 && sales < ATIVO_MIN_SALES;
const pct    = Math.min(Math.round((sales / (ATIVO_MIN_SALES - 1)) * 100), 100);
// ...
<span className="tier-bar-threshold">1–{ATIVO_MIN_SALES - 1} vendas</span>
<span className="tier-bar-result-count">{sales}/{ATIVO_MIN_SALES - 1}</span>
```

---

_Reviewed: 2026-04-28T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
