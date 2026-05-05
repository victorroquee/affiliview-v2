# Phase 9: Infrastructure & Count Correctness - Research

**Researched:** 2026-05-04
**Domain:** Vercel serverless API proxy restore + TypeScript affiliate ranking logic fix
**Confidence:** HIGH — all findings are verified from direct codebase audit, no external dependencies

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-02:** Show a small label near KPI cards displaying the 7-day ranking window dates (e.g., "28/04 — 04/05")
- **D-03:** Trace the 21 vs 4 discrepancy to root cause — audit data flow between Dashboard and Affiliates pages
- **D-04:** "Inativo" = last front sale (upsellNo=0) more than 5 days ago from today. Upsells don't count as activity.
- **D-05:** Affiliates who have NEVER sold also appear in the inactive list (not a separate category)
- **D-06:** Inactive list appears in BOTH places: Dashboard KPI card with count (click to expand) AND Affiliates page tab "Inativos"
- **D-07:** Restore api/digistore.ts from git (file is deleted locally but tracked) — no changes needed, restore as-is via `git restore`

### Claude's Discretion
- **D-01:** Window anchor strategy — Claude picks the best approach based on how data flows through the system. Consider: if API returns data up to yesterday, using "today" would show everyone as less active. The choice should produce the most accurate real-world picture.

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DATA-01 | Restore api/digistore.ts (proxy Vercel deletado) | File tracked in git index (`git ls-files api/`) — `git restore api/digistore.ts` recovers it exactly |
| STAT-01 | Lógica "Ativo" auditada — corrigir discrepância 21 vs 4 | Root cause identified: `computeAffiliateRankings` anchors to dataset maxDate, not wall clock. Fix is in `transactions.ts` lines 188-197. |
| STAT-02 | "Inativo" definido como última venda front há mais de 5 dias (from today) | `lastFrontSaleDate` already tracked in `AffiliateRankingInfo` — change classification logic in `computeAffiliateRankings` lines 253-260 |
| STAT-03 | Listagem de afiliados inativos com contagem visível no dashboard | Dashboard.tsx already has `inativoCount` KPI card (line 211). Affiliates.tsx already has "Inativo" tab filter. Need: (1) never-sold affiliates added to rankings Map, (2) window label near KPI cards |
</phase_requirements>

---

## Summary

Phase 9 is a two-track fix: restore a deleted Vercel serverless proxy file, then correct three interconnected logic errors in a single TypeScript function. No new libraries, no schema changes, no new components — only targeted edits to existing code.

**Track 1 — API Proxy (DATA-01):** `api/digistore.ts` is tracked by git (`git ls-files api/` confirms the blob exists) but deleted from the working tree. The `git restore api/digistore.ts` command will recover the file exactly. The Vercel routing in `vercel.json` and the dev proxy in `vite.config.ts` are already configured to route `/api/digistore` to the Vercel function. Once the file is restored, production 404s disappear with no other changes.

**Track 2 — Count Correctness (STAT-01/02/03):** `computeAffiliateRankings` in `src/lib/transactions.ts` has one anchoring bug that causes the "21 vs 4" discrepancy. The fix requires choosing the window anchor (D-01) and updating the Inativo classification rule from "0 front sales in 7-day window" to "last front sale > 5 days ago from today" (D-04). The data structure (`lastFrontSaleDate` field in `AffiliateRankingInfo`) already exists to support the new rule — the change is purely in the classification predicate. Never-sold affiliates (D-05) are already partially handled via the `lastSaleMap` loop at line 286, but that loop only adds affiliates with historical sales; truly never-sold affiliates are absent from the rankings Map entirely. A separate pass over all distinct affiliate names from `allRows` is needed to populate them.

**Primary recommendation:** Fix `computeAffiliateRankings` with wall-clock anchor + 5-day recency rule, add never-sold affiliates, then add the window label. The two call sites (Dashboard.tsx:66, Affiliates.tsx:71) do not need changes — they correctly pass `allRows`.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| API proxy to Digistore24 | Vercel serverless (api/) | Vite dev proxy | api/digistore.ts runs server-side; key never exposed to browser |
| Affiliate ranking computation | Frontend (pure TS function) | — | `computeAffiliateRankings` is a pure transformation of in-memory data; no server needed |
| Inactive list display — Dashboard | Browser / Client (React) | — | Dashboard KPI card already renders `inativoCount`; expand to show list |
| Inactive list display — Affiliates | Browser / Client (React) | — | Affiliates page already has "Inativo" tab filter; works once rankings Map is correct |
| Window date label | Browser / Client (React) | — | Derive from `windowStart`/`windowEnd` already in `AffiliateRankingInfo` |

---

## Standard Stack

### Core (no changes required)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.2.4 | UI rendering | Project stack |
| TypeScript | 5.9.3 | Type safety | Project stack |
| Vite | 5.4.19 | Dev server + build | Project stack |
| @vercel/node | 5.6.18 | Vercel serverless runtime | Already installed; api/digistore.ts uses it |

### Test Infrastructure
| Library | Version | Purpose | Config Location |
|---------|---------|---------|-----------------|
| vitest | 4.1.5 | Test runner | vite.config.ts (test section, globals+jsdom) |
| @testing-library/react | 16.3.2 | React hook testing | devDependencies |
| jsdom | 29.1.0 | DOM environment | devDependencies |

**Installation:** No new packages needed.

---

## Architecture Patterns

### Data Flow (Ranking Window)

```
allRows (TransactionRow[])
    │
    ▼
computeAffiliateRankings(allRows)
    │  Anchored to: wall-clock Date.now() [AFTER FIX]
    │  Window: today-6 → today
    │
    ├── Map<affiliateName, AffiliateRankingInfo>
    │     .ranking: "Tier 1|2|3|Ativo|Em Rampa|Inativo"
    │     .lastFrontSaleDate: ISO string | null
    │     .windowStart, .windowEnd: ISO strings (for label)
    │
    ├── Dashboard.tsx (line 65-82)
    │     activosCount = rankings where Tier1/2/3 or Ativo
    │     inativoCount = rankings where Inativo
    │     KPI label: windowStart–windowEnd
    │
    └── Affiliates.tsx (line 70-91)
          rankings used for badge, tab filter
          statusFilter === "Inativo" shows inactive list
```

### Ranking Classification Logic (AFTER FIX)

```typescript
// Window anchor: wall clock, not dataset maxDate
const today = new Date();
const windowEnd = new Date(Date.UTC(
  today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(),
  23, 59, 59, 999
));
const windowStart = new Date(Date.UTC(
  today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - 6,
  0, 0, 0, 0
));

// Inativo classification: recency-based (D-04)
const INATIVO_DAYS = 5;
const todayKey = today.toISOString().split("T")[0]!;
function isInativo(lastFrontSaleDate: string | null): boolean {
  if (!lastFrontSaleDate) return true; // never sold (D-05)
  const daysSince = Math.floor(
    (Date.now() - new Date(lastFrontSaleDate + "T00:00:00Z").getTime()) / 86400000
  );
  return daysSince > INATIVO_DAYS;
}
```

### Anti-Patterns to Avoid
- **Anchoring window to dataset maxDate:** The existing code does `let maxDate = payRows[0]!.date; for (const t of payRows) if (t.date > maxDate) maxDate = t.date;` — this is the root cause of the 21 vs 4 bug. Replace with `Date.now()`.
- **Passing filteredRows to computeAffiliateRankings:** Both call sites already use `allRows` — do not change this invariant.
- **Recomputing rankings inside sub-components:** Rankings must be computed once at top-level and passed down as a prop.
- **Using upsell transactions for Inativo check:** D-04 explicitly requires only `upsellNo === 0` transactions for the last-sale date.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| API key injection in serverless | Custom auth middleware | Vercel env vars + existing `api/digistore.ts` pattern | Already working; just needs file restored |
| Date arithmetic | Custom date math | Native `Date.UTC()` + millisecond division | Already used throughout codebase; consistent |
| Window label formatting | Separate utility | `windowStart`/`windowEnd` from `AffiliateRankingInfo` + `toLocaleDateString("pt-BR")` | Data already in the Map |

---

## Root Cause Analysis: 21 vs 4 Discrepancy

### The Bug (STAT-01)

`computeAffiliateRankings` at line 188-197 of `src/lib/transactions.ts`:

```typescript
// CURRENT (broken): window anchored to dataset max date
let maxDate = payRows[0]!.date;
for (const t of payRows) {
  if (t.date > maxDate) maxDate = t.date;
}
const windowStart = new Date(Date.UTC(
  maxDate.getUTCFullYear(), maxDate.getUTCMonth(), maxDate.getUTCDate() - 6,
  0, 0, 0, 0
));
```

**Scenario where 21 vs 4 occurs:** If the API returned data up to 2026-04-28 (6 days ago), the ranking window becomes 2026-04-22 to 2026-04-28. Affiliates who sold on 2026-04-29 through 2026-05-04 (today) are invisible to the window — they show 0 front sales and appear Inativo. Only 4 affiliates who sold consistently before the dataset cutoff appear as Ativo.

**Why this differs from Digistore dashboard:** Digistore's own "active affiliates" metric is wall-clock based. Our stale anchor makes AffiliView show a different (older) window than what the user expects when comparing against today's Digistore dashboard.

### Window Anchor Decision (D-01)

**Recommendation: use `Date.now()` (wall clock) as the anchor.**

Rationale:
- The user's question "how many affiliates are active right now?" requires today as reference.
- If the API returns data up to yesterday (common for daily batch), a wall-clock anchor means yesterday's sales still count (they're within the 7-day window). An affiliate who sold yesterday is correctly shown as Ativo.
- A maxDate anchor would work only when the dataset is perfectly current — an unreliable assumption.
- The window label (D-02) will show the dates to the user, making it transparent that "today" is the reference.

**Edge case to handle:** If `allRows` is empty or filtered to a date range that predates the window, `rankings` will be empty or show everyone as Inativo. This is correct behavior — no data means no activity. The empty-state UI already handles `rankings.size === 0`.

### Inativo Semantics Change (STAT-02)

**Current code (line 253-260):**
```typescript
if (data.frontSales >= ATIVO_MIN_SALES) {
  assigned = "Ativo";
} else if (data.frontSales >= 1) {
  assigned = "Em Rampa";
} else {
  assigned = "Inativo";  // 0 front sales in 7d window
}
```

**Required semantics (D-04):** Inativo = last front sale > 5 days ago from today. This means an affiliate with 1 front sale 6 days ago is Inativo, but an affiliate with 1 front sale yesterday is Em Rampa. The `frontSalesInWindow` count is still relevant for Ativo/Em Rampa thresholds — only the Inativo fallback changes.

**New logic:**
```typescript
// Tier check first (unchanged)
for (const { tier, min } of TIER_THRESHOLDS) {
  if (isTierConsistent(dailyValues, min)) { assigned = tier; break; }
}
if (!assigned) {
  if (data.frontSales >= ATIVO_MIN_SALES) {
    assigned = "Ativo";
  } else if (data.frontSales >= 1) {
    assigned = "Em Rampa";
  } else {
    // Inativo: 0 sales in window. Still check recency for display,
    // but the ranking is Inativo regardless.
    assigned = "Inativo";
  }
}
// Post-assignment override: if lastFrontSaleDate is within 5 days,
// the affiliate has recent activity — keep Em Rampa, not Inativo.
// If > 5 days ago (or null), mark Inativo regardless of window count.
```

Wait — re-reading D-04 carefully: "Inativo = last front sale > 5 days ago." This means the 5-day rule applies even to affiliates with sales in the 7-day window. An affiliate with 1 sale 6 days ago has frontSales=1 in window (Em Rampa by count) but Inativo by recency. The recency rule takes precedence.

**Revised logic (correct interpretation of D-04):**
```typescript
// After window-based classification:
const lastDate = lastSaleMap.get(name) ?? null;
const daysSinceLast = lastDate
  ? Math.floor((Date.now() - new Date(lastDate + "T00:00:00Z").getTime()) / 86400000)
  : Infinity;

if (!assigned || daysSinceLast > 5) {
  assigned = "Inativo";
} else if (assigned === null) {
  // ... normal Em Rampa / Ativo assignment
}
```

The simplest correct implementation: compute window-based assignment first, then override with Inativo if `daysSinceLast > 5`.

### Never-Sold Affiliates (STAT-03 / D-05)

**Current code (line 286-299):** The existing "Add affiliates with historical sales but 0 in window as Inativo" loop adds affiliates from `lastSaleMap` who aren't already in `rankings`. This handles affiliates who sold historically but not in the current 7-day window. However, it does NOT handle affiliates who appear in `allRows` only as refunds (no payment rows), or affiliates who exist in a list but have no transactions at all.

**For never-sold:** If `allRows` comes only from the Digistore API (live fetch), then truly never-sold affiliates won't be in `allRows` at all — they only appear if the Digistore account has them registered. No fix needed for that case: an affiliate with zero transactions cannot be in the API response.

**For zero-payment affiliates (refunds only):** An affiliate could appear in `allRows` with only refund rows (returns from sales made before the dataset period). The normalizer assigns `affiliate_name` to refund rows. These affiliates won't be in `lastSaleMap` (which only checks `isPayment` rows). They won't appear in `affData` either. They will be invisible. This is an edge case but should be explicitly addressed: scan all rows (not just payments) for affiliate names and ensure any that appear nowhere in rankings are added as Inativo.

**Practical implementation for D-05:**
```typescript
// After building rankings Map, add any remaining affiliates from allRows
const allAffiliateNames = new Set<string>();
for (const t of allRows) {
  const name = t.affiliate.trim();
  if (name && !isMaileonardo(name)) allAffiliateNames.add(name);
}
for (const name of allAffiliateNames) {
  if (rankings.has(name)) continue;
  rankings.set(name, {
    ranking: "Inativo",
    days: dateKeys.map(dk => ({ date: dk, gross: 0, frontSales: 0, t1: false, t2: false, t3: false })),
    frontSalesInWindow: 0,
    windowStart: dateKeys[0]!,
    windowEnd: dateKeys[6]!,
    lastFrontSaleDate: null,
  });
}
```

Note: `isMaileonardo` filtering happens before calling `computeAffiliateRankings` at both call sites — the function receives already-filtered rows. So the function itself does not need to call `isMaileonardo`.

---

## Common Pitfalls

### Pitfall 1: git restore may fail if git history is corrupted
**What goes wrong:** `git log` output shows "error: Could not read e8a109570b8eba0049c0ba4a14a8b3df6cf18981" and "fatal: Failed to traverse parents." The history traversal is broken for some commits, but `git ls-files api/` confirms the blob `9de1e8665720b2b6dee86f30f9abff9f9f1dd368` is tracked.
**Why it happens:** The git repo has a corrupted or missing parent object, likely from a worktree agent branch (`worktree-agent-a91ed51f`). `git restore` reads from the index, not history — it should still work.
**How to avoid:** Run `git restore api/digistore.ts` (uses index blob). If that fails, fall back to `git cat-file -p 9de1e8665720b2b6dee86f30f9abff9f9f1dd368 > api/digistore.ts`. Verify with `npx tsc --noEmit`.
**Warning signs:** If `git restore` produces an error, use the blob hash fallback immediately.

### Pitfall 2: Wall-clock anchor shows "all Inativo" when old data is loaded
**What goes wrong:** If the user loads historical data (e.g., "January 2026"), the wall-clock window (today -6 to today) will not overlap with the data. All affiliates have 0 front sales in the window and appear Inativo. The count changes from 21 (maxDate anchor) to some other number.
**Why it happens:** Intentional consequence of the wall-clock fix. The Affiliates page already shows "Última venda: X dias atrás" which provides context.
**How to avoid:** The D-02 window label ("28/04 — 04/05" near KPI cards) makes this transparent. Include it in the same commit as the anchor fix so the UX and logic land together.
**Warning signs:** The "Afiliados Ativos" KPI changes to 0 when historical data is loaded — this is now correct behavior, not a bug.

### Pitfall 3: Inativo override breaks Tier affiliates
**What goes wrong:** If the 5-day recency override runs AFTER the Tier check and uses `if (daysSinceLast > 5) assigned = "Inativo"`, a Tier 1 affiliate who sold last on day 6 ago becomes Inativo — overriding their Tier status.
**Why it happens:** The 5-day rule as stated in D-04 says "last front sale > 5 days ago = Inativo" without specifying Tier exemption.
**How to avoid:** Apply the 5-day rule only when no Tier was assigned (only to the Ativo/Em Rampa/Inativo fallback block). Tier 1/2/3 status is more prestigious and is based on gross volume consistency, not recency alone — a Tier 1 affiliate who had one bad week should not become Inativo. Verify with user if needed, but the safer default is: Tiers are immune to the 5-day Inativo rule.
**Warning signs:** A Tier 1 affiliate appears as Inativo in the list — flag this during verification.

### Pitfall 4: Window label uses ISO format, not pt-BR
**What goes wrong:** Displaying `windowStart` (e.g., "2026-04-28") directly rather than "28/04" makes the UI inconsistent with the Portuguese locale used elsewhere in the app.
**How to avoid:** Format using `toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })` or manual string slicing: `"2026-04-28" → "28/04"`.

### Pitfall 5: Both Dashboard and Affiliates call computeAffiliateRankings independently
**What goes wrong:** After the fix, if the computation is expensive (it iterates all rows twice), performance could degrade.
**Reality check:** Both pages already do this in separate `useMemo([allRows])` calls. They are on separate navigation routes, so they don't run simultaneously. No perf concern for typical Digistore dataset sizes (< 10k rows).
**How to avoid:** Do not attempt to hoist `computeAffiliateRankings` to App-level state just for this phase. That would be a bigger refactor than the fix warrants.

---

## Code Examples

### Restore API Proxy (DATA-01)
```bash
# Primary: restore from git index
git restore api/digistore.ts

# Fallback if git is too corrupted:
git cat-file -p 9de1e8665720b2b6dee86f30f9abff9f9f1dd368 > api/digistore.ts

# Verify TypeScript compiles
npx tsc --noEmit
```

### Fixed Window Anchor (STAT-01)
```typescript
// Source: direct codebase audit of src/lib/transactions.ts lines 188-197
// REPLACE:
let maxDate = payRows[0]!.date;
for (const t of payRows) {
  if (t.date > maxDate) maxDate = t.date;
}
const windowStart = new Date(Date.UTC(
  maxDate.getUTCFullYear(), maxDate.getUTCMonth(), maxDate.getUTCDate() - 6,
  0, 0, 0, 0
));

// WITH:
const todayUTC = new Date();
const windowEnd = new Date(Date.UTC(
  todayUTC.getUTCFullYear(), todayUTC.getUTCMonth(), todayUTC.getUTCDate(),
  23, 59, 59, 999
));
const windowStart = new Date(Date.UTC(
  todayUTC.getUTCFullYear(), todayUTC.getUTCMonth(), todayUTC.getUTCDate() - 6,
  0, 0, 0, 0
));
```

### Fixed Inativo Classification (STAT-02)
```typescript
// Source: direct codebase audit — lines 244-261 of src/lib/transactions.ts
// After Tier check, before setting "Ativo"/"Em Rampa"/"Inativo":
const INATIVO_DAYS = 5;
const lastDate = lastSaleMap.get(name) ?? null;
const daysSinceLast = lastDate
  ? Math.floor((Date.now() - new Date(lastDate + "T00:00:00Z").getTime()) / 86400000)
  : Infinity;

// Only apply recency rule when no Tier was assigned
if (!assigned) {
  if (daysSinceLast > INATIVO_DAYS) {
    assigned = "Inativo";
  } else if (data.frontSales >= ATIVO_MIN_SALES) {
    assigned = "Ativo";
  } else if (data.frontSales >= 1) {
    assigned = "Em Rampa";
  } else {
    assigned = "Inativo";
  }
}
```

### Window Label Near KPI Cards (D-02)
```typescript
// Source: pattern from Affiliates.tsx formatDaysAgo + Dashboard.tsx KPI structure
// In Dashboard.tsx, after rankings useMemo:
const rankingWindowLabel = useMemo(() => {
  const values = [...rankings.values()];
  if (values.length === 0) return null;
  const first = values[0]!;
  const fmt = (iso: string) => iso.slice(8, 10) + "/" + iso.slice(5, 7);
  return `${fmt(first.windowStart)} — ${fmt(first.windowEnd)}`;
}, [rankings]);

// Render near the Atividade KPI group label:
// <div className="kpi-group-label">Atividade · <span className="window-label">{rankingWindowLabel}</span></div>
```

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.1.5 |
| Config file | vite.config.ts (`test: { globals: true, environment: "jsdom" }`) |
| Quick run command | `npm test` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DATA-01 | api/digistore.ts exists and TypeScript compiles | smoke | `npx tsc --noEmit` | ❌ Wave 0 (manual verify after restore) |
| STAT-01 | computeAffiliateRankings uses wall-clock anchor | unit | `npm test -- src/lib/transactions.test.ts` | ❌ Wave 0 |
| STAT-02 | Inativo = lastFrontSaleDate > 5 days ago from today | unit | `npm test -- src/lib/transactions.test.ts` | ❌ Wave 0 |
| STAT-03 | Never-sold affiliates appear in rankings as Inativo | unit | `npm test -- src/lib/transactions.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test` (full suite; currently 1 test file, fast)
- **Per wave merge:** `npm test && npx tsc --noEmit`
- **Phase gate:** All tests green + TypeScript clean before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/lib/transactions.test.ts` — covers STAT-01, STAT-02, STAT-03 (window anchor, Inativo recency, never-sold)
- [ ] No conftest needed — vitest globals configured in vite.config.ts

*(Existing test: `src/hooks/useAffiliateTags.test.ts` — covers tags, not affected by this phase)*

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | TypeScript compilation | ✓ | inferred from npm scripts | — |
| npm | Package management | ✓ | inferred | — |
| git | Restore api/digistore.ts | ✓ | installed (git log works) | Manual blob extract via `git cat-file` |
| Vercel CLI | Production deploy | not tested | — | Deploy via Vercel dashboard or git push |

**Missing dependencies with no fallback:** None for this phase.

**Notes:**
- `git restore` is the recovery mechanism for DATA-01. The git history is partially corrupted (worktree-agent branch issue), but `git ls-files api/` confirms the blob `9de1e8665720b2b6dee86f30f9abff9f9f1dd368` is in the index. `git restore` reads from the index, not history traversal, so it should work.
- Production Digistore API connectivity is not verifiable locally (requires `DIGISTORE_API_KEY` in `.env.local`). Dev proxy in vite.config.ts is already configured.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Tier affiliates should be immune to the 5-day Inativo override | Root Cause Analysis, Pitfall 3 | A Tier 1 affiliate who hasn't sold in 6 days would appear Inativo — likely wrong, but D-04 does not explicitly address this. User should confirm. |
| A2 | `git restore api/digistore.ts` will succeed despite corrupted history | Pitfall 1 | Restore fails silently; file remains absent; 404s persist in production. Fallback: `git cat-file -p 9de1e8665720b2b6dee86f30f9abff9f9f1dd368 > api/digistore.ts` |

---

## Open Questions

1. **Tier affiliates + 5-day Inativo rule (D-04 / A1)**
   - What we know: D-04 says "Inativo = last front sale > 5 days ago." Tier 1/2/3 classification requires consistent daily gross over 7 days, which implies recent activity. In practice a Tier affiliate with no sales in 5+ days would likely have dropped Tier already.
   - What's unclear: Should the 5-day rule explicitly exempt Tier affiliates? The business intent seems to be that Tier status overrides Inativo.
   - Recommendation: In the plan, treat Tiers as immune to the 5-day override. Flag for user review during `/gsd-verify-work`.

2. **"Never-sold" scope (D-05)**
   - What we know: The Digistore API only returns affiliates who have transaction records. If an affiliate is registered in the Digistore account but has zero transactions ever, they will not appear in `allRows`.
   - What's unclear: Does the user expect these affiliates (registered but never transacted) to appear in the inactive list? This would require a separate API call to list registered affiliates.
   - Recommendation: Implement D-05 to cover affiliates who appear in `allRows` (e.g., refund-only rows) but not in payments. Do not implement a separate "registered affiliates" fetch — that is out of scope unless confirmed.

---

## Sources

### Primary (HIGH confidence)
- Direct codebase audit: `src/lib/transactions.ts` — `computeAffiliateRankings` lines 181-302, `ATIVO_MIN_SALES`, `lastSaleMap` logic
- Direct codebase audit: `src/pages/Dashboard.tsx` — `activosCount`, `inativoCount`, `rankings` useMemo, KPI card structure
- Direct codebase audit: `src/pages/Affiliates.tsx` — `rankings`, `activeCount`, tab filter, `formatDaysAgo`
- Direct codebase audit: `src/hooks/useDigistoreAPI.ts` — `/api/digistore` fetch, pagination, abort
- Direct codebase audit: `src/utils/digiNormalizer.ts` — `upsellNo`, `lastFrontSaleDate` normalization
- Direct codebase audit: `vite.config.ts` — dev proxy configuration for `/api/digistore`
- Direct codebase audit: `vercel.json` — Vercel rewrite routing for `/api/(.*)`
- `git ls-files api/` — confirms blob `9de1e8665720b2b6dee86f30f9abff9f9f1dd368` tracked
- `.planning/research/PITFALLS.md` — Pitfalls 1, 9, 11 directly relevant to this phase
- `.planning/research/SUMMARY.md` — Issue table confirming root causes

### Secondary (MEDIUM confidence)
- `.planning/STATE.md` — "21 vs 4" discrepancy documented as known issue, maxDate anchor identified as root cause
- `package.json` — confirms vitest 4.1.5, @vercel/node 5.6.18, no missing deps

---

## Metadata

**Confidence breakdown:**
- DATA-01 fix: HIGH — git blob confirmed, restore path clear, fallback identified
- STAT-01 root cause: HIGH — window anchor code audited directly, mechanism fully understood
- STAT-02 implementation: HIGH — `lastFrontSaleDate` field exists, classification logic is straightforward
- STAT-03 never-sold: MEDIUM — depends on A2 assumption about what "never-sold" means in context of API-only data
- D-01 window anchor decision: HIGH — wall-clock is the correct choice for "current status" display

**Research date:** 2026-05-04
**Valid until:** 2026-06-04 (stable codebase; no external library churn)
