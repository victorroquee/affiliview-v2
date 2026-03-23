# KPI: Valor Líquido (LIA)

## O que é
O lucro real por período após descontar todos os custos operacionais de cada venda: o que foi pago pela fabricação dos produtos e pelo envio ao cliente. É a métrica mais próxima do resultado financeiro real da operação.

---

## Fórmula

```
Valor Líquido = Earnings - Custo de Produto - Custo de Frete
```

O cálculo é feito **transação por transação** e depois somado:

```
Valor Líquido Total = Σ (Earnings[i] - Custo Fulfillment[i])
```

Onde o custo de fulfillment de cada transação = custo de produto + custo de frete para aquele pedido.

---

## Componentes do Cálculo

### 1. Earnings
Valor recebido pelo produtor após o Digistore descontar comissões e taxas (já incluindo o desconto de refunds/chargebacks). Ver `earnings.md` para detalhes completos.

### 2. Custo de Produto
Custo de fabricação dos frascos:
```
Custo Produto = Número de Frascos × €3,26 por frasco
```
O número de frascos é detectado automaticamente pelo nome do produto. Ver `custo_produto.md` para detalhes.

### 3. Custo de Frete
Custo de envio ao cliente, baseado em tabela por zona geográfica e quantidade de frascos. Ver `custo_frete.md` para a tabela completa de zonas.

---

## Regra Especial: Desconto de €20 para Zona Z6 (apenas Produtos M)

Para pedidos **frontais (produtos M)** enviados para países da Zona Z6 (Luxemburgo e Suíça), o cliente paga **€20 do frete diretamente**. Por isso, o custo real de frete para a empresa é reduzido:

```
Custo Frete Z6 = valor_da_tabela - €20
(nunca abaixo de €0)
```

**Importante**: Esta dedução de €20 se aplica **somente a produtos M** (vendas frontais). Upsells enviados para Z6 não recebem esse desconto.

---

## Regras

- O Valor Líquido é calculado apenas para transações de **pagamento** (positivas) — devoluções já reduzem o Earnings
- A dedução de €20 de frete Z6 se aplica apenas a **produtos M** (vendas frontais)
- Inclui os três produtos: **Erectus X**, **Slimjara** e **Memoguard**
- O período filtrado segue horário **UTC** (00:00 até 23:59 UTC)

---

## Exemplo Prático

### Pedido 1 — Erectus X, 6 frascos, Alemanha (Zona Z1)

| Item | Valor |
|------|-------|
| Earnings da venda | €65,00 |
| Custo Produto (6 × €3,26) | -€19,56 |
| Custo Frete (Z1, 6 frascos) | -€9,42 |
| **Valor Líquido deste pedido** | **€36,02** |

---

### Pedido 2 — Slimjara, 6 frascos, Luxemburgo (Zona Z6, produto M)

| Item | Valor |
|------|-------|
| Earnings da venda | €55,00 |
| Custo Produto (6 × €3,26) | -€19,56 |
| Custo Frete tabela Z6 | -€26,66 |
| Desconto cliente paga €20 (produto M, Z6) | +€20,00 |
| Custo Frete real para empresa | **-€6,66** |
| **Valor Líquido deste pedido** | **€28,78** |

---

### Pedido 3 — Memoguard, 3 frascos, Brasil (Zona Z7)

| Item | Valor |
|------|-------|
| Earnings da venda | €39,00 |
| Custo Produto (3 × €3,26) | -€9,78 |
| Custo Frete (Z7, 3 frascos) | -€52,56 |
| **Valor Líquido deste pedido** | **-€23,34** ⚠️ |

> Pedidos para países de zona Z7 podem resultar em Valor Líquido negativo — o frete consome toda a margem.

---

## Breakdown Exibido no Dashboard

O cartão de Valor Líquido no dashboard mostra o detalhamento:
- Earnings (ponto de partida)
- Menos: Custo de Produto total
- Menos: Custo de Frete total
- **= Valor Líquido final**

---

## Onde é Exibido
- Cartão dedicado com breakdown expansível em `Index.tsx`
- Por afiliado na página de Afiliados (campo `lucroLiq`)
- Usado no cálculo da **Margem %**

---

## Observações
- Esta é a métrica mais importante de lucratividade — mais relevante que Gross ou Earnings isolados
- Afiliados com alto Gross mas que atraem clientes de países Z7 (frete elevado) podem ter Valor Líquido muito baixo
- Afiliados que vendem principalmente pacotes de 1-2 frascos têm custo de produto menor, mas o frete por frasco fica mais caro proporcionalmente
- Memoguard segue as mesmas regras de cálculo dos outros produtos

---

## Implementação no Código

**Arquivo**: `src/lib/csvParser.ts` — função `computePeriod()`

```typescript
// Valor Líquido calculado transação por transação, somando tudo
let productCost = 0, shippingCost = 0;

const valorLiq = payTxs.reduce((s, t) => {
  const front = isFrontSale(t);  // true = produto M, false = upsell
  const b = getFulfillmentBreakdown(t.productName, t.country, front);
  productCost  += b.product;   // acumula custo de produto total
  shippingCost += b.shipping;  // acumula custo de frete total
  return s + (t.earnings - b.total);  // earnings - (produto + frete)
}, 0);
```

**Arquivo**: `src/lib/costTable.ts` — função `getFulfillmentBreakdown()`

```typescript
export function getFulfillmentBreakdown(
  productName: string,
  countryCode: string,
  isFrontSale = true  // Z6 €20 desconto apenas em vendas M
): FulfillmentBreakdown {
  const cc = resolveCountryCode(countryCode);
  const zone = COUNTRY_ZONE[cc];
  if (!zone) return { product: 0, shipping: 0, total: 0 };

  const bottles = detectBottles(productName);
  // Aproxima para o tamanho de pacote mais próximo na tabela
  const closestCount = validCounts.reduce((prev, curr) =>
    Math.abs(curr - bottles) < Math.abs(prev - bottles) ? curr : prev
  );

  const productCost = closestCount * PRODUCT_COST_PER_BOTTLE; // bottles × €3,26
  let shippingCost = SHIPPING_TABLE[closestCount][zone];

  // Desconto Z6: somente em vendas frontais (produtos M)
  if (isFrontSale && CUSTOMER_SHIPPING_COUNTRIES.has(cc)) {
    shippingCost = Math.max(0, shippingCost - CUSTOMER_SHIPPING_AMOUNT); // - €20
  }

  return { product: productCost, shipping: shippingCost, total: productCost + shippingCost };
}
```

- `CUSTOMER_SHIPPING_COUNTRIES = new Set(["LU", "CH"])` — apenas Luxemburgo e Suíça
- `CUSTOMER_SHIPPING_AMOUNT = 20` — desconto fixo de €20

**Ajuste de Refund/CB no Valor Líquido por afiliado** (`buildAffDetail`):

```typescript
// Pagamentos: liq = earnings - fulfillmentCost
e.liq += t.earnings - getFulfillmentCost(t.productName, t.country, front);

// Refunds/CBs: apenas earnings (negativo) — sem recuperação de custos de fulfillment
// (produto já foi fabricado e enviado — custo é sunk)
e.liq += t.earnings;  // valor negativo (estorno da comissão recebida)
```

O custo de fulfillment original (produto + frete) já foi pago e não é devolvido no refund. Apenas o earnings é estornado.

**Exibido em**: `src/pages/Index.tsx` — cartão "Valor Líquido" com breakdown expansível (Earnings, Custo Produto, Custo Frete), e por afiliado em `src/pages/Affiliates.tsx` (campo `lucroLiq`)
