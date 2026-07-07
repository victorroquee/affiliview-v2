# KPI: Valor Líquido (LIA)

## O que é
O lucro real por período após descontar todos os custos operacionais de cada venda: o que foi pago pela fabricação dos produtos e pelo envio ao cliente. É a métrica mais próxima do resultado financeiro real da operação.

---

## Fórmula

```
Valor Líquido = earningsKPI − COGS(front) − COGS(upsells) − Custo de Capital
```

Onde:
- **earningsKPI** = SUM(earned_amount) de TODOS os pagamentos (front + upsells) + refunds/CB (negativos)
- **COGS front** = custo de produto + custo de envio (por transação frontal)
- **COGS upsell** = custo de produto apenas (upsells são enviados no mesmo pacote, sem envio extra)
- **Custo de Capital** = gross × 0,10 × (60/365) × 0,20 por pagamento (§ Custo de Capital abaixo)

> Upsells são garrafas adicionais enviadas junto com o pedido frontal. Geram custo de produto mas **não** custo de envio adicional. Refunds não geram novo COGS (sunk cost).

---

## Componentes do Cálculo

### 1. Earnings
`SUM(earned_amount)` para todos os tipos de transação (pagamentos positivos + refunds/CB negativos). Ver `earnings.md` para detalhes.

### 2. Custo de Produto
Custo de fabricação dos frascos:
```
Custo Produto = Número de Frascos × custo/frasco do produto
```
O número de frascos é detectado pelo nome do produto (`main_product_name`). Ver `custo_produto.md` para detalhes.

Aplica-se a **todos os pagamentos** (front e upsells).

### 3. Custo de Frete
Custo de envio ao cliente, baseado em tabela por zona geográfica (`vat_country`) e quantidade de frascos. Ver `custo_frete.md` para a tabela completa de zonas.

Aplica-se **somente a pagamentos frontais** (`upsell_no === 0`). Upsells vão no mesmo pacote.

> **Tier 2 (a partir de 2025-12-01):** além do frete, o Valor Líquido passa a deduzir também as **taxas de embalagem + processing** (€0,23/€0,35 + €0,47), embutidas no `total` retornado por `getFulfillmentBreakdown()` — expostas em `PeriodMetrics` como `fulfillmentFees` (= `packagingCost + processingCost`). Aplicam-se **somente a fronts**. Transações até 2025-11-30 (versão legada) não têm essas taxas. Ver `custos_operacionais.md` e `custo_frete.md`.

### 4. Custo de Capital + Provisão
A Digistore retém **10% do gross por 60 dias** (reserva). O custo de oportunidade + provisão contra chargebacks é estimado em **20% a.a.** sobre essa reserva:
```
Custo de Capital = grossAmount × 0,10 × (60/365) × 0,20  ≈ 0,329% do gross
```
- Aplica-se a **todos os pagamentos** (front e upsells)
- Refunds/CB **não geram nem revertem** capital (o custo do dinheiro parado já ocorreu)
- Constante: `CAPITAL_COST_FACTOR` em `costTable.ts`
- Impacto: ~€0,97 numa venda de €294

---

## Regra Especial: Desconto de €20 para Zona Z6 (apenas upsell_no === 0)

Para pedidos **frontais (`upsell_no === 0`)** enviados para países da Zona Z6 (Luxemburgo e Suíça), o cliente paga **€20 do frete diretamente**. Por isso, o custo real de frete para a empresa é reduzido:

```
Custo Frete Z6 = valor_da_tabela − €20
(nunca abaixo de €0)
```

**Importante**: Esta dedução de €20 se aplica **somente a produtos M** (`upsell_no === 0`).

---

## Tratamento de Refunds no Valor Líquido

Quando um refund/chargeback ocorre:
- O `earned_amount` negativo já reduz o Earnings (e portanto o Valor Líquido)
- **Não há recuperação dos custos de fulfillment** — o produto já foi fabricado e enviado (custo afundado/sunk cost)
- Refunds de front **e** upsells reduzem o Valor Líquido

```typescript
// Pagamentos frontais: liq = earned_amount − fulfillment completo (produto + envio)
if (t.upsellNo === 0) {
  e.liq += t.earnings - getFulfillmentCost(t.productName, t.country, true);
} else {
  // Upsell: earnings − custo de produto apenas (enviado no mesmo pacote)
  const bottles = detectBottles(t.productName);
  e.liq += t.earnings - (bottles * getProductCostPerBottle(t.productName));
}

// Refunds/CBs: earned_amount negativo — sem recuperar COGS
e.liq += t.earnings;  // valor negativo (estorno)
```

---

## Regras

- COGS calculado para **todos** os pagamentos (front: produto + envio; upsell: só produto)
- O desconto Z6 de €20 se aplica apenas a `upsell_no === 0`
- Inclui todos os produtos: **Erectus X**, **Slimjara**, **Memoguard**, **LipoGandha**, **LipoSkin**
- O período filtrado segue horário **UTC** (00:00 até 23:59 UTC)

---

## Exemplo Prático

### Pedido 1 — Erectus X, 6 frascos, Alemanha (Zona Z1, upsell_no=0) + Upsell 3 frascos

| Item | Valor |
|------|-------|
| earned_amount front | €65,00 |
| Custo Produto front (6 × €3,24) | -€19,44 |
| Custo Frete front (Z1, 6 frascos) | -€9,42 |
| earned_amount upsell | €25,00 |
| Custo Produto upsell (3 × €3,24) | -€9,72 |
| Custo Frete upsell | €0,00 (mesmo pacote) |
| **Valor Líquido deste pedido** | **€51,42** |

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
| Custo Frete (Z7, 3 frascos) | -€40,96 |
| **Valor Líquido deste pedido** | **-€11,74** ⚠️ |

---

## Detalhamento do Valor Líquido

O `computePeriod()` acumula e retorna as parcelas do cálculo (campos `productCost`, `shippingCost` e `capitalCost` em `PeriodMetrics`):
- Earnings (ponto de partida — `earningsKPI`)
- Menos: Custo de Produto total (front + upsells)
- Menos: Custo de Frete total (apenas front)
- Menos: Custo de Capital + provisão (todos os pagamentos)
- **= Valor Líquido final**

> Reconciliação: `valorLiq = earnings − productCost − shippingCost − fulfillmentFees − capitalCost` (o `fulfillmentFees` — embalagem + processing — só é não-nulo a partir de 2025-12-01, versão Tier 2).
> ⚠️ Hoje o cartão "Valor Líquido" no Dashboard exibe apenas o **valor final + tooltip** (`KPICard`). O breakdown parcela-a-parcela ainda **não** é renderizado na UI — os campos `productCost`/`shippingCost` estão disponíveis para quando ele for construído.

---

## Onde é Exibido
- Cartão KPI "Valor Líquido" (valor + tooltip) em `Dashboard.tsx`
- Por afiliado na página de Afiliados (campo `valorLiq`) e no `AffiliateDrawer`
- Por kit na tabela "Performance por Kit" (`ProductTable`) — três colunas: **Front** (só vendas frontais), **Upsells** (atribuídos ao kit via `orderId`) e **Total** (mergeado). Ver seção "Valor Líquido por kit" abaixo
- Usado no cálculo da **Margem %**

---

## Valor Líquido por kit (tabela "Performance por Kit")

A tabela de kits (`ProductTable`, alimentada por `bundlePerformance` em `computePeriod()`) exibe **três** métricas de Valor Líquido por SKU de kit front (M1/M2/M3):

- **Valor Líq. (Front)** — só das vendas frontais (`upsell_no === 0`) do kit: `earnings − COGS(produto + frete)`. Não inclui upsells.
- **Valor Líq. (Upsells)** — lucro líquido dos upsells do **mesmo pedido**, atribuído via `orderId` (= `purchase_id`; upsells 1-click compartilham o `purchase_id` do front): `earnings do upsell − custo de produto` (sem frete). Refunds/CB de upsell reduzem.
- **Valor Líq. (Total)** — Front + Upsells mergeado — o lucro real do kit.

Upsells cujo pedido frontal não está no período (ou cujo SKU front não é reconhecido, ou sem `orderId`) caem em `bundleUpsellUnattributed`, exibido como nota abaixo da tabela e **já incluído no card global**.

**Reconciliação:** `SUM(Total por kit) + bundleUpsellUnattributed` reconcilia com o `valorLiq` global, exceto pelos pagamentos/reembolsos **frontais de produtos não reconhecidos** por `getProductBase()` (fora dos 5 produtos) — que entram no global mas não na tabela por kit. Como `getProductBase()` cobre os 5 produtos, na prática o gap é ~€0.

---

## Implementação no Código

**Arquivo**: `src/lib/transactions.ts` — função `computePeriod()`

```typescript
// Front: fulfillment completo (produto + envio)
for (const t of frontPayments) {
  const b = getFulfillmentBreakdown(t.productName, t.country, true);
  productCostTotal  += b.product;
  shippingCostTotal += b.shipping;
  cogsTotal         += b.total;
}
// Upsells: custo de produto apenas (garrafas enviadas no mesmo pacote)
const upsellPayments = payTxs.filter((t) => t.upsellNo > 0);
for (const t of upsellPayments) {
  const bottles = detectBottles(t.productName);
  const pCost = bottles * getProductCostPerBottle(t.productName);
  productCostTotal += pCost;
  cogsTotal        += pCost;
}
// Custo de capital + provisão (§8.1) sobre o gross de todos os pagamentos
const capitalCostTotal = grossBruto * CAPITAL_COST_FACTOR;
const valorLiq = earningsKPI - cogsTotal - capitalCostTotal;
```

**Arquivo**: `src/lib/costTable.ts` — funções `getFulfillmentBreakdown()`, `detectBottles()`, `getProductCostPerBottle()`

**Exibido em**: `src/pages/Dashboard.tsx` — cartão "Valor Líquido" (valor + tooltip; sem breakdown expansível), e por afiliado em `src/pages/Affiliates.tsx`
