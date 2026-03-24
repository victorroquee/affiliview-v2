# KPI: Vendas (Sales Count — Vendas Frontais)

## O que é
Contagem de pedidos frontais realizados no período. Representa o número de transações com `transaction_type === "payment"` e `upsell_no === 0`, ou seja, compras do produto principal — excluindo upsells e downsells.

---

## Origem e Extração
- **Fonte**: API Digistore24 — endpoint `listTransactions`
- **Regra de identificação**: Contar transações com `transaction_type === "payment"` e `upsell_no === 0`

---

## O que é upsell_no === 0

O campo `upsell_no` da API Digistore24 identifica a posição do produto no funil:

| upsell_no | Classificação | Conta como Venda? |
|-----------|--------------|-------------------|
| 0 | Produto principal (front offer) | ✅ Sim |
| 1 | Primeiro upsell | ❌ Não |
| 2 | Segundo upsell | ❌ Não |
| ≥ 1 | Qualquer upsell ou downsell | ❌ Não |

---

## Regras

- Contar apenas transações com `transaction_type === "payment"` e `upsell_no === 0`
- Refunds e chargebacks **não reduzem** este contador — ele conta pedidos realizados, independente de devoluções posteriores
- Inclui os três produtos: **Erectus X**, **Slimjara** e **Memoguard**
- O período filtrado segue horário **UTC** (00:00 até 23:59 UTC)

---

## Exemplo Prático

| transaction_type | upsell_no | Produto | Conta como Venda? |
|-----------------|-----------|---------|-------------------|
| payment | 0 | Erectus X - 6 Bottles | ✅ Sim |
| payment | 1 | Slimjara - 3 frascos (upsell) | ❌ Não |
| payment | 0 | Slimjara - 3 Garrafas | ✅ Sim |
| payment | 0 | Memoguard - 6 Capsules | ✅ Sim |
| refund | 0 | Erectus X - 6 Bottles | ❌ Não (não é payment) |

```
Total de Vendas = 3
(o pedido de Erectus X que foi devolvido ainda conta como venda realizada — mas a linha de refund não conta)
```

---

## Importância desta Métrica

Esta contagem é o **denominador mais crítico** do sistema — ela é usada como base para:

| KPI que usa Vendas como denominador | Impacto de erro |
|-------------------------------------|-----------------|
| AOV | Ticket médio errado |
| Refund % e Chargeback % | Taxa de devolução errada |
| CPA | Custo por aquisição errado |

Qualquer transação classificada incorretamente afeta todas essas métricas.

---

## Onde é Exibido
- Cartão KPI "Vendas" no topo do dashboard

---

## Observações
- A identificação via `upsell_no` da API é mais precisa e confiável que a detecção por nome de produto (usada somente como fallback para dados de CSV)
- Devoluções não reduzem a contagem — para ver o impacto de devoluções, usar os KPIs de Refund % e Chargeback %

---

## Implementação no Código

**Arquivo**: `src/lib/transactions.ts`

Função `isFrontSale()` — usa `upsell_no` da API:

```typescript
/**
 * Returns true if this is a front (non-upsell) payment.
 * Uses upsellNo (0 = front) from the API; falls back to name-based detection for CSV data.
 */
export function isFrontSale(t: TransactionRow): boolean {
  if (!isPayment(t)) return false;
  // upsellNo is set by the API normalizer (0 = front) or inferred from name in parseCSV
  return t.upsellNo === 0;
}
```

Contagem de vendas no período:

```typescript
// Front payments = pagamentos com upsell_no === 0
const frontPayments = payTxs.filter((t) => t.upsellNo === 0);
const frontSales    = frontPayments.length;
```

**Arquivo**: `src/utils/digiNormalizer.ts` — normalização de `upsell_no`:

```typescript
// upsell_no: 0 = front offer, 1+ = upsell/downsell position in funnel
const upsellNo = Number(raw["upsell_no"] ?? 0);
```

**Arquivo**: `src/lib/transactions.ts` — fallback para CSV (inferido por nome):

```typescript
// Para CSV (sem campo upsell_no), inferido pelo nome do produto
upsellNo: (!isRefundRow && isUpsellByName(productName)) ? 1 : 0,

function isUpsellByName(productName: string): boolean {
  const n = productName.toLowerCase().trim();
  return /^(up\d|up\(|up |order bump|bump|down\s?\d|down )/.test(n);
}
```

**Exibido em**: `src/pages/Index.tsx` — cartão "Vendas" no topo do dashboard
