# KPI: Status do Afiliado (Scale / Watch / Probation)

## O que é
Classificação automática de qualidade de tráfego de cada afiliado com base na sua taxa combinada de Refund + Chargeback. Define a ação estratégica recomendada para cada afiliado e orienta decisões de escala ou revisão de parceria.

---

## Fórmula

```
Refund+CB % = (Soma dos valores de refunds e chargebacks) / Gross Bruto × 100

SE Refund+CB % ≤ 5%    → Status: "Scale"      → Ação: "CPA aumentar"
SE 5% < R+CB% ≤ 10%    → Status: "Watch"      → Ação: "Fica de olho"
SE Refund+CB % > 10%   → Status: "Probation"  → Ação: "Revisar conta"
```

---

## Base do Cálculo: Refund+CB %

O status depende inteiramente do percentual de devoluções do afiliado. Ver `refund_chargeback.md` para a explicação completa do cálculo.

Resumo da fórmula do Refund+CB %:
- **Numerador**: soma dos valores absolutos de refunds e chargebacks no período
- **Denominador**: Gross Bruto (apenas valores positivos — sem as devoluções)
- A regra de cancelamento de upsell junto com o frontal se aplica aqui

---

## Significado de Cada Status

### Scale (verde) — Refund+CB ≤ 5%
- Tráfego de alta qualidade — clientes satisfeitos e comprometidos com a compra
- Baixo risco operacional e financeiro
- Afiliado confiável e escalável
- **Ação**: Aumentar o CPA para atrair mais volume deste afiliado

### Watch (amarelo) — Refund+CB entre 5% e 10%
- Taxa de devolução moderada — aceitável, mas requer atenção
- Pode indicar tráfego mais agressivo, promessas exageradas ou público com expectativas desalinhadas
- Ainda é lucrativo, mas com risco de piora
- **Ação**: Monitorar evolução. Não aumentar CPA por enquanto. Investigar a fonte do tráfego

### Probation (vermelho) — Refund+CB > 10%
- Taxa de devolução alta — risco real para a operação e para a conta no Digistore
- Pode indicar tráfego de má qualidade, criativos enganosos ou público errado
- Chargebacks acima de 1-2% podem levar a suspensão de conta na plataforma
- **Ação**: Revisar materiais e fontes de tráfego, pausar aumentos de CPA, considerar encerramento da parceria

---

## Regras

- Calculado por afiliado e por período (7d, 14d, 30d, all)
- O mesmo afiliado pode ter status diferente em períodos diferentes
- Inclui os três produtos: **Erectus X**, **Slimjara** e **Memoguard**
- O período filtrado segue horário **UTC** (00:00 até 23:59 UTC)

---

## Exemplo Prático

| Afiliado | Gross Bruto (positivos) | Devoluções | Refund+CB % | Status |
|----------|------------------------|------------|-------------|--------|
| Afiliado A | €5.000 | €180 | 3,6% | Scale ✅ |
| Afiliado B | €3.200 | €240 | 7,5% | Watch ⚠️ |
| Afiliado C | €1.800 | €220 | 12,2% | Probation 🔴 |

---

## Cuidado: Tamanho da Amostra

Para afiliados com poucas vendas, a taxa pode ser distorcida. Exemplo:
- Afiliado novo: 5 vendas, 1 refund → 20% → Probation
- Mas com amostra tão pequena, o status pode ser enganoso

É importante considerar o volume de vendas junto com o status ao tomar decisões.

---

## Onde é Exibido
- Coluna "Status" com badge colorido na tabela de top afiliados
- Página de Afiliados — tabela detalhada
- Tabela de Afiliado × Produto

---

## Observações
- Os thresholds de 5% e 10% são definições de negócio — podem ser revisados conforme a estratégia
- Chargebacks têm peso muito maior que refunds para a plataforma Digistore — um Chargeback % acima de 1-2% já é crítico mesmo que o Refund+CB total esteja abaixo de 10%
- Memoguard deve ter a mesma classificação de status que os outros produtos — as devoluções deste produto também são computadas no cálculo do afiliado

---

## Implementação no Código

**Arquivo**: `src/lib/csvParser.ts` — função `statusFromPct()`

```typescript
function statusFromPct(pct: number): "Scale" | "Watch" | "Probation" {
  return pct > 10 ? "Probation" : pct > 5 ? "Watch" : "Scale";
}
```

O `pct` passado é o `refundCbPct` do afiliado — soma de `refundPct + chargebackPct`, ambos calculados por valor (não por contagem), com denominador `grossBruto`.

Aplicação do status na tabela de top afiliados (calculada em `computeMetrics()`):

```typescript
const topAffiliates: AffiliateRow[] = Array.from(affMap7.entries())
  .map(([name, d]) => {
    // denominador = grossBruto (positivos apenas) — rastreado separadamente de d.gross (net)
    const refundCbPct = d.grossBruto > 0
      ? ((d.refundAmt + d.cbAmt) / d.grossBruto) * 100
      : 0;
    // IMPORTANTE: valor float bruto passado diretamente — sem Math.round()
    // Math.round antes da comparação causaria erros em valores limítrofes:
    // ex: 5.3% arredondado para 5 → Scale (errado, deveria ser Watch)
    // ex: 10.6% arredondado para 11 → correto, mas 10.4% → 10 → Watch (errado, deveria ser Probation)
    const status = statusFromPct(refundCbPct);
    return {
      name,
      gross7d: d.gross,   // net gross (após devoluções)
      // ...
      status,
    };
  })
  .sort((a, b) => b.gross7d - a.gross7d)
  .slice(0, 10);
```

Indicadores visuais de cor definidos em `src/components/Charts.tsx`:

```typescript
// Cores na barra de ranking de afiliados
fill={
  a.status === "Probation" ? RED    // hsl(0, 70%, 52%)
  : a.status === "Watch"   ? YELLOW // hsl(38, 92%, 50%)
  : GREEN                           // hsl(142, 75%, 45%)
}
```

**Exibido em**:
- `src/components/AffiliateTable.tsx` — badge colorido na coluna "Status"
- `src/components/Charts.tsx` — cor das barras no gráfico de ranking de afiliados
- `src/pages/Affiliates.tsx` — tabela de afiliados por produto
