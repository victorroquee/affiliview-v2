# Phase 7: Tags de Afiliados - Context

**Gathered:** 2026-04-27
**Status:** Ready for planning
**Mode:** Auto-generated (autonomous mode)

<domain>
## Phase Boundary

Manual tagging system for affiliates with localStorage persistence. Users assign origin/source tags to affiliates and filter the affiliate list by tag. No backend required — tags persist in browser localStorage.

</domain>

<decisions>
## Implementation Decisions

### Tag Persistence (TAG-01)
- Use localStorage to persist tags: key `affiliview-affiliate-tags`
- Data format: JSON object `{ [affiliateName: string]: string[] }`
- Tags are strings (lowercase, trimmed) e.g. "chris", "facebook", "instagram"
- Multiple tags per affiliate allowed
- No backend — browser-local only (matches session-only constraint for v1.1)

### Tag Assignment UI (TAG-01)
- Add a tag input/chip area in AffiliateDrawer when an affiliate is selected
- User types a tag name and presses Enter to add
- Existing tags shown as removable chips/badges
- Tags also displayed inline on the affiliate row in the table (small colored chips)

### Tag Filter (TAG-02)
- Add a tag filter dropdown/chip area above or next to the existing status filter tabs on Affiliates page
- Clicking a tag filters the list to show only affiliates with that tag
- Clearing the filter returns to the full list
- Available tags derived from all assigned tags across all affiliates

### Custom Hook
- Create `useAffiliateTags()` hook: reads/writes localStorage, provides `tags`, `addTag`, `removeTag`, `allTags` functions
- Used by both AffiliateDrawer (assign) and Affiliates page (filter + display)

### Claude's Discretion
- Visual design of tag chips (color, size, padding)
- Tag dropdown vs inline filter approach
- Whether to show tag count in the filter UI

</decisions>

<code_context>
## Existing Code Insights

### Files to Create/Modify
- src/hooks/useAffiliateTags.ts — NEW hook for localStorage tag management
- src/components/AffiliateDrawer.tsx — add tag assignment UI section
- src/pages/Affiliates.tsx — add tag display on rows + tag filter UI

### Integration Points
- AffiliateDrawer already receives `affiliate.name` — use as key for tag lookup
- Affiliates page already has statusFilter state — add tagFilter state alongside
- filteredAffiliates useMemo chain — add tag filtering after status filtering

</code_context>

<specifics>
## Specific Ideas

- Tags should be simple strings, not complex objects
- The hook should handle all localStorage read/write and provide reactive state
- Tag chips in table rows should be small and unobtrusive (10-11px font)

</specifics>

<deferred>
## Deferred Ideas

- Backend persistence for tags (shared between users) — PERS-03 in future requirements
- Auto-detection of affiliate origin — AUTO-01 in future requirements

</deferred>
