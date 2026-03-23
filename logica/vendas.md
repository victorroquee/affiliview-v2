# KPI: Vendas (Sales Count — Vendas Frontais)

## O que é
Contagem de pedidos frontais realizados no período. Representa o número de novos clientes que compraram um produto M (produto principal do funil), excluindo upsells, downsells e order bumps.

---

## Origem e Extração
- **Fonte**: Planilha de exportação do Digistore24
- **Regra de identificação**: Contar apenas as linhas cujo nome do produto se enquadra no padrão de **produto M** (venda frontal)

---

## O que é um Produto M

Produto M é o produto principal comprado pelo cliente ao entrar no funil. São os produtos:

- **Erectus X** (em qualquer variação de quantidade de frascos)
- **Slimjara** (em qualquer variação de quantidade de frascos)
- **Memoguard** (em qualquer variação de quantidade de frascos)

### O que NÃO é produto M:
- Upsells (identificados pelo nome — ex: começa com "UP", "Order Bump", "Bump", "Down")
- Downsells
- Outras nomenclaturas fora do padrão de produto M

---

## Regras de Identificação

O nome do produto na planilha determina se é uma venda frontal ou não:

| Começa com... | Classificação |
|---------------|---------------|
| Nome do produto base (Erectus X, Slimjara, Memoguard) | ✅ Produto M — conta como venda |
| UP1, UP2, UP3... | ❌ Upsell — não conta |
| Order Bump, Bump | ❌ Order bump — não conta |
| Down 1, Down 2... | ❌ Downsell — não conta |
| Qualquer outra nomenclatura não M | ❌ Não conta |

A regra é **pela nomenclatura do produto** — o campo de tipo de transação da planilha não é suficiente para esta classificação.

---

## Regras

- Contar apenas produtos M (vendas frontais)
- Refunds e chargebacks **não reduzem** este contador — ele conta pedidos realizados, independente de devoluções posteriores
- Inclui os três produtos: **Erectus X**, **Slimjara** e **Memoguard**
- O período filtrado segue horário **UTC** (00:00 até 23:59 UTC)

---

## Exemplo Prático

| Linha da planilha | Nome do Produto | Conta como Venda? |
|-------------------|-----------------|--------------------|
| 1 | Erectus X - 6 Bottles | ✅ Sim |
| 2 | UP1 - Slimjara 3 frascos | ❌ Não (upsell) |
| 3 | Slimjara - 3 Garrafas | ✅ Sim |
| 4 | Memoguard - 6 Capsules | ✅ Sim |
| 5 | Order Bump - Memoguard 1 frasco | ❌ Não (order bump) |
| 6 | Down 1 - Oferta especial | ❌ Não (downsell) |
| 7 | Erectus X - 2 Bottles (Refund) | ✅ Ainda conta (venda foi feita) |

```
Total de Vendas (Produtos M) = 4
(Erectus X, Slimjara, Memoguard — e o Erectus X que foi devolvido ainda conta como venda realizada)
```

---

## Importância desta Métrica

Esta contagem é o **denominador mais crítico** do sistema — ela é usada como base para:

| KPI que usa Vendas como denominador | Impacto de erro |
|-------------------------------------|-----------------|
| AOV | Ticket médio errado |
| Refund % | Taxa de devolução errada |
| Chargeback % | Taxa de contestação errada |
| CPA | Custo por aquisição errado |

Qualquer produto M classificado incorretamente como upsell (ou vice-versa) afeta todas essas métricas.

---

## Onde é Exibido
- Cartão KPI "Vendas" no topo do dashboard

---

## Observações
- A identificação por nomenclatura do produto é mais confiável que o campo "tipo de transação" da planilha, pois o Digistore nem sempre preenche esse campo de forma consistente
- Memoguard deve seguir o mesmo padrão de nomenclatura dos outros produtos M para ser corretamente identificado — nomes que começam com o nome base do produto são válidos
- Devoluções não reduzem a contagem — para ver o impacto de devoluções, usar o KPI de Refund %

---

## Implementação no Código

**Arquivo**: `src/lib/csvParser.ts`

A classificação de upsell pelo nome do produto:

```typescript
function isUpsellByName(productName: string): boolean {
  const n = productName.toLowerCase().trim();
  return /^(up\d|up\(|up |order bump|bump|down\s?\d|down )/.test(n);
}
```

A função que determina se é uma transação de pagamento válida:

```typescript
const isPayment = (t: TransactionRow): boolean =>
  t.transactionType === "payment" ||
  t.transactionType === "sale" ||
  t.transactionType === "upsell" ||
  t.transactionType === "" ||
  (t.grossAmount > 0 && !["return", "refund", "chargeback", "reversal"].includes(t.transactionType));
```

A função que determina se é produto M (venda frontal):

```typescript
// Produto M = pagamento que NÃO é upsell/downsell
const isFrontSale = (t: TransactionRow): boolean =>
  isPayment(t) && !isUpsellByName(t.productName);
```

A contagem de vendas no período:

```typescript
// Vendas = contagem de produtos M (sem upsells, sem refunds/chargebacks)
const frontSales = payTxs.filter(isFrontSale).length;
```

**Exibido em**: `src/pages/Index.tsx` — cartão "Vendas" no topo do dashboard
