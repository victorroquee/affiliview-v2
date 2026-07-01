# KPI: Earnings (Ganhos)

## O que e

O valor que o produtor (vendedor) efetivamente recebe apos o Digistore descontar automaticamente a comissao do afiliado, as taxas e reservas da plataforma, e o IVA/VAT. Contabiliza TODOS os pagamentos (front + upsells + bumps) mais estornos de reembolsos/chargebacks. Alinhado com "Your Earnings" do Digistore24 que inclui upsells.

---

## Origem e Extracao
- **Fonte**: API Digistore24 — endpoint `listTransactions`
- **Campo utilizado**: `earned_amount` — ganho liquido do produtor por transacao
- `earned_amount` e **positivo** para pagamentos e **negativo** para refunds e chargebacks
- Normalizado para lowercase e com sign enforcement para refunds

---

## Formula

```
Earnings = SUM(earned_amount WHERE payment — ALL upsell_no values)
         + SUM(earned_amount WHERE refund/chargeback)
```

- Pagamentos (front + upsells + bumps): earned_amount positivo
- Refunds/CB: earned_amount negativo (reduz o total)

> **Nota (Phase 8 correcao):** Anteriormente, Earnings usava apenas pagamentos frontais (upsell_no=0). Corrigido para incluir todos os pagamentos, alinhando com "Your Earnings" do Digistore24 que soma inicial + upsells + subscriptions. A diferenca era de -48.3%.

---

## O que esta dentro do Earnings

O Digistore calcula automaticamente, para cada transacao:

```
earned_amount = amount - affiliate_amount - taxa_digistore - reserva_digistore - IVA/VAT
```

Para refunds e chargebacks, `earned_amount` e o valor estornado (negativo).

---

## Regras

- Inclui TODOS os pagamentos (front + upsells + bumps) — alinhado com Digistore24
- Refunds e chargebacks (negativos) sao incluidos na soma, reduzindo o total
- Inclui todos os produtos: **Slimjara**, **LipoGandha**, **LipoSkin**, **Erectus X**, **MemoGuard**
- O periodo filtrado segue horario **UTC**
- **Valor Liquido** parte do MESMO earningsKPI (todos os pagamentos: front + upsells + refunds/CB) e subtrai o COGS — front: produto + frete; upsell: so produto (mesmo pacote). Ver valor_liquido.md

---

## Exemplo Pratico

| Tipo | transaction_type | upsell_no | earned_amount |
|------|-----------------|-----------|---------------|
| Venda frontal Erectus X | payment | 0 | +€65,00 |
| Upsell Slimjara | payment | 1 | +€34,00 |
| Venda frontal Memoguard | payment | 0 | +€39,00 |
| Refund Erectus X | refund | 0 | -€65,00 |

```
Earnings = €65 + €34 + €39 + (-€65) = €73,00
(upsell de €34 incluido — Phase 8 correcao: ALL payments entram no Earnings)
```

---

## Relacao com Outras Metricas

| Relacao | Formula |
|---------|---------|
| Diferenca Gross vs Earnings | Gross - Earnings = custo afiliado + plataforma + IVA |
| Valor Liquido | Earnings − COGS (produto de front+upsells + frete só de front) |

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
// earningsKPI = ALL payments + refund/CB deductions
const earningsKPI =
  payTxs.reduce((s, t) => s + t.earnings, 0) +
  refCbTxs.reduce((s, t) => s + t.earnings, 0);

// earningsKPI é a base ÚNICA: alimenta o cartão Earnings E o Valor Líquido.
// Valor Líquido = earningsKPI − COGS (front: produto + frete; upsell: só produto).
// Refunds/CB de front E de upsell já estão em refCbTxs, portanto reduzem
// earningsKPI e, consequentemente, o Valor Líquido (fulfillment é sunk cost).
```

**Exibido em**: `src/pages/Dashboard.tsx` — cartao "Earnings"
