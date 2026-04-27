---
phase: 07-tags-de-afiliados
plan: "01"
subsystem: hooks, components
tags: [tags, localStorage, hooks, drawer, tdd]
dependency_graph:
  requires: []
  provides: [useAffiliateTags hook, AffiliateDrawer tag UI]
  affects: [src/hooks/useAffiliateTags.ts, src/components/AffiliateDrawer.tsx]
tech_stack:
  added: [vitest, jsdom, @testing-library/react]
  patterns: [TDD RED/GREEN, localStorage persistence, pure helper functions exported for testing]
key_files:
  created:
    - src/hooks/useAffiliateTags.ts
    - src/hooks/useAffiliateTags.test.ts
  modified:
    - src/components/AffiliateDrawer.tsx
    - vite.config.ts
    - package.json
decisions:
  - "Exported pure helpers (addTagToMap, removeTagFromMap, getTagsFor, allTagsFromMap, readTagsFromStorage, writeTagsToStorage) as named exports so they can be unit-tested without React test renderer"
  - "Inline styles used for tag chip UI to avoid adding a CSS file — reuses existing CSS variables"
  - "vitest + jsdom installed to support TDD approach — no test runner existed before"
metrics:
  duration: ~15 minutes
  completed: "2026-04-27"
  tasks_completed: 2
  files_modified: 5
---

# Phase 7 Plan 01: useAffiliateTags Hook and Drawer UI Summary

**One-liner:** localStorage-backed affiliate tag hook with add/remove/normalize operations and removable chip UI in AffiliateDrawer.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 (RED) | Create failing tests for useAffiliateTags | 3c0e33a | src/hooks/useAffiliateTags.test.ts, vite.config.ts, package.json |
| 1 (GREEN) | Implement useAffiliateTags hook | 4a24c0c | src/hooks/useAffiliateTags.ts |
| 2 | Add tag assignment UI to AffiliateDrawer | 9861cd0 | src/components/AffiliateDrawer.tsx |

## What Was Built

### useAffiliateTags hook (`src/hooks/useAffiliateTags.ts`)

- localStorage key: `affiliview-affiliate-tags`
- Data shape: `Record<string, string[]>` (affiliateName -> string[])
- Returns: `tags`, `getTagsFor(name)`, `addTag(name, tag)`, `removeTag(name, tag)`, `allTags`
- Tags normalized to lowercase + trimmed on every write
- Duplicates rejected silently
- Empty/whitespace-only strings rejected
- Pure helper functions exported as named exports for testability

### AffiliateDrawer tag section (`src/components/AffiliateDrawer.tsx`)

- Tags section added as first section in the drawer body, above metrics
- Existing tags rendered as small pill chips with inline x remove button
- Text input (placeholder "Adicionar tag...") — press Enter to add, auto-clears
- Chips use `var(--bg-2)` background, `var(--text-2)` foreground — consistent with app theme
- TypeScript compiles without errors

## Deviations from Plan

### Auto-added: Test infrastructure (Rule 3 — Blocking issue)

- **Found during:** Task 1 (TDD)
- **Issue:** No test runner existed in the project (no vitest/jest)
- **Fix:** Installed vitest + jsdom + @testing-library/react, added `test` script to package.json, added vitest config block to vite.config.ts
- **Files modified:** package.json, package-lock.json, vite.config.ts
- **Rationale:** TDD required a working test runner — without it the RED/GREEN gate couldn't be executed

### Auto-added: Pure helper exports (Rule 2 — Missing critical functionality for testability)

- **Found during:** Task 1 design
- **Issue:** Testing a React hook's internal logic without a full React test renderer is fragile. Exporting pure helper functions as named exports makes the business logic unit-testable without React overhead.
- **Fix:** Designed the hook to separate pure logic from React state, exporting helpers as named exports
- **Files modified:** src/hooks/useAffiliateTags.ts, src/hooks/useAffiliateTags.test.ts

## TDD Gate Compliance

- RED commit: 3c0e33a — `test(07-01): add failing tests for useAffiliateTags hook`
- GREEN commit: 4a24c0c — `feat(07-01): implement useAffiliateTags hook with localStorage persistence`
- All 8 tests passed after GREEN implementation

## Known Stubs

None — the tag UI is fully wired to the hook, which reads/writes real localStorage.

## Threat Flags

None — no new network endpoints, auth paths, or trust boundary changes introduced. localStorage access is user-scoped and was already accepted in the plan's threat model (T-07-01, T-07-02).

## Self-Check: PASSED
