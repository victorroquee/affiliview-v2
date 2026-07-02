# KPI: Margem % (Profit Margin)

## O que é
Percentual de lucro líquido em relação à receita bruta do afiliado. Indica quanto do Gross realmente sobra como lucro após pagar comissões de afiliado, taxas da plataforma, custo de fabricação do produto e custo de frete — captura o impacto de todos os custos da operação.

---

## Fórmula

```
Margem % = (Valor Líquido / Gross) × 100
```

Onde:
- **Valor Líquido** = `SUM(earned_amount)` de todos os pagamentos (front + upsells + bumps) + refunds/CB (negativos) − COGS, onde COGS front = produto + frete e COGS upsell = apenas produto (mesmo pacote, sem frete)
- **Gross** = `SUM(grossAmount)` do afiliado (somente pagamentos — gross é net de devoluções via earned_amount)

---

## O que está dentro da Margem

A margem captura o impacto de **todas as deduções** da operação:

```
amount (gross)
  ↓ deduz: affiliate_amount + Taxas Digistore + Reserva + IVA
= earned_amount
  ↓ deduz: Custo de Produto (custo/frasco por produto × frascos) — front + upsells
  ↓ deduz: Custo de Frete (tabela por zona vat_country) — apenas front (upsells no mesmo pacote)
  ↓ deduz: Custo de Capital + provisão (~0,33% do gross por pagamento)
= Valor Líquido

Margem % = Valor Líquido / Gross × 100
```

---

## Regras

- Calculada por afiliado e por período
- O denominador `d.gross` é o gross acumulado somente de pagamentos — refunds/CB não alteram o gross diretamente
- O Valor Líquido considera a regra de €20 de desconto no frete Z6 para `upsell_no === 0`
- Inclui todos os produtos: **Erectus X**, **Slimjara**, **Memoguard**, **LipoGandha**, **LipoSkin**
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
| earned_amount (após comissão 50% + fees) | €500,00 |
| Custo Produto (32 frascos; custo/frasco varia por produto, aqui ~€3,26 ilustrativo) | -€104,32 |
| Custo Frete (média Z2, 8 pedidos) | -€84,48 |
| **Valor Líquido** | **€311,20** |
| **Margem %** | **€311,20 / €1.200 × 100 = 25,9%** |

---

## Fatores que Impactam a Margem

| Fator | Impacto na Margem |
|-------|-----------------|
| Afiliado em países Z5/Z7 (frete alto) | Reduz margem |
| Clientes compram pacotes de 1-2 frascos | Frete por frasco fica proporcionalmente mais caro |
| Alta taxa de Refund/Chargeback | Reduz earned_amount, piorando a margem |
| Afiliado com alta aceitação de upsells (AOV alto) | Melhora o Gross; cada upsell é um frasco físico adicional que gera Custo de Produto (sem frete extra — mesmo pacote), então a margem melhora, mas menos do que se os upsells fossem sem COGS |
| Países Z6 com desconto de €20 no frete (upsell_no=0) | Melhora levemente a margem |

---

## Onde é Exibido
- Tabela de detalhes por afiliado na página de Afiliados
- Calculado por período (7d, 14d, 30d, all)
- Exibido com cor condicional conforme os thresholds

---

## Implementação no Código

**Arquivo**: `src/lib/transactions.ts` — cálculo de margem por afiliado (`topAffiliates`)

```typescript
// Margem % = Valor Líquido / Gross × 100
margem: d.gross > 0 ? (d.liq / d.gross) * 100 : 0,
```

Onde:
- `d.liq` — Valor Líquido do afiliado no período (`earned_amount` − COGS de pagamentos + `earned_amount` negativo de refunds/CB)
- `d.gross` — gross acumulado somente de pagamentos do afiliado

Indicadores visuais de cor definidos em `src/pages/Affiliates.tsx`:

```typescript
const margemColor = d.margem > 30
  ? "text-primary"       // verde — excelente
  : d.margem > 15
  ? "text-foreground"    // neutro — saudável
  : "text-warning";      // amarelo — atenção
```

**Exibido em**: `src/pages/Affiliates.tsx` — tabela "Métricas Principais por Afiliado", coluna "Margem", com cor condicional por faixa de valor
