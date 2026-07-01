# Lógica dos KPIs — AffiliView

Documentação completa de como cada KPI é extraído da API Digistore24 e calculado no sistema. Os arquivos explicam a lógica de negócio e mapeiam para o código fonte.

---

## Status de Implementação

Abaixo o progresso de implementação de cada componente lógico documentado nesta pasta.

### ✅ Etapa 1 — Estrutura de Dados e API Digistore24
- **Arquivo criado**: `src/lib/transactions.ts`
- Dados via API Digistore24 (endpoint `listTransactions`)
- Proxy serverless: `api/digistore.ts` (Vercel)
- Normalizacao: `src/utils/digiNormalizer.ts` — transactionType lowercase, sign enforcement para refunds
- Classificacao de transacoes: `isPayment()` (whitelist strict), `isRefund()`, `isChargeback()`

### ✅ Etapa 2 — Classificação de Produtos (Produto M vs Upsell)
- **Lógica documentada em**: `vendas.md`
- **Implementado em**: `src/lib/transactions.ts` → `isUpsellByName()`, `isFrontSale()`
- Regex para identificar upsells pelo nome: `^(up\d|up\(|up |order bump|bump|down\s?\d|down )`
- Produtos M (vendas frontais): Erectus X, Slimjara, Memoguard — em qualquer variação de frascos
- Refunds não reduzem a contagem de vendas

### ✅ Etapa 3 — Custo de Produto
- **Lógica documentada em**: `custo_produto.md`
- **Implementado em**: `src/lib/costTable.ts` → `detectBottles()`, `PRODUCT_COSTS`, `getProductCostPerBottle()`
- Custo por frasco **por produto** (`PRODUCT_COSTS`): slimjara €3,26, lipoGandha €3,26, liposkin €3,64, erectus €3,24, memoguard €3,26 (default €3,26)
- Detecção de frascos pelo nome do produto (3 tentativas: keyword → fallback números → default 1)
- Aproximação para tamanho válido mais próximo (1, 2, 3, 6, 9, 12)

### ✅ Etapa 4 — Custo de Frete
- **Lógica documentada em**: `custo_frete.md`
- **Implementado em**: `src/lib/costTable.ts` → `SHIPPING_TABLE`, `COUNTRY_ZONE`, `resolveCountryCode()`
- Tabela completa de 8 zonas (Z1–Z7 + UK) × 6 quantidades de frascos
- Mapeamento de ~40 países para suas respectivas zonas
- Resolução de país por código ISO ou nome completo (PT, EN, DE)
- Regra Z6: desconto de €20 no frete para LU e CH (apenas produtos M)

### ✅ Etapa 5 — Gross Revenue
- **Lógica documentada em**: `gross_revenue.md`
- **Implementado em**: `src/lib/transactions.ts` → `computePeriod()` (`gross`, `grossBruto`)
- `gross` = soma de pagamentos frontais (upsell_no=0) — alinhado com Digistore
- `grossBruto` = soma de TODOS os pagamentos (front + upsells) — usado para AOV e taxas

### ✅ Etapa 6 — Earnings
- **Lógica documentada em**: `earnings.md`
- **Implementado em**: `src/lib/transactions.ts` → `computePeriod()` (`earningsKPI`)
- Earnings = earned_amount de TODOS os pagamentos (front + upsells + bumps) + estornos de refunds/CB
- Alinhado com "Your Earnings" do Digistore24

### ✅ Etapa 7 — Valor Líquido (LIA)
- **Lógica documentada em**: `valor_liquido.md`
- **Implementado em**: `src/lib/transactions.ts` → `computePeriod()` (`valorLiq`) + `getFulfillmentBreakdown()`
- Front: earnings − (produto + frete, com desconto Z6). Upsell: earnings − custo de produto (`detectBottles` × custo/frasco, **sem** frete)
- Acumula custos totais de produto (front + upsells) e frete (só front) para breakdown
- Refunds/CB de front **e** upsell reduzem o Valor Líquido (apenas earnings é estornado; fulfillment é sunk cost)

### ✅ Etapa 8 — AOV (Ticket Médio)
- **Lógica documentada em**: `aov.md`
- **Implementado em**: `src/lib/transactions.ts` → `computePeriod()` (`aov`)
- AOV = net total sem IVA (front + upsells + bumps) / pedidos frontais
- Usa `netAmount` (amount - vat_amount) para excluir IVA

### ✅ Etapa 9 — Refund % e Chargeback %
- **Lógica documentada em**: `refund_chargeback.md`
- **Implementado em**: `src/lib/transactions.ts` → `computePeriod()` (`refundPct`, `chargebackPct`)
- Refund+CB% = Soma absoluta de devoluções / Gross Bruto × 100
- Separação de refunds e chargebacks por tipo de transação
- Cancelamento do pedido inteiro (frontal + upsell) já tratado automaticamente pelo Digistore

### ✅ Etapa 10 — CPA (Custo por Aquisição)
- **Lógica documentada em**: `cpa.md`
- **Implementado em**: `src/lib/transactions.ts` → métricas por afiliado (`cpa`)
- CPA = (Gross − Earnings) / Vendas Frontais

### ✅ Etapa 11 — Margem %
- **Lógica documentada em**: `margem.md`
- **Implementado em**: `src/lib/transactions.ts` → métricas por afiliado (`margem`)
- Margem = Valor Líquido / Gross × 100
- Cores condicionais: >30% verde, 15-30% neutro, <15% amarelo

### ✅ Etapa 12 — Activated ≥ €2K
- **Lógica documentada em**: `activated_2k.md`
- **Implementado em**: `src/lib/transactions.ts` → `computePeriod()` (`activated`)
- Contagem de afiliados com Gross ≥ €2.000 no período
- Ignora afiliados sem nome

### ✅ Etapa 13 — Novos Qualificados
- **Lógica documentada em**: `novos_qualificados.md`
- **Implementado em**: `src/lib/transactions.ts` → `computePeriod()` (`novos`)
- Contagem de afiliados com média diária ≥ €1.000/dia
- Normalização pelo número de dias do período

### ✅ Etapa 14 — Status do Afiliado (Scale / Watch / Probation)
- **Lógica documentada em**: `status_afiliado.md`
- **Implementado em**: `src/lib/transactions.ts` → `statusFromPct()`
- Scale (≤5%) → verde → aumentar CPA
- Watch (5-10%) → amarelo → monitorar
- Probation (>10%) → vermelho → revisar conta
- Valor float sem Math.round() para evitar erros em limites

### ✅ Etapa 15 — Dashboard Visual
- **Implementado em**: `src/pages/Dashboard.tsx`, `src/components/`
- Tema dark matching screenshot de referência
- 8 cartões KPI no topo
- Scorecard operacional (afiliados + refund por produto)
- Gráfico de evolução diária de Gross (area chart)
- Gráfico de mix por produto (donut chart)
- Tabela de resumo por produto
- Tabela de performance por bundle/upsell
- Filtro de período (7d, 14d, 30d, Tudo)
- Filtro de produto (Todos, Slimjara, Erectus X, Memoguard)

### ✅ Etapa 16 — Página de Afiliados
- **Implementado em**: `src/pages/Affiliates.tsx`
- Tabela com top 15 afiliados por Gross
- Colunas: Gross, Earnings, Valor Líq, Vendas, AOV, CPA, Margem, Refund+CB%, Status
- Badge colorido de status (Scale/Watch/Probation)
- Cores condicionais por threshold

---

## Regras Globais do Sistema

### Período de dias — Horário UTC
Todos os períodos de filtragem (7d, 14d, 30d, customizado) usam o horário **UTC** como referência:
- Início do dia: **00:00 UTC**
- Fim do dia: **23:59 UTC**

### Produtos suportados
O sistema contempla três produtos:
- **Erectus X**
- **Slimjara**
- **Memoguard** _(adicionado — pode ainda não aparecer na interface atual)_

### Produtos M vs. Upsells
- **Produto M** = venda frontal (produto principal do funil)
- **Upsell / Downsell / Order Bump** = venda adicional ao mesmo cliente, identificada pelo nome do produto

---

## Índice de KPIs

| Arquivo | KPI | Tipo | Fonte |
|---------|-----|------|-------|
| [gross_revenue.md](./gross_revenue.md) | Gross Revenue (Receita Bruta) | API | Soma grossAmount de pagamentos frontais (upsell_no=0) |
| [earnings.md](./earnings.md) | Earnings (Ganhos) | API | earned_amount de TODOS os pagamentos + estornos refunds/CB |
| [valor_liquido.md](./valor_liquido.md) | Valor Líquido (LIA) | Calculado | Earnings (todos pagamentos + refunds/CB) − COGS (front: produto+frete c/ Z6; upsell: só produto) |
| [aov.md](./aov.md) | AOV (Ticket Médio) | Calculado | Net total (sem IVA) / Pedidos frontais |
| [vendas.md](./vendas.md) | Vendas (Sales Count) | API | Contagem de payments com upsell_no=0 |
| [refund_chargeback.md](./refund_chargeback.md) | Refund % e Chargeback % | Calculado | Soma devoluções / Gross Bruto × 100 |
| [custo_produto.md](./custo_produto.md) | Custo de Produto | Calculado | Frascos detectados × custo/frasco do produto (`PRODUCT_COSTS`) |
| [custo_frete.md](./custo_frete.md) | Custo de Frete | Tabela | Tabela por zona geográfica × frascos |
| [cpa.md](./cpa.md) | CPA (Custo por Aquisição) | Calculado | (Gross − Earnings) / Vendas Frontais |
| [margem.md](./margem.md) | Margem % | Calculado | Valor Líquido / Gross × 100 |
| [activated_2k.md](./activated_2k.md) | Activated ≥ €2k | Calculado | Afiliados com Gross ≥ €2.000 no período |
| [novos_qualificados.md](./novos_qualificados.md) | Novos Qualificados | Calculado | Afiliados com média diária ≥ €1.000/dia |
| [status_afiliado.md](./status_afiliado.md) | Status: Scale / Watch / Probation | Derivado | Baseado no Refund+CB % do afiliado |

---

## Fluxo Geral dos Dados

```
API Digistore24 (listTransactions)
         │
         ▼
digiNormalizer.ts (normaliza campos, lowercase type, sign enforcement)
         │
         ▼
transactions.ts → computePeriod()
         │
         ├── frontPayments (upsell_no === 0)
         │    └── Soma grossAmount → Gross Revenue (KPI)
         │    └── Soma earnings → Earnings base
         │
         ├── payTxs (todos os pagamentos)
         │    └── Soma grossAmount → grossBruto (para AOV e taxas)
         │    └── Soma netAmount → AOV numerador (sem IVA)
         │
         ├── refCbTxs (refunds + chargebacks)
         │    └── Soma earnings (negativos) → reduz Earnings
         │    └── Soma grossAmount → numerador de Refund%
         │
         └── payTxs (front + upsells) por transacao:
              └── front  → earnings − (frascos × custo/frasco + frete[frascos][zona])
              └── upsell → earnings − (frascos × custo/frasco)          [sem frete]
              └── refCbTxs (front e upsell) → reduzem o total
                  └── Soma → Valor Liquido (earningsKPI − COGS)
```

---

## Regra Especial: Cancelamento com Upsell

Quando um pedido frontal (produto M) é cancelado via refund ou chargeback, **o upsell vinculado ao mesmo pedido também é cancelado e incluído** nos valores de devolução. O cancelamento é do pedido inteiro, não apenas da linha de venda frontal.

## Regra Especial: Frete Z6

Para pedidos **frontais (produto M)** enviados para Luxemburgo (LU) e Suíça (CH), o cliente paga €20 do frete — o custo real da empresa é o valor da tabela menos €20. Esta regra **não se aplica** a upsells enviados para esses países.
