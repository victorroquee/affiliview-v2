# Requirements: AffiliView

**Defined:** 2026-05-05
**Core Value:** Know exactly how much margin each affiliate generates per product variant, so CPA can be optimized per-affiliate to maximize profitability.

## v1.2 Requirements

Requirements for milestone v1.2 Melhorias Afiliados & Upsell. Each maps to roadmap phases.

### Status de Afiliados

- [ ] **STAT-01**: Lógica "Ativo" auditada — corrigir discrepância 21 vs 4 (ranking window usa wall clock, não maxDate do dataset)
- [ ] **STAT-02**: "Inativo" definido como última venda front há mais de 5 dias (from today)
- [ ] **STAT-03**: Listagem de afiliados inativos com contagem visível no dashboard

### Correções Visuais

- [x] **VIS-01**: Cores de margem: ≥10% verde, 5-10% amarelo, <5% vermelho — consistente em todas as telas
- [x] **VIS-02**: Cores de reembolso: ≤8% laranja, >8% vermelho — consistente em todas as telas
- [x] **VIS-03**: Reembolso % adicionado na tabela Performance por kit (BundlePerformanceTable)

### Dados & Cálculos

- [ ] **DATA-01**: Restaurar api/digistore.ts (proxy Vercel deletado)
- [ ] **DATA-02**: Corrigir AOV contribution — usar netAmount para numerador e denominador (gross/net mismatch)
- [ ] **DATA-03**: Corrigir regex classifyUpsellProduct — word boundary para evitar "down10" → "down1"

### Drawer do Afiliado

- [ ] **DRAW-01**: Passar topProducts Map como prop para AffiliateDrawer (produto mais rodado)
- [ ] **DRAW-02**: Fechar drawer ao mudar filtro de período (evitar dados misturados)

### Hardening

- [ ] **HARD-01**: localStorage try/catch para QuotaExceededError em useAffiliateTags

## Future Requirements

### Persistência & Backend

- **PERS-01**: Tags de afiliados persistidas em backend (substituir localStorage)
- **PERS-02**: CPA automático por tag/grupo de afiliados

### Notificações

- **NOTF-01**: Alertas de mudança de status (afiliado ficou inativo)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Backend próprio para tags | localStorage suficiente por enquanto, backend futuro |
| CPA automático por grupo | Depende de persistência backend |
| Notificações de status | v2+ após validar utilidade dos status |
| Cross-tab sync de tags | Complexidade desproporcional ao benefício |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DATA-01 | Phase 9 | Pending |
| STAT-01 | Phase 9 | Pending |
| STAT-02 | Phase 9 | Pending |
| STAT-03 | Phase 9 | Pending |
| VIS-01 | Phase 10 | Complete |
| VIS-02 | Phase 10 | Complete |
| VIS-03 | Phase 10 | Complete |
| DATA-02 | Phase 11 | Pending |
| DATA-03 | Phase 11 | Pending |
| DRAW-01 | Phase 11 | Pending |
| DRAW-02 | Phase 11 | Pending |
| HARD-01 | Phase 11 | Pending |

**Coverage:**
- v1.2 requirements: 12 total
- Mapped to phases: 12
- Unmapped: 0 ✓

---
*Requirements defined: 2026-05-05*
*Last updated: 2026-05-04 — traceability updated after v1.2 roadmap*
