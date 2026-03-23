# KPI: Earnings (Ganhos)

## O que é
O valor que o produtor (vendedor) efetivamente recebe após o Digistore descontar automaticamente a comissão do afiliado, as taxas e reservas da plataforma, e o IVA/VAT. É o dinheiro que "entra na conta" antes de pagar os custos de fulfillment (produto + frete).

---

## Origem e Extração
- **Fonte**: Planilha de exportação do Digistore24
- **Coluna utilizada**: coluna de Earnings presente no export (campo "your earnings")
- Os registros de refunds e chargebacks aparecem como **valores negativos** nessa coluna e já são descontados automaticamente ao somar todos os valores
- Portanto, basta somar **todos os valores da coluna** — os negativos já representam os estornos

---

## Fórmula

```
Earnings = SOMA de todos os valores da coluna Earnings
           (incluindo os negativos de refunds e chargebacks)
```

---

## O que está dentro do Earnings

O Digistore calcula automaticamente, para cada transação:

```
Earnings = Gross - Comissão do Afiliado - Taxa Digistore - Reserva Digistore - IVA/VAT
```

Essa dedução já acontece no próprio sistema do Digistore antes de exportar o arquivo. O app apenas soma os valores já calculados.

---

## Regras

- A soma inclui vendas frontais (produtos M), upsells e os três produtos: **Erectus X**, **Slimjara** e **Memoguard**
- Refunds e chargebacks aparecem na coluna como valores negativos e são incluídos na soma (reduzindo o total automaticamente)
- Não é necessário filtrar linhas — todos os registros da coluna são somados
- O período filtrado segue horário **UTC**: do início do dia (00:00 UTC) até o fim do dia (23:59 UTC) da janela selecionada

---

## Exemplo Prático

| Tipo | Gross | Earnings (após dedução Digistore) |
|------|-------|----------------------------------|
| Venda frontal Erectus X (comissão 50% afiliado) | +€150 | +€65,00 |
| Upsell Slimjara | +€80 | +€34,00 |
| Venda frontal Memoguard | +€90 | +€39,00 |
| Refund Erectus X | -€150 | -€65,00 |
| Chargeback Slimjara | -€80 | -€34,00 |

```
Earnings = €65 + €34 + €39 + (-€65) + (-€34) = €39,00
```

---

## Relação com Outras Métricas

| Relação | Fórmula |
|---------|---------|
| Diferença Gross vs Earnings | Gross - Earnings = custo afiliado + plataforma |
| CPA | (Gross - Earnings) / Vendas Frontais |
| Valor Líquido | Earnings - Custo Produto - Custo Frete |

---

## Onde é Exibido
- Cartão KPI no topo do dashboard
- Detalhamento dentro do componente "Valor Líquido" como ponto de partida

---

## Observações
- Earnings é o **ponto de partida** para o cálculo do Valor Líquido — após este passo, ainda é necessário descontar os custos de fulfillment
- Em períodos com muitos refunds/chargebacks, o Earnings pode ser significativamente menor que o Gross
- Memoguard segue as mesmas regras de extração e cálculo dos outros produtos

---

## Implementação no Código

**Arquivo**: `src/lib/csvParser.ts` — função `computePeriod()`

```typescript
// Earnings = soma dos ganhos de pagamentos + ganhos (negativos) de refunds/chargebacks
const earnings = payTxs.reduce((s, t) => s + t.earnings, 0)
               + refCbTxs.reduce((s, t) => s + t.earnings, 0);
```

- `payTxs` — transações de pagamento filtradas pelo período
- `refCbTxs` — transações de refund/chargeback filtradas pelo mesmo período
- `t.earnings` — coluna "your earnings" do CSV exportado pelo Digistore24

Os valores de earnings das linhas de refund/chargeback já vêm negativos no CSV — a soma direta de ambos os grupos produz o earnings líquido automático.

**Exibido em**: `src/pages/Index.tsx` — cartão "Earnings" no topo do dashboard, e como ponto de partida no breakdown do Valor Líquido
