# AffiliView

## What This Is

Dashboard de afiliados para produtores digitais que usam Digistore24. Consolida dados de vendas, margens, CPA e performance por afiliado/produto com dados reais da API Digistore24.

## Core Value

Know exactly how much margin each affiliate generates per product variant, so CPA can be optimized per-affiliate to maximize profitability.

## Current Milestone: v1.2 Melhorias Afiliados & Upsell

**Goal:** Melhorar visibilidade do status de afiliados, adicionar dados de upsell por produto, e enriquecer a tela de resultados por afiliado com tags, produto principal e detalhamento de upsells.

**Target features:**
- Auditoria e correção da lógica "Ativo" (10+ vendas/7d) + resolver discrepância 21 vs 4
- Novo status "Em Rampa" (1-9 vendas em 7 dias)
- Listagem de afiliados inativos (5 dias sem vendas) com contagem
- Cores de margem corrigidas (>10% verde, 5-10% amarelo, <5% vermelho)
- Reembolso % com cores (laranja ≤8%, vermelho >8%)
- Reembolso % na tabela Performance por kit (Front)
- Dados de upsell do backend (up1-3, down1-3) por produto via Digistore API
- Tags manuais por afiliado (origem) com filtro — localStorage
- Produto mais rodado por afiliado (últimos 7 dias)
- Drawer do afiliado: detalhamento de upsells vendidos + contribuição pro AOV

## Requirements

### Validated

- ✓ CPA Variavel page com LTV margins, AOV per funnel, simulação — v1.0
- ✓ Status de afiliados (ativo/inativo) — v1.1
- ✓ Tags de afiliados básico — v1.1
- ✓ Ajustes visuais (R+CB removido, M-prefix removido, Reembolso % adicionado) — v1.1
- ✓ Auditoria de divergência Digistore24 vs AffiliView — v1.1

### Active

- [ ] Lógica "Ativo" auditada e corrigida
- [ ] Status "Em Rampa" (1-9 vendas/7d)
- [ ] Listagem afiliados inativos com contagem
- [ ] Cores de margem corrigidas
- [ ] Reembolso % com cores (laranja/vermelho)
- [ ] Reembolso % em Performance por kit
- [ ] Dados upsell (up1-3, down1-3) por produto
- [ ] Tags manuais por afiliado com filtro
- [ ] Produto mais rodado por afiliado
- [ ] Drawer afiliado: upsells + contribuição AOV

### Out of Scope

- Persistência de tags em backend — localStorage por enquanto, backend futuro
- CPA automático por tag/grupo — v2+
- Notificações de mudança de status — v2+

## Context

- Stack: React 19 + TypeScript + Vite 5 + Recharts + Tailwind-style CSS
- Deploy: Vercel serverless functions para Digistore24 API proxy
- Dados upsell identificados pela nomenclatura da venda na API (M = front, up1/up2/up3/down1/down2/down3)
- Tags armazenadas em localStorage
- Discrepância 21 vs 4 afiliados: bug existente a investigar no código atual

## Constraints

- **Storage**: localStorage only (sem backend próprio por enquanto)
- **API**: Digistore24 API como única fonte de dados
- **Deploy**: Vercel (serverless functions + static frontend)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Tags em localStorage | Sem backend próprio, simplicidade | — Pending |
| Upsell via nomenclatura | API Digistore identifica tipo pela nome do produto | — Pending |
| Status "Em Rampa" 1-9 vendas/7d | Visibilidade de afiliados crescendo | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-05 after milestone v1.2 start*
