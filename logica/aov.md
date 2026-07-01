# KPI: AOV (Average Order Value — Ticket Medio)

## O que e
O valor medio total por pedido, incluindo o produto principal, upsells e order bumps. Mede quanto, em media, cada cliente gasta no pedido completo (front + upsells + bumps). E uma metrica fundamental para entender o valor real que cada pedido gera.

---

## Origem e Extracao
- **Fonte**: API Digistore24 — endpoint `listTransactions`
- **Numerador**: `amount` de **todas** as transacoes com `transaction_type === "payment"` (front + upsells + bumps)
- **Denominador**: Contagem de transacoes com `transaction_type === "payment"` e `upsell_no === 0` (pedidos unicos)

---

## Formula

```
AOV = SUM(amount WHERE payment) / COUNT(payment WHERE upsell_no === 0)
    = grossTotal / frontSales
```

> O AOV usa o valor bruto com IVA (grossAmount) de todos os pagamentos (front + upsells + bumps) dividido pelo numero de pedidos frontais (unicos). Usa `amount` (grossAmount) para alinhar com o painel interno da Digistore24, que exibe valores com IVA incluso.

---

## O que e upsell_no

O campo `upsell_no` da API Digistore24 indica a posicao do produto no funil:

| upsell_no | Significado |
|-----------|-------------|
| 0 | Produto principal (venda frontal — "front offer") |
| 1 | Primeiro upsell |
| 2 | Segundo upsell |
| >= 1 | Qualquer upsell ou downsell |

---

## Regras

- **Numerador**: usa `grossAmount` (amount, incluso IVA) de todas as transacoes `payment` (front + upsells + bumps)
- **Denominador**: usa apenas transacoes com `upsell_no === 0` (pedidos unicos)
- Refunds e chargebacks **nao** entram no calculo (apenas `transaction_type === "payment"`)
- Inclui todos os produtos: **Erectus X**, **Slimjara**, **Memoguard**, **LipoGandha** e **LipoSkin**
- O periodo filtrado segue horario **UTC** (00:00 ate 23:59 UTC)

---

## Exemplo Pratico

| Tipo | upsell_no | amount | Entra no AOV? |
|------|-----------|--------|--------------|
| Erectus X - 6 Bottles (payment) | 0 | EUR150,00 | Numerador + Denominador |
| Slimjara - 3 frascos (payment, upsell) | 1 | EUR80,00 | Numerador apenas |
| Memoguard - 3 frascos (payment) | 0 | EUR90,00 | Numerador + Denominador |
| Slimjara - 6 frascos (payment) | 0 | EUR120,00 | Numerador + Denominador |
| Refund Erectus X | refund | — | Excluido (nao e payment) |

```
grossTotal = EUR150 + EUR80 + EUR90 + EUR120 = EUR440,00
frontSales = 3
AOV = EUR440 / 3 = EUR146,67
```

---

## Onde e Exibido
- Cartao KPI no topo do dashboard
- Por produto na tabela de resumo de produtos
- Por afiliado na tabela de afiliados

---

## Observacoes
- AOV alto indica preferencia por pacotes maiores e boa taxa de aceitacao de upsells/bumps
- Um AOV mais baixo pode indicar que o afiliado traz clientes que nao aceitam upsells
- O AOV nao e afetado por refunds — apenas conta pedidos realizados (`payment`)
- A identificacao via `upsell_no` e mais precisa que a deteccao por nome de produto (usada como fallback somente no CSV)

---

## Implementacao no Codigo

**Arquivo**: `src/lib/transactions.ts` — funcao `computePeriod()`

```typescript
// Front payments = pagamentos com upsell_no === 0 (pedidos unicos)
const frontPayments = payTxs.filter((t) => t.upsellNo === 0);
const frontSales    = frontPayments.length;

// AOV = gross total com IVA (front + upsells + bumps) / pedidos unicos
const grossTotal = payTxs.reduce((s, t) => s + t.grossAmount, 0);
const aov = frontSales > 0 ? grossTotal / frontSales : 0;
```

**Arquivo**: `src/utils/digiNormalizer.ts` — campo `upsell_no` normalizado

```typescript
// upsell_no: 0 = front offer, 1+ = upsell/downsell position in funnel
const upsellNo = Number(raw["upsell_no"] ?? 0);

return {
  // ...
  upsellNo,
};
```

> Para dados de CSV (fallback), `upsellNo` e inferido pelo nome do produto via `isUpsellByName()`. Para dados da API, usa-se diretamente o campo `upsell_no`.

**Exibido em**: `src/pages/Dashboard.tsx` — cartao "AOV" no topo do dashboard, e na tabela de produtos em `ProductSummaryTable`
