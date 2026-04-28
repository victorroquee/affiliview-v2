# AffiliView

## What This Is

AffiliView is an internal analytics dashboard for managing affiliate performance in a European supplement e-commerce operation (Digistore24). It tracks transactions, calculates CPA margins per affiliate and product variant (2/3/6 pots), monitors refund rates, classifies affiliate activity status, displays backend/upsell performance, supports affiliate tagging, and simulates CPA optimization scenarios. Built with React + TypeScript + Vite, deployed on Vercel.

## Core Value

Know exactly how much margin each affiliate generates per product variant, so CPA can be optimized per-affiliate to maximize profitability.

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
- Status de afiliados: Ativo (10+), Em Rampa (1-9), Inativo (0 vendas em 7 dias) — v1.1
- Contagem consistente de ativos entre menu e ranking — v1.1
- Cores de reembolso: laranja <=8%, vermelho >8% — v1.1
- Cores de margem: verde >=10%, amarelo 5-10%, vermelho <5% — v1.1
- Coluna R+CB removida, prefixo M removido, Reembolso % adicionado — v1.1
- Backend results (up1-3, down1-3) por produto — v1.1
- Upsells por afiliado no drawer com AOV contribution — v1.1
- Top produto por afiliado (ultimos 7 dias) — v1.1
- Tags manuais por afiliado com filtro — v1.1
- Gross Revenue e Earnings alinhados com Digistore24 dashboard (all payments) — v1.1

### Active

(Next milestone requirements to be defined via /gsd-new-milestone)

### Out of Scope

- Persistencia de CPA custom (localStorage ou servidor) — so simulacao ao vivo
- Substituicao das abas Calculator ou CPA Fixo — nova aba separada
- Mobile app — web-first
- Offline mode — real-time data is core value

## Context

- Stack: React 19, TypeScript, Vite 5, Recharts, React Router, Tailwind-style CSS
- Data: Digistore24 API via serverless functions (Vercel)
- Variantes: M1 (2 potes), M2 (3 potes), M3 (6 potes)
- CPA defaults: M1=100, M2=130, M3=185
- COGS calculados por bottles x zona de shipping
- Shipped v1.1 with affiliate status classification, visual encoding fixes, backend/upsell data, tag system, and KPI alignment audit
- 5 phases, 12 plans executed in v1.1

## Constraints

- **Stack**: React + TypeScript + Vite — manter consistencia com codebase existente
- **Data source**: Digistore24 API — sem dados externos adicionais
- **Deploy**: Vercel — serverless functions para API proxy
- **Session-only**: Sem persistencia de valores custom

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Nova aba separada (nao substituir) | Calculator e CPA Fixo servem propositos diferentes | Good |
| Simulacao session-only | Simplicidade, sem backend adicional | Good |
| LTV completo para margem | Front + upsells da imagem real de rentabilidade | Good |
| Dados reais Digistore (sem input manual) | Precisao e automatizacao | Good |
| Gross/Earnings = all payments (Phase 8) | Alinha com definicao do painel Digistore24 | Good |
| earningsFront decoupled from earningsKPI (Phase 8) | Preserva Valor Liquido front-only COGS logic | Good |
| Tags stored in localStorage (Phase 7) | Simple, no backend needed for internal tool | Good |

## Evolution

This document evolves at phase transitions and milestone boundaries.

---
*Last updated: 2026-04-28 after v1.1 milestone*
