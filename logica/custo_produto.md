# Componente: Custo de Produto

## O que é
Custo de fabricação dos frascos/unidades vendidas. É calculado automaticamente com base na quantidade de frascos identificada no nome do produto (`main_product_name`), multiplicada pelo custo unitário de produção **específico de cada produto**. É um dos dois componentes deduzidos do Earnings para chegar ao **Valor Líquido**.

---

## Fórmula

```
Custo de Produto = Número de Frascos × Custo por Frasco (varia por produto)
```

---

## Produtos e Categorias

| Categoria | Brand | SKU (ShipOffers) | Custo/frasco |
|-----------|-------|------------------|-------------|
| Weight Loss | **Slimjara** | 6426-EU/WGHTLBLND | €3,26 |
| Metabolism | **LipoGandha** | 6462-EU/METABLND | €3,26 |
| Nerve | **Liposkin** | 6424-EU/NRVEBLND | €3,64 |
| Virility | **Erectus** | 6427-EU/VRTYBLND | €3,24 |
| — | **Memoguard** | — | €3,26 |

**Default** (produto não reconhecido): €3,26

---

## Origem e Extração
- **Fonte**: API Digistore24 — campo `main_product_name`
- A quantidade de frascos é detectada pelo nome do produto (não existe campo separado para isso na API)
- A categoria do produto é detectada pelo nome (slimjara, lipogandha, liposkin, erectus, memoguard)
- Aplica-se somente a transações de pagamento (`transaction_type === "payment"`)

---

## Como o Número de Frascos é Detectado

O sistema identifica a quantidade de frascos lendo o nome do produto. A detecção segue esta ordem de prioridade:

### 1ª tentativa — Leitura de palavras-chave no nome
O sistema busca um número seguido de palavras como: "bottle", "garrafa", "b", "pack", "un", "capsule", "flasche" (e variações). Exemplos que funcionam:
- `"Erectus - 6 Bottles"` → detecta **6 frascos**
- `"Slimjara 3 Garrafas"` → detecta **3 frascos**
- `"Memoguard - 2 Capsules"` → detecta **2 frascos**

### 2ª tentativa — Busca de números conhecidos no nome (fallback)
Se a 1ª tentativa não encontrar, o sistema procura os números: 12, 9, 6, 3, 2 no nome do produto (nesta ordem).
- `"Erectus Gold 6"` → detecta **6 frascos**

### 3ª tentativa — Default
Se nenhum número for identificado → assume **1 frasco**

---

## Tabela de Custo por Quantidade (exemplos)

| Produto | 1 frasco | 3 frascos | 6 frascos |
|---------|---------|----------|----------|
| Slimjara | €3,26 | €9,78 | €19,56 |
| LipoGandha | €3,26 | €9,78 | €19,56 |
| Liposkin | €3,64 | €10,92 | €21,84 |
| Erectus | €3,24 | €9,72 | €19,44 |
| Memoguard | €3,26 | €9,78 | €19,56 |

---

## Regras de Front/Upsell por Product ID

O campo `main_product_id` da API codifica se o produto é front ou upsell pelo sufixo numérico:
- **Sem sufixo ou 1-8** → front offer (mesmo produto, bundles diferentes)
- **9+** → upsell

Exemplos:
- `S9V2LXKN` (front), `S9V2LXKN1` (front), `S9V2LXKN9` (upsell)
- `3LM55YMS` (front), `3LM55YMS1` (front)

---

## Regras

- Custo unitário **varia por produto** (Liposkin €3,64, Erectus €3,24, demais €3,26)
- Calculado por transação individualmente
- Se o nome do produto não indicar a quantidade, assume 1 frasco (pode subestimar o custo)
- Se o produto não for reconhecido, usa o custo default de €3,26

---

## Onde é Usado
- Deduzido do Earnings no cálculo do **Valor Líquido** (ver `valor_liquido.md`)
- Exibido no breakdown do cartão "Valor Líquido" no dashboard

---

## Implementação no Código

**Arquivo**: `src/lib/costTable.ts`

Custo por produto (mapa por categoria):

```typescript
export const PRODUCT_COSTS: Record<ProductCategory, number> = {
  slimjara:   3.26,
  lipoGandha: 3.26,
  liposkin:   3.64,
  erectus:    3.24,
  memoguard:  3.26,
};
```

Detecção de categoria e custo:

```typescript
export function detectProductCategory(productName: string): ProductCategory | null { ... }
export function getProductCostPerBottle(productName: string): number { ... }
```

O custo de produto é calculado dentro de `getFulfillmentBreakdown()`:

```typescript
const productCost = closestCount * getProductCostPerBottle(productName);
```

**Utilizado em**: `src/lib/transactions.ts` via `getFulfillmentBreakdown()` no cálculo do Valor Líquido
