# Phase 4: Status de Afiliados - Pattern Map

**Mapped:** 2026-04-27
**Files analyzed:** 4 files to modify
**Analogs found:** 4 / 4

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/lib/transactions.ts` | utility/model | transform | self (existing file to modify) | exact |
| `src/pages/Dashboard.tsx` | page/component | request-response | self (existing file to modify) | exact |
| `src/pages/Affiliates.tsx` | page/component | request-response | self (existing file to modify) | exact |
| `src/index.css` | config/style | — | self (existing file to modify) | exact |

---

## Pattern Assignments

### `src/lib/transactions.ts` — Add "Em Rampa" to type union and ranking logic

**Analog:** self (lines 101–240)

**Type union pattern** (line 101):
```typescript
export type AffiliateRanking = "Tier 1" | "Tier 2" | "Tier 3" | "Ativo" | "Inativo";
```
Modify to:
```typescript
export type AffiliateRanking = "Tier 1" | "Tier 2" | "Tier 3" | "Ativo" | "Em Rampa" | "Inativo";
```

**Assignment logic to change** (lines 214–215):
```typescript
if (!assigned) {
  assigned = data.frontSales >= ATIVO_MIN_SALES ? "Ativo" : "Inativo";
}
```
New three-way split:
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

**`AffiliateRankingInfo` interface** (lines 112–118): No change needed — `frontSalesInWindow` already carries the 7-day front sales count needed to compute "last sale" date for Inativo display.

**Pattern for "last sale" date** — add to `AffiliateRankingInfo`:
```typescript
export interface AffiliateRankingInfo {
  ranking: AffiliateRanking;
  days: AffiliateDayDetail[];
  frontSalesInWindow: number;
  windowStart: string;
  windowEnd: string;
  lastFrontSaleDate: string | null;  // ISO date of most recent front sale across allRows
}
```
Population in `computeAffiliateRankings()` — after building `affData`, iterate `payRows` for `upsellNo === 0` and track max date per affiliate name, then assign to `lastFrontSaleDate`.

**`ATIVO_MIN_SALES` constant** (line 132) — already used; introduce a parallel `EM_RAMPA_MIN_SALES = 1` constant for clarity (or inline the `>= 1` check directly — follow whichever the author prefers).

---

### `src/pages/Affiliates.tsx` — Add Em Rampa to maps, status filter tabs, summary badges

**Analog:** self (lines 1–176)

**Imports pattern** (lines 1–17): No new imports needed. `AffiliateRanking` type import already covers the expanded union.

**RANKING_LABEL / RANKING_CLASS maps** (lines 26–33):
```typescript
const RANKING_LABEL: Record<AffiliateRanking, string> = {
  "Tier 1": "Tier 1", "Tier 2": "Tier 2", "Tier 3": "Tier 3",
  "Ativo": "Ativo", "Inativo": "Inativo",
};
const RANKING_CLASS: Record<AffiliateRanking, string> = {
  "Tier 1": "tier-1", "Tier 2": "tier-2", "Tier 3": "tier-3",
  "Ativo": "tier-ativo", "Inativo": "tier-inativo",
};
```
Add "Em Rampa" entries to both:
```typescript
const RANKING_LABEL: Record<AffiliateRanking, string> = {
  "Tier 1": "Tier 1", "Tier 2": "Tier 2", "Tier 3": "Tier 3",
  "Ativo": "Ativo", "Em Rampa": "Em Rampa", "Inativo": "Inativo",
};
const RANKING_CLASS: Record<AffiliateRanking, string> = {
  "Tier 1": "tier-1", "Tier 2": "tier-2", "Tier 3": "tier-3",
  "Ativo": "tier-ativo", "Em Rampa": "tier-em-rampa", "Inativo": "tier-inativo",
};
```

**Status filter tab pattern** — copy the `product-tabs` / `product-tab` pattern from Dashboard.tsx (lines 188–218). In Affiliates.tsx, add a filter state and apply it to `affiliates` + `rankings`:
```tsx
const [statusFilter, setStatusFilter] = useState<AffiliateRanking | "all">("all");

// Derive counts for badge display
const activeCount   = useMemo(() => [...rankings.values()].filter(r => ["Tier 1","Tier 2","Tier 3","Ativo"].includes(r.ranking)).length, [rankings]);
const emRampaCount  = useMemo(() => [...rankings.values()].filter(r => r.ranking === "Em Rampa").length, [rankings]);
const inativoCount  = useMemo(() => [...rankings.values()].filter(r => r.ranking === "Inativo").length, [rankings]);
```

**Summary badges above table** — render above `<div className="table-container">` using existing `tier-badge` classes:
```tsx
<div className="aff-summary-badges">
  <span className="tier-badge tier-ativo">{activeCount} Ativos</span>
  <span className="tier-badge tier-em-rampa">{emRampaCount} Em Rampa</span>
  <span className="tier-badge tier-inativo">{inativoCount} Inativos</span>
</div>
```

**Filter tab UI** — insert between summary badges and table, following `product-tabs` pattern (Dashboard.tsx lines 188–218):
```tsx
<div className="product-tabs">
  <span>Filtrar:</span>
  {(["all", "Tier 1", "Tier 2", "Tier 3", "Ativo", "Em Rampa", "Inativo"] as const).map((f) => (
    <button
      key={f}
      className={`product-tab ${statusFilter === f ? "active" : ""}`}
      onClick={() => setStatusFilter(f)}
    >
      {f === "all" ? "Todos" : f}
    </button>
  ))}
</div>
```

**Table sorting** — Em Rampa affiliates appear after Ativos. Define a sort-order helper:
```typescript
const RANKING_SORT_ORDER: Record<AffiliateRanking, number> = {
  "Tier 1": 0, "Tier 2": 1, "Tier 3": 2, "Ativo": 3, "Em Rampa": 4, "Inativo": 5,
};
```
Apply when constructing the display list.

**"Ultima venda" for Inativo** — use `rankingInfo.lastFrontSaleDate` (new field from transactions.ts) to compute days ago and render inline in the row when `ranking === "Inativo"`.

**RANKING_TOOLTIP update** (line 35–38): Add Em Rampa rule: `· Em Rampa: 1–9 vendas em 7 dias`.

**Legend update** (lines 150–157): Add Em Rampa entry:
```tsx
<span className="status-legend-item">
  <span className="tier-badge tier-em-rampa">Em Rampa</span> 1–9 vendas em 7 dias
</span>
```

---

### `src/pages/Dashboard.tsx` — Fix "Afiliados Ativos" count, add "Inativos no Periodo" KPI, add sub-text breakdown

**Analog:** self (lines 1–235)

**Current broken count** (line 153):
```tsx
<KPICard icon={Users} label="Afiliados Ativos"
  value={formatInt(metrics.affiliatesSelling.filter((n) => !isMaileonardo(n)).length)}
  info="..." />
```

**Fixed count using ranking data** — derive from `rankings` Map (already computed at line 60–63):
```tsx
const activosCount = useMemo(() => {
  return [...rankings.values()].filter(r =>
    ["Tier 1","Tier 2","Tier 3","Ativo"].includes(r.ranking)
  ).length;
}, [rankings]);

const emRampaCount = useMemo(() => {
  return [...rankings.values()].filter(r => r.ranking === "Em Rampa").length;
}, [rankings]);

const inativoCount = useMemo(() => {
  return [...rankings.values()].filter(r => r.ranking === "Inativo").length;
}, [rankings]);
```

Replace the KPICard with corrected value + breakdown sub-text via `info` prop:
```tsx
<KPICard
  icon={Users}
  label="Afiliados Ativos"
  value={formatInt(activosCount)}
  info={`Tier 1/2/3 + Ativo (≥10 vendas/7d). Excl. Maileonardo. Breakdown: ${activosCount} Ativos · ${emRampaCount} Em Rampa · ${inativoCount} Inativos`}
/>
```

**New "Inativos no Periodo" KPI card** — add as 5th card in the `kpi-grid-4` Atividade section (or change grid to `kpi-grid-5`, following pattern of `kpi-grid` with 5 items in Receita block). Copy KPICard pattern exactly from lines 150–153:
```tsx
<KPICard
  icon={UserX}
  label="Inativos no Periodo"
  value={formatInt(inativoCount)}
  info="Afiliados com 0 vendas frontais nos últimos 7 dias disponíveis. Inclui apenas afiliados que já tiveram histórico no dataset."
/>
```
Import `UserX` from `lucide-react` alongside other icon imports (lines 3–12).

**Grid layout** — switching `kpi-grid-4` to `kpi-grid-5` for Atividade block, or add a new CSS class `kpi-grid-5`. Prefer adding the new class in `index.css` following the pattern of `kpi-grid-4` (line 481–484).

---

### `src/index.css` — Add tier-em-rampa badge class and optional kpi-grid-5

**Analog:** existing tier-badge rules (lines 828–832)

**Existing tier badge pattern** to copy:
```css
.tier-badge.tier-1       { background: #FEF3C7; color: #92400E; border: 1px solid #FDE68A; }
.tier-badge.tier-2       { background: var(--blue-bg); color: var(--blue); border: 1px solid var(--blue-bd); }
.tier-badge.tier-3       { background: #F3E8FF; color: #6B21A8; border: 1px solid #DDD6FE; }
.tier-badge.tier-ativo   { background: var(--green-bg); color: var(--green-text); border: 1px solid var(--green-bd); }
.tier-badge.tier-inativo { background: var(--bg-secondary); color: var(--text-3); border: 1px solid var(--border); }
```

**New class to add** — insert between `tier-ativo` and `tier-inativo` (amber/yellow, visually between green and grey):
```css
.tier-badge.tier-em-rampa { background: var(--amber-bg); color: var(--amber); border: 1px solid var(--amber-bd); }
```
CSS vars already exist: `--amber: #B45309`, `--amber-bg: #FFFBEB`, `--amber-bd: #fde68a` (line 49–51).

**kpi-grid-5 class** — insert after `kpi-grid-4` block (line 481–484):
```css
.kpi-grid-5 {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 10px;
}
```
And in the responsive block (line 2684–2685):
```css
.kpi-grid-5 { grid-template-columns: repeat(3, 1fr); }
```

**aff-summary-badges class** — add near `.status-legend` or `.table-header` section:
```css
.aff-summary-badges {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 12px;
}
```

---

### `src/components/AffiliateDrawer.tsx` — Update RANKING_LABEL, RANKING_CLASS, TIER_ORDER

**Analog:** self (lines 1–231)

**Maps to update** (lines 13–21) — same change as Affiliates.tsx:
```typescript
const RANKING_LABEL: Record<AffiliateRanking, string> = {
  "Tier 1": "Tier 1", "Tier 2": "Tier 2", "Tier 3": "Tier 3",
  "Ativo": "Ativo", "Em Rampa": "Em Rampa", "Inativo": "Inativo",
};
const RANKING_CLASS: Record<AffiliateRanking, string> = {
  "Tier 1": "tier-1", "Tier 2": "tier-2", "Tier 3": "tier-3",
  "Ativo": "tier-ativo", "Em Rampa": "tier-em-rampa", "Inativo": "tier-inativo",
};
const TIER_ORDER: AffiliateRanking[] = ["Tier 1", "Tier 2", "Tier 3", "Ativo", "Em Rampa", "Inativo"];
```

**Em Rampa tier bar** (lines 181–203 — "Ativo row" pattern) — add an "Em Rampa" row between Ativo and the closing of the tier bars list. Uses `frontSalesInWindow` and threshold of 1–9:
```tsx
{(() => {
  const sales  = rankingInfo.frontSalesInWindow;
  const passes = sales >= 1 && sales < 10;
  const pct    = Math.min(Math.round((sales / 9) * 100), 100);
  const isActive = ranking === "Em Rampa";
  return (
    <div className={`tier-bar-row${isActive ? " active" : ""}`}>
      <div className="tier-bar-left">
        <span className="tier-badge tier-em-rampa">Em Rampa</span>
        <span className="tier-bar-threshold">1–9 vendas</span>
      </div>
      <div className="tier-bar-track">
        <div className={`tier-bar-fill ${passes ? "pass" : "fail"}`} style={{ width: `${pct}%` }} />
        <div className="tier-bar-min-marker" style={{ left: "100%" }} />
      </div>
      <div className={`tier-bar-result ${passes ? "pass" : "fail"}`}>
        <span className="tier-bar-result-icon">{passes ? "✓" : "✗"}</span>
        <span className="tier-bar-result-count">{sales}/9</span>
      </div>
    </div>
  );
})()}
```

**"Ultima venda" display** — when `ranking === "Inativo"` and `rankingInfo.lastFrontSaleDate` is set, add below the drawer metrics grid:
```tsx
{ranking === "Inativo" && rankingInfo?.lastFrontSaleDate && (
  <div className="aff-drawer-last-sale">
    Última venda: {daysAgo(rankingInfo.lastFrontSaleDate)} dias atrás
  </div>
)}
```
Helper `daysAgo(iso: string): number` uses `Date.UTC` subtraction and `Math.floor(ms / 86400000)`.

---

## Shared Patterns

### Badge Rendering Pattern
**Source:** `src/pages/Affiliates.tsx` lines 126–128 and `src/components/AffiliateDrawer.tsx` lines 85–87
**Apply to:** All locations where an `AffiliateRanking` value is displayed
```tsx
<span className={`tier-badge ${RANKING_CLASS[ranking]}`}>
  {RANKING_LABEL[ranking]}
</span>
```
The `RANKING_LABEL` and `RANKING_CLASS` Record maps must be updated consistently in **three** files: `Affiliates.tsx`, `AffiliateDrawer.tsx`, and any future file that renders a ranking badge.

### useMemo Derived Data Pattern
**Source:** `src/pages/Dashboard.tsx` lines 55–83, `src/pages/Affiliates.tsx` lines 48–60
**Apply to:** All new derived counts (activosCount, emRampaCount, inativoCount)
```tsx
const activosCount = useMemo(() => {
  return [...rankings.values()].filter(r =>
    ["Tier 1","Tier 2","Tier 3","Ativo"].includes(r.ranking)
  ).length;
}, [rankings]);
```
Always derive from the `rankings` Map (computed from `allRows`), never from `metrics.affiliatesSelling` (which is period-filtered).

### KPI Card Addition Pattern
**Source:** `src/pages/Dashboard.tsx` lines 150–155
**Apply to:** New "Inativos no Periodo" card
```tsx
<KPICard
  icon={SomeLucideIcon}
  label="Label"
  value={formatInt(count)}
  info="Tooltip text explaining the metric."
/>
```
Always pair a Lucide icon import with each new KPI card. Icon is imported from `lucide-react` at lines 3–12 in Dashboard.tsx.

### CSS Variable Pattern for Amber Styling
**Source:** `src/index.css` lines 49–51 (`:root` block) and lines 828–832 (tier-badge rules)
**Apply to:** `tier-em-rampa` badge class
```css
/* Existing vars — already available, no new vars needed */
--amber:    #B45309;
--amber-bg: #FFFBEB;
--amber-bd: #fde68a;
```

---

## No Analog Found

None — all files are existing files with clear analog patterns in the codebase.

---

## Metadata

**Analog search scope:** `src/lib/`, `src/pages/`, `src/components/`, `src/index.css`
**Files scanned:** 8 (transactions.ts, Affiliates.tsx, Dashboard.tsx, AffiliateDrawer.tsx, KPICard.tsx, InfoTooltip.tsx, index.css excerpts, App.tsx)
**Pattern extraction date:** 2026-04-27
