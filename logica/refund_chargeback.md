# KPI: Refund % e Chargeback % (Taxa de Devolução e Contestação)

## O que são

- **Refund**: Devolução solicitada pelo cliente diretamente ao produtor/plataforma (reembolso voluntário)
- **Chargeback**: Contestação iniciada pelo cliente junto ao banco/operadora do cartão (dispute bancário)
- **Refund + CB %**: Percentual combinado das duas situações em relação ao volume de vendas — principal indicador de qualidade de tráfego de um afiliado

---

## Origem e Extração
- **Fonte**: Planilha de exportação do Digistore24
- Refunds e chargebacks aparecem como **linhas com valores negativos** na planilha
- O tipo da transação (refund, return, reversal, chargeback) identifica a natureza de cada devolução

---

## Fórmula

```
Refund + CB % = (Soma dos valores absolutos de Refunds + Chargebacks) / Gross Bruto × 100
```

Onde:
- **Numerador**: Soma dos valores absolutos de todas as linhas de refund e chargeback no período
- **Denominador**: **Gross Bruto** — receita bruta total **sem** descontar os refunds e chargebacks (ou seja, apenas os valores positivos da coluna H)

> Esta fórmula mede a proporção de devoluções em relação ao que foi gerado de receita positiva, sem a distorção de subtrair as próprias devoluções do denominador.

---

## Regra Especial: Cancelamento com Upsell

Quando um pedido frontal é cancelado (refund ou chargeback), **o upsell vinculado ao mesmo pedido também deve ser cancelado e contabilizado na taxa**.

Ou seja: se um cliente comprou um produto M (frontal) + aceitou um upsell, e solicitou devolução do pedido, tanto o valor do frontal quanto o valor do upsell entram no numerador da taxa de refund/chargeback.

**Regra**: o cancelamento é do **pedido inteiro**, não apenas da linha de venda frontal.

---

## Como Identificar Refunds e Chargebacks

| Tipo | Como aparece na planilha |
|------|--------------------------|
| Refund | Linha com valor negativo, tipo: `return`, `refund` ou `reversal` |
| Chargeback | Linha com valor negativo, tipo: `chargeback` |

---

## Regras

- O denominador usa o **Gross Bruto** (somente valores positivos da coluna H) — sem desconto de devoluções
- Quando um frontal é cancelado, o upsell correspondente ao mesmo pedido também deve ser incluído no numerador
- Inclui os três produtos: **Erectus X**, **Slimjara** e **Memoguard**
- O período filtrado segue horário **UTC** (00:00 até 23:59 UTC)

---

## Exemplo Prático

| Tipo | Produto | Valor |
|------|---------|-------|
| Venda frontal | Erectus X 6 frascos | +€150,00 |
| Upsell (mesmo pedido) | Slimjara 3 frascos | +€80,00 |
| Venda frontal | Memoguard 3 frascos | +€90,00 |
| Venda frontal | Slimjara 6 frascos | +€120,00 |
| Refund frontal | Erectus X 6 frascos | -€150,00 |
| Refund upsell (mesmo pedido cancelado) | Slimjara 3 frascos | -€80,00 |

```
Gross Bruto (somente positivos) = €150 + €80 + €90 + €120 = €440,00

Soma dos refunds/CBs = €150 + €80 = €230,00

Refund + CB % = €230 / €440 × 100 = 52,3%
```

> Neste exemplo extremo, o pedido com upsell foi cancelado integralmente — ambos os valores entram no numerador.

---

## Thresholds de Qualidade (Status do Afiliado)

| Faixa | Status | Ação Recomendada |
|-------|--------|-----------------|
| ≤ 5% | **Scale** (verde) | Aumentar CPA |
| 5% – 10% | **Watch** (amarelo) | Manter vigilância |
| > 10% | **Probation** (vermelho) | Revisar conta |

---

## Diferença entre Refund e Chargeback

| Característica | Refund | Chargeback |
|----------------|--------|------------|
| Iniciado por | Cliente (via produtor/plataforma) | Cliente (via banco/cartão) |
| Impacto financeiro | Devolução do valor | Devolução + possível multa |
| Risco para conta Digistore | Baixo | Alto — pode suspender conta |

---

## Onde é Exibido
- Cartão KPI "Refund + CB" no topo do dashboard (valor combinado)
- Breakdown separado de Refund % e CB % abaixo do valor principal
- Por afiliado na tabela de top afiliados e na página de Afiliados

---

## Observações
- Um Chargeback % acima de 1-2% já é sinal de alerta crítico para a plataforma Digistore
- A regra de cancelar frontal + upsell juntos evita subestimar o impacto real de devoluções no resultado
- Memoguard segue as mesmas regras de classificação dos outros produtos

---

## Implementação no Código

**Arquivo**: `src/lib/csvParser.ts` — função `computePeriod()`

Identificação de refunds e chargebacks:

```typescript
const isRefund = (t: TransactionRow): boolean =>
  ["return", "refund", "reversal"].includes(t.transactionType);

const isChargeback = (t: TransactionRow): boolean =>
  t.transactionType === "chargeback";
```

Cálculo da taxa por valor (denominador = grossBruto, não contagem de vendas):

```typescript
// Soma dos valores absolutos de refunds e chargebacks
const refundAmt = refCbTxs.filter(isRefund)
  .reduce((s, t) => s + Math.abs(t.grossAmount), 0);

const cbAmt = refCbTxs.filter(isChargeback)
  .reduce((s, t) => s + Math.abs(t.grossAmount), 0);

// Divisor = grossBruto (somente positivos — sem descontar devoluções)
const rPct = grossBruto > 0 ? (refundAmt / grossBruto) * 100 : 0;
const cPct = grossBruto > 0 ? (cbAmt     / grossBruto) * 100 : 0;
```

O `refCbTxs` contém todas as linhas de devolução do período — tanto dos frontais quanto dos upsells do mesmo pedido, pois o Digistore gera uma linha de devolução por produto cancelado. A soma total automática já reflete a regra de cancelamento de pedido inteiro (frontal + upsell).

**Denominador correto na tabela de afiliados** (`buildAffDetail` + `toPeriod`):

```typescript
// grossBruto é rastreado separadamente — acumulado apenas de payTxs (positivos)
e.grossBruto += t.grossAmount; // apenas nos pagamentos

// No toPeriod(), o denominador usa grossBruto, não o net gross
const rcPct = d.grossBruto > 0 ? ((d.refundAmt + d.cbAmt) / d.grossBruto) * 100 : 0;
```

Isso garante que o denominador seja sempre o **grossBruto** (somente positivos), mesmo após aplicar os ajustes negativos de refund/CB ao `d.gross` para outras métricas.

**Exibido em**: `src/pages/Index.tsx` — cartão "Refund+CB%" com breakdown separado, e por afiliado em `src/pages/Affiliates.tsx`
