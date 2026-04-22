# Requirements: AffiliView

**Defined:** 2026-04-22
**Core Value:** Know exactly how much margin each affiliate generates per product variant, so CPA can be optimized per-affiliate to maximize profitability.

## v1.0 Requirements

Requirements for CPA Variavel milestone. Each maps to roadmap phases.

### Dados & Calculo

- [x] **DATA-01
**: User pode ver tabela de afiliados com margem LTV por pote (M1/M2/M3) — front + upsell earnings - COGS - refunds
- [x] **DATA-02
**: User pode ver AOV real por funil calculado automaticamente dos dados Digistore (upsell rate por afiliado)
- [x] **DATA-03
**: User pode ver KPIs resumo no topo (total afiliados, margem media, AOV medio)

### Simulacao CPA

- [ ] **SIM-01**: User pode definir margem target (%) e ver CPA maximo calculado por pote por afiliado
- [ ] **SIM-02**: User pode definir CPA custom por pote por afiliado e ver margem resultante
- [ ] **SIM-03**: User pode comparar CPA atual (default) vs CPA proposto com delta visivel

### UX & Navegacao

- [x] **UX-01**: Nova aba "CPA Variavel" na sidebar com icone
- [ ] **UX-02**: Detalhe por afiliado (expandir ou drawer) com breakdown detalhado por pote
- [x] **UX-03
**: Filtro por nome e busca de afiliados

## Future Requirements

### Persistencia

- **PERS-01**: Salvar CPA custom por afiliado em localStorage
- **PERS-02**: Exportar tabela de CPA custom para CSV

### Visualizacao

- **VIZ-01**: Grafico de margem por afiliado
- **VIZ-02**: Historico de simulacoes

## Out of Scope

| Feature | Reason |
|---------|--------|
| Persistencia de CPA custom (localStorage/servidor) | So simulacao ao vivo neste milestone |
| Substituir abas Calculator ou CPA Fixo | Nova aba separada — cada uma serve proposito diferente |
| Input manual de upsell rate | Dados vem automaticamente da Digistore |
| Mobile app | Web-first |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DATA-01 | Phase 2 | Pending |
| DATA-02 | Phase 2 | Pending |
| DATA-03 | Phase 2 | Pending |
| SIM-01 | Phase 3 | Pending |
| SIM-02 | Phase 3 | Pending |
| SIM-03 | Phase 3 | Pending |
| UX-01 | Phase 1 | Complete (01-01) |
| UX-02 | Phase 2 | Pending |
| UX-03 | Phase 2 | Pending |

**Coverage:**
- v1.0 requirements: 9 total
- Mapped to phases: 9
- Unmapped: 0

---
*Requirements defined: 2026-04-22*
*Last updated: 2026-04-22 after roadmap creation*
