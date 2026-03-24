# KPI: AOV (Average Order Value — Ticket Médio)

## O que é
O valor médio por pedido frontal. Mede quanto, em média, cada cliente gasta na compra do produto principal (`upsell_no === 0`), excluindo upsells. É uma métrica fundamental para entender o poder de compra do tráfego que cada afiliado traz.

---

## Origem e Extração
- **Fonte**: API Digistore24 — endpoint `listTransactions`
- **Numerador**: `amount` das transações com `transaction_type === "payment"` e `upsell_no === 0` (apenas vendas frontais)
- **Denominador**: Contagem de transações com `transaction_type === "payment"` e `upsell_no === 0`

---

## Fórmula

```
AOV = SUM(amount WHERE payment AND upsell_no === 0) / COUNT(payment WHERE upsell_no === 0)
    = frontGross / frontSales
```

> O AOV usa apenas o gross das vendas frontais (`upsell_no === 0`) — upsells aceitos pelo cliente **não** entram no cálculo. Mede o ticket médio da compra principal.

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

- Numerador e denominador usam apenas transações com `upsell_no === 0` (vendas frontais)
- Refunds e chargebacks **não** entram no cálculo (apenas `transaction_type === "payment"`)
- Inclui os três produtos: **Erectus X**, **Slimjara** e **Memoguard**
- O período filtrado segue horário **UTC** (00:00 até 23:59 UTC)

---

## Exemplo Prático

| Tipo | upsell_no | amount | Entra no AOV? |
|------|-----------|--------|--------------|
| Erectus X - 6 Bottles (payment) | 0 | €150,00 | ✅ Numerador + Denominador |
| Slimjara - 3 frascos (payment, upsell) | 1 | €80,00 | ❌ Excluído |
| Memoguard - 3 frascos (payment) | 0 | €90,00 | ✅ Numerador + Denominador |
| Slimjara - 6 frascos (payment) | 0 | €120,00 | ✅ Numerador + Denominador |
| Refund Erectus X | refund | — | ❌ Excluído (não é payment) |

```
frontGross = €150 + €90 + €120 = €360,00
frontSales = 3
AOV = €360 / 3 = €120,00
```

---

## Onde é Exibido
- Cartão KPI no topo do dashboard
- Por produto na tabela de resumo de produtos
- Por afiliado na tabela de afiliados

---

## Observações
- AOV alto indica preferência por pacotes maiores (mais frascos)
- Um AOV mais baixo pode indicar que o afiliado traz clientes que preferem pacotes menores
- O AOV não é afetado por refunds — apenas conta pedidos realizados (`payment`)
- A identificação via `upsell_no` é mais precisa que a detecção por nome de produto (usada como fallback somente no CSV)

---

## Implementação no Código

**Arquivo**: `src/lib/transactions.ts` — função `computePeriod()`

```typescript
// Front payments = pagamentos com upsell_no === 0
const frontPayments = payTxs.filter((t) => t.upsellNo === 0);
const frontSales    = frontPayments.length;

// AOV = gross das vendas frontais / quantidade de vendas frontais
const frontGross = frontPayments.reduce((s, t) => s + t.grossAmount, 0);
const aov = frontSales > 0 ? frontGross / frontSales : 0;
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

**Exibido em**: `src/pages/Index.tsx` — cartão "AOV" no topo do dashboard, e na tabela de produtos em `ProductSummaryTable`
