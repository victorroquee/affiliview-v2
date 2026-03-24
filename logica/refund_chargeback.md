# KPI: Refund % e Chargeback % (Taxa de Devolução e Contestação)

## O que são

- **Refund**: Devolução solicitada pelo cliente diretamente ao produtor/plataforma (reembolso voluntário)
- **Chargeback**: Contestação iniciada pelo cliente junto ao banco/operadora do cartão (dispute bancário)
- **Refund + CB %**: Percentual combinado das duas situações em relação ao total de transações de pagamento — principal indicador de qualidade de tráfego de um afiliado

---

## Origem e Extração
- **Fonte**: API Digistore24 — endpoint `listTransactions`
- Refunds e chargebacks aparecem como transações separadas com `transaction_type` igual a `"refund"` ou `"chargeback"`
- O campo `earned_amount` dessas transações é **negativo** na API (representa o valor estornado)

---

## Fórmula

```
Refund %    = (COUNT de transações refund) / (COUNT de transações payment) × 100
Chargeback % = (COUNT de transações chargeback) / (COUNT de transações payment) × 100
Refund + CB % = Refund % + Chargeback %
```

> A taxa é calculada por **contagem de transações**, não por valor monetário. O denominador é o total de registros com `transaction_type === "payment"`.

---

## Como Identificar Refunds e Chargebacks

| Tipo | transaction_type na API |
|------|------------------------|
| Refund | `"refund"` ou `"return"` ou `"reversal"` |
| Chargeback | `"chargeback"` |

> A API Digistore24 utiliza `"refund"` como tipo principal. Os tipos `"return"` e `"reversal"` também são tratados como refund por compatibilidade.

---

## Valores Monetários (para exibição)

Além das taxas percentuais, os **valores absolutos** de devoluções são exibidos para referência:

```
refundAmt = SUM(ABS(earned_amount) WHERE type IN refund/return/reversal)
cbAmt     = SUM(ABS(earned_amount) WHERE type = chargeback)
```

O `earned_amount` é negativo na API para esses tipos — `Math.abs()` converte para valor positivo de exibição.

---

## Regras

- O denominador é a **contagem total de transações payment** no período
- Inclui os três produtos: **Erectus X**, **Slimjara** e **Memoguard**
- O período filtrado segue horário **UTC** (00:00 até 23:59 UTC)
- `refund_request` é filtrado antes da normalização e **não entra** no cálculo

---

## Exemplo Prático

| transaction_type | Contagem | Entra no cálculo |
|-----------------|----------|-----------------|
| payment | 10 | Denominador |
| refund | 1 | Numerador Refund |
| chargeback | 0 | Numerador CB |

```
Refund %     = 1 / 10 × 100 = 10,0%
Chargeback % = 0 / 10 × 100 = 0,0%
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
- Cartão KPI "Refund + CB" no topo do dashboard (valor combinado)
- Breakdown separado de Refund % e CB % abaixo do valor principal
- Por afiliado na tabela de top afiliados e na página de Afiliados

---

## Observações
- Um Chargeback % acima de 1-2% já é sinal de alerta crítico para a plataforma Digistore
- A taxa count-based reflete a proporção de pedidos problemáticos, independente do valor monetário

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

Cálculo das taxas (count-based):

```typescript
const refundRows = refCbTxs.filter(isRefund);
const cbRows     = refCbTxs.filter(isChargeback);
const payCount   = payTxs.length;  // total de transações payment

// Taxas por contagem de transações
const rPct = payCount > 0 ? (refundRows.length / payCount) * 100 : 0;
const cPct = payCount > 0 ? (cbRows.length   / payCount) * 100 : 0;
```

Valores monetários (para exibição):

```typescript
// earned_amount é negativo na API para refunds/CB — Math.abs() para exibição
const refundAmt = refundRows.reduce((s, t) => s + Math.abs(t.earnings), 0);
const cbAmt     = cbRows.reduce((s, t)     => s + Math.abs(t.earnings), 0);
```

Filtro de `refund_request` na normalização (excluído antes de chegar ao cálculo):

```typescript
// src/utils/digiNormalizer.ts
.filter((t) => {
  const type = String(t["transaction_type"] ?? "");
  return type !== "refund_request";  // refund_request é descartado
})
```

**Taxa por afiliado** (tabela de top afiliados — usa valor monetário como denominador para consistência):

```typescript
// Na tabela de afiliados, o denominador é grossBruto (somente pagamentos positivos)
const rcPct = d.grossBruto > 0
  ? ((d.refundAmt + d.cbAmt) / d.grossBruto) * 100
  : 0;
```

**Exibido em**: `src/pages/Index.tsx` — cartão "Refund+CB%" com breakdown separado, e por afiliado em `src/pages/Affiliates.tsx`
