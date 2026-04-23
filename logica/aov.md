# KPI: AOV (Average Order Value — Ticket Médio)

## O que é
O valor médio total por pedido, incluindo o produto principal, upsells e order bumps. Mede quanto, em média, cada cliente gasta no pedido completo (front + upsells + bumps). É uma métrica fundamental para entender o valor real que cada pedido gera.

---

## Origem e Extração
- **Fonte**: API Digistore24 — endpoint `listTransactions`
- **Numerador**: `amount` de **todas** as transações com `transaction_type === "payment"` (front + upsells + bumps)
- **Denominador**: Contagem de transações com `transaction_type === "payment"` e `upsell_no === 0` (pedidos únicos)

---

## Fórmula

```
AOV = SUM((amount − vat_amount) WHERE payment) / COUNT(payment WHERE upsell_no === 0)
    = netTotal / frontSales
```

> O AOV usa o valor líquido sem IVA de todos os pagamentos (front + upsells + bumps) dividido pelo número de pedidos frontais (únicos). Usa `amount − vat_amount` (netAmount) porque o campo `amount` da API inclui IVA, que inflava o AOV vs. a métrica real de negócio.

---

## O que é upsell_no

O campo `upsell_no` da API Digistore24 indica a posição do produto no funil:

| upsell_no | Significado |
|-----------|-------------|
| 0 | Produto principal (venda frontal — "front offer") |
| 1 | Primeiro upsell |
| 2 | Segundo upsell |
| ≥ 1 | Qualquer upsell ou downsell |

---

## Regras

- **Numerador**: usa `netAmount` (amount − vat_amount) de todas as transações `payment` (front + upsells + bumps), excluindo IVA
- **Denominador**: usa apenas transações com `upsell_no === 0` (pedidos únicos)
- Refunds e chargebacks **não** entram no cálculo (apenas `transaction_type === "payment"`)
- Inclui os três produtos: **Erectus X**, **Slimjara** e **Memoguard**
- O período filtrado segue horário **UTC** (00:00 até 23:59 UTC)

---

## Exemplo Prático

| Tipo | upsell_no | amount | Entra no AOV? |
|------|-----------|--------|--------------|
| Erectus X - 6 Bottles (payment) | 0 | €150,00 | ✅ Numerador + Denominador |
| Slimjara - 3 frascos (payment, upsell) | 1 | €80,00 | ✅ Numerador apenas |
| Memoguard - 3 frascos (payment) | 0 | €90,00 | ✅ Numerador + Denominador |
| Slimjara - 6 frascos (payment) | 0 | €120,00 | ✅ Numerador + Denominador |
| Refund Erectus X | refund | — | ❌ Excluído (não é payment) |

```
totalGross = €150 + €80 + €90 + €120 = €440,00
frontSales = 3
AOV = €440 / 3 = €146,67
```

---

## Onde é Exibido
- Cartão KPI no topo do dashboard
- Por produto na tabela de resumo de produtos
- Por afiliado na tabela de afiliados

---

## Observações
- AOV alto indica preferência por pacotes maiores e boa taxa de aceitação de upsells/bumps
- Um AOV mais baixo pode indicar que o afiliado traz clientes que não aceitam upsells
- O AOV não é afetado por refunds — apenas conta pedidos realizados (`payment`)
- A identificação via `upsell_no` é mais precisa que a detecção por nome de produto (usada como fallback somente no CSV)

---

## Implementação no Código

**Arquivo**: `src/lib/transactions.ts` — função `computePeriod()`

```typescript
// Front payments = pagamentos com upsell_no === 0 (pedidos únicos)
const frontPayments = payTxs.filter((t) => t.upsellNo === 0);
const frontSales    = frontPayments.length;

// AOV = net total sem IVA (front + upsells + bumps) / pedidos únicos
const netTotal = payTxs.reduce((s, t) => s + t.netAmount, 0);
const aov = frontSales > 0 ? netTotal / frontSales : 0;
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

> Para dados de CSV (fallback), `upsellNo` é inferido pelo nome do produto via `isUpsellByName()`. Para dados da API, usa-se diretamente o campo `upsell_no`.

**Exibido em**: `src/pages/Dashboard.tsx` — cartão "AOV" no topo do dashboard, e na tabela de produtos em `ProductSummaryTable`
