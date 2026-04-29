# KPI: Refund % e Chargeback % (Taxa de Devolução e Contestação)

## O que são

- **Refund**: Devolução solicitada pelo cliente diretamente ao produtor/plataforma (reembolso voluntário)
- **Chargeback**: Contestação iniciada pelo cliente junto ao banco/operadora do cartão (dispute bancário)
- **Refund + CB %**: Percentual combinado das duas situações — principal indicador de qualidade de tráfego

---

## Origem e Extração
- **Fonte**: API Digistore24 — endpoint `listTransactions`
- Refunds e chargebacks aparecem como transações separadas com `transaction_type` igual a `"refund"` ou `"chargeback"`
- O campo `earned_amount` dessas transações é **negativo** na API (representa o valor estornado)
- O campo `transaction_amount` é **negativo** e reflete o valor **efetivamente** reembolsado (correto para reembolsos parciais)
- O campo `amount` é sempre **positivo** e mostra o valor **original do pedido** (NÃO o valor reembolsado para parciais)

---

## Fórmula (KPI Global — value-based)

```
Refund %     = SUM(grossAmount WHERE refund) / SUM(grossAmount WHERE payment) × 100
Chargeback % = SUM(grossAmount WHERE chargeback) / SUM(grossAmount WHERE payment) × 100
Refund + CB % = Refund % + Chargeback %
```

> A taxa global é calculada por **valor monetário (value-based)**. O numerador é o gross total reembolsado/contestado; o denominador é o gross total de pagamentos.
>
> Para refunds/CB, `grossAmount` usa o campo `|transaction_amount|` da API (valor efetivamente devolvido), não `amount` (valor original do pedido). Isso garante que reembolsos parciais (30-50% do valor) sejam contabilizados corretamente.

---

## Fórmula (Bundle Performance — count-based)

```
Refund % (por kit) = COUNT(refunds) / COUNT(vendas) × 100
```

> Na tabela de Performance por Kit (Front), a taxa é calculada por **contagem**, não por valor.

---

## Como Identificar Refunds e Chargebacks

| Tipo | transaction_type na API |
|------|------------------------|
| Refund | `"refund"` |
| Chargeback | `"chargeback"` |

> A API Digistore24 aceita apenas `"payment"`, `"refund"`, `"chargeback"` e `"refund_request"` como tipos válidos. Outros tipos (`"sale"`, `"upsell"`, `"return"`, `"reversal"`) causam HTTP 400.
>
> O normalizer reconhece `"return"` e `"reversal"` como refund por compatibilidade, mas a API nunca retorna esses tipos.

---

## Valores Monetários

Para refunds e chargebacks, o `grossAmount` no TransactionRow é:

```
grossAmount = |transaction_amount|   (valor efetivamente devolvido, sempre positivo)
```

Isso é diferente do campo `amount` da API, que para reembolsos parciais mostra o valor original do pedido (não o reembolsado).

**Exemplo de reembolso parcial:**
```
Pedido original: amount = €294.00
Reembolso de 30%: transaction_amount = -€88.20
→ grossAmount no TransactionRow = €88.20 (correto)
→ earned_amount = -€74.31 (impacto nos earnings)
```

---

## Regras

- O denominador (gross) inclui **todos os payments** (front + upsells + bumps)
- Inclui os três produtos: **Erectus X**, **Slimjara** e **Memoguard**
- O período filtrado segue horário **UTC** (00:00 até 23:59 UTC)
- `refund_request` é filtrado antes da normalização e **não entra** no cálculo

---

## Exemplo Prático (value-based)

| Tipo | Gross | Contagem |
|------|-------|----------|
| payment | €10.000 | 40 |
| refund | €800 | 3 |
| chargeback | €200 | 1 |

```
Refund %     = €800 / €10.000 × 100 = 8,0%
Chargeback % = €200 / €10.000 × 100 = 2,0%
Refund + CB % = 10,0%
```

---

## Thresholds de Qualidade (Status do Afiliado)

| Faixa | Status | Ação Recomendada |
|-------|--------|-----------------|
| ≤ 5% | **Scale** (verde) | Aumentar CPA |
| 5% – 10% | **Watch** (amarelo) | Manter vigilância |
| > 10% | **Probation** (vermelho) | Revisar conta |

---

## Diferença entre Refund e Chargeback

| Característica | Refund | Chargeback |
|----------------|--------|------------|
| Iniciado por | Cliente (via produtor/plataforma) | Cliente (via banco/cartão) |
| Impacto financeiro | Devolução do valor | Devolução + possível multa |
| Risco para conta Digistore | Baixo | Alto — pode suspender conta |

---

## Onde é Exibido
- Cartão KPI "Refund + CB" no topo do dashboard (valor combinado, value-based)
- Breakdown separado de Refund % e CB % no tooltip
- Por afiliado na tabela de top afiliados (value-based: gross reembolsado / gross total do afiliado)
- Por kit na tabela BundlePerformance (count-based: contagem refunds / contagem vendas)

---

## Observações
- Um Chargeback % acima de 1-2% já é sinal de alerta crítico para a plataforma Digistore
- Reembolsos parciais (30-50% do valor) são comuns — representam ~23% dos reembolsos no dataset atual
- O uso de `|transaction_amount|` garante que parciais não inflem artificialmente a taxa

---

## Implementação no Código

**Arquivo**: `src/lib/transactions.ts` — função `computePeriod()`

Identificação de refunds e chargebacks:

```typescript
export function isRefund(t: TransactionRow): boolean {
  return ["return", "refund", "reversal"].includes(t.transactionType);
}

export function isChargeback(t: TransactionRow): boolean {
  return t.transactionType === "chargeback";
}
```

Cálculo das taxas (value-based — KPI global):

```typescript
const refundRows = refCbTxs.filter(isRefund);
const cbRows     = refCbTxs.filter(isChargeback);

// grossAmount usa |transaction_amount| para refunds (actual amount refunded)
const refundAmt = refundRows.reduce((s, t) => s + t.grossAmount, 0);
const cbAmt     = cbRows.reduce((s, t)     => s + t.grossAmount, 0);

// Taxas value-based: gross reembolsado / gross total de pagamentos
const rPct = gross > 0 ? (refundAmt / gross) * 100 : 0;
const cPct = gross > 0 ? (cbAmt     / gross) * 100 : 0;
```

Normalização do grossAmount para refunds (actual amount, not original order):

```typescript
// src/utils/digiNormalizer.ts
const grossAmount = isRefundCbTx
  ? Math.abs(rawTransactionAmount || rawAmount)  // |transaction_amount|
  : rawAmount;                                    // amount (original)
```

**Exibido em**: `src/pages/Dashboard.tsx` — cartão "Refund+CB%" e por afiliado em `src/pages/Affiliates.tsx`
