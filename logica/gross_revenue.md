# KPI: Gross Revenue (Receita Bruta)

## O que é
Receita bruta total gerada pelos pagamentos no período selecionado. Representa o valor total pago pelos clientes (incluindo IVA/VAT) em transações do tipo `payment` — vendas frontais (upsell_no = 0) e upsells (upsell_no ≥ 1).

---

## Origem e Extração
- **Fonte**: API Digistore24 — endpoint `listTransactions`
- **Campo utilizado**: `amount` — valor bruto pago pelo comprador (inclui VAT), somente para transações com `transaction_type === "payment"`
- Refunds e chargebacks **não afetam o Gross** — o campo `amount` de refunds/CB é positivo na API mas o normalizador define `grossAmount = 0` para transações que não são `payment`
- O impacto financeiro de devoluções é capturado exclusivamente via `earned_amount` (negativo), refletindo no KPI de **Earnings**

---

## Fórmula

```
Gross Revenue = SUM(amount WHERE transaction_type === "payment")
```

Refunds e chargebacks **não** são subtraídos do Gross. O Gross representa o volume bruto de receita gerada por pagamentos realizados.

---

## Regras

- Inclui vendas frontais (`upsell_no === 0`) e upsells (`upsell_no >= 1`)
- Inclui os três produtos: **Erectus X**, **Slimjara** e **Memoguard**
- Refunds e chargebacks não reduzem o Gross — seu impacto vai para o Earnings via `earned_amount` negativo
- O período filtrado segue horário **UTC**: do início do dia (00:00 UTC) até o fim do dia (23:59 UTC) da janela selecionada

---

## Exemplo Prático

| Tipo | transaction_type | amount (API) | grossAmount (normalizado) |
|------|-----------------|-------------|--------------------------|
| Venda frontal | payment | €150,00 | €150,00 |
| Upsell | payment | €80,00 | €80,00 |
| Venda frontal | payment | €90,00 | €90,00 |
| Refund | refund | €150,00 (positivo na API) | €0,00 (zeroed) |
| Chargeback | chargeback | €80,00 (positivo na API) | €0,00 (zeroed) |

```
Gross Revenue = €150 + €80 + €90 = €320,00
(refund e chargeback não entram no gross)
```

---

## Onde é Exibido
- Cartão KPI principal no topo do dashboard
- Comparativo entre períodos (ex: 7 dias vs 30 dias)

---

## Observações
- O Gross é a métrica de topo de funil — reflete o volume bruto de receita por pagamentos realizados
- Não representa lucro — é necessário deduzir comissões, taxas da plataforma e custos de fulfillment para chegar ao lucro real
- Para análise do impacto de devoluções, ver o KPI **Earnings** (onde `earned_amount` negativo de refunds/CB reduz o total)
- Para análise de lucratividade real, ver o KPI **Valor Líquido**

---

## Implementação no Código

**Arquivo**: `src/utils/digiNormalizer.ts` — normalização do campo `amount`

```typescript
// API field mapping:
// amount → grossAmount (somente para payments; 0 para refunds/CB)
const isPaymentTx = transactionType === "payment";
const grossAmount = isPaymentTx ? rawAmount : 0;
```

**Arquivo**: `src/lib/transactions.ts` — função `computePeriod()`

```typescript
// payTxs = transações com transaction_type === "payment"
const grossBruto = payTxs.reduce((s, t) => s + t.grossAmount, 0);
const gross = grossBruto; // gross === grossBruto (refunds não afetam gross)
```

- `payTxs` — transações filtradas para `transaction_type === "payment"`
- `t.grossAmount` — campo `amount` da API Digistore24 (normalizado para 0 em refunds/CB)
- `gross === grossBruto` — são o mesmo valor; `grossBruto` mantido para compatibilidade com denominadores de AOV e Refund%

**Exibido em**: `src/pages/Index.tsx` — cartão "Gross" no topo do dashboard
