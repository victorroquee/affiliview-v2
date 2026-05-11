# Phase 6: Dados de Backend e Upsell - Context

**Gathered:** 2026-04-27
**Status:** Ready for planning
**Mode:** Auto-generated (autonomous mode)

<domain>
## Phase Boundary

Surface per-product backend/upsell results and per-affiliate upsell detail. All data already exists in TransactionRow (upsellNo, productName, affiliate, grossAmount, netAmount). This phase builds computed views and UI, not new data fetching.

</domain>

<decisions>
## Implementation Decisions

### Backend Product Results (BKND-01)
- Group transactions by productName where upsellNo > 0
- Classify as up1/up2/up3/down1/down2/down3 based on productName patterns (already detected by isUpsellByName)
- Display as a new table or section showing each upsell product with: name, quantity sold, gross, contribution to total
- Data source: existing Digistore24 API transactions — upsellNo field already populated
- The "up1, up2, up3, down1, down2, down3" naming comes from product name patterns in the data

### Per-Affiliate Upsell Breakdown in Drawer (BKND-02)
- In AffiliateDrawer, add a section showing upsells sold by this affiliate in the period
- Filter allRows by affiliate name AND upsellNo > 0
- Group by productName, show quantity and gross per upsell product
- Sort by quantity descending

### Upsell Kit AOV Contribution (BKND-03)
- For each upsell kit, show what percentage of the affiliate's total AOV it represents
- AOV = total net (front + upsells) / front sales count
- Each upsell's contribution = upsell gross / (total net per front sale)
- Show as a breakdown: "Up1: €X (Y% of AOV)" etc.

### Top Product per Affiliate (BKND-04)
- Calculate the product each affiliate sold most in the last 7 days
- Use the 7-day window from computeAffiliateRankings (same window as status)
- Count front sales (upsellNo === 0) per productName per affiliate
- Display as a badge or text on the affiliate row: "Top: [product name]"

### Claude's Discretion
- Layout and placement of the upsell breakdown table in AffiliateDrawer
- Whether backend results get their own section on Dashboard or a new tab

</decisions>

<code_context>
## Existing Code Insights

### Data Available
- TransactionRow has: affiliate, productName, upsellNo (0=front, 1+=upsell), grossAmount, netAmount, earnings
- isUpsellByName() detects upsell products by name pattern: /^(up\d|up\(|up |order bump|bump|down\s?\d|down )/
- computeFromFiltered() already iterates all transactions — can add upsell aggregation
- AffiliateDetail in affMap accumulates per-affiliate totals but not per-upsell-product breakdowns

### Files to Modify
- src/lib/transactions.ts — add upsell aggregation functions (per-product backend, per-affiliate upsell breakdown)
- src/components/AffiliateDrawer.tsx — add upsell breakdown section
- src/pages/Affiliates.tsx — add top product badge per affiliate
- Possibly src/pages/Dashboard.tsx or new component — backend product results table

### Integration Points
- AffiliateDrawer receives filteredRows and allRows props — can compute upsell data from these
- The 7-day window for top product can reuse computeAffiliateRankings window dates
- Product names need cleaning (strip M-prefix for display, same as Phase 5)

</code_context>

<specifics>
## Specific Ideas

- Use filteredRows (period-scoped) for upsell breakdowns, allRows for 7-day top product
- The upsell classification (up1/up2/up3/down1/down2/down3) is based on product naming conventions in Digistore24
- AOV contribution should show absolute value and percentage

</specifics>

<deferred>
## Deferred Ideas

None — all 4 requirements are implementable from existing data.

</deferred>
