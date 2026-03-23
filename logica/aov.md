# KPI: AOV (Average Order Value — Ticket Médio)

## O que é
O valor médio por pedido. Mede quanto, em média, cada cliente gasta por compra — considerando o valor total do pedido, incluindo upsells aceitos. É uma métrica fundamental para entender o poder de compra do tráfego que cada afiliado traz.

---

## Origem e Extração
- **Fonte**: Planilha de exportação do Digistore24
- **Numerador**: Coluna **H** (Gross Total) — apenas os valores **positivos** (sem refunds e chargebacks)
- **Denominador**: Contagem de **produtos M** (vendas frontais) — coluna que identifica os pedidos de frente

---

## Fórmula

```
AOV = Gross Total (somente valores positivos) / Quantidade de Produtos M (vendas frontais)
```

> O Gross Total usado no numerador **não desconta** refunds e chargebacks — usa apenas os valores positivos da coluna H para representar o volume real de vendas realizadas.

---

## O que são Produtos M (Vendas Frontais)

Produtos M são as **vendas frontais** — o produto principal que o cliente compra ao entrar no funil. Não incluem upsells, downsells ou order bumps.

O denominador conta **apenas** os pedidos de produtos M — mesmo que um pedido frontal tenha gerado um upsell, ele conta como 1 no denominador.

---

## Por que o Numerador Inclui Upsells?

O AOV mede o valor total de cada pedido, não apenas do produto frontal. Quando um cliente aceita um upsell, esse valor também compõe o ticket médio do pedido. Por isso:

- **Numerador** = gross de todos os produtos (M + upsells), sem refunds/chargebacks
- **Denominador** = apenas contagem de pedidos M (cada pedido frontal = 1 pedido)

Esta lógica garante que o AOV reflita o valor real que cada cliente gera, incluindo os upsells aceitos.

---

## Regras

- O numerador usa apenas os valores **positivos** da coluna H (sem devoluções)
- O denominador conta apenas **produtos M** — nomes que seguem o padrão de venda frontal
- Inclui os três produtos: **Erectus X**, **Slimjara** e **Memoguard**
- O período filtrado segue horário **UTC** (00:00 até 23:59 UTC)

---

## Exemplo Prático

| Tipo | Produto | Valor Gross |
|------|---------|-------------|
| Produto M (frontal) | Erectus X - 6 frascos | +€150,00 |
| Upsell (mesmo pedido) | Slimjara - 3 frascos | +€80,00 |
| Produto M (frontal) | Memoguard - 3 frascos | +€90,00 |
| Produto M (frontal) | Slimjara - 6 frascos | +€120,00 |
| Refund (ignorado no numerador) | Erectus X - 6 frascos | -€150,00 |

```
Gross Total (somente positivos) = €150 + €80 + €90 + €120 = €440,00
Quantidade de Produtos M = 3 (Erectus X, Memoguard, Slimjara — sem contar o upsell e sem contar o refund)

AOV = €440 / 3 = €146,67
```

---

## Onde é Exibido
- Cartão KPI no topo do dashboard
- Por produto na tabela de resumo de produtos
- Por afiliado na tabela de afiliados

---

## Observações
- Um AOV alto indica boa taxa de aceitação de upsells e/ou preferência por pacotes maiores (mais frascos)
- Afiliados que vendem mais pacotes de 6 frascos naturalmente terão AOV maior que os que vendem principalmente de 1-2 frascos
- O AOV não é afetado diretamente pelos refunds no denominador — refunds reduzem o gross mas não a contagem de pedidos M (o pedido foi feito mesmo que devolvido)
- Memoguard segue as mesmas regras de classificação dos outros produtos M

---

## Implementação no Código

**Arquivo**: `src/lib/csvParser.ts` — função `computePeriod()`

```typescript
// Contagem de vendas frontais (produtos M) — excluindo upsells
const frontSales = payTxs.filter(isFrontSale).length;

// AOV = grossBruto (somente positivos) / quantidade de produtos M
const aov = frontSales > 0 ? grossBruto / frontSales : 0;
```

A função `isFrontSale()` que determina o denominador:

```typescript
// Produto M = pagamento que NÃO é upsell/downsell pelo nome
const isFrontSale = (t: TransactionRow): boolean =>
  isPayment(t) && !isUpsellByName(t.productName);

// Upsell identificado pelo nome do produto
function isUpsellByName(productName: string): boolean {
  const n = productName.toLowerCase().trim();
  return /^(up\d|up\(|up |order bump|bump|down\s?\d|down )/.test(n);
}
```

**Exibido em**: `src/pages/Index.tsx` — cartão "AOV" no topo do dashboard, e na tabela de produtos em `ProductSummaryTable`
