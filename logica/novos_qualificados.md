# KPI: Novos Qualificados

## O que é
Contagem de afiliados que atingem uma **média diária** de Gross elevada — identificando quem está operando em alto volume e alta velocidade. Diferente do Activated 2K (que usa um valor absoluto), esta métrica normaliza o resultado pelo número de dias do período, tornando a comparação justa entre períodos diferentes.

---

## Fórmula

```
Novos Qualificados = Contagem de afiliados onde (Gross do afiliado / dias do período) ≥ €1.000/dia
```

---

## Como é Calculado

1. Agrupar o Gross de cada afiliado no período (mesma base do Activated 2K)
2. Identificar o número de dias do período:
   - Se período definido (7d, 14d, 30d): usar esse valor
   - Se período customizado ou não definido: calcular a diferença entre a data mais antiga e a mais recente no conjunto de dados
3. Dividir o Gross de cada afiliado pelo número de dias
4. Contar os afiliados com média diária ≥ €1.000

---

## Regras

- A média diária é calculada sobre o período selecionado, não sobre dias em que o afiliado vendeu
- O número de dias do período segue horário **UTC** (00:00 até 23:59 UTC por dia)
- Usa apenas transações de pagamento (valores positivos)
- Inclui os três produtos: **Erectus X**, **Slimjara** e **Memoguard**
- Afiliados sem nome na planilha são ignorados

---

## Threshold por Período

| Período | Threshold diário | Gross mínimo equivalente |
|---------|-----------------|--------------------------|
| 7 dias | €1.000/dia | €7.000 no período |
| 14 dias | €1.000/dia | €14.000 no período |
| 30 dias | €1.000/dia | €30.000 no período |

---

## Exemplo Prático (período 30 dias)

| Afiliado | Gross 30d | Média Diária | Qualificado? |
|----------|-----------|--------------|--------------|
| Afiliado A | €35.000 | €1.167/dia | ✅ Sim |
| Afiliado B | €29.500 | €983/dia | ❌ Não |
| Afiliado C | €30.000 | €1.000/dia | ✅ Sim (exatamente no threshold) |
| Afiliado D | €8.000 | €267/dia | ❌ Não |

```
Novos Qualificados = 2
```

---

## Diferença para Activated 2K

| Métrica | Threshold | Normaliza | Identifica |
|---------|-----------|-----------|------------|
| **Activated 2K** | ≥ €2.000 total | Não | Afiliado ativo/produtivo |
| **Novos Qualificados** | ≥ €1.000/dia (média) | Sim | Afiliado de alta velocidade |

Um afiliado com €3.000 em 30 dias é Activated 2K, mas **não** é Qualificado (€100/dia, bem abaixo dos €1.000/dia). Um afiliado com €8.000 em 7 dias é Qualificado (€1.143/dia) mas pode não ser Activated em períodos de 30d se ficou inativo.

---

## Onde é Exibido
- Cartão KPI "Novos Qualificados" no topo do dashboard

---

## Observações
- O threshold de €1.000/dia é muito elevado — esta métrica tipicamente mostra poucos ou nenhum afiliado na maioria dos períodos, sendo um indicador de afiliados premium
- Afiliados identificados aqui são candidatos prioritários para aumento de CPA, suporte dedicado e estratégias de escala
- Memoguard deve ter o campo de afiliado preenchido corretamente no CSV para ser contabilizado nesta métrica

---

## Implementação no Código

**Arquivo**: `src/lib/csvParser.ts` — função `computePeriod()`

```typescript
// Número de dias do período:
// - Se período fixo (7d, 14d, 30d): usa o valor passado como parâmetro
// - Se "all" (sem período definido): calcula span real entre a data mais antiga e mais recente
let days = periodDays ?? 30;
if (!periodDays && payTxs.length > 0) {
  const dates = payTxs.map(t => payDates.get(t)).filter(Boolean) as Date[];
  if (dates.length > 1) {
    const span = Math.max(...dates.map(d => d.getTime()))
               - Math.min(...dates.map(d => d.getTime()));
    days = Math.max(1, Math.ceil(span / 86400000)); // converte ms para dias
  }
}

// Contagem de afiliados com média diária >= €1.000
// affGross: mesma Map já calculada para Activated 2K
const novos = Array.from(affGross.values()).filter(v => (v / days) >= 1000).length;
```

- `periodDays` — 7, 14 ou 30 para períodos fixos; `undefined` para "Todo o Período"
- A divisão por `days` normaliza o gross total pelo número de dias, tornando comparável entre períodos
- `86400000` = milissegundos em um dia

**Exibido em**: `src/pages/Index.tsx` — cartão KPI "Novos Qualificados" no topo do dashboard
