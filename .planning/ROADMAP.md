# Roadmap: AffiliView

## Milestones

- **v1.0 CPA Variavel** - Phases 1-3 (shipped 2026-04-22)
- **v1.1 Melhorias Dashboard** - Phases 4-7 (in progress)

## Phases

<details>
<summary>v1.0 CPA Variavel (Phases 1-3) — SHIPPED 2026-04-22</summary>

### Phase 1: Page Scaffold
**Goal**: Users can navigate to the CPA Variavel page from the sidebar
**Depends on**: Nothing (first phase)
**Requirements**: UX-01
**Success Criteria** (what must be TRUE):
  1. Sidebar shows a "CPA Variavel" entry with an icon alongside existing tabs
  2. Clicking the tab renders the CPA Variavel page (no broken routes)
  3. The page does not break or error-boundary when navigating to/from it
**Plans:** 1/1 plans complete
Plans:
- [x] 01-01-PLAN.md — Wire CPA Variavel page into sidebar navigation and App.tsx routing
**UI hint**: yes

### Phase 2: Data Display
**Goal**: Users can see real LTV margin, AOV, and KPI summaries per affiliate per pot variant
**Depends on**: Phase 1
**Requirements**: DATA-01, DATA-02, DATA-03, UX-02, UX-03
**Success Criteria** (what must be TRUE):
  1. User can see a table listing each affiliate with their margin per pot (M1/M2/M3), computed as front + upsell earnings - COGS - refunds
  2. User can see the real AOV per funnel for each affiliate, automatically derived from Digistore upsell data (no manual input)
  3. User can see summary KPI cards at the top of the page showing total affiliates, average margin, and average AOV
  4. User can expand or open a drawer for any affiliate to see a full per-pot breakdown with line-item detail
  5. User can type in a search/filter field to narrow the affiliate table by name
**Plans:** 2/2 plans complete
Plans:
- [x] 02-01-PLAN.md — Data layer extension (AOV in analyzeCPA) + useCpaVariavel hook
- [x] 02-02-PLAN.md — CPA Variavel page UI: KPI cards, table, search, detail navigation
**UI hint**: yes

### Phase 3: Simulation Engine
**Goal**: Users can simulate CPA scenarios and immediately see margin impact per affiliate per pot
**Depends on**: Phase 2
**Requirements**: SIM-01, SIM-02, SIM-03
**Success Criteria** (what must be TRUE):
  1. User can enter a margin target percentage and see the maximum CPA calculated for each pot (M1/M2/M3) per affiliate in real time
  2. User can enter a custom CPA value for any pot per affiliate and see the resulting margin percentage immediately
  3. User can see the current default CPA alongside the proposed CPA with the delta (difference) clearly visible for each pot
**Plans:** 2/2 plans complete
Plans:
- [x] 03-01-PLAN.md — Simulation data layer: extend useCpaVariavel hook with marginTarget, customCpa state, and computed simMaxCpa/customMargin/cpaDelta
- [x] 03-02-PLAN.md — Simulation UI: margin slider on page, sim columns in table, custom CPA input with delta in detail view
**UI hint**: yes

</details>

### v1.1 Melhorias Dashboard (In Progress)

**Milestone Goal:** Corrigir logica de status de afiliados, melhorar visualizacao de dados, integrar resultados de backend/upsell, e adicionar sistema de tags para afiliados.

#### Phase 4: Status de Afiliados
**Goal**: Users can see affiliates correctly classified by activity status with consistent counts across all views
**Depends on**: Phase 3
**Requirements**: STAT-01, STAT-02, STAT-03, STAT-04, STAT-05
**Success Criteria** (what must be TRUE):
  1. User can see affiliates classified as "Ativo" only when they have 10 or more sales in the last 7 days, and the count matches between the activity menu and ranking views
  2. User can see affiliates classified as "Em Rampa" when they have 1-9 sales in the last 7 days
  3. User can see the count of affiliates who became inactive (0 sales for 5+ days) in the selected period
  4. User can see the specific list of affiliates currently classified as inactive
**Plans:** 3 plans
Plans:
- [x] 04-01-PLAN.md — Data layer: add Em Rampa to ranking type/logic + lastFrontSaleDate + CSS foundation
- [x] 04-02-PLAN.md — Dashboard count fix + Inativos KPI + AffiliateDrawer Em Rampa support
- [x] 04-03-PLAN.md — Affiliates page: status filter tabs, summary badges, sort order, Ultima venda

**UI hint**: yes

#### Phase 5: Ajustes Visuais
**Goal**: Users see data presented with correct visual encoding (colors, columns, labels) that matches business thresholds
**Depends on**: Phase 4
**Requirements**: VIS-01, VIS-02, VIS-03, VIS-04, VIS-05
**Success Criteria** (what must be TRUE):
  1. User sees refund percentage in orange when at or below 8% and in red when above 8%
  2. User sees margin values color-coded as green (>=10%), yellow (5-10%), or red (<5%) on the affiliate results screen
  3. User no longer sees the R+CB (TOTAL) column in any table
  4. User no longer sees M3/M2/M1 prefix text before SKU names
  5. User can see a Reembolso % column in the Performance por kit (Front) table
**Plans:** 2 plans
Plans:
- [ ] 05-01-PLAN.md — Fix refund and margin color thresholds (VIS-01, VIS-02)
- [ ] 05-02-PLAN.md — Remove R+CB column, strip M-prefix, add Reembolso % column (VIS-03, VIS-04, VIS-05)
**UI hint**: yes

#### Phase 6: Dados de Backend e Upsell
**Goal**: Users can see per-product backend results and per-affiliate upsell detail including AOV contribution and top product
**Depends on**: Phase 5
**Requirements**: BKND-01, BKND-02, BKND-03, BKND-04
**Success Criteria** (what must be TRUE):
  1. User can see backend product results (up1, up2, up3, down1, down2, down3) broken down per product
  2. User can open an affiliate drawer and see which upsells that affiliate sold in the selected period with quantities
  3. User can see how much each upsell kit contributed to the affiliate's overall AOV inside the drawer
  4. User can see which product each affiliate is running the most in the last 7 days
**Plans:** 2 plans
Plans:
- [x] 06-01-PLAN.md — Data layer: upsell/backend aggregation functions and types
- [x] 06-02-PLAN.md — UI: backend products table, upsell drawer section, top product badge
**UI hint**: yes

#### Phase 7: Tags de Afiliados
**Goal**: Users can organize affiliates with manual tags and filter the list by tag
**Depends on**: Phase 6
**Requirements**: TAG-01, TAG-02
**Success Criteria** (what must be TRUE):
  1. User can assign one or more manual tags (e.g., "chris", "facebook") to any affiliate and see the tag displayed on that affiliate's row
  2. User can select a tag and filter the affiliate list to show only affiliates with that tag
  3. User can clear the tag filter to return to the full affiliate list
**Plans:** 2 plans
Plans:
- [x] 07-01-PLAN.md — useAffiliateTags hook + drawer tag assignment UI
- [ ] 07-02-PLAN.md — Tag display on rows + tag filter on Affiliates page
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 4 -> 5 -> 6 -> 7 -> 8

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Page Scaffold | v1.0 | 1/1 | Complete | 2026-04-22 |
| 2. Data Display | v1.0 | 2/2 | Complete | 2026-04-22 |
| 3. Simulation Engine | v1.0 | 2/2 | Complete | 2026-04-22 |
| 4. Status de Afiliados | v1.1 | 0/3 | Planning complete | - |
| 5. Ajustes Visuais | v1.1 | 0/2 | Planning complete | - |
| 6. Dados de Backend e Upsell | v1.1 | 0/2 | Planning complete | - |
| 7. Tags de Afiliados | v1.1 | 0/2 | Planning complete | - |
| 8. Auditoria Divergencia | v1.1 | 0/TBD | Not started | - |

### Phase 8: Auditoria de Divergencia Digistore24 vs AffiliView

**Goal:** Identificar e corrigir as causas raiz da divergencia entre Gross (-13.4%), Earnings (-48.3%) e Net Amount exibidos no painel Digistore24 vs AffiliView
**Requirements**: TBD
**Depends on:** Phase 7
**Success Criteria** (what must be TRUE):
  1. Relatorio de diagnostico com hipoteses rankeadas por probabilidade
  2. Mapeamento de campos da API Digistore24 vs campos calculados no AffiliView
  3. Identificacao de quais filtros (timezone, order_type, status, paginacao) causam a divergencia
  4. Gross Revenue do AffiliView alinhado com Gross Amount do painel Digistore24 (margem <1%)
  5. Earnings do AffiliView alinhado com Your Earnings do painel Digistore24 (margem <1%)
**Plans:** 0 plans
**UI hint**: no

Plans:
- [ ] TBD (run /gsd-plan-phase 8 to break down)
