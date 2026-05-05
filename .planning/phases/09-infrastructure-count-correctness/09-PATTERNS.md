# Phase 9: Infrastructure & Count Correctness - Pattern Map

**Mapped:** 2026-05-04
**Files analyzed:** 4 files (1 restore, 2 modify existing, 1 create new)
**Analogs found:** 4 / 4

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `api/digistore.ts` | serverless handler | request-response | `api/digistore.ts` (git blob `9de1e8665720b2b6dee86f30f9abff9f9f1dd368`) | exact (restore) |
| `src/lib/transactions.ts` | utility / pure function | transform (batch) | `src/lib/transactions.ts` itself (targeted edits) | exact (in-place fix) |
| `src/pages/Dashboard.tsx` | component / page | request-response + CRUD | `src/pages/Affiliates.tsx` | role-match |
| `src/lib/transactions.test.ts` | test | batch | `src/hooks/useAffiliateTags.test.ts` | role-match |

---

## Pattern Assignments

### `api/digistore.ts` (serverless handler, request-response)

**Action:** `git restore api/digistore.ts` (restore deleted file from git index). No pattern to copy — file content is already correct. Fallback: `git cat-file -p 9de1e8665720b2b6dee86f30f9abff9f9f1dd368 > api/digistore.ts`.

**Verify after restore:**
```bash
npx tsc --noEmit
```

**Routing configuration already in place** — `vite.config.ts` dev proxy and `vercel.json` rewrites are unchanged.

---

### `src/lib/transactions.ts` — `computeAffiliateRankings` (utility, transform)

**Analog:** `src/lib/transactions.ts` itself (three targeted edits within the existing function)

**Edit 1 — Window anchor fix (STAT-01)**
Lines 187-197 (current broken code):
```typescript
// REMOVE: maxDate-based anchor
let maxDate = payRows[0]!.date;
for (const t of payRows) {
  if (t.date > maxDate) maxDate = t.date;
}
const windowStart = new Date(Date.UTC(
  maxDate.getUTCFullYear(), maxDate.getUTCMonth(), maxDate.getUTCDate() - 6,
  0, 0, 0, 0
));
```

Replace with wall-clock anchor:
```typescript
// Wall-clock anchor: today is the reference point (D-01)
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

Note: `dateKeys[6]` now equals today's ISO date key (derived from the loop at lines 200-205 which remains unchanged). The variable `windowEnd` is needed only to make the window boundary explicit; `dateKeys[6]` is still the correct upper bound for the filter at line 215.

**Edit 2 — Inativo recency classification (STAT-02)**
Lines 253-260 (current code):
```typescript
if (!assigned) {
  if (data.frontSales >= ATIVO_MIN_SALES) {
    assigned = "Ativo";
  } else if (data.frontSales >= 1) {
    assigned = "Em Rampa";
  } else {
    assigned = "Inativo";
  }
}
```

Replace with recency-aware classification (D-04 — Tier affiliates are immune per Pitfall 3):
```typescript
const INATIVO_DAYS = 5;
// lastSaleMap already built at lines 230-240 — pattern: Map<string, string> of ISO dates
const lastDate = lastSaleMap.get(name) ?? null;
const daysSinceLast = lastDate
  ? Math.floor((Date.now() - new Date(lastDate + "T00:00:00Z").getTime()) / 86400000)
  : Infinity;

// Only apply recency rule when no Tier was assigned (Tiers are immune — Pitfall 3)
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

Pattern for `daysSinceLast` computation: mirrors `formatDaysAgo` in `src/pages/Affiliates.tsx` line 47:
```typescript
// Affiliates.tsx line 47 — same arithmetic pattern
function formatDaysAgo(iso: string): string {
  const d = Math.floor((Date.now() - new Date(iso + "T00:00:00Z").getTime()) / 86400000);
  ...
}
```

**Edit 3 — Never-sold affiliates from allRows (STAT-03 / D-05)**
After the existing `lastSaleMap` loop at lines 285-299, add a second pass for affiliates who appear in `allRows` (including refund-only rows) but were never in `lastSaleMap`:

```typescript
// Add affiliates who appear in allRows but have zero payment transactions (refund-only)
// These are absent from both affData and lastSaleMap — add them as Inativo (D-05)
const allAffiliateNames = new Set<string>();
for (const t of allRows) {
  const name = t.affiliate.trim();
  if (name) allAffiliateNames.add(name);
}
for (const name of allAffiliateNames) {
  if (rankings.has(name)) continue;
  const emptyDays: AffiliateDayDetail[] = dateKeys.map((dk) => ({
    date: dk, gross: 0, frontSales: 0, t1: false, t2: false, t3: false,
  }));
  rankings.set(name, {
    ranking: "Inativo",
    days: emptyDays,
    frontSalesInWindow: 0,
    windowStart: dateKeys[0]!,
    windowEnd: dateKeys[6]!,
    lastFrontSaleDate: null,
  });
}
```

Pattern for empty-days construction: copy from existing loop at lines 287-291:
```typescript
// Lines 287-291 — existing pattern for never-in-window affiliates
const emptyDays: AffiliateDayDetail[] = dateKeys.map((dk) => ({
  date: dk, gross: 0, frontSales: 0, t1: false, t2: false, t3: false,
}));
```

**Note on `isMaileonardo` filtering:** Both call sites (Dashboard.tsx line 66, Affiliates.tsx line 71) pre-filter with `allRows.filter((r) => !isMaileonardo(r.affiliate))` before calling `computeAffiliateRankings`. The function itself does NOT need to call `isMaileonardo`.

---

### `src/pages/Dashboard.tsx` — window label (component, request-response)

**Analog:** `src/pages/Affiliates.tsx` (same page role, same `rankings` useMemo pattern)

**Imports pattern** (Dashboard.tsx lines 1-32 — no new imports needed; `useMemo` already imported):
```typescript
import React, { useMemo, useState } from "react";
// ... existing imports unchanged
```

**Window label useMemo** — insert after `inativoCount` useMemo (lines 80-83):
```typescript
// Pattern: derive from AffiliateRankingInfo.windowStart / windowEnd fields
// Same ISO string slicing pattern as RESEARCH.md Code Examples section
const rankingWindowLabel = useMemo(() => {
  const values = [...rankings.values()];
  if (values.length === 0) return null;
  const first = values[0]!;
  const fmt = (iso: string) => iso.slice(8, 10) + "/" + iso.slice(5, 7);
  return `${fmt(first.windowStart)} — ${fmt(first.windowEnd)}`;
}, [rankings]);
```

**KPI group label pattern** (Dashboard.tsx line 200 — existing):
```typescript
// Existing pattern to extend — add window label inline:
<div className="kpi-group-label">Atividade</div>
// → becomes:
<div className="kpi-group-label">
  Atividade
  {rankingWindowLabel && (
    <span style={{ fontWeight: 400, fontSize: 12, color: "var(--text-3)", marginLeft: 8 }}>
      {rankingWindowLabel}
    </span>
  )}
</div>
```

**KPI card info text update** (Dashboard.tsx line 215 — existing `Inativos no Período` KPI):
```typescript
// Current info text references "0 vendas front nos últimos 7 dias (janela de ranking)"
// Update to: "Última venda front há mais de 5 dias (D-04 recency rule)"
info="Afiliados cuja última venda front foi há mais de 5 dias. Veja a lista completa na aba Afiliados → Inativos."
```

---

### `src/lib/transactions.test.ts` (test, batch)

**Analog:** `src/hooks/useAffiliateTags.test.ts`

**Test file structure** (useAffiliateTags.test.ts lines 1-28):
```typescript
import { describe, it, expect, beforeEach } from "vitest";

// Mock external dependencies before imports (pattern: IIFE mock factory)
const localStorageMock = (() => { ... })();
Object.defineProperty(global, "localStorage", { value: localStorageMock, writable: true });

// Import pure functions directly — test logic, not React hooks
import { fn1, fn2 } from "./targetModule";

describe("moduleName — descriptive label", () => {
  beforeEach(() => {
    // reset shared state
  });

  it("describes the behavior under test", () => {
    // arrange
    // act
    // assert with expect(...).toEqual(...)
  });
});
```

**Date mocking pattern** — `computeAffiliateRankings` uses `Date.now()` and `new Date()` after the fix. Tests must control wall-clock time:
```typescript
// vitest fake timer pattern (no additional imports needed — vitest globals: true)
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

describe("computeAffiliateRankings — window anchor", () => {
  beforeEach(() => {
    // Pin Date.now() to a known date (e.g., 2026-05-04)
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-04T12:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });
  ...
});
```

**TransactionRow factory** — needed for test data (pattern: minimal object construction from interface):
```typescript
// Derived from TransactionRow interface in src/lib/transactions.ts lines 4-21
function makeRow(overrides: Partial<TransactionRow>): TransactionRow {
  return {
    date: new Date("2026-05-04"),
    orderId: "ORD-001",
    buyerId: "BUY-001",
    transactionType: "payment",
    grossAmount: 100,
    netAmount: 90,
    earnings: 20,
    affiliate: "affiliateName",
    productName: "Slimjara",
    productGroup: "group",
    country: "DE",
    quantity: 1,
    upsellNo: 0,
    affiliateAmount: 10,
    vatAmount: 10,
    ...overrides,
  };
}
```

**Test cases to cover** (map to RESEARCH.md Validation Architecture):

| Req ID | Test description |
|--------|-----------------|
| STAT-01 | `computeAffiliateRankings` uses wall-clock anchor (dateKeys[6] === today's ISO date) |
| STAT-01 | Affiliate who sold yesterday is Em Rampa, not Inativo (verifies maxDate anchor is gone) |
| STAT-02 | Affiliate with 1 front sale 6 days ago is Inativo despite frontSalesInWindow=1 |
| STAT-02 | Affiliate with 1 front sale 4 days ago is Em Rampa |
| STAT-02 | Tier 1 affiliate (consistent daily gross) is NOT overridden to Inativo even if last sale > 5 days ago |
| STAT-03 | Affiliate appearing only in refund rows (no payment rows) appears as Inativo in rankings |

**Run command:**
```bash
npm test -- src/lib/transactions.test.ts
```

---

## Shared Patterns

### Date arithmetic — days-since calculation
**Source:** `src/pages/Affiliates.tsx` line 47
**Apply to:** `computeAffiliateRankings` (Inativo classification), `transactions.test.ts` (assertions)
```typescript
// Consistent pattern throughout codebase — append T00:00:00Z to avoid timezone shift
Math.floor((Date.now() - new Date(isoDateString + "T00:00:00Z").getTime()) / 86400000)
```

### ISO date key extraction
**Source:** `src/lib/transactions.ts` line 214 (and many others)
**Apply to:** All date comparisons in the edited `computeAffiliateRankings`
```typescript
const dateKey = t.date.toISOString().split("T")[0]!;
```

### useMemo with `[allRows]` dependency
**Source:** `src/pages/Dashboard.tsx` line 65-68, `src/pages/Affiliates.tsx` lines 70-73
**Apply to:** `rankingWindowLabel` useMemo (depends on `rankings`, not `allRows` directly)
```typescript
// Pattern: derived values from rankings use [rankings] dependency
const derivedValue = useMemo(() => {
  return [...rankings.values()].filter(...).length;
}, [rankings]);
```

### isMaileonardo filter at call site (not inside function)
**Source:** `src/pages/Dashboard.tsx` line 66, `src/pages/Affiliates.tsx` line 71
**Apply to:** Both call sites remain unchanged — the filter stays outside `computeAffiliateRankings`
```typescript
// Call sites — do NOT change:
computeAffiliateRankings(allRows.filter((r) => !isMaileonardo(r.affiliate)))
```

### pt-BR date formatting
**Source:** `src/pages/Dashboard.tsx` line 134
**Apply to:** `rankingWindowLabel` in Dashboard.tsx (D-02)
```typescript
// Existing pt-BR format pattern in Dashboard.tsx line 134:
d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
// For window label (shorter format, no year needed):
const fmt = (iso: string) => iso.slice(8, 10) + "/" + iso.slice(5, 7);
// → "2026-04-28" → "28/04"
```

---

## No Analog Found

None — all files have direct analogs or are in-place edits.

---

## Critical Pitfalls (from RESEARCH.md)

| Pitfall | Guard |
|---------|-------|
| Pitfall 3: 5-day recency overrides Tier affiliates | Apply recency rule ONLY inside the `if (!assigned)` block — Tiers are immune |
| Pitfall 2: wall-clock shows all Inativo for historical data | Window label (D-02) ships in same commit as anchor fix — makes it transparent |
| Pitfall 4: window label in ISO, not pt-BR | Use `iso.slice(8,10) + "/" + iso.slice(5,7)` pattern |
| Pitfall 1: `git restore` fails on corrupted history | Fallback: `git cat-file -p 9de1e8665720b2b6dee86f30f9abff9f9f1dd368 > api/digistore.ts` |

---

## Metadata

**Analog search scope:** `src/lib/`, `src/pages/`, `src/hooks/`, `api/`
**Files scanned:** 5 source files read in full
**Pattern extraction date:** 2026-05-04
