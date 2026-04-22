# Phase 2: Data Display — Research

**Researched:** 2026-04-22
**Domain:** React data display, existing CPA computation layer, UI component reuse
**Confidence:** HIGH

---

## Summary

Phase 2 replaces the placeholder `CpaVariavel.tsx` body with a real data display: a KPI header, a searchable affiliate table showing LTV margin per pot variant (M1/M2/M3), and a per-affiliate detail view with full line-item breakdown. The data layer is already complete — `analyzeCPA` + `useCPACalculator` produce every field required by every requirement in this phase. No new computation logic is needed.

The primary architectural question is reuse vs. new: the existing `CPAShell`, `CPATable`, and `AffiliateDetail` components are purpose-built for `CpaCalculator` and carry margin-target slider + CPA-status filter UI that is out of scope for Phase 2. Reusing them as-is would pull in Phase 3 controls prematurely. The correct approach is to create a dedicated `CpaVariavelShell` (thin wrapper, no slider), a `CpaVariavelTable` (margin-focused columns vs. CPA-recommendation columns), and reuse `AffiliateDetail` directly — it already shows exactly the per-pot breakdown required by UX-02.

AOV per funnel (DATA-02) is not a separate field in `VariantResult` — it must be derived at display time from `grossAmount` data already on `TransactionRow`. The simplest approach: extend `analyzeCPA` (or add a companion helper) to compute `aovPerVariant` (gross per front order per variant) alongside `ltvProfit`. Alternatively, AOV can be computed as `grossBruto / frontTotal` per affiliate in a useCpaVariavel hook, mirroring the pattern in `transactions.ts` line 624.

**Primary recommendation:** Create a dedicated `useCpaVariavel` hook that calls `analyzeCPA(rows, 0)` (marginTarget=0 to get stable ltvProfit), augments each `VariantResult` with a computed `aovGross` field, and feeds a new `CpaVariavelShell` + `CpaVariavelTable` + reused `AffiliateDetail`. KPI summary cards reuse the existing `.kpi-card` CSS class family.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| LTV margin computation (DATA-01) | Data layer (`analyzeCPA`) | Hook (`useCpaVariavel`) | Computation belongs in lib, hook memoizes |
| AOV per funnel (DATA-02) | Hook (`useCpaVariavel`) | Data layer extension | AOV is derived from grossAmount/frontCount per variant — needs hook-level augmentation |
| KPI summary cards (DATA-03) | Page component | — | Derived from results array; pure render |
| Affiliate detail drawer/view (UX-02) | `AffiliateDetail` (reuse) | Page state | Component already renders full per-pot breakdown |
| Search/filter (UX-03) | Page component | Hook | Filter is applied in useMemo over results, same pattern as CpaCalculator |

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DATA-01 | Table of affiliates with LTV margin per pot (M1/M2/M3) — front + upsell earnings - COGS - refunds | `VariantResult.ltvProfit` already provides this per variant. `AffiliateResult.variants[]` holds M1/M2/M3 breakdown. Direct render in table. |
| DATA-02 | Real AOV per funnel calculated automatically from Digistore upsell data (upsell rate per affiliate) | AOV = grossAmount of front + upsell orders / front order count per variant. Not a current field in VariantResult — must be computed. grossAmount is on TransactionRow; can be accumulated in analyzeCPA or a hook augment. |
| DATA-03 | KPI summary cards at top: total affiliates, average margin, average AOV | Derived from `results.length`, mean of `variant.ltvProfit` across dom variants, mean of `aovGross`. Existing `.kpi-card` CSS class reused. |
| UX-02 | Affiliate detail (expand or drawer) with full per-pot breakdown | `AffiliateDetail` component already renders this. Reuse directly with `marginTarget=0`. Remove or hide the marginTarget badge if it creates confusion. |
| UX-03 | Filter by name and affiliate search | Search state + useMemo filter — identical pattern to CpaCalculator. Copy filter logic verbatim. |
</phase_requirements>

---

## Standard Stack

### Core (all already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19 | Component rendering | Project stack [VERIFIED: package.json] |
| TypeScript | 5.x | Type safety | Project stack [VERIFIED: project codebase] |
| lucide-react | 0.468 | Icons | Locked to this version by Vercel build fix [VERIFIED: STATE.md] |

### Supporting (already in codebase)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `analyzeCPA` (internal) | — | LTV computation | All margin/profit data |
| `useCPACalculator` (internal) | — | Hook wrapper around analyzeCPA | Reference pattern only — Phase 2 creates its own hook |
| `AffiliateDetail` (internal) | — | Per-affiliate detail view | Direct reuse for UX-02 |
| `.kpi-card` CSS (internal) | — | Styled KPI metric cards | Direct reuse for DATA-03 |

No new npm packages are required for Phase 2. [VERIFIED: all requirements can be satisfied from existing lib + CSS]

---

## Architecture Patterns

### System Architecture Diagram

```
filteredRows (TransactionRow[])
        │
        ▼
useCpaVariavel hook
  ├── analyzeCPA(rows, 0) → AffiliateResult[]
  ├── augment each VariantResult with aovGross (grossAmount/frontCount per variant)
  ├── compute KPI aggregates (totalCount, avgMargin, avgAov)
  └── returns: { results, kpis, loading }
        │
        ▼
CpaVariavel page
  ├── KPI cards row (DATA-03)
  │     └── .kpi-card × 3: total affiliates, avg margin, avg AOV
  ├── Search input (UX-03)
  │     └── filters displayResults by name
  ├── CpaVariavelTable (DATA-01, DATA-02)
  │     └── columns: affiliate name, front orders, LTV margin, AOV, upsell conv, refund rate, per-variant badges, "Ver →"
  └── AffiliateDetail (UX-02)
        └── rendered when selectedAff !== null (replaces table, same pattern as CpaCalculator)
```

### Recommended Project Structure

New files to create:
```
src/
├── hooks/
│   └── useCpaVariavel.ts         # New — wraps analyzeCPA + AOV augmentation
├── components/cpa/
│   └── CpaVariavelTable.tsx      # New — Phase 2 table (margin-focused columns)
└── pages/
    └── CpaVariavel.tsx           # Existing — replace placeholder body
```

Reused without modification:
```
src/
├── lib/cpa/analyzeCPA.ts         # No changes
├── lib/cpa/types.ts              # Possibly extend VariantResult with aovGross
├── components/cpa/AffiliateDetail.tsx   # Reuse directly
├── components/cpa/VariantCard.tsx       # Reused inside AffiliateDetail
├── components/cpa/StatusBadge.tsx       # Reused inside VariantCard
```

### Pattern 1: Hook Wrapping analyzeCPA (reference: useCPACalculator.ts)

```typescript
// Source: src/hooks/useCPACalculator.ts — adapt this pattern
export function useCpaVariavel(rows: TransactionRow[]) {
  const results = useMemo<AffiliateResult[] | null>(() => {
    if (rows.length === 0) return null;
    const filtered = rows.filter(r => !isMaileonardo(r.affiliate));
    return analyzeCPA(filtered, 0); // marginTarget=0: stable ltvProfit
  }, [rows]);

  const kpis = useMemo(() => {
    if (!results) return null;
    const avgMargin = results.length > 0
      ? results.reduce((s, a) => {
          const domV = a.variants.find(v => v.variant === a.domVariant);
          return s + (domV?.ltvProfit ?? 0);
        }, 0) / results.length
      : 0;
    return { totalAffiliates: results.length, avgMargin };
  }, [results]);

  return { results, kpis };
}
```

### Pattern 2: AOV Per Variant Computation

`VariantResult` does not expose gross revenue — it exposes `earnings` (platform net). AOV requires grossAmount. Two options:

**Option A (preferred):** Accumulate `frontGrossPerVariant` inside `analyzeCPA` accumulator and pass it through to `VariantResult` as `aovGross = grossPerVariant / frontCount`. This keeps the computation co-located with the rest of the per-variant logic.

**Option B:** Compute AOV in the hook by doing a separate pass over `rows` per affiliate per variant. More verbose, scatters logic.

Option A is correct: extend `AffiliateAccumulator.fronts[v]` to include `gross: number` (already tracks `count` and `earn`), then set `aovGross = f.gross / f.count` in the result construction loop.

```typescript
// In analyzeCPA.ts — extend AffiliateAccumulator.fronts entry
if (!acc.fronts[v]) acc.fronts[v] = { count: 0, earn: 0, cogs: 0, gross: 0 };
acc.fronts[v].gross += r.grossAmount;  // add this line

// In result construction
const aovGross = f.gross / f.count;  // per-variant AOV

// Extend VariantResult interface in types.ts
aovGross: number;  // gross revenue per front order (including upsell orders attributed to this variant)
```

Note: whether upsell gross is included in AOV depends on the definition used in DATA-02. The requirement says "AOV real por funil" — CpaFixo page uses `gross / frontSales` where gross includes all upsells (line 486, 624 in transactions.ts). This is the standard definition: include upsell revenue in numerator, divide by front order count. The hook should accumulate upsell gross per variant in the same variant bucket.

### Pattern 3: KPI Cards (DATA-03)

Reuse `.kpi-card` / `.kpi-grid` CSS classes already present in `index.css`. No new CSS needed.

```tsx
// Source: src/index.css lines 475-594 — kpi-card CSS exists
<div className="kpi-grid">
  <div className="kpi-card">
    <div className="kpi-card-header">
      <span className="kpi-card-label">Afiliados ativos</span>
    </div>
    <div className="kpi-card-value">{kpis.totalAffiliates}</div>
  </div>
  {/* repeat for avg margin, avg AOV */}
</div>
```

### Pattern 4: Search/Filter (UX-03)

Identical pattern to `CpaCalculator.tsx` lines 28-38. Copy verbatim:

```typescript
// Source: src/pages/CpaCalculator.tsx lines 28-38
const displayResults = useMemo(() => {
  if (!results) return [];
  return results.filter(aff =>
    !search || aff.name.toLowerCase().includes(search.toLowerCase())
  );
}, [results, search]);
```

Search input uses `.cpa-search-input` / `.cpa-search-wrap` CSS classes from `CPAShell` — these can be copied inline to `CpaVariavel.tsx` or extracted. No new CSS needed.

### Pattern 5: Detail Navigation (UX-02)

Same conditional render pattern as `CpaCalculator.tsx`:

```tsx
// Source: src/pages/CpaCalculator.tsx lines 83-99
{results && selectedAff && (
  <AffiliateDetail aff={selectedAff} marginTarget={0} onBack={() => setSelected(null)} />
)}
{results && !selectedAff && results.length > 0 && (
  <CpaVariavelTable results={displayResults} onSelect={setSelected} />
)}
```

`AffiliateDetail` accepts `marginTarget` as prop. Pass `0` since Phase 2 has no margin target slider. The "Margem alvo" badge will show "0%" — either suppress it in AffiliateDetail if desired, or leave it (Phase 3 will add the slider, which Phase 2 scaffold will be compatible with).

### Anti-Patterns to Avoid

- **Reusing `CPAShell` directly:** It contains a margin-target slider and CPA-status filter (increase/ok/reduce) that are Phase 3 features. Pulling them in now creates dead UI. Use a simpler wrapper.
- **Computing AOV in the page component:** Scatter computation into the lib where it belongs; page components render, they don't derive financial metrics.
- **Adding marginTarget state in Phase 2:** Phase 2 is display-only. No margin target slider. Pass `marginTarget=0` to `analyzeCPA` and `AffiliateDetail`.
- **Forking AffiliateDetail:** The existing component renders exactly the per-pot breakdown required by UX-02 including VariantCard, StatusBadge, Delta, and "vs média da operação." Do not create a parallel version.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| LTV profit per variant | Custom computation | `analyzeCPA` + `VariantResult.ltvProfit` | Already handles front/upsell attribution, COGS, refund bucketing |
| Per-affiliate detail view | New drawer/modal component | `AffiliateDetail` + `VariantCard` | Already renders full M1/M2/M3 breakdown with tooltips and delta indicators |
| Status coloring | Custom color logic | `StatusBadge`, CSS vars `--green`, `--red`, `--amber` | Consistent with design system |
| Number formatting | `toFixed()` inline | `formatEur`, `formatPct`, `formatInt` from `lib/transactions` | Consistent locale-aware formatting |
| KPI card styling | New CSS | `.kpi-card`, `.kpi-grid` in `index.css` | Already implemented with hover, icon, sub-value |

---

## Common Pitfalls

### Pitfall 1: AOV Definition Mismatch
**What goes wrong:** Computing AOV as only front gross (upsellNo === 0) instead of total funnel gross (front + upsells attributed to this variant), yielding lower numbers than CpaFixo page shows.
**Why it happens:** `VariantResult` only tracks `earnings` not `grossAmount`. Easy to forget upsell gross.
**How to avoid:** Add `gross: number` to `AffiliateAccumulator.fronts[v]` and accumulate `r.grossAmount` for both front and upsell transactions. Set `aovGross = (f.gross + ups.gross) / f.count` in result construction.
**Warning signs:** AOV numbers significantly lower than what CpaFixo shows for same affiliate.

### Pitfall 2: Reusing CPAShell Pulls in Phase 3 UI
**What goes wrong:** Wrapping CpaVariavel in the existing CPAShell introduces a margin slider and CPA-status filter buttons — Phase 3 features — in Phase 2.
**Why it happens:** CPAShell is convenient but opinionated.
**How to avoid:** Write a minimal `CpaVariavelShell` (or inline the header in `CpaVariavel.tsx`). The header pattern is 10 lines of JSX — not worth abstracting into CPAShell yet.

### Pitfall 3: Breaking Type Contract of VariantResult
**What goes wrong:** Adding `aovGross` to `VariantResult` breaks `CPATable` and `AffiliateDetail` if TypeScript strict mode catches the partial type.
**Why it happens:** Shared types in `types.ts` are consumed by multiple components.
**How to avoid:** Add `aovGross` as an optional field (`aovGross?: number`) to `VariantResult`, or create a `VariantResultV2` extended type only used in Phase 2 hook output.

### Pitfall 4: Maileonardo Exclusion
**What goes wrong:** Maileonardo rows appear in the CpaVariavel table as an affiliate.
**Why it happens:** `useCPACalculator` filters them — a custom hook must replicate this.
**How to avoid:** Apply `rows.filter(r => !isMaileonardo(r.affiliate))` in `useCpaVariavel` before calling `analyzeCPA`, mirroring `useCPACalculator.ts` line 19.

### Pitfall 5: Empty State Handling
**What goes wrong:** No data or no M1/M2/M3 products in period causes blank screen.
**Why it happens:** `analyzeCPA` returns `[]` when no front orders match.
**How to avoid:** Replicate the two empty states from `CpaCalculator.tsx` lines 58-82: one for `filteredRows.length === 0`, one for `results.length === 0` after filtering.

---

## Code Examples

### LTV Margin Fields Already Available in VariantResult

```typescript
// Source: src/lib/cpa/types.ts
interface VariantResult {
  variant:          number;   // 1=M1, 2=M2, 3=M3
  bottles:          number;   // 2, 3, 6
  count:            number;   // front orders
  frontEarnPer:     number;   // platform earnings per front order
  upsellEarnPer:    number;   // upsell earnings per front order (divided by fronts, not upsell count)
  frontCogsPer:     number;
  upsellCogsPer:    number;
  ltvEarn:          number;   // frontEarnPer + upsellEarnPer
  ltvProfit:        number;   // ltvEarn - frontCogsPer - upsellCogsPer  ← DATA-01 value
  upsellConv:       number;   // % of front orders that generated an upsell
  cpaDefault:       number;
  // ... Phase 3 fields: maxCpa, cpaStatus, roomAboveCurrent
}
```

### AffiliateResult Fields Available

```typescript
// Source: src/lib/cpa/types.ts
interface AffiliateResult {
  name:               string;
  frontTotal:         number;  // total front orders across all variants
  domVariant:         number;  // dominant variant (highest front order count)
  variants:           VariantResult[];  // M1, M2, M3 entries (only those with data)
  totalEarn:          number;
  totalCogs:          number;
  refundEarn:         number;  // negative, includes chargebacks
  netProfit:          number;  // totalEarn + refundEarn - totalCogs
  refundRate:         number;  // %
  upsellConvOverall:  number;  // buyer-level upsell conversion %
}
```

### Accumulator Extension for AOV (Option A)

```typescript
// Source: src/lib/cpa/analyzeCPA.ts — modify fronts accumulator entry
if (!acc.fronts[v]) acc.fronts[v] = { count: 0, earn: 0, cogs: 0, gross: 0 };
acc.fronts[v].count++;
acc.fronts[v].earn  += r.earnings;
acc.fronts[v].cogs  += getCogs(getBottles(r.productName), r.country, true);
acc.fronts[v].gross += r.grossAmount;  // NEW — for AOV

// Upsell block — also needs gross for AOV
if (!acc.upsells[v]) acc.upsells[v] = { count: 0, earn: 0, cogs: 0, gross: 0 };
acc.upsells[v].gross += r.grossAmount;  // NEW

// In result construction
const upsellGross   = ups.gross ?? 0;
const aovGross      = (f.gross + upsellGross) / f.count;  // total funnel gross per front order

variants.push({ ...existingFields, aovGross });  // add to VariantResult
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual upsell rate input | Automatic from Digistore API (upsellNo field) | Built in current codebase | DATA-02 requires no manual input |
| CpaFixo uses estimated gross per variant | CPA Variavel uses actual per-transaction grossAmount | Current separation | AOV in Phase 2 will be more accurate |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `AffiliateDetail` can be reused with `marginTarget=0` without confusing the user | Architecture Patterns §5 | If the "Margem alvo: 0%" badge is distracting, minor UX issue only; easily patched |
| A2 | Upsell gross should be included in AOV denominator (funnel AOV = total revenue per front order) | Common Pitfalls §1 | If product owner wants front-only AOV, `aovGross` formula changes but the implementation does not |

---

## Open Questions

1. **AOV numerator scope for DATA-02**
   - What we know: `transactions.ts` line 624 uses `gross / sales` where gross includes upsells (line 486). CpaFixo uses the same.
   - What's unclear: Does the user want "AOV of the front offer" or "AOV of the full funnel (front + upsells)"?
   - Recommendation: Default to full funnel AOV (consistent with existing pages). If product owner wants front-only, it's a 1-line change.

2. **marginTarget badge in AffiliateDetail for Phase 2**
   - What we know: `AffiliateDetail` renders a "Margem alvo: X%" badge using the `marginTarget` prop.
   - What's unclear: Should Phase 2 show "Margem alvo: 0%" (pass-through) or hide it?
   - Recommendation: Pass `marginTarget={0}` for now; it costs nothing and Phase 3 will replace it with the real slider value. The VariantCard will show `maxCpa` based on 0% margin target (maxCpa = cpaDefault + ltvProfit), which is a reasonable display.

---

## Environment Availability

Step 2.6: SKIPPED — no external dependencies. All computation uses existing in-repo lib and in-memory Digistore data already loaded by the app.

---

## Validation Architecture

`workflow.nyquist_validation` key is absent from `.planning/config.json` — treated as enabled.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None detected — no test files, no jest/vitest config found |
| Config file | None — Wave 0 must add |
| Quick run command | `npx vitest run --reporter=verbose` (after Wave 0 setup) |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DATA-01 | `ltvProfit` per variant = frontEarnPer + upsellEarnPer - frontCogsPer - upsellCogsPer | unit | `npx vitest run tests/analyzeCPA.test.ts -t "ltvProfit"` | Wave 0 |
| DATA-02 | `aovGross` per variant = (frontGross + upsellGross) / frontCount | unit | `npx vitest run tests/analyzeCPA.test.ts -t "aovGross"` | Wave 0 |
| DATA-03 | KPI values (totalAffiliates, avgMargin, avgAov) derived correctly from results | unit | `npx vitest run tests/useCpaVariavel.test.ts` | Wave 0 |
| UX-02 | AffiliateDetail renders for selected affiliate | manual smoke | N/A — render test | N/A |
| UX-03 | Search filter narrows affiliate list | unit | `npx vitest run tests/useCpaVariavel.test.ts -t "search"` | Wave 0 |

### Wave 0 Gaps

- [ ] `vitest` not installed — `npm install --save-dev vitest @vitest/ui`
- [ ] `tests/analyzeCPA.test.ts` — covers DATA-01 (ltvProfit), DATA-02 (aovGross per variant)
- [ ] `tests/useCpaVariavel.test.ts` — covers DATA-03 (KPI aggregates), UX-03 (search filter logic)
- [ ] `vitest.config.ts` — basic config pointing to `src` and `tests`

---

## Security Domain

This phase is a data-display feature over already-fetched Digistore24 data. No new authentication, session, input validation, or cryptographic operations are introduced. All data originates from the existing Vercel serverless proxy (unchanged). ASVS categories V2/V3/V4/V6 do not apply. V5 (Input Validation): search input is never sent to a server — it is a client-side string filter only. No security controls needed for Phase 2.

---

## Sources

### Primary (HIGH confidence)
- `src/lib/cpa/analyzeCPA.ts` — verified LTV computation, front/upsell attribution, accumulator structure
- `src/lib/cpa/types.ts` — verified AffiliateResult and VariantResult field inventory
- `src/hooks/useCPACalculator.ts` — verified hook pattern, Maileonardo exclusion, marginTarget=0 for stable ltvProfit
- `src/pages/CpaCalculator.tsx` — verified data-to-component wiring pattern
- `src/components/cpa/AffiliateDetail.tsx` — verified per-pot detail view capabilities
- `src/index.css` lines 460-594 — verified `.kpi-card` CSS class family exists

### Secondary (MEDIUM confidence)
- `src/lib/transactions.ts` lines 486, 624 — verified AOV definition used elsewhere (full funnel gross / front orders)
- `src/pages/CpaFixo.tsx` — verified AOV is defined as gross (including upsells) / front order count

---

## Metadata

**Confidence breakdown:**
- Data layer availability: HIGH — all fields verified in source
- Component reuse: HIGH — components read, interfaces verified
- AOV computation path: HIGH — verified in transactions.ts and CpaFixo patterns
- Architecture: HIGH — pattern is an existing established pattern in this codebase

**Research date:** 2026-04-22
**Valid until:** 2026-05-22 (stable codebase, no external dependencies)
