# KPI: Valor Líquido (LIA)

## O que é
O lucro real por período após descontar todos os custos operacionais de cada venda: o que foi pago pela fabricação dos produtos e pelo envio ao cliente. É a métrica mais próxima do resultado financeiro real da operação.

---

## Fórmula

```
Valor Líquido = SUM(earned_amount para front payments + refunds/CB) − SUM(COGS para front payments)
```

Onde COGS (custo de fulfillment) = custo de produto + custo de frete, calculado por transação frontal:

```
Valor Líquido = frontEarnings + refundEarnings − SUM(product_cost + shipping_cost) para frontPayments
```

> COGS é aplicado **somente** a transações de pagamento frontais (upsell_no=0). Upsells não geram COGS (são digitais). Refunds não geram novo COGS (sunk cost).

---

## Componentes do Cálculo

### 1. Earnings
`SUM(earned_amount)` para todos os tipos de transação (pagamentos positivos + refunds/CB negativos). Ver `earnings.md` para detalhes.

### 2. Custo de Produto
Custo de fabricação dos frascos:
```
Custo Produto = Número de Frascos × €3,26 por frasco
```
O número de frascos é detectado pelo nome do produto (`main_product_name`). Ver `custo_produto.md` para detalhes.

### 3. Custo de Frete
Custo de envio ao cliente, baseado em tabela por zona geográfica (`vat_country`) e quantidade de frascos. Ver `custo_frete.md` para a tabela completa de zonas.

---

## Regra Especial: Desconto de €20 para Zona Z6 (apenas upsell_no === 0)

Para pedidos **frontais (`upsell_no === 0`)** enviados para países da Zona Z6 (Luxemburgo e Suíça), o cliente paga **€20 do frete diretamente**. Por isso, o custo real de frete para a empresa é reduzido:

```
Custo Frete Z6 = valor_da_tabela − €20
(nunca abaixo de €0)
```

**Importante**: Esta dedução de €20 se aplica **somente a produtos M** (`upsell_no === 0`). Upsells enviados para Z6 não recebem esse desconto.

---

## Tratamento de Refunds no Valor Líquido

Quando um refund/chargeback ocorre:
- O `earned_amount` negativo já reduz o Earnings (e portanto o Valor Líquido)
- **Não há recuperação dos custos de fulfillment** — o produto já foi fabricado e enviado (custo afundado/sunk cost)

```typescript
// Pagamentos frontais: liq = earned_amount − fulfillment_cost (apenas upsell_no === 0)
if (t.upsellNo === 0) {
  e.liq += t.earnings - getFulfillmentCost(t.productName, t.country, true);
}

// Refunds/CBs frontais: apenas earned_amount (negativo) — sem recuperar COGS
if (t.upsellNo === 0) {
  e.liq += t.earnings;  // valor negativo (estorno da comissão recebida)
}
```

> **Importante**: O cálculo de `liq` por afiliado aplica COGS **somente a transações frontais** (`upsell_no === 0`), mantendo paralelismo com o `valorLiq` global do dashboard. Upsells são digitais e não geram COGS.

---

## Regras

- COGS calculado apenas para transações de pagamento (`transaction_type === "payment"`)
- O desconto Z6 de €20 se aplica apenas a `upsell_no === 0`
- Inclui os três produtos: **Erectus X**, **Slimjara** e **Memoguard**
- O período filtrado segue horário **UTC** (00:00 até 23:59 UTC)

---

## Exemplo Prático

### Pedido 1 — Erectus X, 6 frascos, Alemanha (Zona Z1, upsell_no=0)

| Item | Valor |
|------|-------|
| earned_amount | €65,00 |
| Custo Produto (6 × €3,26) | -€19,56 |
| Custo Frete (Z1, 6 frascos) | -€9,42 |
| **Valor Líquido deste pedido** | **€36,02** |

### Pedido 2 — Slimjara, 6 frascos, Luxemburgo (Zona Z6, upsell_no=0)

| Item | Valor |
|------|-------|
| earned_amount | €55,00 |
| Custo Produto (6 × €3,26) | -€19,56 |
| Custo Frete tabela Z6 (6 frascos) | -€25,31 |
| Desconto cliente paga €20 (upsell_no=0, Z6) | +€20,00 |
| Custo Frete real para empresa | **-€5,31** |
| **Valor Líquido deste pedido** | **€30,13** |

### Pedido 3 — Memoguard, 3 frascos, Canadá (Zona Z7, upsell_no=0)

| Item | Valor |
|------|-------|
| earned_amount | €39,00 |
| Custo Produto (3 × €3,26) | -€9,78 |
| Custo Frete (Z7, 3 frascos) | -€51,03 |
| **Valor Líquido deste pedido** | **-€21,81** ⚠️ |

---

## Breakdown Exibido no Dashboard

O cartão de Valor Líquido no dashboard mostra o detalhamento:
- Earnings (ponto de partida)
- Menos: Custo de Produto total
- Menos: Custo de Frete total
- **= Valor Líquido final**

---

## Onde é Exibido
- Cartão dedicado com breakdown expansível em `Dashboard.tsx`
- Por afiliado na página de Afiliados (campo `valorLiq`)
- Usado no cálculo da **Margem %**

---

## Implementação no Código

**Arquivo**: `src/lib/transactions.ts` — função `computePeriod()`

```typescript
// COGS acumulado apenas para frontPayments (upsells são digitais, sem COGS)
let productCostTotal = 0;
let shippingCostTotal = 0;
let cogsTotal = 0;
for (const t of frontPayments) {
  const b = getFulfillmentBreakdown(t.productName, t.country, true);
  productCostTotal  += b.product;
  shippingCostTotal += b.shipping;
  cogsTotal         += b.total;
}

// Valor Líquido = front earnings + refund/CB deductions - front COGS
const valorLiq = earningsTotal - cogsTotal;
```

**Arquivo**: `src/lib/costTable.ts` — função `getFulfillmentBreakdown()`

```typescript
export function getFulfillmentBreakdown(
  productName: string,
  countryCode: string,
  isFrontSale = true  // upsell_no === 0 → true; upsell_no >= 1 → false
): FulfillmentBreakdown {
  const cc = resolveCountryCode(countryCode);
  const zone = COUNTRY_ZONE[cc];
  if (!zone) return { product: 0, shipping: 0, total: 0 }; // país não mapeado

  const bottles = detectBottles(productName);
  const closestCount = validCounts.reduce((prev, curr) =>
    Math.abs(curr - bottles) < Math.abs(prev - bottles) ? curr : prev
  );

  const productCost = closestCount * PRODUCT_COST_PER_BOTTLE;
  let shippingCost = SHIPPING_TABLE[closestCount][zone];

  // Desconto Z6: somente em vendas frontais (upsell_no === 0)
  if (isFrontSale && CUSTOMER_SHIPPING_COUNTRIES.has(cc)) {
    shippingCost = Math.max(0, shippingCost - CUSTOMER_SHIPPING_AMOUNT);
  }

  return { product: productCost, shipping: shippingCost, total: productCost + shippingCost };
}
```

**Exibido em**: `src/pages/Dashboard.tsx` — cartão "Valor Líquido" com breakdown expansível, e por afiliado em `src/pages/Affiliates.tsx`
