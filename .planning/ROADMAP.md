# Roadmap: AffiliView

## Milestones

- ✅ **v1.0 CPA Variavel** — Phases 1-3 (shipped 2026-04-22)
- ✅ **v1.1 Melhorias Dashboard** — Phases 4-8 (shipped 2026-04-28)
- 🔄 **v1.2 Melhorias Afiliados & Upsell** — Phases 9-11 (in progress)

## Phases

<details>
<summary>✅ v1.0 CPA Variavel (Phases 1-3) — SHIPPED 2026-04-22</summary>

- [x] Phase 1: Page Scaffold (1/1 plans) — completed 2026-04-21
- [x] Phase 2: Data Display (2/2 plans) — completed 2026-04-22
- [x] Phase 3: CPA Simulation (2/2 plans) — completed 2026-04-22

</details>

<details>
<summary>✅ v1.1 Melhorias Dashboard (Phases 4-8) — SHIPPED 2026-04-28</summary>

- [x] Phase 4: Status de Afiliados (3/3 plans) — completed 2026-04-25
- [x] Phase 5: Ajustes Visuais (2/2 plans) — completed 2026-04-28
- [x] Phase 6: Dados de Backend e Upsell (2/2 plans) — completed 2026-04-26
- [x] Phase 7: Tags de Afiliados (2/2 plans) — completed 2026-04-27
- [x] Phase 8: Auditoria de Divergencia (3/3 plans) — completed 2026-04-28

</details>

### v1.2 Melhorias Afiliados & Upsell (Phases 9-11)

- [ ] **Phase 9: Infrastructure & Count Correctness** - Restore API proxy and fix affiliate count bug (21 vs 4) + inactive semantics
- [x] **Phase 10: Visual Corrections** - Align color thresholds for margin and refund across all surfaces (completed 2026-05-05)
- [ ] **Phase 11: Data Accuracy, Drawer & Hardening** - Fix AOV calc, regex classification, wire drawer, harden localStorage

## Phase Details

### Phase 9: Infrastructure & Count Correctness
**Goal**: The application reaches Digistore24 successfully and affiliate counts are accurate
**Depends on**: Nothing (first phase of milestone)
**Requirements**: DATA-01, STAT-01, STAT-02, STAT-03
**Success Criteria** (what must be TRUE):
  1. Production requests to Digistore24 return data (no 404 from missing proxy)
  2. The affiliate count labeled "Ativo" matches the actual number of affiliates with 10+ front sales in the last 7 days relative to today's date
  3. An affiliate whose last front sale was more than 5 days ago is labeled "Inativo" — not "Ativo" or "Em Rampa"
  4. The dashboard shows a visible count and list of inactive affiliates
**Plans**: 2 plans
Plans:
- [x] 09-01-PLAN.md — Restore API proxy + fix ranking logic (wall-clock anchor, recency Inativo, never-sold)
- [x] 09-02-PLAN.md — Dashboard window label + KPI info text update

### Phase 10: Visual Corrections
**Goal**: Margin and refund percentages display with correct color thresholds on every screen
**Depends on**: Phase 9
**Requirements**: VIS-01, VIS-02, VIS-03
**Success Criteria** (what must be TRUE):
  1. A margin of 10% or above shows green on every table and card where margin color appears
  2. A margin between 5% and 9.9% shows yellow — not green — on every surface
  3. A refund rate of 8% or below shows orange and above 8% shows red, consistently across all screens
  4. The BundlePerformanceTable shows a Reembolso % column with the correct color encoding
**Plans**: 2 plans
Plans:
- [x] 10-01-PLAN.md — Create centralized color threshold helper + add .yellow CSS class
- [x] 10-02-PLAN.md — Apply helpers across all surfaces + fix tooltip thresholds
**UI hint**: yes

### Phase 11: Data Accuracy, Drawer & Hardening
**Goal**: AOV contribution is numerically correct, the affiliate drawer shows top product and closes on filter change, and the app survives localStorage quota errors
**Depends on**: Phase 10
**Requirements**: DATA-02, DATA-03, DRAW-01, DRAW-02, HARD-01
**Success Criteria** (what must be TRUE):
  1. AOV contribution values use net amounts for both numerator and denominator (no gross/net mismatch)
  2. A product slug like "down10" is classified as "down10" — not mistakenly matched to "down1"
  3. The affiliate drawer displays the affiliate's top-selling product from the last 7 days
  4. Changing the date period filter while a drawer is open closes the drawer (no stale mixed-period data)
  5. Saving affiliate tags when localStorage is full does not throw an uncaught error — it fails silently or shows a graceful message
**Plans**: 2 plans
Plans:
- [ ] 11-01-PLAN.md — [to be planned]
- [ ] 11-02-PLAN.md — [to be planned]

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Page Scaffold | v1.0 | 1/1 | Complete | 2026-04-21 |
| 2. Data Display | v1.0 | 2/2 | Complete | 2026-04-22 |
| 3. CPA Simulation | v1.0 | 2/2 | Complete | 2026-04-22 |
| 4. Status de Afiliados | v1.1 | 3/3 | Complete | 2026-04-25 |
| 5. Ajustes Visuais | v1.1 | 2/2 | Complete | 2026-04-28 |
| 6. Dados de Backend e Upsell | v1.1 | 2/2 | Complete | 2026-04-26 |
| 7. Tags de Afiliados | v1.1 | 2/2 | Complete | 2026-04-27 |
| 8. Auditoria de Divergencia | v1.1 | 3/3 | Complete | 2026-04-28 |
| 9. Infrastructure & Count Correctness | v1.2 | 2/2 | Complete | - |
| 10. Visual Corrections | v1.2 | 2/2 | Complete   | 2026-05-05 |
| 11. Data Accuracy, Drawer & Hardening | v1.2 | 0/2 | Not started | - |
