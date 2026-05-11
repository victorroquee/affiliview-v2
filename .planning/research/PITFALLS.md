# Domain Pitfalls — AffiliView v1.2

**Domain:** Affiliate dashboard — adding status tiers, upsell data, tags, and drawer enhancements to an existing system
**Researched:** 2026-05-04
**Codebase version:** v1.2 planning phase (on top of v1.1 deliverables)

---

## Critical Pitfalls

Mistakes that cause data corruption, silent wrong numbers, or rewrites.

---

### Pitfall 1: Ranking window anchored to dataset max date, not wall-clock time

**What goes wrong:** `computeAffiliateRankings` derives its 7-day window from the maximum `date` in `allRows` — not from `Date.now()`. If the loaded dataset ends on, say, 2026-04-28, ranking is computed relative to that date even if today is 2026-05-04. Affiliates who sold on 2026-04-29 through 2026-05-04 are invisible to the ranking window and appear Inativo.

**Why it happens:** The design choice was intentional (make ranking reproducible for any date range), but it silently produces wrong tier/Ativo counts when the user loads a partial or stale dataset without realizing the anchor has shifted. The KPI cards ("Afiliados Ativos", "Inativos no Período") pull from these counts directly.

**Consequences:** The "21 vs 4 active affiliates" discrepancy noted in STATE.md is likely partly this: ranking uses `allRows` (wide window), but if `allRows` is also bounded by the selected period filter upstream, the window shrinks and affiliates fall off. Any new "Em Rampa" count or inactive listing will inherit this same ambiguity.

**Prevention:**
- Add a visible "Ranking window: DD/MM → DD/MM" label wherever tier/status counts are shown (already done in drawer header — extend it to KPI tooltips).
- Never pass a date-filtered slice as `allRows` to `computeAffiliateRankings`. Audit every call site — currently only `Dashboard.tsx:66` calls it, and it correctly uses the unfiltered `allRows` prop.
- When adding an "inactive affiliates list" feature, confirm the list pulls from `allRows`-based rankings, not from `filteredRows`.

**Detection:** KPI card "Afiliados Ativos" count changes when period filter changes, even though ranking is supposed to be period-independent.

**Phase:** Status tiers phase (STAT-01/02/03)

---

### Pitfall 2: `computeAffiliateRankings` is not called with `allRows` everywhere

**What goes wrong:** `computeAffiliateRankings` must receive ALL available rows to anchor the 7-day window correctly. Currently the `rankings` Map is computed once in `Dashboard.tsx` and passed down as a prop. When adding an "inactive affiliates list" or a tag-filtered affiliate view, a developer may re-compute rankings from a filtered slice (e.g., rows filtered by tag or product) instead of always using the full `allRows`.

**Consequences:** Affiliates appear as Inativo inside a tag-filtered view because they have no sales in the filtered subset, even if they are Tier 1 globally.

**Prevention:** Keep `rankings` as a single Map computed at the top (App or Dashboard level) from unfiltered `allRows`. Pass it down as a prop everywhere. Never recompute it locally in a sub-component.

**Phase:** Status tiers + tags phases (STAT-03, TAG-01)

---

### Pitfall 3: Product name regex is fragile for upsell classification

**What goes wrong:** `classifyUpsellProduct` in `transactions.ts` uses prefix regexes like `/^up\s?1\b|^up\(1\)/i`. This correctly handles "Up1 Slimjara Extra" and "Up(1) Slimjara" but will silently return `"other"` for any variation Digistore introduces, such as:
- "Upsell 1 — Slimjara" (word "Upsell" not "up")
- "UP 1 - Memoguard" (space before digit — caught by `up\s?1` only if \s? matches exactly one space; it does, but worth noting)
- Names starting with locale punctuation or invisible characters

**Consequences:** `contributionPct` in the upsell table will undercount because "other" items are shown separately, and the drawer's `computeAffiliateUpsells` will lump them into unnamed rows. If a new product line uses a different naming convention, all its upsells silently become "other" with no alert.

**Prevention:**
- Log (in dev) a warning whenever `classifyUpsellProduct` returns `"other"` for a row with `upsellNo > 0`.
- Add regression tests with the actual product names from the live dataset, not invented fixtures.
- The regex for `down\s?1` etc. has no `\b` word boundary — "down10" would match "down1". Add `\b` consistently across all patterns.

**Phase:** Upsell data phase (BKND-01/02/03)

---

### Pitfall 4: AOV contribution in drawer uses `grossAmount` for upsells but `netAmount` for AOV denominator

**What goes wrong:** `computeAffiliateUpsells` computes `totalAOV = totalNet / frontSalesCount` (using `netAmount` = VAT-excluded), but `aovContribution` for each upsell is `e.gross / frontSalesCount` using `grossAmount` (VAT-included). This makes the AOV contribution percentages (`aovContributionPct`) overstated by the VAT rate (~12-23%) for EU buyers.

**Consequences:** The drawer shows "AOV +" and "% AOV" columns that are numerically inconsistent — a upsell contribution can sum to more than 100% of AOV if most buyers are in high-VAT countries, because the numerator uses gross (VAT-in) but the denominator uses net (VAT-out).

**Prevention:** Make the upsell contribution calculation consistent: either use `netAmount` for both upsell contribution and AOV, or use `grossAmount` for both. Recommend net for both (matches the dashboard's AOV KPI definition as established in v1.1). Fix in `computeAffiliateUpsells` before the drawer upsell section ships.

**Phase:** Upsell drawer phase (BKND-02/03)

---

### Pitfall 5: `useAffiliateTags` reads localStorage only once (useState initializer)

**What goes wrong:** The hook initializes state with `useState(() => readTagsFromStorage())`. This runs once on mount. If two browser tabs are open (e.g., one for today's data, one for last week), tags added in one tab are not visible in the other until a hard refresh. More critically: if localStorage is cleared externally or by the browser (private mode, storage quota exceeded), the hook's in-memory state still reflects the old snapshot for the rest of the session.

**Consequences:** Tags appear to be added (UI updates via in-memory state) but are silently lost on next reload in edge cases (storage quota). The tag filter feature will show tags that no affiliate actually has anymore.

**Prevention:**
- Add a `storage` event listener to sync the in-memory state when another tab writes to localStorage. This is a standard pattern for cross-tab localStorage sync.
- Add a try/catch around `writeTagsToStorage` that surfaces an error if `localStorage.setItem` throws (QuotaExceededError). localStorage is capped at ~5MB per origin; tag data is tiny, but the pattern should be safe.
- Document in code comments that tag persistence is localStorage-only and survives browser restart but not incognito sessions.

**Phase:** Tags phase (TAG-01)

---

### Pitfall 6: Tag filtering on `affiliatesWithoutMail` does not account for ranking Map scope mismatch

**What goes wrong:** When a tag filter is added to the affiliate table, the natural implementation is to filter `affiliatesWithoutMail` (which comes from `metrics.topAffiliates`, filtered from `filteredRows`). The `rankings` Map, however, is computed from `allRows`. An affiliate present in the rankings Map might not appear in `topAffiliates` if they had zero front sales in the selected period (only refunds, or only upsells). Filtering by tag on the affiliate list and then showing their ranking badge will work, but filtering by "show only tagged affiliates" and then counting Ativo/Inativo from the visible rows will produce a wrong KPI if the count is recomputed.

**Consequences:** If a "filter by tag" feature adds a filtered count of Ativo affiliates within the tag group, it may show 0 for affiliates who are Ativo globally but have no sales in the period filter.

**Prevention:** When adding tag-based filtering, filter only the display list. Never recompute rankings or status counts from the filtered list. The KPI cards must always derive from `allRows`-based rankings. The tag filter is a display-only filter, not a data re-computation trigger.

**Phase:** Tags phase (TAG-01)

---

## Moderate Pitfalls

Issues that cause visible bugs or degraded UX, recoverable without data changes.

---

### Pitfall 7: Drawer opened via `AffiliateTable` passes stale `filteredRows`

**What goes wrong:** `AffiliateDrawer` receives `filteredRows` as a prop and computes `computeAffiliateUpsells` inside a `useMemo`. If the user opens a drawer, then changes the date filter (which updates `filteredRows` in the parent), the drawer will recompute upsells for the new period but still show the same affiliate's metrics from `AffiliateRow` (which was captured at click time via `drawerAffiliate` state).

**Consequences:** The drawer's "Período selecionado" metrics section (gross, sales, AOV from `AffiliateRow`) and the upsell table (recomputed from live `filteredRows`) will show numbers from two different time periods simultaneously — creating an inconsistent view where the header says "€12k gross" but the upsell detail sums to €18k.

**Prevention:** When `filteredRows` changes, either close the drawer automatically or re-derive the `AffiliateRow` metrics from the new `filteredRows` in the same `useMemo`. The simpler fix: close the drawer on filter change by adding a `useEffect` in Dashboard that calls `setDrawerAffiliate(null)` when `filteredRows` reference changes.

**Phase:** Drawer enhancement phase (BKND-02/03)

---

### Pitfall 8: "Top product per affiliate" strips M-prefix at display time, not storage time

**What goes wrong:** `computeTopProductPerAffiliate` returns product names with `M-prefix` stripped (e.g., "M3 Slimjara 6 Bottles" → "Slimjara"). This is correct for display, but if this label is stored or used as a lookup key downstream (e.g., to cross-reference with `productSummary` or `bundlePerformance`), it will fail to match because those tables store the original names with M-prefix stripped differently or not at all.

**Consequences:** If the drawer tries to show "top product" and then link to the bundle row for that product, the name lookup will silently return nothing.

**Prevention:** Keep the raw product name in the Map and strip only at render time. Or use `getProductBase` (which returns "Slimjara", "Erectus X", "Memoguard") as the canonical key, which is already used consistently in `productSummary` and `refundByProduct`.

**Phase:** Top product per affiliate (BKND-04)

---

### Pitfall 9: "Inativo" threshold hardcoded as "no sales in last 5 days" in product spec vs "0 in 7d window" in code

**What goes wrong:** PROJECT.md specifies: "Listagem de afiliados inativos (5 dias sem vendas)". The current `computeAffiliateRankings` uses a fixed 7-day window and marks affiliates with 0 front sales in that window as Inativo. There is no 5-day threshold — an affiliate who sold 0 times in 7 days is Inativo, regardless of whether their last sale was 6 days ago or 60 days ago.

**Consequences:** An affiliate who sold yesterday but not in the prior 6 days would appear "Ativo" (1 sale = Em Rampa, not Inativo), but an affiliate who sold 8 days ago with 5 sales would be Inativo. The business spec ("5 days without sales") implies recency from today, not a window count. These are different semantics.

**Prevention:** Clarify with the product owner before implementation: is "inactive" defined as (a) 0 front sales in the 7-day ranking window, or (b) last front sale was more than 5 days ago? Option (b) requires using `lastFrontSaleDate` (already tracked in `AffiliateRankingInfo`) and comparing to today's date. Implement the correct semantics — the data structure already supports both, so this is a logic decision, not an engineering one.

**Phase:** Status tiers phase (STAT-03) — must be resolved before building the inactive list UI

---

### Pitfall 10: Tags stored as lowercase but displayed as-is from storage

**What goes wrong:** `addTagToMap` normalizes tags to `tag.trim().toLowerCase()`. However, `getTagsFor` returns whatever is in the Map, which is always lowercase. The tag filter UI will compare lowercase tags from storage against user input or displayed values. If the filter input is case-sensitive, no match is found when the user types "Facebook" but the stored tag is "facebook".

**Consequences:** The tag filter may silently not match tags when user input has mixed case.

**Prevention:** Normalize the filter comparison at query time: `affiliateTags.filter(tag => tag.includes(filterInput.trim().toLowerCase()))`. This is consistent with how tags are stored. Document the lowercase normalization in the hook's JSDoc so future developers don't add case-sensitive comparisons.

**Phase:** Tags phase (TAG-01)

---

## Minor Pitfalls

Cosmetic issues or low-impact edge cases.

---

### Pitfall 11: `daysAgo` in drawer uses `Date.now()` not dataset max date

**What goes wrong:** The "Última venda: X dias atrás" label in the drawer calls `daysAgo(iso)` which computes `Math.floor((now - then) / 86400000)`. `Date.now()` reflects wall-clock time, but the dataset may be 3 days old. An affiliate who sold on the last day of the dataset will show "3 dias atrás" even if, from the dataset's perspective, they are current.

**Consequences:** Minor confusion for users who notice the mismatch between the dataset date range shown in the period bar and the "days ago" label.

**Prevention:** Pass the dataset's max date to `daysAgo` as a reference point, or add a "(dados até DD/MM)" qualifier next to the label. Low priority, but note it before shipping the inactive list feature.

**Phase:** Status tiers phase (STAT-03)

---

### Pitfall 12: `Em Rampa` bar's progress marker is at "left: 100%" which clips off the track

**What goes wrong:** In `AffiliateDrawer.tsx`, the `Em Rampa` tier bar renders `<div className="tier-bar-min-marker" style={{ left: "100%" }} />`. If the CSS class positions this as an absolutely-positioned child of `tier-bar-track` with `overflow: hidden`, the marker is invisible. Tier 3 does the same (`left: "85.7%"`) but that is intentionally inside the track. The 100% marker for Ativo and Em Rampa conveys no information if it's clipped.

**Consequences:** The visual affordance for "how close to the threshold" is lost for Ativo and Em Rampa tiers.

**Prevention:** For thresholds at exactly 100%, either omit the marker or place a label outside the track. Low visual priority but easy to fix during any drawer styling pass.

**Phase:** Status tiers / drawer polish

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|----------------|------------|
| Status tiers: "Ativo" 10+/7d audit (STAT-01/02) | Ranking window anchored to dataset maxDate, not today (Pitfall 1) | Audit all `computeAffiliateRankings` call sites; add window label to KPI tooltips |
| Inactive list (STAT-03) | "5 days" spec vs "7-day window" code mismatch (Pitfall 9) | Clarify business definition before building list UI |
| Inactive list (STAT-03) | Wall-clock `daysAgo` drift from dataset age (Pitfall 11) | Pass dataset maxDate as reference or add disclaimer |
| Upsell classification (BKND-01) | Regex fragility for non-standard product names (Pitfall 3) | Add dev-mode warn on "other" classification; add boundary anchors |
| Upsell drawer (BKND-02/03) | gross vs net inconsistency in AOV contribution (Pitfall 4) | Fix `computeAffiliateUpsells` to use `netAmount` for upsell gross |
| Upsell drawer (BKND-02/03) | Drawer shows metrics from two different periods when filter changes (Pitfall 7) | Close drawer on `filteredRows` change or re-derive `AffiliateRow` from fresh computation |
| Top product per affiliate (BKND-04) | M-prefix stripped at wrong layer, breaks downstream lookups (Pitfall 8) | Strip only at render; use `getProductBase` as canonical key |
| Tags (TAG-01) | `useAffiliateTags` not cross-tab synced; silent QuotaExceeded failure (Pitfall 5) | Add `storage` event listener; wrap setItem in try/catch |
| Tags (TAG-01) | Rankings computed from filtered slice when tag filter active (Pitfall 6 + 2) | Never recompute rankings from tag-filtered data; always use `allRows`-derived Map |
| Tags (TAG-01) | Case-sensitive filter mismatch (Pitfall 10) | Normalize filter input to lowercase before comparison |

---

## Sources

- Code audit: `/src/lib/transactions.ts` — `computeAffiliateRankings`, `computeAffiliateUpsells`, `classifyUpsellProduct`, `computeTopProductPerAffiliate`
- Code audit: `/src/components/AffiliateDrawer.tsx` — `daysAgo`, tier bar rendering, tag input
- Code audit: `/src/hooks/useAffiliateTags.ts` — localStorage read pattern, normalization
- Code audit: `/src/pages/Dashboard.tsx` — prop passing, `allRows` vs `filteredRows` usage
- Code audit: `/src/utils/digiNormalizer.ts` — `grossAmount` vs `netAmount` for upsell rows
- Project spec: `.planning/PROJECT.md` — "5 dias sem vendas" vs 7-day window definition
- Project state: `.planning/STATE.md` — "21 vs 4 afiliados" divergence note; open questions list
