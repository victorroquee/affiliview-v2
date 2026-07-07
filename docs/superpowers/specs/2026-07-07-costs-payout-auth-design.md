# Design: Custos Operacionais + Payout Semanal + Login/Branding

**Data:** 2026-07-07
**Branch:** `feat/costs-payout-auth` → PR única para `main`
**Escopo:** três frentes coesas entregues juntas (A + B + C), com docs em `logica/` e auditorias com dados reais.

---

## Contexto

Affiliview é um SPA React 19 + Vite + TypeScript que consome a API Digistore24 via proxy serverless (`api/digistore.ts`). O motor de métricas é `src/lib/transactions.ts::computePeriod()`, que já calcula `productCost`, `shippingCost`, `capitalCost`, `frontSales` e `dailyGross`. O modelo de custo vive em `src/lib/costTable.ts`. Toda a lógica de negócio é documentada em `logica/*.md`.

---

## A — Custos Operacionais Diários

### Decisões travadas
- **Categorização:** 4 linhas separadas — COGS (só produto), Frete, Taxas de Fulfillment (embalagem+processing), Total.
- **Versionamento:** por data de vigência. Tier 2 vale a partir de **2025-12-01**; antes disso, tabela legada. Uma fonte única (Valor Líquido, CPA e o novo painel leem o mesmo registro).
- **Surface:** cards + tabela diária no Dashboard.
- **Produtos:** mesma tabela de frete/taxas para os 5 produtos (frete por peso, 40 g/frasco); só o custo/frasco difere.

### Modelo de custo versionado (`costTable.ts`)

Registro ordenado por `effectiveFrom`:

| Versão | Vigência | Frete | Embalagem | Processing |
|---|---|---|---|---|
| `v1-legacy` | até 2025-11-30 | tabela atual (7,58…) | €0 | €0 |
| `v2-tier2` | ≥ 2025-12-01 | tabela do PDF (abaixo) | €0,23 (1-3) / €0,35 (6-12) | €0,47 flat |

**Frete Tier 2 (€), confirmado célula a célula do PDF ShipOffers `Shipping_WL_Blend_EU`:**

| Frascos | z1 | z2 | z3 | z4 | z5 | z6 | z7 | uk |
|---|---|---|---|---|---|---|---|---|
| 1,2,3,6 | 8,60 | 9,44 | 11,12 | 12,96 | 17,11 | 24,49 | 50,33 | 9,44 |
| 9,12 | 8,78 | 9,77 | 11,95 | 13,31 | 17,48 | 25,84 | 51,74 | 9,77 |

**Embalagem:** 1-3 → €0,23 · 6-12 → €0,35. **Processing:** €0,47 (flat).

Regras herdadas: desconto Z6 €20 (cliente paga; só front LU/CH; aplicado **só ao frete**); países fora de zona → custo 0. Upsell = só produto (mesmo pacote; sem frete/taxas).

`getFulfillmentBreakdown(produto, país, isFront, date)` seleciona a versão pela data e retorna `{ product, shipping, packaging, processing, total }`. `total` passa a incluir embalagem+processing → **Valor Líquido e CPA deduzem essas taxas automaticamente a partir de 2025-12-01** (é o "implementar em todo o projeto"). Versão legada tem packaging/processing = 0 → histórico inalterado.

**Fidelidade (audit determinístico):** `product + shipping + packaging + processing` deve bater com a coluna "Total Cost" do PDF, ex.:
`1 frasco z1 = 3,26+8,60+0,23+0,47 = 12,56` · `6 z7 = 19,56+50,33+0,35+0,47 = 70,71` · `9 z6 = 29,34+25,84+0,35+0,47 = 56,00` · `12 z2 = 39,12+9,77+0,35+0,47 = 49,71`.

### Novas métricas (`PeriodMetrics`)
Estende (não duplica): `bottlesSold` (Σ frascos front+upsell, contagem física real), `packagingCost`, `processingCost`, `fulfillmentFees` (=emb+proc, só front), `uniqueShippedOrders` (orderIds distintos entre pagamentos front), `dailyCosts: DailyCostRow[]` (`{date, orders, bottles, productCost, shipping, fulfillmentFees, totalCost}`).

### UI (Dashboard)
4 cards primários (COGS · Potes Vendidos · Frete · Pedidos Únicos) + 2 secundários (Taxas de Fulfillment · Custo Total de Fulfillment, com custo médio/pedido no tooltip) + seção "Custos Operacionais" com tabela diária + linha de totais.

---

## B — Payout Semanal

### Decisões travadas
- **Base:** `earned_amount` (líquido do vendedor).
- **Clearing:** 90% em **D+14**; 10% de reserva em **D+60**.
- **Saque:** toda **sexta-feira**, **sem mínimo, sem taxa** (varre saldo inteiro).
- **Cap 4/mês:** 5ª sexta pulada, rola para a próxima.
- **Validação:** manual (mostra esperado; coluna "Real" editável com Δ).

### Motor `src/lib/payout.ts`
Ledger por eventos. Cada pagamento gera `+90%×earned` em D0+14 e `+10%×earned` em D0+60. Refund/CB gera `+earned` (negativo) na data do estorno. Varredura semanal: `payout(sexta) = Σ eventos em (sexta_anterior, sexta]`. Cap 4/mês pula a 5ª sexta.

Saída: `PayoutWeek { sexta, liberado90, reservaLiberada10, refunds, payoutEsperado, vendasNoCiclo, skipped }` e `PayoutSchedule { weeks[], reservaAindaRetida, emClearing, totalEsperado }`.

Constantes: `RESERVE_PCT=0.10`, `RESERVE_DAYS=60`, `CLEARING_DAYS=14`, `PAYOUT_WEEKDAY=5` (sexta), `MAX_PAYOUTS_PER_MONTH=4`.

### UI — nova aba `Payout`
Rota + item na Sidebar. Cards (Próximo payout · Reserva retida · Em clearing). Tabela: `Sexta | Vendas | 90% | Reserva 10% | Refunds | Esperado | Real ✏️ | Δ`.

### Simplificações declaradas (validar na auditoria)
Refund posta negativo na data do estorno (não cancela retroativamente a liberação de reserva da venda original — diferença só de timing perto da fronteira de 60d). 5ª sexta pulada; feriados não deslocam a sexta (v1).

---

## C — Login + Branding + Header + Dashboard

### Decisões travadas
- **Auth real com Supabase** (projeto dedicado `affiliview`, id `fqhhmxnojtjwbliblyih`). Usuário seed: `admin@gmail.com` / `OG2026@!`. Usuários futuros pelo painel Supabase.
- **PR única A+B+C** para `main`.
- **Desktop-only.**

### Auth
`@supabase/supabase-js`; client em `src/lib/supabase.ts` (env `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`); `AuthContext` + `ProtectedRoute` + `Login` page. Session persistida pelo SDK. Logout na sidebar/header.

### Branding
Favicon gerado do OG GROUP LOGO; logo na tela de login e sidebar; cores do `logica/designsystem.md`; `index.html` title/meta.

### Header (topo)
Relógio ao vivo + countdown para o próximo payout (usa `payout.ts` → próxima sexta e valor esperado).

### Dashboard "command center"
Dados que cruzam toda a app: receita/earnings/valor líquido, COGS+fulfillment (A), próximo payout + reserva retida (B), refund %, distribuição de tiers de afiliados, potes vendidos, top afiliados.

---

## Auditoria (todas as frentes)
1. **Testes determinísticos** (vitest): fidelidade da tabela Tier 2 vs PDF; métricas de custo; ledger de payout (eventos 90/10 nas datas certas, refund, varredura de sexta, skip 5ª sexta).
2. **Reconciliação com dados reais** (`scripts/audit-cogs.ts`, `scripts/audit-payout.ts`): busca transações reais da Digistore, computa e reconcilia (`Total = COGS+Frete+Taxas`; `pedidos únicos = nº front`; payouts semanais esperados). Achados gravados em `logica/auditoria_custos.md` e na seção de auditoria de `logica/payout_semanal.md`.

## Docs `logica/`
Novos: `custos_operacionais.md`, `payout_semanal.md`, `auditoria_custos.md`. Atualizar: `custo_frete.md` (Tier 2 + versionamento), `valor_liquido.md` (taxas ≥ 2025-12-01), `README.md` (índice).

## Fora de escopo (YAGNI)
Peso do pacote recalculado por frascos de upsell (embalagem/frete seguem o tier do front — documentado). Comparação automática de payout (v1 é manual). Mobile/responsivo (desktop-only).

## Ordem de execução
Core lógico (TDD) → auditorias → auth Supabase → UI (branding, header, painéis, dashboard) → docs → verificação (build/lint/test) → PR.
