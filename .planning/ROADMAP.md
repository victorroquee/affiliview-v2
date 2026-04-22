# Roadmap: AffiliView — v1.0 CPA Variavel

## Overview

Three phases deliver the CPA Variavel feature: first the page is scaffolded and wired into navigation, then the data layer shows each affiliate's real LTV margins and AOV per pot variant with full detail access, and finally the simulation engine enables bidirectional CPA/margin modeling so users can find the optimal CPA per affiliate per pot.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Page Scaffold** - New CPA Variavel page wired into sidebar navigation
- [ ] **Phase 2: Data Display** - Affiliate table with LTV margins, AOV per funnel, KPI cards, detail drawer, and search
- [ ] **Phase 3: Simulation Engine** - Bidirectional CPA/margin simulation with live delta comparison

## Phase Details

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
**Plans:** 2 plans
Plans:
- [ ] 02-01-PLAN.md — Data layer extension (AOV in analyzeCPA) + useCpaVariavel hook
- [ ] 02-02-PLAN.md — CPA Variavel page UI: KPI cards, table, search, detail navigation
**UI hint**: yes

### Phase 3: Simulation Engine
**Goal**: Users can simulate CPA scenarios and immediately see margin impact per affiliate per pot
**Depends on**: Phase 2
**Requirements**: SIM-01, SIM-02, SIM-03
**Success Criteria** (what must be TRUE):
  1. User can enter a margin target percentage and see the maximum CPA calculated for each pot (M1/M2/M3) per affiliate in real time
  2. User can enter a custom CPA value for any pot per affiliate and see the resulting margin percentage immediately
  3. User can see the current default CPA alongside the proposed CPA with the delta (difference) clearly visible for each pot
**Plans:** 2 plans
Plans:
- [ ] 02-01-PLAN.md — Data layer extension (AOV in analyzeCPA) + useCpaVariavel hook
- [ ] 02-02-PLAN.md — CPA Variavel page UI: KPI cards, table, search, detail navigation

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Page Scaffold | 1/1 | Complete    | 2026-04-22 |
| 2. Data Display | 0/2 | Planned | - |
| 3. Simulation Engine | 0/TBD | Not started | - |
