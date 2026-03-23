# Componente: Custo de Frete

## O que é
Custo de envio do produto ao cliente, calculado com base no país de destino (zona logística) e na quantidade de frascos do pedido. É o segundo componente deduzido do Earnings para chegar ao **Valor Líquido**.

---

## Fórmula

```
Custo de Frete = Tabela de Fretes [quantidade de frascos] [zona do país]
```

Para países da Zona Z6 onde o cliente paga parte do frete (apenas produtos M/frontais):
```
Custo de Frete efetivo = valor_da_tabela - €20
(mínimo €0)
```

---

## Mapeamento de Zonas por País

| Zona | Países incluídos |
|------|-----------------|
| **Z1** | FR (França), DE (Alemanha), GR (Grécia), ES (Espanha) |
| **Z2** | CZ (República Tcheca), IE (Irlanda), PT (Portugal), SK (Eslováquia) |
| **Z3** | AT (Áustria), BE (Bélgica), HU (Hungria), IT (Itália), NL (Holanda), PL (Polônia), RO (Romênia) |
| **Z4** | BG (Bulgária), HR (Croácia), DK (Dinamarca), LT (Lituânia), SI (Eslovênia) |
| **Z5** | EE (Estônia), FI (Finlândia), LV (Letônia), SE (Suécia) |
| **Z6** | CY (Chipre), LU (Luxemburgo), MT (Malta), CH (Suíça), LI (Liechtenstein), AE (Emirados Árabes), GA (Gabão) |
| **Z7** | IS (Islândia), GE (Geórgia), MX (México), CA (Canadá), DO (Rep. Dominicana), CL (Chile), UY (Uruguai), PY (Paraguai), MC (Mônaco), NO (Noruega) |
| **UK** | GB (Reino Unido) |

Países não listados → retornam **custo zero** (`{ product: 0, shipping: 0, total: 0 }`) — o sistema não aplica nenhum custo de fulfillment para países fora do mapeamento

---

## Tabela de Custos de Frete por Zona (valores exatos em €)

| Frascos | Z1 | Z2 | Z3 | Z4 | Z5 | Z6 | Z7 | UK |
|---------|------|-------|-------|-------|-------|-------|-------|-------|
| 1 | 9,30 | 10,14 | 11,82 | 13,66 | 17,81 | 25,19 | 51,03 | 10,14 |
| 2 | 9,30 | 10,14 | 11,82 | 13,66 | 17,81 | 25,19 | 51,03 | 10,14 |
| 3 | 9,30 | 10,14 | 11,82 | 13,66 | 17,81 | 25,19 | 51,03 | 10,14 |
| 6 | 9,42 | 10,26 | 11,94 | 13,78 | 17,93 | 25,31 | 51,15 | 10,26 |
| 9 | 9,60 | 10,59 | 12,77 | 14,13 | 18,30 | 26,66 | 52,56 | 10,59 |
| 12 | 9,60 | 10,59 | 12,77 | 14,13 | 18,30 | 26,66 | 52,56 | 10,59 |

> Valores definidos em `costTable.ts` → constante `SHIPPING_TABLE`. Observar que 1, 2 e 3 frascos têm o mesmo custo de frete entre si; 9 e 12 frascos também são idênticos.

---

## Regra Especial: Zona Z6 — Cliente Paga €20

Para **Luxemburgo (LU)** e **Suíça (CH)**, o cliente é cobrado adicionalmente €20 de frete diretamente. Por isso, o custo real que a empresa paga de envio é reduzido:

```
Custo de Frete Z6 (empresa) = valor_tabela_Z6 - €20
```

**Importante**: Esta regra de desconto de €20 se aplica **somente a produtos M** (vendas frontais). Upsells enviados para Z6 têm o frete integral conforme tabela.

---

## Regras

- O país de destino vem da coluna "country" na planilha do Digistore24
- Países não mapeados nas zonas → **custo zero retornado** — sem produto e sem frete computados (não há fallback para Z1)
- A quantidade de frascos é detectada pelo nome do produto (mesma lógica do custo de produto — ver `custo_produto.md`)
- Desconto Z6 de €20 → apenas para produtos M (frontais)
- Aplica-se a todos os produtos: **Erectus X**, **Slimjara** e **Memoguard**

---

## Exemplo Prático

| Produto | País | Zona | Frascos | Frete Tabela | Desconto Z6 | Frete Efetivo |
|---------|------|------|---------|-------------|------------|--------------|
| Erectus X 6 frascos (produto M) | DE | Z1 | 6 | €9,42 | — | €9,42 |
| Slimjara 3 frascos (produto M) | PT | Z2 | 3 | €10,59 | — | €10,59 |
| Memoguard 6 frascos (produto M) | IT | Z3 | 6 | €12,77 | — | €12,77 |
| Erectus X 6 frascos (produto M) | SE | Z5 | 6 | €18,30 | — | €18,30 |
| Slimjara 6 frascos (produto M) | CH | Z6 | 6 | €26,66 | -€20,00 | €6,66 |
| UP1 Slimjara 3 frascos (upsell) | CH | Z6 | 3 | €26,66 | ❌ não aplica | €26,66 |
| Memoguard 3 frascos (produto M) | CA | Z7 | 3 | €52,56 | — | €52,56 |

---

## Onde é Usado
- Deduzido do Earnings no cálculo do **Valor Líquido** (ver `valor_liquido.md`)
- Exibido no breakdown do cartão "Valor Líquido" no dashboard

---

## Observações
- Fretes de Zona Z7 (~€51-52 por envio) são muito elevados e podem tornar o Valor Líquido negativo, especialmente em pacotes menores
- A diferença de frete entre Z1 e Z5 é de quase €9 por pedido — afiliados com tráfego majoritariamente de países nórdicos terão margem naturalmente mais apertada
- Memoguard deve ter os países de destino mapeados da mesma forma que os outros produtos — não há diferenciação de frete por produto, apenas por zona e quantidade de frascos

---

## Implementação no Código

**Arquivo**: `src/lib/costTable.ts`

Tabela completa de fretes por quantidade de frascos e zona:

```typescript
const SHIPPING_TABLE: Record<number, Record<ZoneKey, number>> = {
  1:  { z1: 9.30, z2: 10.14, z3: 11.82, z4: 13.66, z5: 17.81, z6: 25.19, z7: 51.03, uk: 10.14 },
  2:  { z1: 9.30, z2: 10.14, z3: 11.82, z4: 13.66, z5: 17.81, z6: 25.19, z7: 51.03, uk: 10.14 },
  3:  { z1: 9.30, z2: 10.14, z3: 11.82, z4: 13.66, z5: 17.81, z6: 25.19, z7: 51.03, uk: 10.14 },
  6:  { z1: 9.42, z2: 10.26, z3: 11.94, z4: 13.78, z5: 17.93, z6: 25.31, z7: 51.15, uk: 10.26 },
  9:  { z1: 9.60, z2: 10.59, z3: 12.77, z4: 14.13, z5: 18.30, z6: 26.66, z7: 52.56, uk: 10.59 },
  12: { z1: 9.60, z2: 10.59, z3: 12.77, z4: 14.13, z5: 18.30, z6: 26.66, z7: 52.56, uk: 10.59 },
};
```

Mapeamento de país para zona (Digistore exporta nome completo do país):

```typescript
const COUNTRY_ZONE: Record<string, ZoneKey> = {
  FR: "z1", DE: "z1", GR: "z1", ES: "z1",
  CZ: "z2", IE: "z2", PT: "z2", SK: "z2",
  AT: "z3", BE: "z3", HU: "z3", IT: "z3", NL: "z3", PL: "z3", RO: "z3",
  // ... e demais zonas
  LU: "z6", CH: "z6", // Z6 — cliente paga €20
  GB: "uk",
};
```

Países não mapeados em `COUNTRY_ZONE` retornam `{ product: 0, shipping: 0, total: 0 }` (custo zero), não Z1.

Cálculo do custo de frete com desconto Z6 para produtos M:

```typescript
let shippingCost = SHIPPING_TABLE[closestCount][zone];

// Desconto Z6: cliente paga €20 — apenas em vendas frontais (produtos M)
const CUSTOMER_SHIPPING_COUNTRIES = new Set(["LU", "CH"]);
const CUSTOMER_SHIPPING_AMOUNT = 20;

if (isFrontSale && CUSTOMER_SHIPPING_COUNTRIES.has(cc)) {
  shippingCost = Math.max(0, shippingCost - CUSTOMER_SHIPPING_AMOUNT);
}
```

O país vem da coluna `country` do CSV. A função `resolveCountryCode()` aceita tanto código ISO (ex: "DE") quanto nome por extenso (ex: "Germany", "Deutschland"):

```typescript
function resolveCountryCode(raw: string): string {
  const s = raw.trim();
  if (s.length <= 3 && /^[A-Za-z]{2,3}$/.test(s)) return s.toUpperCase(); // já é código
  const code = COUNTRY_NAME_TO_CODE[s.toLowerCase()];                      // busca por nome
  return code || s.toUpperCase();
}
```

**Utilizado em**: `src/lib/csvParser.ts` via `getFulfillmentBreakdown()` no cálculo do Valor Líquido
