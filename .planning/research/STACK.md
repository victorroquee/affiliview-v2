# Technology Stack — v1.2 Delta

**Project:** AffiliView — affiliate dashboard upsell & status features
**Researched:** 2026-05-04
**Scope:** NEW capabilities only. Existing validated stack (React 19, TypeScript, Vite 5, Recharts, Tailwind-style CSS, Vercel) is not re-evaluated.

---

## Verdict: No New Dependencies Required

After auditing the codebase, all four feature domains (upsell parsing, "Em Rampa" status, localStorage tags, affiliate drawer) are already implemented with the current stack. The v1.2 milestone requires code changes and bug fixes, not stack additions.

---

## What Already Exists (Do Not Reinstall or Re-Architect)

| Capability | Where It Lives | Status |
|---|---|---|
| `useAffiliateTags` hook | `src/hooks/useAffiliateTags.ts` | Complete — add/remove/get/allTags, localStorage-backed, tested |
| Tag filter UI | `src/pages/Affiliates.tsx` | Complete — tab-style filter buttons, `tagFilter` state |
| "Em Rampa" status (1-9 vendas/7d) | `src/lib/transactions.ts:computeAffiliateRankings` | Complete — state machine outputs Tier 1/2/3 → Ativo → Em Rampa → Inativo |
| Upsell breakdown in drawer | `src/components/AffiliateDrawer.tsx` | Complete — `computeAffiliateUpsells` called, table rendered |
| Margin color logic | `src/pages/Affiliates.tsx` line 230 | Complete — green ≥10%, orange ≥5%, red <5% |
| Refund % color (laranja/vermelho) | `src/pages/Affiliates.tsx` line 283 | Complete — orange >0%, red >8% |
| `upsellNo` field in `TransactionRow` | `src/utils/digiNormalizer.ts` | Complete — maps `upsell_no` from API directly |
| Top product per affiliate | `src/lib/transactions.ts:computeTopProductPerAffiliate` | Complete — 7-day window, front sales only |
| Inactive affiliate count + last sale date | `src/pages/Affiliates.tsx` + `AffiliateDrawer` | Complete — inativoCount, `lastFrontSaleDate` shown |
| Refund % in BundlePerformance table | `src/components/ProductTable.tsx` line 83 | Complete — column present with color coding |
| PDF export | `src/lib/pdfExport.ts` + jsPDF@4 + jspdf-autotable@5 | Already in `dependencies` |

---

## The One Real Gap: Vercel API Proxy

`api/digistore.ts` is staged for deletion and the `api/` directory is empty. The Digistore24 API calls from `useDigistoreAPI.ts` fetch `/api/digistore` which will 404 in production.

**What to do:** Recreate `api/digistore.ts` as a Vercel serverless function. This is not a new stack choice — it is a restoration of existing architecture using `@vercel/node` (already in `devDependencies@5.6.18`).

**Pattern to follow:**
```typescript
// api/digistore.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { from, to, page, ...rest } = req.query;
  const apiKey = process.env.DIGISTORE_API_KEY;
  // proxy to https://www.digistore24.com/api/call/...
}
```

Environment variable `DIGISTORE_API_KEY` must be set in Vercel dashboard. Not a new capability — this was the established pattern.

---

## Supporting Libraries — Current Versions (No Changes Needed)

| Library | Current Version | Used For | Notes |
|---|---|---|---|
| `lucide-react` | ^0.468.0 | Icons in drawer, sidebar, KPI cards | Sufficient — `X`, `Users`, `FileDown` used |
| `date-fns` | ^4.1.0 | Date arithmetic | Not currently used in status logic (native Date used) — acceptable |
| `d3-array` | ^3.2.4 | Statistical helpers | Not currently used — keep for CPA pages |
| `papaparse` | ^5.5.3 | CSV fallback parsing | Keep for offline/CSV mode |
| `react-router-dom` | ^7.13.1 | Page routing | Sufficient |
| `jsPDF` | ^4.2.1 | PDF export | Already integrated in Dashboard |
| `jspdf-autotable` | ^5.0.7 | Table rendering in PDF | Already integrated |

---

## What NOT to Add

| Temptation | Why to Avoid |
|---|---|
| Zustand / Jotai for tag state | `useAffiliateTags` with `useState` + localStorage is already correct and tested. Adding a global store adds complexity for no benefit at this scope. |
| React Query / SWR | Data fetching is already handled by `useDigistoreAPI` with abort controller, pagination, and error state. Wrapping it now would require a large refactor. |
| A component library (shadcn, radix) | The drawer, tags, and status UI are already built with custom CSS variables. Introducing a component library mid-project creates style conflicts. |
| IndexedDB / localForage | localStorage is explicitly in scope per PROJECT.md constraints. IndexedDB adds complexity for data volumes that fit trivially in localStorage (tag map is <1KB). |
| A separate state management layer for status | The status state machine is pure functions in `transactions.ts`. No reactive state management is needed — `useMemo` over `computeAffiliateRankings(allRows)` is the right model. |
| `immer` for localStorage updates | `addTagToMap` and `removeTagFromMap` already use immutable spread patterns and are unit-tested. |

---

## Integration Points for Each New Feature

### Upsell Breakdowns (up1-3, down1-3)

- Data source: `TransactionRow.upsellNo` (already parsed from `upsell_no` in API response)
- Classification logic lives in `computeBackendProducts` in `transactions.ts` — maps product names to up1/up2/up3/down1/down2/down3 by naming convention
- Drawer display: `computeAffiliateUpsells` → `AffiliateDrawer` "Upsells Vendidos" section (already rendered)
- No new dependencies. Work is in fixing classification accuracy and surfacing it in the Dashboard's backend products table.

### "Em Rampa" Status

- Already computed in `computeAffiliateRankings` (1-9 front sales in 7-day window → `"Em Rampa"`)
- Already displayed in `Affiliates.tsx` with `tier-em-rampa` CSS class and badge
- Already shown in tier progress bars in `AffiliateDrawer`
- Work remaining: verify the 21 vs 4 affiliate count discrepancy (a data bug, not a stack issue)

### localStorage Tags

- `useAffiliateTags` hook is complete and covered by unit tests (`useAffiliateTags.test.ts`)
- Tag filter in `Affiliates.tsx` is wired: `tagFilter` state, filter buttons for each tag, filter applied in `filteredAffiliates` memo
- No changes to the storage layer needed

### Affiliate Drawer Enhancements

- `AffiliateDrawer.tsx` already renders: tags, metrics grid, tier analysis with 7-day squares, upsell table, AOV contribution
- "Produto mais rodado" (top product per affiliate): `computeTopProductPerAffiliate` exists and is called in `Affiliates.tsx` — needs to be passed as prop to drawer and displayed
- The only missing wire is passing `topProducts` Map into `AffiliateDrawer` props

---

## CSS / Styling

All new status badges and states use CSS custom properties already defined in `src/index.css`. Classes `tier-em-rampa`, `tier-ativo`, `tier-inativo` should be verified to exist there; if missing, they follow the same pattern as `tier-1`/`tier-2`/`tier-3`.

No CSS framework additions. No Tailwind upgrade. Custom CSS variables system is the correct approach for this dark-theme dashboard.

---

## Confidence Assessment

| Area | Confidence | Basis |
|---|---|---|
| No new deps needed | HIGH | Direct code audit — all features implemented |
| API proxy pattern | HIGH | `@vercel/node` in devDeps, `vercel.json` rewrite rule present |
| localStorage tag pattern | HIGH | Implemented and unit-tested |
| upsellNo parsing | HIGH | `digiNormalizer.ts` maps `upsell_no` directly from API |
| 21 vs 4 discrepancy root cause | LOW | Suspected data filter bug — needs runtime investigation |

---

## Sources

- Direct code audit: `src/lib/transactions.ts`, `src/components/AffiliateDrawer.tsx`, `src/pages/Affiliates.tsx`, `src/hooks/useAffiliateTags.ts`, `src/utils/digiNormalizer.ts`
- `package.json` — current dependency versions
- `vercel.json` — confirmed serverless rewrite rule
- `.planning/PROJECT.md` — feature requirements and constraints
