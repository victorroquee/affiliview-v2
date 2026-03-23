# Lógica dos KPIs — AffiliView

Documentação completa de como cada KPI principal é extraído da planilha e calculado no sistema. Os arquivos explicam a lógica de negócio sem detalhes técnicos de implementação.

---

## Status de Implementação

Abaixo o progresso de implementação de cada componente lógico documentado nesta pasta.

### ✅ Etapa 1 — Estrutura de Dados e Parsing CSV
- **Arquivo criado**: `src/lib/csvParser.ts`
- Parsing do CSV Digistore24 (delimitador `;`, formato `="valor"`)
- Extração de campos: Date, Time, Order ID, Transaction type, Gross amount, Net amount, Your earnings, Affiliate, Product name, Country
- Conversão de datas para UTC
- Classificação de transações: `isPayment()`, `isRefund()`, `isChargeback()`

### ✅ Etapa 2 — Classificação de Produtos (Produto M vs Upsell)
- **Lógica documentada em**: `vendas.md`
- **Implementado em**: `src/lib/csvParser.ts` → `isUpsellByName()`, `isFrontSale()`
- Regex para identificar upsells pelo nome: `^(up\d|up\(|up |order bump|bump|down\s?\d|down )`
- Produtos M (vendas frontais): Erectus X, Slimjara, Memoguard — em qualquer variação de frascos
- Refunds não reduzem a contagem de vendas

### ✅ Etapa 3 — Custo de Produto
- **Lógica documentada em**: `custo_produto.md`
- **Implementado em**: `src/lib/costTable.ts` → `detectBottles()`, `PRODUCT_COST_PER_BOTTLE`
- Custo fixo: €3,26 por frasco
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
- **Implementado em**: `src/lib/csvParser.ts` → `computePeriod()` (`gross`, `grossBruto`)
- Gross = soma de todos os valores da coluna H (positivos + negativos)
- Gross Bruto = soma apenas dos pagamentos positivos (denominador para AOV e Refund%)

### ✅ Etapa 6 — Earnings
- **Lógica documentada em**: `earnings.md`
- **Implementado em**: `src/lib/csvParser.ts` → `computePeriod()` (`earningsTotal`)
- Earnings = soma de todos os valores de "Your earnings" (positivos + negativos de estornos)

### ✅ Etapa 7 — Valor Líquido (LIA)
- **Lógica documentada em**: `valor_liquido.md`
- **Implementado em**: `src/lib/csvParser.ts` → `computePeriod()` (`valorLiq`) + `getFulfillmentBreakdown()`
- Calculado transação por transação: Earnings[i] − Custo Produto[i] − Custo Frete[i]
- Acumula custos totais de produto e frete para breakdown
- Regra de refund por afiliado: apenas earnings é estornado (fulfillment é sunk cost)

### ✅ Etapa 8 — AOV (Ticket Médio)
- **Lógica documentada em**: `aov.md`
- **Implementado em**: `src/lib/csvParser.ts` → `computePeriod()` (`aov`)
- AOV = Gross Bruto (positivos) / Quantidade de Produtos M
- Numerador inclui upsells, denominador apenas vendas frontais

### ✅ Etapa 9 — Refund % e Chargeback %
- **Lógica documentada em**: `refund_chargeback.md`
- **Implementado em**: `src/lib/csvParser.ts` → `computePeriod()` (`refundPct`, `chargebackPct`)
- Refund+CB% = Soma absoluta de devoluções / Gross Bruto × 100
- Separação de refunds e chargebacks por tipo de transação
- Cancelamento do pedido inteiro (frontal + upsell) já tratado automaticamente pelo Digistore

### ✅ Etapa 10 — CPA (Custo por Aquisição)
- **Lógica documentada em**: `cpa.md`
- **Implementado em**: `src/lib/csvParser.ts` → métricas por afiliado (`cpa`)
- CPA = (Gross − Earnings) / Vendas Frontais

### ✅ Etapa 11 — Margem %
- **Lógica documentada em**: `margem.md`
- **Implementado em**: `src/lib/csvParser.ts` → métricas por afiliado (`margem`)
- Margem = Valor Líquido / Gross × 100
- Cores condicionais: >30% verde, 15-30% neutro, <15% amarelo

### ✅ Etapa 12 — Activated ≥ €2K
- **Lógica documentada em**: `activated_2k.md`
- **Implementado em**: `src/lib/csvParser.ts` → `computePeriod()` (`activated`)
- Contagem de afiliados com Gross ≥ €2.000 no período
- Ignora afiliados sem nome

### ✅ Etapa 13 — Novos Qualificados
- **Lógica documentada em**: `novos_qualificados.md`
- **Implementado em**: `src/lib/csvParser.ts` → `computePeriod()` (`novos`)
- Contagem de afiliados com média diária ≥ €1.000/dia
- Normalização pelo número de dias do período

### ✅ Etapa 14 — Status do Afiliado (Scale / Watch / Probation)
- **Lógica documentada em**: `status_afiliado.md`
- **Implementado em**: `src/lib/csvParser.ts` → `statusFromPct()`
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
| [gross_revenue.md](./gross_revenue.md) | Gross Revenue (Receita Bruta) | Extraído da planilha | Coluna H (Gross Total) — soma incluindo negativos |
| [earnings.md](./earnings.md) | Earnings (Ganhos) | Extraído da planilha | Coluna Earnings — soma incluindo negativos de refunds/CB |
| [valor_liquido.md](./valor_liquido.md) | Valor Líquido (LIA) | Calculado | Earnings − Custo Produto − Custo Frete |
| [aov.md](./aov.md) | AOV (Ticket Médio) | Calculado | Gross positivos / Quantidade de Produtos M |
| [vendas.md](./vendas.md) | Vendas (Sales Count) | Extraído | Contagem de Produtos M na planilha |
| [refund_chargeback.md](./refund_chargeback.md) | Refund % e Chargeback % | Calculado | Soma devoluções / Gross Bruto × 100 |
| [custo_produto.md](./custo_produto.md) | Custo de Produto | Calculado | Frascos detectados × €3,26 |
| [custo_frete.md](./custo_frete.md) | Custo de Frete | Tabela | Tabela por zona geográfica × frascos |
| [cpa.md](./cpa.md) | CPA (Custo por Aquisição) | Calculado | (Gross − Earnings) / Vendas Frontais |
| [margem.md](./margem.md) | Margem % | Calculado | Valor Líquido / Gross × 100 |
| [activated_2k.md](./activated_2k.md) | Activated ≥ €2k | Calculado | Afiliados com Gross ≥ €2.000 no período |
| [novos_qualificados.md](./novos_qualificados.md) | Novos Qualificados | Calculado | Afiliados com média diária ≥ €1.000/dia |
| [status_afiliado.md](./status_afiliado.md) | Status: Scale / Watch / Probation | Derivado | Baseado no Refund+CB % do afiliado |

---

## Fluxo Geral dos Dados

```
Planilha Digistore24 (CSV export)
         │
         ▼
Leitura linha a linha
         │
         ├── Coluna H (Gross Total)
         │    └── Soma de todos os valores (pos. e neg.) → Gross Revenue
         │    └── Soma apenas positivos → Gross Bruto (denominador de Refund%)
         │
         ├── Coluna Earnings
         │    └── Soma de todos os valores (pos. e neg.) → Earnings
         │
         ├── Classificação das linhas
         │    ├── Produto M (frontal) → conta como venda
         │    ├── Upsell/Bump/Down → NÃO conta como venda
         │    └── Refund/Chargeback → entra no numerador de Refund%
         │
         └── Por transação:
              └── Earnings[i] − (frascos × €3,26) − frete[frascos][zona]
                  └── Soma → Valor Líquido
```

---

## Regra Especial: Cancelamento com Upsell

Quando um pedido frontal (produto M) é cancelado via refund ou chargeback, **o upsell vinculado ao mesmo pedido também é cancelado e incluído** nos valores de devolução. O cancelamento é do pedido inteiro, não apenas da linha de venda frontal.

## Regra Especial: Frete Z6

Para pedidos **frontais (produto M)** enviados para Luxemburgo (LU) e Suíça (CH), o cliente paga €20 do frete — o custo real da empresa é o valor da tabela menos €20. Esta regra **não se aplica** a upsells enviados para esses países.
