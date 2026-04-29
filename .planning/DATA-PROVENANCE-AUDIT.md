---
audited: 2026-04-28
status: divergences_found
scope: "Full data provenance audit — Digistore24 API → AffiliView KPIs"
api_version: "1.2"
api_endpoint: "https://www.digistore24.com/api/call/listTransactions"
sample_period: "30 days"
sample_size: 981
findings: 5
critical: 2
---

# Auditoria de Procedência de Dados — Digistore24 vs AffiliView

## 1. Fonte de Dados: API Digistore24

### Endpoint

```
GET /api/call/listTransactions
```

### Parâmetros Usados pelo AffiliView

| Parâmetro | Valor | Notas |
|-----------|-------|-------|
| `from` | `-30d` / `-7d` / `YYYY-MM-DD` | Início do período |
| `to` | `now` / `YYYY-MM-DD` | Fim do período |
| `search[role]` | `vendor` | Apenas transações como vendedor |
| `search[transaction_type]` | `payment,refund,chargeback` | Tipos válidos da API |
| `sort_by` | `date` | Ordenação |
| `sort_order` | `asc` | Crescente |
| `page_size` | `1000` | Max por página |

**IMPORTANTE:** A API aceita APENAS `payment`, `refund`, `chargeback` como `transaction_type`. Tipos como `sale`, `upsell`, `return`, `reversal` resultam em HTTP 400. Upsells vêm como `transaction_type: "payment"` com `upsell_no >= 1`.

### Campos Retornados por Transação (campos financeiros)

| Campo API | Tipo | Descrição | Sinal |
|-----------|------|-----------|-------|
| `amount` | string | Valor bruto original do pedido (VAT incluso). Sempre positivo, mesmo em refunds. Para reembolsos parciais, mostra o valor original completo, não o reembolsado. | Sempre + |
| `transaction_amount` | string | Valor efetivo da transação. Positivo para payments, **negativo** para refunds/CB. Para reembolsos parciais, mostra o valor realmente reembolsado. | +/- (assinado) |
| `vat_amount` | string | Valor do IVA. Positivo para payments, negativo para refunds/CB. | +/- |
| `earned_amount` | string | Ganhos do produtor. Positivo para payments, **negativo** para refunds/CB. Já líquido de comissão de afiliado + taxa Digistore. | +/- (assinado) |
| `merchant_amount` | string | = `earned_amount` (redundante). Fallback quando `earned_amount` ausente. | +/- |
| `affiliate_amount` | string | Comissão paga ao afiliado nesta transação. Negativa em refunds (comissão devolvida). | +/- |
| `upsell_no` | string | `"0"` = pedido frontal, `"1"`+ = upsell/bump na posição do funil. | N/A |
| `transaction_type` | string | `"payment"`, `"refund"`, `"chargeback"` | N/A |
| `transaction_pay_date` | string | `"YYYY-MM-DD"` — data do pagamento | N/A |
| `main_product_name` | string | Nome interno do produto (ex: `"M3 - Slimjara - 6 Bottles"`) | N/A |
| `affiliate_name` | string | Nome do afiliado. Vazio para vendas diretas. | N/A |
| `vat_country` | string | País ISO 2 letras (ex: `"AT"`, `"DE"`) | N/A |
| `currency` | string | Moeda (sempre `"EUR"` neste caso) | N/A |
| `purchase_id` | string | ID único do pedido (agrupa front + upsells) | N/A |

### Summary da API (campo `data.summary`)

A API retorna um summary agregado por moeda:

```json
{
  "amounts": {
    "EUR": {
      "count": 981,
      "total_amount": 189330.53,
      "vat_amount": 11689.87,
      "earned_amount": 47412.13
    }
  }
}
```

**IMPORTANTE:**
- `total_amount` = `SUM(transaction_amount)` — valor assinado (payments - refunds - CB)
- `earned_amount` = `SUM(earned_amount)` — ganhos líquidos (payments + refunds negativos)
- `count` = total de transações (todas os tipos)

---

## 2. Normalização: API → TransactionRow

O arquivo `src/utils/digiNormalizer.ts` converte cada transação da API em `TransactionRow`:

| Campo API | Campo TransactionRow | Transformação |
|-----------|---------------------|---------------|
| `amount` | `grossAmount` | `parseMoney(amount)` — sempre positivo |
| `amount - vat_amount` | `netAmount` | Só para payments (`isPaymentTx ? amount - vat : 0`) |
| `earned_amount` | `earnings` | `parseMoney()` + força negativo se refund e valor positivo |
| `affiliate_amount` | `affiliateAmount` | `parseMoney()` direto |
| `upsell_no` | `upsellNo` | `Number()` — 0 = front, 1+ = upsell |
| `transaction_type` | `transactionType` | `.toLowerCase()` |
| `transaction_pay_date` | `date` | `new Date(YYYY-MM-DDT00:00:00Z)` |
| `main_product_name` | `productName` | String direto |
| `affiliate_name` | `affiliate` | Fallback: `"(direto)"` se vazio |
| `vat_country` | `country` | ISO 2-letter direto |
| `vat_amount` | `vatAmount` | `parseMoney()` direto |

### Classificação de Tipo

```
isPaymentTx = "payment" | "sale" | "upsell"    ← sale/upsell nunca chegam da API
isRefundCbTx = "refund" | "return" | "chargeback" | "reversal"  ← return/reversal nunca chegam
```

**Filtro:** Transações com `transaction_type === "refund_request"` são excluídas na normalização.

---

## 3. Métricas e KPIs — Definição Individual

### 3.1 Gross Revenue (Receita Bruta)

| Atributo | Valor |
|----------|-------|
| **Label na UI** | "Gross Revenue" |
| **Variável** | `gross` / `grossBruto` (`transactions.ts:544-545`) |
| **Fórmula** | `SUM(grossAmount) WHERE transaction_type = 'payment'` (todos os upsell_no) |
| **Campo API fonte** | `amount` |
| **Inclui upsells?** | Sim — front (upsell_no=0) + upsells (upsell_no>=1) |
| **Inclui refunds?** | Não |
| **Tooltip** | "Receita bruta de todos os pagamentos (front + upsells + bumps). Alinhado com Gross Amount do dashboard Digistore24." |

**Divergência potencial vs Digistore:**
- AffiliView usa `amount` (€214,288.64)
- Digistore dashboard pode usar `transaction_amount` (€214,341.00)
- Delta: €52.36 (0.02%) — **insignificante**

---

### 3.2 Earnings (Ganhos do Produtor)

| Atributo | Valor |
|----------|-------|
| **Label na UI** | "Earnings" |
| **Variável** | `earningsKPI` (`transactions.ts:554-556`) |
| **Fórmula** | `SUM(earnings) WHERE payment` + `SUM(earnings) WHERE refund/chargeback` |
| **Campo API fonte** | `earned_amount` (já assinado: + para payments, - para refunds/CB) |
| **Inclui upsells?** | Sim |
| **Inclui refunds?** | Sim (valores negativos, reduzem o total) |
| **Tooltip** | "Ganhos do produtor de todos os pagamentos (front + upsells) menos deducoes de reembolsos e chargebacks." |

**Cross-check vs API Summary:**
- AffiliView: `SUM(earned_amount)` = €47,412.13
- API summary `earned_amount` = €47,412.13
- **MATCH EXATO** ✓

---

### 3.3 Valor Líquido

| Atributo | Valor |
|----------|-------|
| **Label na UI** | "Valor Líquido" |
| **Variável** | `valorLiq` (`transactions.ts:588`) |
| **Fórmula** | `earningsFront - COGS` |
| **earningsFront** | `SUM(earnings) WHERE payment AND upsellNo=0` + `SUM(earnings) WHERE refund/CB AND upsellNo=0` |
| **COGS** | `SUM(productCost + shippingCost) WHERE payment AND upsellNo=0` — tabela de custos interna |
| **Inclui upsells?** | Não — front-only (upsells são digitais, sem custo de fulfillment) |
| **Tooltip** | "Earnings menos o custo de produtos (COGS): preço do produto + frete por transação." |

**Notas:**
- COGS é dados internos, não da API Digistore
- `earningsFront` filtra refunds/CB para `upsellNo === 0` (fix CR-02)
- Não tem equivalente no painel Digistore

---

### 3.4 Ticket Médio (AOV)

| Atributo | Valor |
|----------|-------|
| **Label na UI** | "Ticket Médio (AOV)" |
| **Variável** | `aov` (`transactions.ts:573`) |
| **Fórmula** | `SUM(netAmount WHERE payment) / COUNT(WHERE payment AND upsellNo=0)` |
| **netAmount** | `amount - vat_amount` (só payments) |
| **Numerador** | Total líquido (sem VAT) de TODOS os payments (front + upsells) |
| **Denominador** | Número de pedidos frontais (upsell_no=0) — proxy para pedidos únicos |
| **Tooltip** | "Total líquido sem IVA (front + upsells + bumps) dividido pelo número de pedidos front." |

---

### 3.5 Reembolso + Chargeback (%)

| Atributo | Valor |
|----------|-------|
| **Label na UI** | "Reembolso + Chargeback" |
| **Variável** | `refundCbPct` = `rPct + cPct` (`transactions.ts:548-549, 875`) |
| **Fórmula** | `(SUM(grossAmount WHERE refund) + SUM(grossAmount WHERE chargeback)) / gross × 100` |
| **Campo API fonte** | `amount` — **PROBLEMA: usa valor original, não valor reembolsado** |
| **Threshold** | laranja ≤8%, vermelho >8% |

**DIVERGÊNCIA ENCONTRADA (F-01):**
- Usa campo `amount` que é sempre o valor **original completo** do pedido
- Para reembolsos parciais (25 de 109 = 23%), o `amount` é o valor total, não o reembolsado
- **Exemplo:** Pedido de €294 com reembolso parcial de 30% → `amount=294` mas `transaction_amount=-88.20`
- **Impacto:** Taxa de reembolso superestimada em ~1.9 pontos percentuais (13.0% vs 11.2% correto)

---

### 3.6 Vendas Totais

| Atributo | Valor |
|----------|-------|
| **Label na UI** | "Vendas Totais" |
| **Variável** | `sales` = `frontSales` (`transactions.ts:539, 872`) |
| **Fórmula** | `COUNT(WHERE payment AND upsellNo=0)` |
| **Tooltip** | "Contagem de pagamentos aprovados com upsell_no=0 (pedidos principais/frontais)." |
| **Notas** | Upsells não são contados como vendas separadas |

---

### 3.7 Ativados ≥ €2K

| Atributo | Valor |
|----------|-------|
| **Label na UI** | "Ativados ≥ €2K" |
| **Variável** | `activated` (`transactions.ts:605-607`) |
| **Fórmula** | `COUNT(affiliates WHERE SUM(affiliateAmount) >= 2000)` |
| **Campo API fonte** | `affiliate_amount` — CPA real pago, não estimado |
| **Fallback** | Se `affiliateAmount = 0` para todos, usa `SUM(grossAmount) >= 2000` |

---

### 3.8 Novos Qualificados

| Atributo | Valor |
|----------|-------|
| **Label na UI** | "Novos Qualificados" |
| **Variável** | `novos` (`transactions.ts:622-624`) |
| **Fórmula** | `COUNT(affiliates WHERE SUM(grossAmount)/days >= 1000)` |
| **Notas** | `days` = duração do período em dias; afiliados com média ≥ €1K/dia |

---

### 3.9 Afiliados Ativos / Em Rampa / Inativos

| Atributo | Valor |
|----------|-------|
| **Label na UI** | "Afiliados Ativos" / "Inativos no Período" |
| **Lógica** | `computeAffiliateRankings()` (`transactions.ts:220-274`) |
| **Janela** | Últimos 7 dias de transações |
| **Classificação** | Baseada em `frontSales` (vendas front no período): |

| Ranking | Critério |
|---------|----------|
| Tier 1 | ≥ 30 vendas front / 7 dias |
| Tier 2 | ≥ 20 vendas front / 7 dias |
| Tier 3 | ≥ 10 vendas front / 7 dias |
| Ativo | ≥ 10 vendas front / 7 dias (= Tier 3) |
| Em Rampa | 1-9 vendas front / 7 dias |
| Inativo | 0 vendas front / 7 dias |

---

### 3.10 Métricas por Afiliado (tabela TopAffiliates)

Para cada afiliado, calculado em `transactions.ts:805-862`:

| Métrica | Fórmula | Notas |
|---------|---------|-------|
| `gross` | `SUM(grossAmount) WHERE payment` | Front + upsells |
| `earnings` | `SUM(earnings) WHERE payment + refund/CB` | Assinado |
| `valorLiq` | `SUM(earnings - COGS) WHERE payment + SUM(earnings) WHERE refund/CB` | COGS só em front |
| `sales` | `COUNT WHERE payment AND upsellNo=0` | Só front |
| `refundCbPct` | `(refundAmt + cbAmt) / grossBruto × 100` | **Mesmo problema: usa amount, não transaction_amount** |
| `aov` | `SUM(netAmount) / sales` | Inclui upsells no numerador, front no denominador |
| `cpa` | `affiliateAmt / sales` (ou `(gross - earnings) / sales` fallback) | CPA real |
| `margem` | `valorLiq / gross × 100` | Margem operacional |

---

### 3.11 Performance por Kit (BundlePerformance)

Calculado em `transactions.ts:746-802`, **apenas front (upsell_no=0)**:

| Métrica | Fórmula |
|---------|---------|
| `vendas` | `COUNT WHERE payment AND upsellNo=0` |
| `gross` | `SUM(grossAmount) WHERE payment AND upsellNo=0` |
| `netRevenue` | `gross - refundAmt - cbAmt` |
| `valorLiq` | `SUM(earnings - COGS) WHERE payment` + `SUM(earnings) WHERE refund/CB` |
| `refundPct` | `reembolsos / vendas × 100` — **baseado em contagem, não valor** |

---

### 3.12 Product Summary (ProductSummaryRow)

Calculado em `transactions.ts:681-744`:

| Métrica | Fórmula | Notas |
|---------|---------|-------|
| `grossRevenue` | `SUM(grossAmount) WHERE payment` | Front + upsells do mesmo produto |
| `netRevenue` | `gross - refundAmt - cbAmt` | |
| `earnings` | `SUM(earnings) para todos os tipos` | |
| `aov` | `SUM(netAmount WHERE front) / frontSales` | AOV por produto |
| `returnPct` | `refundAmt / grossBruto × 100` | Baseado em grossBruto front-only |
| `cbPct` | `cbAmt / grossBruto × 100` | |

---

## 4. Divergências Encontradas

### F-01 [CRÍTICO] — Reembolsos parciais superestimam taxa de R+CB

**Causa raiz:** O campo `grossAmount` do `TransactionRow` é mapeado do campo API `amount`, que para reembolsos mostra o **valor original completo do pedido**, não o valor efetivamente reembolsado. Para reembolsos parciais (30-50% do pedido), isso infla significativamente o numerador da taxa de reembolso.

**Dados:**
- 25 de 109 reembolsos (23%) são parciais
- Taxa com `amount`: 13.0%
- Taxa com `|transaction_amount|` (correto): 11.2%
- **Superestimação: 1.9 pontos percentuais**

**Correção sugerida:** Usar `transaction_amount` (negativo, valor assinado) para reembolsos em vez de `amount` no normalizer. O `grossAmount` para refunds deve ser `|transaction_amount|`, não `amount`.

**Impacto:** Afeta `refundPct`, `chargebackPct`, `refundCbPct`, `refundAmt`, `cbAmt`, `netRevenue` de ProductSummary e BundlePerformance, e `refundCbPct` por afiliado.

---

### F-02 [CRÍTICO] — Campo `amount` vs `transaction_amount` para payments

**Causa raiz:** 2 transações de payment têm `amount ≠ transaction_amount` (€261.82 vs €288.00). São ajustes de preço onde o comprador pagou um valor diferente do `amount` registrado.

**Impacto:** Mínimo (€52.36 em €214K, 0.02%) — mas conceitualmente `transaction_amount` é o valor correto cobrado.

---

### F-03 [INFO] — API Summary `total_amount` não é comparável a Gross

O `total_amount` no summary da API = `SUM(transaction_amount)` assinado (pagamentos - reembolsos - chargebacks = €189,330.53). **Não** é o Gross Revenue e **não** é comparável diretamente. É um "net amount" que o painel Digistore pode mostrar como outra métrica.

---

### F-04 [INFO] — Painel Digistore vs AffiliView: mapping provável

| Métrica Digistore | Fórmula provável | AffiliView equivalente | Match? |
|-------------------|-------------------|----------------------|--------|
| **Gross Amount** | `SUM(transaction_amount) WHERE payment` | `gross` = `SUM(amount) WHERE payment` | ~99.98% (€52 diff em €214K) |
| **Your Earnings** | `SUM(earned_amount) ALL` | `earningsKPI` = `SUM(earned_amount) ALL` | **100% MATCH** (€47,412.13) |
| **Net Amount** | `total_amount - vat_amount` | Não exibido diretamente | N/A |
| **Refund Rate** | Possivelmente usa `transaction_amount` | `refundPct` usa `amount` | **Diverge ~1.9pp** |

---

### F-05 [AVISO] — grossAmount para refunds usa `amount` (sempre positivo)

No normalizer (`digiNormalizer.ts:119`):
```ts
const grossAmount = rawAmount;  // = parseMoney(amount) — sempre positivo
```

Para refunds, `grossAmount` = `amount` = valor original do pedido (positivo). Mas `earned_amount` é corretamente negativo. Isso cria inconsistência: `grossAmount` para refund de €294 com reembolso parcial de €88.20 mostra €294 no gross mas -€74.31 nos earnings.

---

## 5. Campos API Não Utilizados pelo AffiliView

Campos retornados pela API mas ignorados que podem ser úteis:

| Campo | Descrição | Potencial uso |
|-------|-----------|---------------|
| `transaction_amount` | Valor efetivo assinado | **Deve** substituir `amount` para refunds/CB |
| `billing_type` | `"single_payment"` / `"subscription"` | Segmentar por modelo de pagamento |
| `billing_status` | `"completed"` / etc | Filtrar pagamentos incompletos |
| `items[].product_name_intern` | Nome interno do produto | Produto mais preciso |
| `items[].total_netto_amount` | Valor líquido por item | Net por item |
| `commission_reason` | Razão da comissão | Debug de earning calculations |
| `users_share` | = `earned_amount` | Redundante, mas útil para cross-check |
| `total_affiliate_amount` | Total CPA do pedido | Verificação |
| `total_merchant_amount` | Total merchant do pedido | Verificação |

---

## 6. Recomendações

### Prioridade Alta

1. **Corrigir refund grossAmount** — Usar `|transaction_amount|` para reembolsos/CB em vez de `amount`. Isso corrige a superestimação de 1.9pp na taxa de reembolso e alinha com o que o Digistore realmente devolveu.

### Prioridade Média

2. **Considerar usar `transaction_amount` globalmente** — Para payments, a diferença é mínima (0.02%), mas conceitualmente é o campo correto para "quanto foi efetivamente cobrado".

### Prioridade Baixa

3. **Adicionar cross-check com API summary** — O `earned_amount` da summary é um sanity check gratuito: se `SUM(earned_amount)` do AffiliView ≠ API summary, algo está errado.

---

## 7. Distribuição das Transações (30 dias)

```
Payments:     867 (758 front + 109 upsell)
Refunds:      109 (84 full + 25 partial)
Chargebacks:    5
Total:        981

Upsell distribution:
  upsell_no=0: 857 (front orders)
  upsell_no=1: 101
  upsell_no=2:  22
  upsell_no=3:   1
```

---

## 8. Inconsistências entre Documentação (`logica/`) e Código

### 8.1 Refund % — documentação diz count-based, código é value-based

**`logica/refund_chargeback.md`** define:
```
Refund % = COUNT(refund) / COUNT(payment) × 100
```

**Código real** (`transactions.ts:548`):
```
rPct = refundAmt / gross × 100  (value-based: € reembolsados / € gross)
```

**Exceção:** BundlePerformance (`transactions.ts:800`) usa count-based: `reembolsos / vendas × 100`

**Resultado:** A documentação está desatualizada. O KPI global é value-based, o por-bundle é count-based.

### 8.2 Affiliate Status — documentação vs thresholds do código

**`logica/status_afiliado.md`** define thresholds como:
- Scale: ≤5%
- Watch: 5-10%
- Probation: >10%

**Código** (`transactions.ts:498-500`):
```ts
return pct > 10 ? "Probation" : pct > 5 ? "Watch" : "Scale";
```

**Match:** ✓ Correto.

### 8.3 Gross Revenue — documentação corrigida na Phase 8

A documentação `logica/gross_revenue.md` foi corrigida na Phase 8 para incluir upsells. Agora está consistente com o código. ✓

### 8.4 Earnings — documentação corrigida na Phase 8

A documentação `logica/earnings.md` foi corrigida na Phase 8 para incluir upsells. Agora está consistente com o código. ✓

---

## 9. Confirmação da API Digistore24 (documentação oficial)

Baseado na pesquisa da documentação oficial:

### Tipos de transação válidos
- `payment` ✓
- `refund` ✓
- `chargeback` ✓
- `refund_request` (filtrado pelo normalizer)

Tipos inválidos que causam HTTP 400: `sale`, `upsell`, `return`, `reversal`

### Distribuição de receita (confirmada pela doc oficial)
```
Gross Amount (buyer pays) → IVA → Margem Digistore (7.9% + $1) → Comissão afiliado → Seu Earnings
```

O `earned_amount` da API = valor final após todas as deduções. Confirmado que é o campo correto para "Your Earnings".

### Dashboard vs API
A documentação oficial nota que:
- Valores do dashboard são **estimativas** — chargebacks, fees, e reembolsos podem alterar valores finais
- Se você gera earnings como vendor E afiliado, o dashboard combina ambos — a API separa por `role`

---

## 10. Cross-Check Final — Dados Reais (30 dias)

| Métrica | AffiliView calcula | API Summary | Match |
|---------|-------------------|-------------|-------|
| Gross Revenue | €214,288.64 (`SUM(amount) WHERE payment`) | N/A (não tem equivalente direto) | — |
| Earnings | €47,412.13 (`SUM(earned_amount) ALL`) | €47,412.13 | **100% MATCH** ✓ |
| Vendas Front | 758 | N/A | — |
| Upsell payments | 109 | N/A | — |
| Refunds | 109 (84 full + 25 partial) | N/A | — |
| Chargebacks | 5 | N/A | — |
| Total transações | 981 | 981 | **MATCH** ✓ |

### Distribuição de upsell_no
```
upsell_no=0: 857 (front orders + refunds/CB)
upsell_no=1: 101 (1st upsell)
upsell_no=2:  22 (2nd upsell)
upsell_no=3:   1 (3rd upsell)
```

### Reembolsos parciais (achado novo)
```
Full refunds:    84 (amount == |transaction_amount|)
Partial refunds: 25 (amount > |transaction_amount|)

Percentuais de reembolso parcial: 30%, 40%, 50% do valor original
Impacto na taxa: 13.0% (atual) vs 11.2% (correto) = +1.9pp superestimação
```

---

## 11. Resumo de Ações

| # | Ação | Prioridade | Impacto |
|---|------|-----------|---------|
| 1 | Usar `\|transaction_amount\|` para refunds/CB no normalizer | **Alta** | Corrige taxa de reembolso (-1.9pp) |
| 2 | Atualizar `logica/refund_chargeback.md` para refletir cálculo value-based | Média | Consistência doc |
| 3 | Considerar `transaction_amount` para payments (price adjustments) | Baixa | €52 em €214K (0.02%) |
| 4 | Adicionar sanity-check com API summary `earned_amount` | Baixa | Detecção precoce de bugs |

---

_Auditor: Claude (data provenance audit)_
_Data: 2026-04-28_
