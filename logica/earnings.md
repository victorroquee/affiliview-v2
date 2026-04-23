# KPI: Earnings (Ganhos)

## O que e

O valor que o produtor (vendedor) efetivamente recebe apos o Digistore descontar automaticamente a comissao do afiliado, as taxas e reservas da plataforma, e o IVA/VAT. Contabiliza apenas pedidos frontais (upsell_no=0) mais estornos de reembolsos/chargebacks. Alinhado com "Your Earnings" do Digistore24.

---

## Origem e Extracao
- **Fonte**: API Digistore24 — endpoint `listTransactions`
- **Campo utilizado**: `earned_amount` — ganho liquido do produtor por transacao
- `earned_amount` e **positivo** para pagamentos e **negativo** para refunds e chargebacks
- Normalizado para lowercase e com sign enforcement para refunds

---

## Formula

```
Earnings = SUM(earned_amount WHERE payment AND upsell_no === 0)
         + SUM(earned_amount WHERE refund/chargeback)
```

- Pagamentos frontais: earned_amount positivo
- Upsells: **nao incluidos** (alinhamento com Digistore)
- Refunds/CB: earned_amount negativo (reduz o total)

---

## O que esta dentro do Earnings

O Digistore calcula automaticamente, para cada transacao:

```
earned_amount = amount - affiliate_amount - taxa_digistore - reserva_digistore - IVA/VAT
```

Para refunds e chargebacks, `earned_amount` e o valor estornado (negativo).

---

## Regras

- Inclui apenas pagamentos frontais (`upsell_no === 0`) — upsells nao inflam este KPI
- Refunds e chargebacks (negativos) sao incluidos na soma, reduzindo o total
- Inclui os tres produtos: **Erectus X**, **Slimjara** e **Memoguard**
- O periodo filtrado segue horario **UTC**

---

## Exemplo Pratico

| Tipo | transaction_type | upsell_no | earned_amount |
|------|-----------------|-----------|---------------|
| Venda frontal Erectus X | payment | 0 | +€65,00 |
| Upsell Slimjara | payment | 1 | +€34,00 |
| Venda frontal Memoguard | payment | 0 | +€39,00 |
| Refund Erectus X | refund | 0 | -€65,00 |

```
Earnings = €65 + €39 + (-€65) = €39,00
(upsell de €34 nao incluido — contabilizado apenas no AOV)
```

---

## Relacao com Outras Metricas

| Relacao | Formula |
|---------|---------|
| Diferenca Gross vs Earnings | Gross - Earnings = custo afiliado + plataforma + IVA |
| Valor Liquido | Earnings - COGS (custo produto + frete) |

---

## Onde e Exibido
- Cartao KPI "Earnings" no topo do dashboard

---

## Implementacao no Codigo

**Arquivo**: `src/utils/digiNormalizer.ts` — normalizacao do `earned_amount`

```typescript
const transactionType = str("transaction_type").toLowerCase();
const isRefundCbTx = transactionType === "refund" || transactionType === "chargeback" || ...;

const rawEarned = raw["earned_amount"] ? parseMoney(raw["earned_amount"]) : parseMoney(raw["merchant_amount"]);
// Garante sign correto para refunds
const earnedAmount = isRefundCbTx && rawEarned > 0 ? -rawEarned : rawEarned;
```

**Arquivo**: `src/lib/transactions.ts` — funcao `computePeriod()`

```typescript
const frontPayments = payTxs.filter((t) => t.upsellNo === 0);

// Earnings = front payments + refund/CB deductions
const earningsTotal =
  frontPayments.reduce((s, t) => s + t.earnings, 0) +
  refCbTxs.reduce((s, t) => s + t.earnings, 0);
```

**Exibido em**: `src/pages/Dashboard.tsx` — cartao "Earnings"
