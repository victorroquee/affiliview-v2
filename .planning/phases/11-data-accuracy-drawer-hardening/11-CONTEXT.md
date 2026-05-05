# Phase 11: Data Accuracy, Drawer & Hardening - Context

**Gathered:** 2026-05-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix data calculation bugs (AOV gross/net mismatch, regex classification), wire the affiliate drawer's top product display and close-on-filter behavior, and harden localStorage writes against quota errors. After this phase, all data is numerically correct, the drawer shows relevant context, and the app is resilient to storage limits.

</domain>

<decisions>
## Implementation Decisions

### AOV Contribution Fix (DATA-02)
- **D-01:** Claude identifies the exact location of the gross/net mismatch in AOV contribution calculation and fixes to use netAmount for both numerator and denominator

### Regex Word Boundary (DATA-03)
- **D-02:** Fix `classifyUpsellProduct` in `src/lib/transactions.ts` line 340 — the regex `/^down\s?1\b/i` already has `\b` word boundary but the issue is that other patterns like "down10" need checking. Claude audits all regex patterns in the function and ensures "down10" does not match "down1".

### Drawer Top Product (DRAW-01)
- **D-03:** Pass `topProducts` Map as prop to AffiliateDrawer from Affiliates.tsx (already computed at line 76)
- **D-04:** Display top product as subtitle text below the affiliate name in the drawer header. Style: secondary text, smaller font, e.g. "Top: Slimjara Front"

### Drawer Close on Filter (DRAW-02)
- **D-05:** Close the drawer (setSelectedAffiliate(null)) when the PERIOD filter changes. Use a useEffect watching the period filter value.
- **D-06:** Do NOT close on status tab change — only period filter triggers close. Rationale: affiliate data doesn't change with tab filter, only visibility does.

### localStorage Hardening (HARD-01)
- **D-07:** Wrap localStorage.setItem in try/catch. On QuotaExceededError, fail silently — tag is not persisted but app does not throw uncaught error.
- **D-08:** No user-facing notification on quota failure. Silent failure is acceptable since tags are non-critical.

### Claude's Discretion
- Exact regex fix strategy for DATA-03 (audit all patterns in classifyUpsellProduct, ensure word boundaries prevent cross-matching)
- Implementation of useEffect for drawer close (which dependency to watch — likely the period/dateRange state)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Data Logic
- `src/lib/transactions.ts` line 336-370 — `classifyUpsellProduct` function (regex patterns for upsell classification)
- `src/lib/transactions.ts` — AOV/contribution computation (search for grossAmount vs netAmount usage in contribution calcs)

### Drawer
- `src/components/AffiliateDrawer.tsx` — drawer component (props interface at line 66, header at line 117)
- `src/pages/Affiliates.tsx` line 60 — `selectedAffiliate` state
- `src/pages/Affiliates.tsx` line 76 — `topProducts` Map (already computed, not passed as prop)
- `src/pages/Affiliates.tsx` line 316 — AffiliateDrawer render (current props)

### Hardening
- `src/hooks/useAffiliateTags.ts` line 19 — localStorage.setItem (no try/catch currently)

### Requirements
- `.planning/REQUIREMENTS.md` — DATA-02, DATA-03, DRAW-01, DRAW-02, HARD-01

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `topProducts` Map already computed in Affiliates.tsx — just needs prop passing
- `useAffiliateTags` hook already has the localStorage logic centralized — single place to add try/catch
- `classifyUpsellProduct` is a pure function — easy to unit test the regex fix

### Established Patterns
- Drawer receives `affiliate`, `rankingInfo`, `filteredRows`, `onClose` props — add `topProduct: string | undefined`
- Period filter state in Affiliates.tsx — need to identify the exact state variable for useEffect dependency
- `useAffiliateTags.test.ts` already exists — can extend for quota error scenario

### Integration Points
- AffiliateDrawer is used from BOTH Affiliates.tsx (line 316) and Dashboard.tsx (line 336) — topProduct prop needs to be passed from both
- Period filter change affects data that drawer displays — closing prevents stale mixed-period data

</code_context>

<specifics>
## Specific Ideas

No specific requirements beyond what's in REQUIREMENTS.md. The fixes are well-defined bugs with clear expected behavior.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 11-Data Accuracy, Drawer & Hardening*
*Context gathered: 2026-05-05*
