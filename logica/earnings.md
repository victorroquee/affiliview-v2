# KPI: Earnings (Ganhos)

## O que é
O valor que o produtor (vendedor) efetivamente recebe após o Digistore descontar automaticamente a comissão do afiliado, as taxas e reservas da plataforma, e o IVA/VAT. É o dinheiro que "entra na conta" antes de pagar os custos de fulfillment (produto + frete).

---

## Origem e Extração
- **Fonte**: API Digistore24 — endpoint `listTransactions`
- **Campo utilizado**: `earned_amount` — ganho líquido do produtor por transação
- `earned_amount` é **positivo** para pagamentos e **negativo** para refunds e chargebacks
- Ao somar todos os registros do período (pagamentos + refunds + chargebacks), os negativos já reduzem o total automaticamente

---

## Fórmula

```
Earnings = SUM(earned_amount) para TODOS os tipos de transação
           (pagamentos positivos + refunds/CB negativos)
```

---

## O que está dentro do Earnings

O Digistore calcula automaticamente, para cada transação:

```
earned_amount = amount - affiliate_amount - taxa_digistore - reserva_digistore - IVA/VAT
```

Para refunds e chargebacks, `earned_amount` é o valor estornado de volta (negativo), representando a reversão do que havia sido ganho.

---

## Regras

- A soma inclui vendas frontais (`upsell_no === 0`), upsells (`upsell_no >= 1`) e os três produtos: **Erectus X**, **Slimjara** e **Memoguard**
- Refunds e chargebacks têm `earned_amount` negativo na API e são incluídos na soma (reduzindo o total automaticamente)
- O período filtrado segue horário **UTC**: do início do dia (00:00 UTC) até o fim do dia (23:59 UTC) da janela selecionada

---

## Exemplo Prático

| Tipo | transaction_type | earned_amount (API) |
|------|-----------------|---------------------|
| Venda frontal Erectus X | payment | +€65,00 |
| Upsell Slimjara | payment | +€34,00 |
| Venda frontal Memoguard | payment | +€39,00 |
| Refund Erectus X | refund | -€65,00 |
| Chargeback Slimjara | chargeback | -€34,00 |

```
Earnings = €65 + €34 + €39 + (-€65) + (-€34) = €39,00
```

---

## Relação com Outras Métricas

| Relação | Fórmula |
|---------|---------|
| Diferença Gross vs Earnings | Gross − Earnings = custo afiliado + plataforma + IVA |
| CPA | affiliate_amount / Vendas Frontais (ou Gross − Earnings quando affiliate_amount indisponível) |
| Valor Líquido | Earnings − Custo Produto − Custo Frete |

---

## Onde é Exibido
- Cartão KPI no topo do dashboard
- Detalhamento dentro do componente "Valor Líquido" como ponto de partida

---

## Observações
- Earnings é o **ponto de partida** para o cálculo do Valor Líquido — após este passo, ainda é necessário descontar os custos de fulfillment
- Em períodos com muitos refunds/chargebacks, o Earnings pode ser significativamente menor que o Gross
- O campo `earned_amount` na API Digistore24 equivale ao campo `merchant_amount` — o normalizador usa `earned_amount` com fallback para `merchant_amount`

---

## Implementação no Código

**Arquivo**: `src/utils/digiNormalizer.ts` — normalização do campo `earned_amount`

```typescript
// earned_amount: positivo para pagamentos, NEGATIVO para refunds/CB
const earnedAmount =
  raw["earned_amount"] !== undefined && raw["earned_amount"] !== null && raw["earned_amount"] !== ""
    ? parseMoney(raw["earned_amount"])
    : parseMoney(raw["merchant_amount"]);  // fallback

return {
  // ...
  earnings: earnedAmount,
};
```

**Arquivo**: `src/lib/transactions.ts` — função `computePeriod()`

```typescript
// Earnings = SUM(earned_amount) para todos os tipos (pagamentos + refunds/CB)
const earningsTotal =
  payTxs.reduce((s, t) => s + t.earnings, 0) +
  refCbTxs.reduce((s, t) => s + t.earnings, 0);
```

- `payTxs` — transações com `transaction_type === "payment"` (earnings positivos)
- `refCbTxs` — transações de refund/chargeback (earnings negativos)
- A soma direta de ambos os grupos produz o earnings líquido automaticamente

**Exibido em**: `src/pages/Index.tsx` — cartão "Earnings" no topo do dashboard, e como ponto de partida no breakdown do Valor Líquido
