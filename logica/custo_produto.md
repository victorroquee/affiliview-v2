# Componente: Custo de Produto

## O que é
Custo de fabricação dos frascos/unidades vendidas. É calculado automaticamente com base na quantidade de frascos identificada no nome do produto (`main_product_name`), multiplicada pelo custo unitário de produção. É um dos dois componentes deduzidos do Earnings para chegar ao **Valor Líquido**.

---

## Fórmula

```
Custo de Produto = Número de Frascos × €3,26 por frasco
```

---

## Origem e Extração
- **Fonte**: API Digistore24 — campo `main_product_name`
- A quantidade de frascos é detectada pelo nome do produto (não existe campo separado para isso na API)
- Aplica-se somente a transações de pagamento (`transaction_type === "payment"`)

---

## Como o Número de Frascos é Detectado

O sistema identifica a quantidade de frascos lendo o nome do produto. A detecção segue esta ordem de prioridade:

### 1ª tentativa — Leitura de palavras-chave no nome
O sistema busca um número seguido de palavras como: "bottle", "garrafa", "b", "pack", "un", "capsule", "flasche" (e variações). Exemplos que funcionam:
- `"Erectus X - 6 Bottles"` → detecta **6 frascos**
- `"Slimjara 3 Garrafas"` → detecta **3 frascos**
- `"Memoguard - 2 Capsules"` → detecta **2 frascos** ("capsule" incluído)
- `"Erectus X - 2b"` → detecta **2 frascos**

### 2ª tentativa — Busca de números conhecidos no nome (fallback)
Se a 1ª tentativa não encontrar, o sistema procura os números: 12, 9, 6, 3, 2 no nome do produto (nesta ordem).
- `"Erectus X Gold 6"` → detecta **6 frascos**

### 3ª tentativa — Default
Se nenhum número for identificado → assume **1 frasco**

---

## Custo por Frasco

O custo unitário de produção por frasco é:
```
€3,26 por frasco
```

Este valor é fixo e hardcoded no sistema.

---

## Tabela de Custo por Quantidade

| Frascos | Custo de Produto |
|---------|-----------------|
| 1 frasco | €3,26 |
| 2 frascos | €6,52 |
| 3 frascos | €9,78 |
| 6 frascos | €19,56 |
| 9 frascos | €29,34 |
| 12 frascos | €39,12 |

---

## Regras

- Aplica-se a todos os produtos: **Erectus X**, **Slimjara** e **Memoguard**
- Mesmo custo unitário (€3,26) para todos os produtos
- Calculado por transação individualmente
- Se o nome do produto não indicar a quantidade, assume 1 frasco (pode subestimar o custo)

---

## Exemplo Prático

| Produto | main_product_name (API) | Frascos Detectados | Custo de Produto |
|---------|------------------------|-------------------|-----------------|
| Erectus X | M3 - Erectus X - 6 Bottles | 6 | €19,56 |
| Slimjara | M1 - Slimjara - 3 Garrafas | 3 | €9,78 |
| Memoguard | M2 - Memoguard - 2 Capsules | 2 | €6,52 |
| Produto desconhecido | Produto sem número | 1 (default) | €3,26 |

---

## Onde é Usado
- Deduzido do Earnings no cálculo do **Valor Líquido** (ver `valor_liquido.md`)
- Exibido no breakdown do cartão "Valor Líquido" no dashboard

---

## Observações
- O valor €3,26 deve ser atualizado manualmente no sistema caso o custo de fabricação mude
- A palavra-chave "capsule" foi adicionada à 1ª tentativa para melhor detecção dos produtos Memoguard

---

## Implementação no Código

**Arquivo**: `src/lib/costTable.ts`

Custo unitário por frasco (constante fixo):

```typescript
export const PRODUCT_COST_PER_BOTTLE = 3.26;
```

Função que detecta o número de frascos a partir do nome do produto:

```typescript
export function detectBottles(productName: string): number {
  const n = productName.toLowerCase();

  // 1ª tentativa: número seguido de palavra-chave
  const m = n.match(/(\d+)\s*(bottle|garrafa|b\b|pack|un|capsule|flasche)/i);
  if (m) return parseInt(m[1]);

  // 2ª tentativa: fallback por números conhecidos no nome (ordem decrescente)
  if (n.includes("12")) return 12;
  if (n.includes("9"))  return 9;
  if (n.includes("6"))  return 6;
  if (n.includes("3"))  return 3;
  if (n.includes("2"))  return 2;

  // Default: assume 1 frasco
  return 1;
}
```

O custo de produto é calculado dentro de `getFulfillmentBreakdown()`:

```typescript
const bottles = detectBottles(productName);
// Aproxima para o tamanho de pacote mais próximo na tabela (1, 2, 3, 6, 9, 12)
const closestCount = validCounts.reduce((prev, curr) =>
  Math.abs(curr - bottles) < Math.abs(prev - bottles) ? curr : prev
);

const productCost = closestCount * PRODUCT_COST_PER_BOTTLE; // ex: 6 × €3,26 = €19,56
```

**Utilizado em**: `src/lib/transactions.ts` via `getFulfillmentBreakdown()` no cálculo do Valor Líquido
