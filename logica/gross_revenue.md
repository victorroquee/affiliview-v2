# KPI: Gross Revenue (Receita Bruta)

## O que é
Receita bruta total gerada pelas vendas no período selecionado. Representa o valor total pago pelos clientes antes de qualquer dedução de comissões, taxas ou custos operacionais. Inclui vendas frontais (produtos M) e upsells aceitos pelo cliente.

---

## Origem e Extração
- **Fonte**: Planilha de exportação do Digistore24
- **Coluna utilizada**: Coluna **H** — "Gross Total"
- Os valores negativos presentes nessa coluna (referentes a refunds e chargebacks) são **somados normalmente**, o que faz com que automaticamente reduzam o total bruto
- Não há filtragem prévia: todos os registros da coluna H são somados

---

## Fórmula

```
Gross Revenue = SOMA de todos os valores da coluna H (Gross Total)
```

Os valores negativos (refunds e chargebacks) já estão na coluna H e reduzem automaticamente o total. Portanto o Gross já é **líquido de devoluções**.

---

## Regras

- Inclui vendas frontais (produtos M) e upsells
- Inclui os três produtos: **Erectus X**, **Slimjara** e **Memoguard**
- Valores negativos (refunds e chargebacks) são considerados na soma e reduzem o total
- O período filtrado segue horário **UTC**: do início do dia (00:00 UTC) até o fim do dia (23:59 UTC) da janela selecionada

---

## Exemplo Prático

| Tipo | Descrição | Valor (coluna H) |
|------|-----------|-----------------|
| Venda frontal | Erectus X - 6 frascos | +€150,00 |
| Upsell | Slimjara - 3 frascos | +€80,00 |
| Venda frontal | Memoguard - 3 frascos | +€90,00 |
| Refund | Devolução Erectus X | -€150,00 |
| Chargeback | Contestação Slimjara | -€80,00 |

```
Gross Revenue = €150 + €80 + €90 + (-€150) + (-€80) = €90,00
```

---

## Onde é Exibido
- Cartão KPI principal no topo do dashboard
- Comparativo entre períodos (ex: 7 dias vs 30 dias)

---

## Observações
- O Gross é a métrica de topo de funil — reflete o volume bruto de receita, já descontando devoluções
- Não representa lucro — ainda é necessário deduzir comissões, taxas da plataforma e custos de fulfillment para chegar ao lucro real
- Para análise de lucratividade real, ver o KPI **Valor Líquido**
- Memoguard segue as mesmas regras de extração que Erectus X e Slimjara, mesmo que ainda não apareça na interface do sistema

---

## Implementação no Código

**Arquivo**: `src/lib/csvParser.ts` — função `computePeriod()`

```typescript
// Gross bruto = soma apenas dos pagamentos positivos (usado para AOV e Refund%)
const grossBruto = payTxs.reduce((s, t) => s + t.grossAmount, 0);

// Gross líquido = grossBruto + negativos de refunds e chargebacks
const gross = grossBruto + refCbTxs.reduce((s, t) => s + t.grossAmount, 0);
```

- `payTxs` — transações de pagamento filtradas pelo período (apenas positivas)
- `refCbTxs` — transações de refund/chargeback filtradas pelo mesmo período (valores negativos)
- `t.grossAmount` — coluna H do CSV exportado pelo Digistore24

O `grossBruto` (somente positivos) é usado internamente como denominador para AOV e Refund+CB%. O `gross` (líquido de devoluções) é o valor exibido no cartão KPI do dashboard.

**Exibido em**: `src/pages/Index.tsx` — cartão "Gross" com sub-info de grossBruto
