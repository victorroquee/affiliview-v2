# KPI: CPA (Custo por Aquisição)

## O que é
Custo médio para adquirir uma venda frontal. Representa tudo que foi pago a terceiros por cada pedido realizado: a comissão do afiliado mais todas as taxas e reservas cobradas pelo Digistore. É um indicador direto da eficiência de custo de cada afiliado.

---

## Fórmula

```
CPA = (Gross - Earnings) / Quantidade de Vendas Frontais (produtos M)
```

---

## O que está dentro do CPA

A diferença entre Gross e Earnings representa todos os valores retidos pelo Digistore antes de repassar ao produtor:

```
Gross - Earnings = Comissão do Afiliado + Taxas Digistore + Reserva Digistore + IVA/VAT
```

Ao dividir pelo número de vendas frontais, obtemos quanto custou, em média, cada pedido em termos de terceiros.

---

## Regras

- O Gross usado é o valor positivo (receita gerada) — refunds e chargebacks impactam o earnings mas o denominador (vendas) não é reduzido por devoluções
- O denominador conta apenas **produtos M** (vendas frontais) — sem upsells, downsells ou order bumps
- Inclui os três produtos: **Erectus X**, **Slimjara** e **Memoguard**
- O período filtrado segue horário **UTC** (00:00 até 23:59 UTC)

---

## Exemplo Prático

| Item | Valor |
|------|-------|
| Gross Total (5 vendas frontais + upsells) | €950,00 |
| Earnings Total (após dedução Digistore) | €380,00 |
| Gross − Earnings | €570,00 |
| Quantidade de Produtos M (vendas frontais) | 5 |
| **CPA** | **€114,00 por venda** |

Interpretação: cada venda custou €114 em comissão de afiliado e taxas da plataforma.

---

## Relação com Outras Métricas

| Métrica | Diferença em relação ao CPA |
|---------|---------------------------|
| **Valor Líquido** | Desconta também o custo de produto e frete — CPA não inclui esses custos |
| **Margem %** | Usa o Valor Líquido como numerador — CPA é apenas o custo de aquisição, não o lucro |
| **AOV** | Ticket médio — quanto maior o AOV em relação ao CPA, melhor a margem |

---

## Onde é Exibido
- Tabela de detalhes por afiliado na página de Afiliados
- Calculado por período (7d, 14d, 30d, all)
- Não aparece nos KPI cards principais do dashboard

---

## Observações
- O CPA **não inclui** custos de fulfillment (produto + frete) — para o custo total por aquisição, é necessário somar o custo médio de fulfillment por pedido
- Em países com IVA mais elevado (ex: alguns países Z3 e Z5), o CPA será naturalmente maior mesmo que a comissão do afiliado seja a mesma
- Um CPA mais baixo com AOV alto é a combinação ideal — indica que o afiliado traz clientes de alto valor com custo de aquisição eficiente
- Memoguard segue as mesmas regras de cálculo dos outros produtos

---

## Implementação no Código

**Arquivo**: `src/lib/csvParser.ts` — função `toPeriod()` (converte métricas do período para exibição por afiliado)

```typescript
// CPA = (gross - earnings) / vendas frontais
cpa: d.sales > 0 ? (d.gross - d.earnings) / d.sales : 0,
```

Onde:
- `d.gross` — receita bruta do afiliado no período (líquida de devoluções)
- `d.earnings` — ganhos do produtor após deduções do Digistore
- `d.sales` — contagem de produtos M (vendas frontais) do afiliado

O cálculo usa `d.gross` = **net gross** (pagamentos − refund/CB negatives) e `d.earnings` = **net earnings** (incluindo estornos de comissão de refunds/CBs), ambos corrigidos em `buildAffDetail()`. Isso garante que o CPA reflita o custo líquido real de aquisição — descontando o que foi devolvido pelos afiliados nos estornos.

**Exibido em**: `src/pages/Affiliates.tsx` — tabela "Métricas Principais por Afiliado", coluna "CPA (€)", por período selecionado
