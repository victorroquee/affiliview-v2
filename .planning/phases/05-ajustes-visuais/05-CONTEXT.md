# Phase 5: Ajustes Visuais - Context

**Gathered:** 2026-04-27
**Status:** Ready for planning
**Mode:** Auto-generated (autonomous mode — all decisions from REQUIREMENTS.md)

<domain>
## Phase Boundary

Visual encoding corrections: fix color thresholds for refund and margin indicators, remove unnecessary columns, remove SKU prefixes, add refund percentage column to kit performance table. Pure presentation layer — no data logic changes.

</domain>

<decisions>
## Implementation Decisions

### Refund Color Thresholds (VIS-01)
- Orange: refund percentage <= 8%
- Red: refund percentage > 8%
- Applies to: Dashboard refund KPI, Affiliates page refund column, ProductTable refund indicators
- Current thresholds (to replace): orange >5%, red >10%

### Margin Color Thresholds (VIS-02)
- Green: margin >= 10%
- Yellow/amber: margin 5-10%
- Red: margin < 5%
- Applies to: Affiliates page margin column, AffiliateDrawer margin display
- Current thresholds (to replace): green >30%, orange >15%, red <=15%

### Remove R+CB (TOTAL) Column (VIS-03)
- Remove the "R+CB (total)" column from BundlePerformanceTable in ProductTable.tsx
- Remove the `rcb` field from BundleRow interface and calculation
- Keep individual Reembolsos and Chargebacks columns

### Remove M3/M2/M1 SKU Prefix (VIS-04)
- Strip M1/M2/M3/M4 prefix from product names displayed in tables
- Keep the variant detection logic in parseHelpers.ts (used for CPA variant analysis)
- Only affect display — strip prefix in UI rendering, not data layer

### Add Reembolso % Column to Kit Table (VIS-05)
- Add "Reembolso %" column to BundlePerformanceTable
- Calculate as: (refund count / total sales count) * 100 per kit
- Apply same color thresholds: orange <=8%, red >8%

### Claude's Discretion
All implementation decisions are locked by requirements. No discretion needed.

</decisions>

<code_context>
## Existing Code Insights

### Files to Modify
- `src/components/ProductTable.tsx` — BundlePerformanceTable: remove R+CB column, add Reembolso %, strip M prefix from display
- `src/pages/Affiliates.tsx` — margin color thresholds, refund color thresholds
- `src/components/AffiliateDrawer.tsx` — margin color thresholds, refund color thresholds
- `src/pages/Dashboard.tsx` — refund KPI color thresholds

### Current Threshold Locations
- Dashboard.tsx line ~141: `metrics.refundCbPct > 10 ? "red" : metrics.refundCbPct > 5 ? "orange" : ""`
- Affiliates.tsx line ~112: margin thresholds (>30% green, >15% orange, <=15% red)
- Affiliates.tsx line ~137: refund thresholds
- AffiliateDrawer.tsx line ~70: margin thresholds
- AffiliateDrawer.tsx line ~106: refund thresholds
- ProductTable.tsx lines ~46-49: refund/chargeback thresholds

### BundleRow Interface
- `rcb: number` field at ProductTable.tsx line ~69 — to be removed
- `rcb` column at line ~83 — to be removed
- Need to add `refundPct: number` field and column

</code_context>

<specifics>
## Specific Ideas

- All threshold changes are simple numeric replacements in ternary expressions
- R+CB column removal is a clean delete (field + column + calculation)
- M prefix stripping should use a display-only helper, not modify underlying data
- Reembolso % needs access to refund count and total sales per kit (already available in BundleRow data)

</specifics>

<deferred>
## Deferred Ideas

None — all requirements are concrete visual adjustments.

</deferred>
