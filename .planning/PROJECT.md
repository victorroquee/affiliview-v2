# AffiliView

## What This Is

AffiliView is an internal analytics dashboard for managing affiliate performance in a European supplement e-commerce operation (Digistore24). It tracks transactions, calculates CPA margins per affiliate and product variant (2/3/6 pots), monitors refund rates, and simulates CPA optimization scenarios. Built with React + TypeScript + Vite, deployed on Vercel.

## Core Value

Know exactly how much margin each affiliate generates per product variant, so CPA can be optimized per-affiliate to maximize profitability.

## Current Milestone: v1.1 Melhorias Dashboard

**Goal:** Corrigir logica de status de afiliados, melhorar visualizacao de dados, integrar resultados de backend/upsell, e adicionar sistema de tags para afiliados.

**Target features:**
- Status de afiliados (Ativo/Em Rampa/Inativo) com contagem e listagem
- Ajustes visuais: cores de margem/reembolso, remover colunas desnecessarias
- Dados de backend (upsells, downsells) por produto e contribuicao no AOV
- Tags manuais de afiliados com filtro
- Produto mais rodado por afiliado nos ultimos 7 dias
- Detalhes de upsell por afiliado no drawer lateral

## Requirements

### Validated

- Dashboard com KPIs de receita, affiliates, chargebacks
- Pagina de afiliados com drawer de detalhe
- CPA Calculator com analise de margem por variante e marginTarget global
- CPA Fixo com simulacao de valores fixos por variante
- Mail Sales (Maileonardo) tracking
- Integracao Digistore24 API com filtros de periodo
- COGS por zona de shipping (Z1-Z7, UK)
- Upsell tracking por afiliado/variante
- CPA Variavel — nova aba com CPA personalizado por pote por afiliado (v1.0)
- Margem LTV completa por pote: front + upsells - COGS - refunds (v1.0)
- AOV real por funil com upsell rate automatico (v1.0)
- Simulacao bidirecional CPA/margem (v1.0)

### Active

- [ ] Corrigir logica "Ativo" (10+ vendas em 7 dias) e discrepancia 21 vs 4
- [ ] Novo status "Em Rampa" (1-9 vendas em 7 dias)
- [ ] Status "Inativo" com contagem e listagem (5 dias sem vendas)
- [ ] Remover coluna R+CB (TOTAL)
- [ ] Cores de reembolso: laranja ate 8%, vermelho acima
- [ ] Coluna Reembolso % na tabela Performance por kit (Front)
- [ ] Remover prefixo M3/M2/M1 antes do SKU
- [ ] Cores de margem: verde >=10%, amarelo 5-10%, vermelho <5%
- [ ] Integrar resultados backend (up1-3, down1-3) por produto
- [ ] Upsells vendidos por afiliado no drawer (quantidades + contribuicao AOV)
- [ ] Produto mais rodado por afiliado nos ultimos 7 dias
- [ ] Tags manuais por afiliado (origem/source tracking)
- [ ] Filtrar lista de afiliados por tags

### Out of Scope

- Persistencia de CPA custom (localStorage ou servidor) — so simulacao ao vivo
- Substituicao das abas Calculator ou CPA Fixo — nova aba separada
- Mobile app — web-first

## Context

- Stack: React 19, TypeScript, Vite 5, Recharts, React Router, Tailwind-style CSS
- Data: Digistore24 API via serverless functions (Vercel)
- Variantes: M1 (2 potes), M2 (3 potes), M3 (6 potes)
- CPA defaults: M1=100, M2=130, M3=185
- COGS calculados por bottles x zona de shipping
- Benchmarks operacionais (OP_AVG) por variante ja definidos
- Upsell data ja parsed por afiliado/variante no analyzeCPA.ts

## Constraints

- **Stack**: React + TypeScript + Vite — manter consistencia com codebase existente
- **Data source**: Digistore24 API — sem dados externos adicionais
- **Deploy**: Vercel — serverless functions para API proxy
- **Session-only**: Sem persistencia de valores custom

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Nova aba separada (nao substituir) | Calculator e CPA Fixo servem propositos diferentes | -- Pending |
| Simulacao session-only | Simplicidade, sem backend adicional | -- Pending |
| LTV completo para margem | Front + upsells da imagem real de rentabilidade | -- Pending |
| Dados reais Digistore (sem input manual) | Precisao e automatizacao | -- Pending |

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
*Last updated: 2026-04-22 after milestone v1.1 start*
