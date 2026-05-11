# Feature Landscape

**Domain:** Affiliate partner dashboard — digital product producer (Digistore24)
**Milestone:** v1.2 Melhorias Afiliados & Upsell
**Researched:** 2026-05-04
**Mode:** Subsequent milestone — existing codebase, incremental features only

---

## Codebase Audit: Already Built vs Still Needed

Before mapping new features, here is the actual state of the codebase based on direct code inspection.

### Already implemented (do not rebuild)

| Feature | Where |
|---------|-------|
| Status tiers: Tier 1/2/3 + Ativo + Em Rampa + Inativo | `transactions.ts: computeAffiliateRankings`, `Affiliates.tsx` |
| Status filter tabs (Todos / Ativos / Em Rampa / Inativos) | `Affiliates.tsx` |
| Summary badges (count per status) | `Affiliates.tsx: aff-summary-badges` |
| Last sale date shown for Inativo affiliates | `Affiliates.tsx` row + `AffiliateDrawer.tsx` |
| Top product per affiliate (7d) | `transactions.ts: computeTopProductPerAffiliate`, `Affiliates.tsx` column |
| Tags in localStorage (add, remove, normalize, dedup) | `useAffiliateTags.ts` |
| Tag filter row (pill buttons above table) | `Affiliates.tsx` |
| Tags inline in affiliate table rows | `Affiliates.tsx` |
| Tags section in drawer (inline add/remove via input + x) | `AffiliateDrawer.tsx` |
| Upsell data computed per affiliate | `transactions.ts: computeAffiliateUpsells` |
| Upsell table in drawer (product, qty, gross, AOV+, % AOV) | `AffiliateDrawer.tsx` |
| Backend products table in Dashboard (global upsell breakdown) | `Dashboard.tsx` + `computeBackendProducts` |
| Refund+CB % with color in affiliate table | `Affiliates.tsx` (orange >0, red >8%) |
| Refund % column in ProductSummaryTable (Performance por kit front) | `ProductTable.tsx` |
| Margin % color in affiliate table | `Affiliates.tsx` (green ≥10, orange ≥5, red <5) |
| Tier analysis in drawer (7-day squares, progress bars, next tier) | `AffiliateDrawer.tsx` |
| Drawer opens on row click, closes on overlay/Escape/X | `Affiliates.tsx` + `AffiliateDrawer.tsx` |

### Still needed (active requirements from PROJECT.md)

| Feature | Gap | Complexity |
|---------|-----|------------|
| "Ativo" logic audit — verify 10+ vendas/7d bug (21 vs 4) | Logic correctness, possibly a filter or date-window bug | Low-Med |
| Margin color threshold audit | PROJECT.md says ">10% verde, 5-10% amarelo, <5% vermelho" — verify this matches code (it does in Affiliates.tsx, but check ProductTable) | Low |
| Refund % color thresholds audit | PROJECT.md says "laranja ≤8%, vermelho >8%" — ProductTable uses ≤5% orange, >10% red. Inconsistent. | Low |
| Refund % in BundlePerformanceTable (Performance por kit) | BundlePerformanceTable has Reembolso count + %, but color thresholds may not match spec | Low |

---

## Table Stakes

Features users expect in an affiliate partner dashboard. Missing = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Status tiers with clear visual hierarchy | Producers need instant "who is performing" — tiers communicate scale, not just binary on/off | Low | Already built. Audit correctness of 10-vendas threshold. |
| Inactive affiliate list with recency | Without this, dead affiliates pollute the active view — "Inativo" tab + last sale date is the standard pattern | Low | Built. Verify the 21 vs 4 bug is actually fixed. |
| Tag filtering that persists | Manual segmentation (source origin, campaign type) is expected in any partner tool used by a human analyst | Low | Built. localStorage is correct choice for now. |
| Upsell breakdown in affiliate detail | When debugging AOV or commission disputes, producers need to see which upsells an affiliate triggered | Medium | Built in drawer. |
| Consistent color thresholds across all tables | Color coding loses trust if the same metric shows different colors in different views | Low | Gap: Refund % color spec (≤8%/> 8%) differs from ProductTable impl (≤5/>10). Fix needed. |
| Affiliate drawer that shows full context | Clicking an affiliate should answer: what tier, why, what they sold, any tags, last sale — in one place | Medium | Built. Contains tier analysis, upsell table, metrics, tags. |

## Differentiators

Features that set this dashboard apart. Not expected by default, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Tier qualification engine with 7-day window and "3 of 4" rule | Goes beyond simple sale counts — models consistent performance, not one-day spikes. Reduces false positives from flash sales. | High | Built. Genuinely differentiated vs typical "active = N sales" binary. |
| "Em Rampa" (ramping) tier | Most tools binary-classify affiliates. Ramping tier catches affiliates growing toward activation — actionable for outreach. | Low | Built. |
| Per-affiliate upsell AOV contribution | Shows not just that an affiliate sold upsells, but how much those upsells inflated their average order value. Useful for CPA negotiation. | Medium | Built: aovContribution + aovContributionPct in drawer. |
| Next-tier progress shown in drawer | Producers can see exactly how many sales/days an affiliate needs to promote. Reduces "is this affiliate almost there?" guesswork. | Low | Built in drawer (frontSalesInWindow vs threshold). |
| Tag-based filtering with localStorage persistence | Simple segmentation without backend. Tags survive page reload. Useful for tracking acquisition channels (e.g. "YT", "email", "meta"). | Low | Built. |

## Anti-Features

Features to explicitly NOT build in this milestone.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Backend tag persistence (database) | Adds API surface, auth complexity, sync conflicts — solves a problem users don't have yet | Keep localStorage. Mark for v2+ when multi-user need is confirmed. |
| Automated CPA adjustment by tag/group | Too much business logic variability — requires deep understanding of each producer's CPA contract rules | Expose CPA data for manual decision-making. CPA calculator already exists. |
| Push notifications for status changes | Requires background worker, subscription management, browser permissions. High friction for a dashboard checked manually. | Use visual indicators (badge counts, color coding) in the UI instead. |
| Full affiliate profile page (separate route) | Drawer pattern covers the depth needed at this scale. A full page would require navigation state, back-button handling, URL routing per affiliate. | Keep drawer. If affiliate count exceeds ~200 or detail requirements grow, revisit. |
| Webhook ingestion from Digistore24 | Real-time push requires backend infrastructure not currently in scope. | Poll via existing API proxy on Vercel. |

---

## Feature Dependencies

```
Tag localStorage hook → Tag filter (already wired)
computeAffiliateRankings (allRows) → Status tiers → Status filter tabs → Summary badges
computeTopProductPerAffiliate (allRows) → Top Produto column
computeAffiliateUpsells (filteredRows, affiliateName) → Drawer upsell table
AffiliateRankingInfo.frontSalesInWindow → "Ativo" correctness bug

Color threshold spec (PROJECT.md) → Audit: ProductTable.tsx thresholds → Fix if inconsistent
```

---

## Gap Analysis: What Remains

Cross-referencing PROJECT.md "Active" requirements against codebase:

| Requirement | Status | Action Needed |
|-------------|--------|---------------|
| Lógica "Ativo" auditada e corrigida | PARTIAL — logic exists, bug "21 vs 4" not confirmed resolved | Trace `computeAffiliateRankings` with real data; verify window filter matches API date format |
| Status "Em Rampa" (1-9 vendas/7d) | BUILT | None |
| Listagem afiliados inativos com contagem | BUILT | None |
| Cores de margem corrigidas (>10 verde / 5-10 amarelo / <5 vermelho) | BUILT in Affiliates.tsx | Verify same thresholds in ProductTable if margin shown there |
| Reembolso % com cores (laranja ≤8%, vermelho >8%) | PARTIAL — Affiliates.tsx orange>0 red>8, ProductTable.tsx orange>5 red>10 | Reconcile ProductTable thresholds to match spec |
| Reembolso % em Performance por kit | BUILT | Verify BundlePerformanceTable uses same spec thresholds |
| Dados upsell (up1-3, down1-3) por produto | BUILT | None — computeBackendProducts + drawer table |
| Tags manuais por afiliado com filtro | BUILT | None |
| Produto mais rodado por afiliado | BUILT | None |
| Drawer afiliado: upsells + contribuição AOV | BUILT | None |

---

## MVP for This Milestone

The milestone is largely implemented. Remaining work is:

**Priority 1 — Correctness fixes (spec violations)**
1. Audit and resolve the "Ativo" count discrepancy (21 vs 4). Trace `computeAffiliateRankings` window logic against actual `allRows` date format.
2. Reconcile Refund % color thresholds: `ProductTable.tsx` uses `>5% orange / >10% red` but spec says `≤8% orange / >8% red`. One file needs to change.

**Priority 2 — Verify completeness**
3. Confirm `BundlePerformanceTable` Reembolso % coloring matches the ≤8%/>8% spec.
4. Confirm `Dashboard.tsx` margin color (if shown in any KPI/table there) matches ≥10/>5/<5 spec.

**Defer**
- Any new feature not listed in the Active requirements block.
- Backend tag persistence (explicitly out of scope in PROJECT.md).

---

## Sources

- Direct code inspection: `src/pages/Affiliates.tsx`, `src/components/AffiliateDrawer.tsx`, `src/pages/Dashboard.tsx`, `src/components/ProductTable.tsx`, `src/lib/transactions.ts`, `src/hooks/useAffiliateTags.ts`
- Requirements source: `.planning/PROJECT.md` (v1.2 milestone, last updated 2026-05-05)
- Confidence: HIGH — all findings based on direct file reads, not inference
