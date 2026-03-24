# KPI: Novos Qualificados

## O que é
Contagem de afiliados que atingem uma **média diária** de Gross elevada — identificando quem está operando em alto volume e alta velocidade. Diferente do Activated 2K (que usa um valor absoluto de comissão), esta métrica normaliza o resultado pelo número de dias do período, tornando a comparação justa entre períodos diferentes.

---

## Fórmula

```
Novos Qualificados = Contagem de afiliados onde (grossAmount do afiliado / dias do período) ≥ €1.000/dia
```

---

## Origem e Extração
- **Fonte**: API Digistore24 — campo `amount` (grossAmount) por afiliado (`affiliate_name`)
- Usa a mesma estrutura `affGross` calculada para o Activated 2K
- Usa apenas transações com `transaction_type === "payment"`

---

## Como é Calculado

1. Agrupar o `grossAmount` de cada afiliado no período (somente pagamentos)
2. Identificar o número de dias do período:
   - Se período definido (7d, 30d): usar esse valor
   - Se período não definido ("all"): calcular a diferença entre a data mais antiga e a mais recente nas transações
3. Dividir o grossAmount de cada afiliado pelo número de dias
4. Contar os afiliados com média diária ≥ €1.000

---

## Regras

- A média diária é calculada sobre o período selecionado, não sobre dias em que o afiliado vendeu
- O número de dias do período segue horário **UTC** (00:00 até 23:59 UTC por dia)
- Usa apenas transações de pagamento (valores positivos)
- Inclui os três produtos: **Erectus X**, **Slimjara** e **Memoguard**
- Afiliados sem nome (`affiliate_name` vazio) são ignorados

---

## Threshold por Período

| Período | Threshold diário | Gross mínimo equivalente |
|---------|-----------------|--------------------------|
| 7 dias | €1.000/dia | €7.000 no período |
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

| Métrica | Base | Threshold | Normaliza | Identifica |
|---------|------|-----------|-----------|------------|
| **Activated 2K** | affiliate_amount | ≥ €2.000 total | Não | Afiliado com CPA acumulado relevante |
| **Novos Qualificados** | grossAmount | ≥ €1.000/dia (média) | Sim | Afiliado de alta velocidade e volume |

---

## Onde é Exibido
- Cartão KPI "Novos Qualificados" no topo do dashboard

---

## Observações
- O threshold de €1.000/dia é muito elevado — esta métrica tipicamente mostra poucos ou nenhum afiliado na maioria dos períodos, sendo um indicador de afiliados premium
- Afiliados identificados aqui são candidatos prioritários para aumento de CPA, suporte dedicado e estratégias de escala

---

## Implementação no Código

**Arquivo**: `src/lib/transactions.ts` — função `computePeriod()`

```typescript
// Número de dias do período:
let days = periodDays ?? 30;
if (!periodDays && payTxs.length > 1) {
  // Evita spread operator em arrays grandes (stack overflow com 65k+ args no V8)
  let minT = payTxs[0]!.date.getTime();
  let maxT = minT;
  for (const t of payTxs) {
    const ms = t.date.getTime();
    if (ms < minT) minT = ms;
    if (ms > maxT) maxT = ms;
  }
  days = Math.max(1, Math.ceil((maxT - minT) / 86400000)); // converte ms para dias
}

// affGross: mesma Map já calculada para Activated 2K
// Contagem de afiliados com média diária >= €1.000
const novos = Array.from(affGross.values()).filter(
  (v) => v / days >= 1000
).length;
```

- `periodDays` — 7 ou 30 para períodos fixos; `undefined` para "Todo o Período"
- A divisão por `days` normaliza o gross total pelo número de dias
- `86400000` = milissegundos em um dia

**Exibido em**: `src/pages/Index.tsx` — cartão KPI "Novos Qualificados" no topo do dashboard
