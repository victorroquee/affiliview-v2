# KPI: Status do Afiliado (Scale / Watch / Probation)

## O que é
Classificação automática de qualidade de tráfego de cada afiliado com base na sua taxa combinada de Refund + Chargeback. Define a ação estratégica recomendada para cada afiliado e orienta decisões de escala ou revisão de parceria.

---

## Fórmula

```
Refund+CB % = (refundAmt + cbAmt) / grossBruto × 100

SE Refund+CB % ≤ 5%    → Status: "Scale"      → Ação: "CPA aumentar"
SE 5% < R+CB% ≤ 10%    → Status: "Watch"      → Ação: "Fica de olho"
SE Refund+CB % > 10%   → Status: "Probation"  → Ação: "Revisar conta"
```

> O status do afiliado usa **valor monetário** como base (refundAmt + cbAmt / grossBruto), diferente do cálculo global do KPI de Refund+CB% que usa contagem de transações.

---

## Base do Cálculo

O status depende do percentual de devoluções do afiliado calculado por valor:

- **Numerador**: soma dos valores absolutos de refunds e chargebacks do afiliado no período (`ABS(earned_amount)` para refunds/CB)
- **Denominador**: `grossBruto` do afiliado — soma de `amount` somente das transações `payment` (sem refunds)

> `grossBruto` é rastreado separadamente de `gross` para garantir que o denominador nunca inclua negativos de devoluções.

---

## Significado de Cada Status

### Scale (verde) — Refund+CB ≤ 5%
- Tráfego de alta qualidade — clientes satisfeitos e comprometidos com a compra
- Baixo risco operacional e financeiro
- **Ação**: Aumentar o CPA para atrair mais volume deste afiliado

### Watch (amarelo) — Refund+CB entre 5% e 10%
- Taxa de devolução moderada — aceitável, mas requer atenção
- Ainda é lucrativo, mas com risco de piora
- **Ação**: Monitorar evolução. Não aumentar CPA por enquanto. Investigar a fonte do tráfego

### Probation (vermelho) — Refund+CB > 10%
- Taxa de devolução alta — risco real para a operação e para a conta no Digistore
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

| Afiliado | grossBruto (payments) | refundAmt + cbAmt | Refund+CB % | Status |
|----------|-----------------------|-------------------|-------------|--------|
| Afiliado A | €5.000 | €180 | 3,6% | Scale ✅ |
| Afiliado B | €3.200 | €240 | 7,5% | Watch ⚠️ |
| Afiliado C | €1.800 | €220 | 12,2% | Probation 🔴 |

---

## Cuidado: Tamanho da Amostra

Para afiliados com poucas vendas, a taxa pode ser distorcida. Exemplo:
- Afiliado novo: 5 vendas, 1 refund de €150 em grossBruto de €750 → 20% → Probation
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
- O valor float bruto é passado diretamente para `statusFromPct()` — sem `Math.round()` — para evitar erros em valores limítrofes (ex: 5,3% arredondado para 5 resultaria em Scale incorretamente)

---

## Implementação no Código

**Arquivo**: `src/lib/transactions.ts` — função `statusFromPct()`

```typescript
export function statusFromPct(pct: number): "Scale" | "Watch" | "Probation" {
  return pct > 10 ? "Probation" : pct > 5 ? "Watch" : "Scale";
}
```

Aplicação do status na tabela de top afiliados:

```typescript
// grossBruto: acumulado somente de payTxs (pagamentos positivos)
// refundAmt + cbAmt: acumulado de |earned_amount| de refunds/CB
const rcPct = d.grossBruto > 0
  ? ((d.refundAmt + d.cbAmt) / d.grossBruto) * 100
  : 0;

// Float bruto passado diretamente — sem Math.round()
const status = statusFromPct(rcPct);
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
