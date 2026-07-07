# Componente: Custos Operacionais (Fulfillment Diário)

## O que é
Pipeline de custos operacionais de fulfillment apurado por dia e por período: COGS (custo de produto), potes/frascos vendidos, frete, taxas de fulfillment (embalagem + processing) e pedidos únicos com frete pago. Consolida, transação a transação, tudo o que a operação paga para fabricar e enviar cada pedido — a mesma fonte de custo usada pelo Valor Líquido e pelo CPA.

---

## Fórmula

```
Total fulfillment do dia = Custo de Produto (front + upsell)
                         + Custo de Frete (só front)
                         + Taxas de Fulfillment (embalagem + processing, só front)
```

Onde as **Taxas de Fulfillment** só existem a partir de 2025-12-01 (versão Tier 2):
```
Taxas de Fulfillment = Embalagem + Processing
```

---

## Passo a Passo do Processamento

### 1. Fonte e normalização
- **Fonte**: API Digistore24 (endpoint `listTransactions`)
- Cada linha crua é normalizada por `normalizeDigiTransaction` (`src/utils/digiNormalizer.ts`) → `TransactionRow` (lowercase de `transactionType`, sign enforcement de refunds, mapeamento de `upsell_no`, `vat_country`, `main_product_name` etc.)

### 2. Classificação front / upsell
- Cada pagamento é classificado pelo campo **`upsell_no`** da API: `0` = venda frontal (front), `≥1` = upsell/downsell — ver `vendas.md`.
- Front paga **produto + frete + embalagem + processing**. Upsell paga **apenas produto** (vai no mesmo pacote do front, sem frete/taxas adicionais).

### 3. Detecção de frascos por nome (`detectBottles`)
A quantidade de frascos vem do nome do produto (`main_product_name`), na ordem:
1. **Bundles "N+M"** (ex.: `"UP4 - LipoGandha 3+3 Kostenlos"`) → soma pagos + grátis (**6 frascos**) — as garrafas grátis são físicas e geram COGS.
2. **Keyword** (`"6 Bottles"`, `"3 Garrafas"`, `"2 Capsules"`, `"Flasche"` …).
3. **Fallback** por números conhecidos (12, 9, 6, 3, 2).
4. **Default** → 1 frasco.

Para a tabela de frete/embalagem, a contagem é arredondada ao tier válido mais próximo (1/2/3/6/9/12) via `closestBottleTier`.

### 4. Seleção da versão de custo pela DATA da transação
- Cada transação usa a versão de custo **vigente na sua própria data** (ver "Versionamento" abaixo). Histórico não muda retroativamente.

### 5. Cálculo por transação (`getFulfillmentBreakdown`)
Para um **front**:
```
produto    = frascos(tier) × custo/frasco do produto
frete      = tabela_da_versão[frascos(tier)][zona]
embalagem  = tabela_embalagem_da_versão[frascos(tier)]   (0 no legado)
processing = taxa_processing_da_versão                    (0 no legado)
```
Para um **upsell**: só `produto = detectBottles × custo/frasco` (contagem crua, sem arredondar, **sem** frete/taxas).

### 6. Desconto Z6 (€20)
- Aplica-se **apenas ao frete**, **apenas em vendas frontais** para **LU** e **CH**: `frete = max(0, frete − €20)`.
- Não afeta produto, embalagem nem processing. Upsells nunca sofrem desconto Z6 (não têm frete).

### 7. Agregação diária e do período
- Os valores por transação são somados em `dailyCosts: DailyCostRow[]` (uma linha por dia) e nos totais do período (`PeriodMetrics`).

---

## Versionamento por Data de Vigência

> **Fonte única de custo**: `src/lib/costTable.ts`. Valor Líquido, CPA e o painel de custos leem a mesma tabela.

| Versão | Vigência | Frete | Embalagem | Processing |
|--------|----------|-------|-----------|-----------|
| `v1-legacy` | até **2025-11-30** | tabela legada (7,58 z1@1 etc.) | — | — |
| `v2-tier2` | a partir de **2025-12-01** | tabela Tier 2 (PDF ShipOffers) | €0,23 / €0,35 | €0,47 |

- O corte é a constante `TIER2_EFFECTIVE_FROM = Date.UTC(2025, 11, 1)` (01/12/2025, 00:00 UTC).
- `selectCostVersion(date)` retorna a versão vigente na data da transação; sem data → assume a versão mais recente (Tier 2).
- Cada transação usa a versão da sua data → **o histórico não muda retroativamente** quando uma nova tabela entra em vigor.

---

## Tabela de Frete Tier 2 (€) — vigente a partir de 2025-12-01

Do PDF ShipOffers `Shipping_WL_Blend_EU` (SKU 6426-EU:WGHTLBLND), confirmada célula a célula. Frascos {1,2,3,6} compartilham o mesmo frete; {9,12} compartilham entre si.

| Frascos | z1 | z2 | z3 | z4 | z5 | z6 | z7 | uk |
|---------|------|------|-------|-------|-------|-------|-------|------|
| 1,2,3,6 | 8,60 | 9,44 | 11,12 | 12,96 | 17,11 | 24,49 | 50,33 | 9,44 |
| 9,12 | 8,78 | 9,77 | 11,95 | 13,31 | 17,48 | 25,84 | 51,74 | 9,77 |

**Embalagem** (Tier 2): 1–3 frascos → **€0,23** ; 6–12 frascos → **€0,35**.
**Processing** (Tier 2): **€0,47** flat, independente de frascos/zona.

> A tabela legada (frete até 2025-11-30, sem embalagem/processing) está documentada em `custo_frete.md`.

---

## COGS e Custo por Frasco

- **COGS** = custo de produto de **TODOS** os pagamentos (front **e** upsell).
- **Frete / embalagem / processing** = **apenas front** (o upsell vai no mesmo pacote).
- Custo por frasco por produto (**inalterado** entre versões):

| Produto | Custo/frasco |
|---------|-------------|
| Slimjara / LipoGandha / Memoguard | €3,26 |
| Liposkin | €3,64 |
| Erectus | €3,24 |

---

## Métricas Expostas em `PeriodMetrics`

| Campo | Significado |
|-------|-------------|
| `bottlesSold` | Σ de frascos físicos vendidos (front + upsell) |
| `productCost` | COGS — custo de produto de todos os pagamentos |
| `shippingCost` | Frete total (só front) |
| `packagingCost` | Embalagem total (só front, Tier 2) |
| `processingCost` | Processing total (só front, Tier 2) |
| `fulfillmentFees` | `packagingCost + processingCost` |
| `uniqueShippedOrders` | orderIds distintos de fronts (pedidos com frete pago) |
| `dailyCosts` | `DailyCostRow[]` — breakdown de custos por dia |

Cada `DailyCostRow`:

| Campo | Significado |
|-------|-------------|
| `date` | dia `"YYYY-MM-DD"` |
| `orders` | pedidos front (envios) do dia |
| `bottles` | Σ frascos físicos (front + upsell) do dia |
| `productCost` | COGS do dia (front + upsell) |
| `shipping` | frete do dia (só front) |
| `fulfillmentFees` | embalagem + processing do dia (só front) |
| `totalCost` | `productCost + shipping + fulfillmentFees` |

---

## Reconciliações

- `Total fulfillment do dia = productCost + shipping + fulfillmentFees` (por `DailyCostRow`)
- `Σ dailyCosts.orders = uniqueShippedOrders` (exceto o raro pedido cujos fronts cruzam a meia-noite UTC — contado em 2 dias; ver `auditoria_custos.md`)
- `Σ dailyCosts.bottles = bottlesSold`
- `valorLiq = earnings − productCost − shippingCost − fulfillmentFees − capitalCost`

> Todas essas reconciliações foram validadas com dados reais (~9,3k transações) — ver `auditoria_custos.md`.

---

## Exemplo Prático

### Pedido front — Slimjara, 6 frascos, Alemanha (Zona Z1), Tier 2

| Item | Cálculo | Valor |
|------|---------|-------|
| Custo de Produto | 6 × €3,26 | €19,56 |
| Custo de Frete (Tier 2, z1, 6 frascos) | tabela | €8,60 |
| Embalagem (6 frascos) | tabela | €0,35 |
| Processing | flat | €0,47 |
| **Total fulfillment** | 19,56 + 8,60 + 0,35 + 0,47 | **€28,98** |

### Fidelidade com a coluna "Total Cost" do PDF ShipOffers

| Cenário | Produto | Frete | Embalagem | Processing | Total |
|---------|---------|-------|-----------|-----------|-------|
| 1 frasco, z1 | 1 × 3,26 = 3,26 | 8,60 | 0,23 | 0,47 | **12,56** |
| 12 frascos, z2 | 12 × 3,26 = 39,12 | 9,77 | 0,35 | 0,47 | **49,71** |

---

## Onde é Usado
- Alimenta o painel de custos operacionais (custos diários, potes vendidos, pedidos com frete)
- Base do **Valor Líquido** (ver `valor_liquido.md`) e do **CPA**
- É a **fonte única** de custo — todas as telas leem `costTable.ts`

---

## Implementação no Código

**Arquivo**: `src/lib/costTable.ts`
- `getFulfillmentBreakdown(productName, countryCode, isFrontSale, date)` → `{ product, shipping, packaging, processing, total }`
- `selectCostVersion(date)` → versão vigente na data (`v2-tier2` ou `v1-legacy`)
- `SHIPPING_TABLE_TIER2`, `PACKAGING_TIER2`, `PROCESSING_FEE_TIER2`, `TIER2_EFFECTIVE_FROM`
- `detectBottles()`, `closestBottleTier()`, `getProductCostPerBottle()`

```typescript
const ver = selectCostVersion(date);
const closestCount = closestBottleTier(detectBottles(productName));
const productCost = closestCount * getProductCostPerBottle(productName);
let shippingCost = ver.shipping[closestCount]![zone];
if (isFrontSale && CUSTOMER_SHIPPING_COUNTRIES.has(cc)) {
  shippingCost = Math.max(0, shippingCost - CUSTOMER_SHIPPING_AMOUNT); // Z6 −€20 (só frete)
}
const packaging = ver.packaging[closestCount] ?? 0;
const processing = ver.processing;
// total = produto + frete + embalagem + processing
```

**Arquivo**: `src/lib/transactions.ts` — função `computePeriod()`
- Acumula `productCost`, `shippingCost`, `packagingCost`, `processingCost`, `fulfillmentFees`, `bottlesSold`, `uniqueShippedOrders` e monta `dailyCosts: DailyCostRow[]`.

```typescript
for (const t of frontPayments) {
  const b = getFulfillmentBreakdown(t.productName, t.country, true, t.date);
  productCostTotal    += b.product;
  shippingCostTotal   += b.shipping;
  packagingCostTotal  += b.packaging;
  processingCostTotal += b.processing;
  const d = dayRow(t);
  d.bottles += detectBottles(t.productName);
  d.productCost += b.product;
  d.shipping += b.shipping;
  d.fulfillmentFees += b.packaging + b.processing;
  d.totalCost += b.product + b.shipping + b.packaging + b.processing;
  dayOrderSets.get(d.date)!.add(t.orderId || fallbackKey(t)); // orders = pedidos DISTINTOS/dia
}
// Upsells: só produto (mesmo pacote, sem frete/taxas)
for (const t of upsellPayments) {
  const pCost = detectBottles(t.productName) * getProductCostPerBottle(t.productName);
  productCostTotal += pCost;
  const d = dayRow(t);
  d.bottles += detectBottles(t.productName);
  d.productCost += pCost;
  d.totalCost += pCost;
}
const fulfillmentFeesTotal = packagingCostTotal + processingCostTotal;
```
