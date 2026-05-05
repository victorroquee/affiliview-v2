# Phase 10: Visual Corrections - Context

**Gathered:** 2026-05-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Align color thresholds for margin and refund percentage across all surfaces in the app. Add missing Reembolso % column to BundlePerformanceTable. After this phase, every screen shows consistent color coding per the defined rules.

</domain>

<decisions>
## Implementation Decisions

### Color Threshold Rules
- **D-01:** Margem colors: ≥10% verde (green), 5-10% amarelo (yellow), <5% vermelho (red)
- **D-02:** Reembolso colors: ≤8% laranja (orange), >8% vermelho (red)
- **D-03:** Create a NEW CSS class "yellow" distinct from "orange" for margin 5-10% range. Margin uses green/yellow/red; Refund uses orange/red — no visual confusion.

### Centralized Helper
- **D-04:** Create `src/utils/colorThresholds.ts` with `getMarginColor(pct): "green" | "yellow" | "red"` and `getRefundColor(pct): "orange" | "red" | ""`. All pages import from this single source of truth.
- **D-05:** Replace all inline ternaries for margin/refund color in every page with calls to the helper functions.

### BundlePerformanceTable Column
- **D-06:** Add Reembolso % column positioned immediately AFTER the Reembolsos (quantity) column in BundlePerformanceTable.
- **D-07:** The new column uses the same color coding as refund everywhere: ≤8% orange, >8% red.

### Claude's Discretion
- CSS variable name for yellow (e.g., `--yellow`, `--warning`, `--amber-light`) — pick what fits the existing design system in index.css
- Tooltip text updates for any tooltips that reference wrong thresholds (e.g., ProductTable tooltip says ">5 orange, >10 red" but should say "≤8 orange, >8 red")

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Color Implementation
- `src/utils/colorThresholds.ts` — NEW file to create (helper functions)
- `src/index.css` — CSS classes: `.green`, `.orange`, `.red` exist; `.yellow` must be added
- `src/components/KPICard.tsx` — KPICard color prop type: `"green" | "orange" | "red" | ""`

### Surfaces to Update
- `src/pages/Affiliates.tsx` line 230 — margin color ternary (currently uses "orange" for 5-10%)
- `src/pages/Affiliates.tsx` line 283 — refund color ternary
- `src/pages/Dashboard.tsx` line 201 — refund KPI color
- `src/components/ProductTable.tsx` line 32 — tooltip text references wrong thresholds (">5%, >10%")
- `src/components/ProductTable.tsx` line 103 — refund color ternary (BundlePerformanceTable section)
- `src/components/cpa/AffiliateDetail.tsx` line 80 — refund badge colors (uses refundHigh/refundMid)
- `src/components/cpa/CPATable.tsx` line 43 — refundRate color threshold

### Requirements
- `.planning/REQUIREMENTS.md` — VIS-01, VIS-02, VIS-03 definitions

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- CSS classes `.green`, `.orange`, `.red` in `src/index.css` — already define color variables
- `KPICard` component accepts `color` prop — may need "yellow" added to union type
- `formatPct` utility — already used across all pages for percentage formatting

### Established Patterns
- Color classes applied via `className={`num ${colorClass}`}` pattern in table cells
- KPICard uses `color` prop directly (green/orange/red)
- CPA components use inline `var(--green-text)`, `var(--red)` etc. — slightly different pattern

### Integration Points
- BundlePerformanceTable is rendered inside `ProductTable.tsx` (the second table in the component, starting around line 74)
- `row.refundPct` is already computed in transactions.ts `computeBundlePerformance` — data exists, just needs a column
- Dashboard's refund KPI already has color logic — just needs threshold verified

</code_context>

<specifics>
## Specific Ideas

No specific requirements — the rules are clear from REQUIREMENTS.md. Key constraint: after this phase, visually inspecting ANY table with margin or refund columns should show the correct color per the defined thresholds.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 10-Visual Corrections*
*Context gathered: 2026-05-05*
