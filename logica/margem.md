# KPI: Margem % (Profit Margin)

## O que é
Percentual de lucro líquido em relação à receita bruta. Indica quanto do Gross realmente sobra como lucro após pagar comissões de afiliado, taxas da plataforma, custo de fabricação do produto e custo de frete — ou seja, captura o impacto de todos os custos da operação.

---

## Fórmula

```
Margem % = (Valor Líquido / Gross) × 100
```

Onde:
- **Valor Líquido** = Earnings - Custo de Produto - Custo de Frete
- **Gross** = Receita bruta total do período

---

## O que está dentro da Margem

A margem captura o impacto de **todas as deduções** da operação:

```
Gross
  ↓ deduz: Comissão Afiliado + Taxas Digistore + Reserva + IVA
= Earnings
  ↓ deduz: Custo de Produto (€3,26 × frascos)
  ↓ deduz: Custo de Frete (tabela por zona)
= Valor Líquido

Margem % = Valor Líquido / Gross × 100
```

---

## Regras

- Calculada por afiliado e por período
- O Gross usado é o total do período (incluindo upsells e devoluções já descontadas)
- O Valor Líquido considera a regra de €20 de desconto no frete Z6 para produtos M
- Inclui os três produtos: **Erectus X**, **Slimjara** e **Memoguard**
- O período filtrado segue horário **UTC** (00:00 até 23:59 UTC)

---

## Thresholds de Qualidade (Exibição Visual)

| Margem | Interpretação | Indicador Visual |
|--------|---------------|-----------------|
| > 30% | Excelente — alta eficiência operacional | Verde |
| 15% – 30% | Boa — operação saudável | Normal |
| < 15% | Atenção — margens apertadas | Amarelo |

---

## Exemplo Prático

| Item | Valor |
|------|-------|
| Gross total (período 7d) | €1.200,00 |
| Earnings (após comissão 50% + fees) | €500,00 |
| Custo Produto (média 4 frascos por pedido, 8 pedidos) | -€104,32 |
| Custo Frete (média Z2, 8 pedidos) | -€84,72 |
| **Valor Líquido** | **€310,96** |
| **Margem %** | **€310,96 / €1.200 × 100 = 25,9%** |

---

## Fatores que Impactam a Margem

| Fator | Impacto na Margem |
|-------|-----------------|
| Afiliado em países Z5/Z7 (frete alto) | Reduz margem |
| Clientes compram pacotes de 1-2 frascos | Frete por frasco fica proporcionalmente mais caro |
| Alta taxa de Refund/Chargeback | Reduz Earnings, piorando a margem |
| Afiliado com alta aceitação de upsells (AOV alto) | Melhora o Gross sem aumentar necessariamente os custos proporcionalmente |
| Países Z6 com desconto de €20 no frete (produtos M) | Melhora levemente a margem |

---

## Onde é Exibido
- Tabela de detalhes por afiliado na página de Afiliados
- Calculado por período (7d, 14d, 30d, all)
- Exibido com cor condicional conforme os thresholds

---

## Observações
- A Margem % é o indicador mais completo de saúde de um afiliado — considera todos os custos, não apenas o custo de aquisição
- Uma margem negativa significa que a operação está no prejuízo — pode acontecer com afiliados que trazem muitos clientes de países Z7 ou com alta taxa de devoluções
- Uma margem de 20-30% é considerada saudável para produtos de suplemento com modelo de comissão alta de afiliados
- Memoguard segue as mesmas regras de cálculo dos outros produtos

---

## Implementação no Código

**Arquivo**: `src/lib/csvParser.ts` — função `toPeriod()` (converte métricas do período para exibição por afiliado)

```typescript
// Margem % = Valor Líquido / Gross × 100
margem: d.gross > 0 ? (d.liq / d.gross) * 100 : 0,
```

Onde:
- `d.liq` — Valor Líquido do afiliado no período (earnings − custo produto − custo frete)
- `d.gross` — Gross líquido de devoluções do afiliado no período

Indicadores visuais de cor definidos em `src/pages/Affiliates.tsx`:

```typescript
const margemColor = d.margem > 30
  ? "text-primary"       // verde — excelente
  : d.margem > 15
  ? "text-foreground"    // neutro — saudável
  : "text-warning";      // amarelo — atenção
```

O denominador usa `d.gross` que agora é o **net gross** (positivos de pagamentos + negativos de refund/CB), garantindo que a margem reflita a realidade após devoluções.

**Exibido em**: `src/pages/Affiliates.tsx` — tabela "Métricas Principais por Afiliado", coluna "Margem", com cor condicional por faixa de valor
