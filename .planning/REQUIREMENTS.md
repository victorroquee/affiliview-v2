# Requirements: AffiliView

**Defined:** 2026-04-22
**Core Value:** Know exactly how much margin each affiliate generates per product variant, so CPA can be optimized per-affiliate to maximize profitability.

## v1.0 Requirements (Complete)

All v1.0 requirements delivered. See MILESTONES.md for details.

- [x] **DATA-01**: User pode ver tabela de afiliados com margem LTV por pote (M1/M2/M3)
- [x] **DATA-02**: User pode ver AOV real por funil calculado automaticamente dos dados Digistore
- [x] **DATA-03**: User pode ver KPIs resumo no topo (total afiliados, margem media, AOV medio)
- [x] **SIM-01**: User pode definir margem target (%) e ver CPA maximo calculado por pote por afiliado
- [x] **SIM-02**: User pode definir CPA custom por pote por afiliado e ver margem resultante
- [x] **SIM-03**: User pode comparar CPA atual (default) vs CPA proposto com delta visivel
- [x] **UX-01**: Nova aba "CPA Variavel" na sidebar com icone
- [x] **UX-02**: Detalhe por afiliado (expandir ou drawer) com breakdown detalhado por pote
- [x] **UX-03**: Filtro por nome e busca de afiliados

## v1.1 Requirements

Requirements for milestone v1.1 — Melhorias Dashboard.

### Status de Afiliados

- [ ] **STAT-01**: User can see affiliates correctly classified as "Ativo" (10+ vendas em 7 dias) with verified logic
- [ ] **STAT-02**: User can see consistent active affiliate count between activity menu and ranking views (fix 21 vs 4 discrepancy)
- [ ] **STAT-03**: User can see how many affiliates became inactive in the selected period (5 dias sem vendas)
- [ ] **STAT-04**: User can see which specific affiliates are inactive in the selected period
- [ ] **STAT-05**: User can see affiliates classified as "Em Rampa" (1-9 vendas em 7 dias)

### Ajustes Visuais

- [ ] **VIS-01**: User sees refund percentage in orange when <= 8% and red when > 8%
- [ ] **VIS-02**: User sees margin colors as green >= 10%, yellow 5-10%, red < 5% on affiliate results screen
- [ ] **VIS-03**: User no longer sees the R+CB (TOTAL) column (removed)
- [ ] **VIS-04**: User no longer sees M3/M2/M1 prefix before SKU names
- [ ] **VIS-05**: User can see a Reembolso % column in the Performance por kit (Front) table

### Dados de Backend e Upsell

- [ ] **BKND-01**: User can see backend results (up1, up2, up3, down1, down2, down3) per product
- [ ] **BKND-02**: User can see which upsells an affiliate sold in the selected period with quantities (in drawer)
- [ ] **BKND-03**: User can see how much each upsell kit contributed to an affiliate's overall AOV (in drawer)
- [ ] **BKND-04**: User can see which product each affiliate is running the most in the last 7 days

### Tags de Afiliados

- [ ] **TAG-01**: User can assign manual tags to affiliates (e.g., source/origin like "chris")
- [ ] **TAG-02**: User can filter the affiliate list by tags

## Open Questions

| Question | Impact | Resolve Before |
|----------|--------|----------------|
| Dados up1-3/down1-3 vem da Digistore API ou outro sistema? | BKND-01: define fonte de dados e integracao | Phase 6 execution |
| Tags persistem em localStorage ou backend? | TAG-01: define implementacao | Phase 7 execution |
| Discrepancia 21 vs 4 afiliados ativos — bug ou logica diferente? | STAT-02: define se e fix ou redesign | Phase 4 execution |

## Future Requirements

### Persistencia

- **PERS-01**: Salvar CPA custom por afiliado em localStorage
- **PERS-02**: Exportar tabela de CPA custom para CSV
- **PERS-03**: Tags de afiliados persistidas em backend (compartilhadas entre usuarios)

### Visualizacao

- **VIZ-01**: Grafico de margem por afiliado
- **VIZ-02**: Historico de simulacoes

### Automacao

- **AUTO-01**: Deteccao automatica de origem de afiliado (sem tag manual)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Persistencia de CPA custom (localStorage/servidor) | Session-only por design (v1.0 decision) |
| Mobile app | Web-first |
| Substituicao de abas Calculator/CPA Fixo | Servem propositos diferentes |
| Deteccao automatica de origem de afiliado | Complexidade alta, tag manual suficiente para v1.1 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| STAT-01 | Phase 4 | Pending |
| STAT-02 | Phase 4 | Pending |
| STAT-03 | Phase 4 | Pending |
| STAT-04 | Phase 4 | Pending |
| STAT-05 | Phase 4 | Pending |
| VIS-01 | Phase 5 | Pending |
| VIS-02 | Phase 5 | Pending |
| VIS-03 | Phase 5 | Pending |
| VIS-04 | Phase 5 | Pending |
| VIS-05 | Phase 5 | Pending |
| BKND-01 | Phase 6 | Pending |
| BKND-02 | Phase 6 | Pending |
| BKND-03 | Phase 6 | Pending |
| BKND-04 | Phase 6 | Pending |
| TAG-01 | Phase 7 | Pending |
| TAG-02 | Phase 7 | Pending |

**Coverage:**
- v1.1 requirements: 16 total
- Mapped to phases: 16
- Unmapped: 0

---
*Requirements defined: 2026-04-22*
*Last updated: 2026-04-22 after v1.1 roadmap creation*
