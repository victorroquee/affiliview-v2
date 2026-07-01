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

## Origem e Extração
- **Fonte**: API Digistore24 — campo `vat_country`
- `vat_country` já retorna código ISO de 2 letras (ex: "DE", "AT") — não requer conversão para a maioria dos casos
- A função `resolveCountryCode()` normaliza entradas que possam chegar como nome por extenso (ex: "Germany")

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
| 1 | 7,58 | 8,25 | 9,60 | 11,07 | 14,39 | 20,29 | 40,96 | 8,25 |
| 2 | 7,58 | 8,25 | 9,60 | 11,07 | 14,39 | 20,29 | 40,96 | 8,25 |
| 3 | 7,58 | 8,25 | 9,60 | 11,07 | 14,39 | 20,29 | 40,96 | 8,25 |
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

**Importante**: Esta regra de desconto de €20 se aplica **somente a produtos M** (transações com `upsell_no === 0`). Upsells **não geram custo de frete** no Valor Líquido — vão no mesmo pacote do front —, então o desconto Z6 é irrelevante para eles (frete de upsell é sempre €0,00, independentemente da zona).

---

## Regras

- O país de destino vem do campo `vat_country` da API Digistore24 (código ISO 2 letras)
- Países não mapeados nas zonas → **custo zero retornado** — sem produto e sem frete computados
- A quantidade de frascos é detectada pelo nome do produto (mesma lógica do custo de produto — ver `custo_produto.md`)
- Desconto Z6 de €20 → apenas para produtos M (`upsell_no === 0`)
- O custo de frete é deduzido **apenas em pagamentos frontais** (`upsell_no === 0`); para upsells o frete é sempre €0 (mesmo pacote)
- Aplica-se a todos os produtos: **Erectus X**, **Slimjara**, **Memoguard**, **LipoGandha** e **LipoSkin**

---

## Exemplo Prático

| Produto | vat_country | Zona | Frascos | Frete Tabela | Desconto Z6 | Frete Efetivo |
|---------|------------|------|---------|-------------|------------|--------------|
| Erectus X 6 frascos (upsell_no=0) | DE | Z1 | 6 | €9,42 | — | €9,42 |
| Slimjara 3 frascos (upsell_no=0) | PT | Z2 | 3 | €8,25 | — | €8,25 |
| Memoguard 6 frascos (upsell_no=0) | IT | Z3 | 6 | €11,94 | — | €11,94 |
| Erectus X 6 frascos (upsell_no=0) | SE | Z5 | 6 | €17,93 | — | €17,93 |
| Slimjara 6 frascos (upsell_no=0) | CH | Z6 | 6 | €25,31 | -€20,00 | €5,31 |
| UP1 Slimjara 3 frascos (upsell_no=1) | CH | Z6 | 3 | — (mesmo pacote) | n/a | €0,00 (upsell não gera frete) |
| Memoguard 3 frascos (upsell_no=0) | CA | Z7 | 3 | €40,96 | — | €40,96 |

---

## Onde é Usado
- Deduzido do Earnings no cálculo do **Valor Líquido** (ver `valor_liquido.md`)
- Exibido no breakdown do cartão "Valor Líquido" no dashboard

---

## Observações
- Fretes de Zona Z7 (~€41-53 por envio) são muito elevados e podem tornar o Valor Líquido negativo, especialmente em pacotes menores
- A diferença de frete entre Z1 e Z5 é de quase €9 por pedido

---

## Implementação no Código

**Arquivo**: `src/lib/costTable.ts`

Tabela completa de fretes por quantidade de frascos e zona:

```typescript
export const SHIPPING_TABLE: Record<number, Record<ZoneKey, number>> = {
  1:  { z1: 7.58, z2: 8.25, z3: 9.60, z4: 11.07, z5: 14.39, z6: 20.29, z7: 40.96, uk: 8.25 },
  2:  { z1: 7.58, z2: 8.25, z3: 9.60, z4: 11.07, z5: 14.39, z6: 20.29, z7: 40.96, uk: 8.25 },
  3:  { z1: 7.58, z2: 8.25, z3: 9.60, z4: 11.07, z5: 14.39, z6: 20.29, z7: 40.96, uk: 8.25 },
  6:  { z1: 9.42, z2: 10.26, z3: 11.94, z4: 13.78, z5: 17.93, z6: 25.31, z7: 51.15, uk: 10.26 },
  9:  { z1: 9.60, z2: 10.59, z3: 12.77, z4: 14.13, z5: 18.30, z6: 26.66, z7: 52.56, uk: 10.59 },
  12: { z1: 9.60, z2: 10.59, z3: 12.77, z4: 14.13, z5: 18.30, z6: 26.66, z7: 52.56, uk: 10.59 },
};
```

Mapeamento de país para zona (API retorna código ISO diretamente via `vat_country`):

```typescript
export const COUNTRY_ZONE: Record<string, ZoneKey> = {
  FR: "z1", DE: "z1", GR: "z1", ES: "z1",
  CZ: "z2", IE: "z2", PT: "z2", SK: "z2",
  AT: "z3", BE: "z3", HU: "z3", IT: "z3", NL: "z3", PL: "z3", RO: "z3",
  BG: "z4", HR: "z4", DK: "z4", LT: "z4", SI: "z4",
  EE: "z5", FI: "z5", LV: "z5", SE: "z5",
  CY: "z6", LU: "z6", MT: "z6", CH: "z6", LI: "z6", AE: "z6", GA: "z6",
  IS: "z7", GE: "z7", MX: "z7", CA: "z7", DO: "z7", CL: "z7", UY: "z7", PY: "z7", MC: "z7", NO: "z7",
  GB: "uk",
};
```

Países não mapeados em `COUNTRY_ZONE` retornam `{ product: 0, shipping: 0, total: 0 }` (custo zero).

Cálculo do custo de frete com desconto Z6 para produtos M (`upsell_no === 0`):

```typescript
// isFrontSale = t.upsellNo === 0
let shippingCost = SHIPPING_TABLE[closestCount][zone];

// Desconto Z6: cliente paga €20 — apenas em vendas frontais (upsell_no === 0)
export const CUSTOMER_SHIPPING_COUNTRIES = new Set(["LU", "CH"]);
export const CUSTOMER_SHIPPING_AMOUNT = 20;

if (isFrontSale && CUSTOMER_SHIPPING_COUNTRIES.has(cc)) {
  shippingCost = Math.max(0, shippingCost - CUSTOMER_SHIPPING_AMOUNT);
}
```

Resolução do código do país (API já retorna ISO 2 letras via `vat_country`):

```typescript
export function resolveCountryCode(raw: string): string {
  const s = raw.trim();
  if (s.length <= 3 && /^[A-Za-z]{2,3}$/.test(s)) return s.toUpperCase(); // já é código
  const code = COUNTRY_NAME_TO_CODE[s.toLowerCase()];                      // busca por nome
  return code || s.toUpperCase();
}
```

**Utilizado em**: `src/lib/transactions.ts` via `getFulfillmentBreakdown()` no cálculo do Valor Líquido
