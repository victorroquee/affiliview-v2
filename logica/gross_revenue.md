# KPI: Gross Revenue (Receita Bruta)

## O que e

Receita bruta dos pedidos frontais no periodo selecionado. Representa o valor total pago pelos clientes (incluindo IVA/VAT) em transacoes do tipo `payment` com `upsell_no === 0` (vendas frontais apenas). Alinhado com o gross do dashboard Digistore24.

---

## Origem e Extracao
- **Fonte**: API Digistore24 — endpoint `listTransactions`
- **Campo utilizado**: `amount` — valor bruto pago pelo comprador (inclui VAT)
- **Filtro**: somente transacoes com `transaction_type === "payment"` e `upsell_no === 0`
- Upsells e bumps (upsell_no >= 1) **nao** entram no Gross Revenue — sao contabilizados no AOV
- Refunds e chargebacks **nao** afetam o Gross

---

## Formula

```
Gross Revenue = SUM(amount WHERE payment AND upsell_no === 0)
              = frontPayments.reduce(grossAmount)
```

---

## Diferenca entre `gross` e `grossBruto`

| Campo | Escopo | Uso |
|-------|--------|-----|
| `gross` | Pedidos frontais (upsell_no=0) | KPI display, alinhado com Digistore |
| `grossBruto` | Todos os pagamentos (front + upsells) | AOV, taxas de reembolso internas |

---

## Regras

- Inclui apenas vendas frontais (`upsell_no === 0`)
- Inclui os tres produtos: **Erectus X**, **Slimjara** e **Memoguard**
- Refunds e chargebacks nao reduzem o Gross — seu impacto vai para o Earnings via `earned_amount` negativo
- Upsells e bumps nao inflam este KPI — sao capturados no AOV
- O periodo filtrado segue horario **UTC**

---

## Exemplo Pratico

| Tipo | transaction_type | upsell_no | amount | Entra no Gross? |
|------|-----------------|-----------|--------|-----------------|
| Venda frontal | payment | 0 | €150,00 | Sim |
| Upsell | payment | 1 | €80,00 | Nao (upsell) |
| Venda frontal | payment | 0 | €90,00 | Sim |
| Refund | refund | 0 | €150,00 | Nao (refund) |

```
Gross Revenue = €150 + €90 = €240,00
```

---

## Onde e Exibido
- Cartao KPI "Gross Revenue" no topo do dashboard
- Grafico diario de gross (area chart)

---

## Implementacao no Codigo

**Arquivo**: `src/lib/transactions.ts` — funcao `computePeriod()`

```typescript
const frontPayments = payTxs.filter((t) => t.upsellNo === 0);
const gross = frontPayments.reduce((s, t) => s + t.grossAmount, 0);
// grossBruto mantido como total (front + upsells) para AOV e taxas
const grossBruto = payTxs.reduce((s, t) => s + t.grossAmount, 0);
```

**Exibido em**: `src/pages/Dashboard.tsx` — cartao "Gross Revenue"
