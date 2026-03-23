# KPI: Activated ≥ €2k (Afiliados Ativados)

## O que é
Contagem de afiliados únicos que geraram pelo menos €2.000 em Gross no período selecionado. Indica quantos afiliados estão ativos e produtivos na campanha — o "piso mínimo" de atividade relevante para considerar escalar um afiliado.

---

## Fórmula

```
Activated 2K = Contagem de afiliados onde Gross do afiliado ≥ €2.000 no período
```

---

## Como é Calculado

1. Agrupar todas as transações de pagamento (valores positivos) por nome do afiliado
2. Somar o Gross gerado por cada afiliado no período
3. Contar quantos afiliados atingiram o total de €2.000 ou mais

Afiliados sem nome na planilha (campo vazio) são ignorados.

---

## Regras

- Usa o Gross total (vendas frontais + upsells) do afiliado no período
- Afiliados sem identificação na planilha são desconsiderados
- O threshold de €2.000 é fixo — representa um volume mínimo de atividade relevante
- Inclui os três produtos: **Erectus X**, **Slimjara** e **Memoguard**
- O período filtrado segue horário **UTC** (00:00 até 23:59 UTC)

---

## Exemplo Prático (período 7 dias)

| Afiliado | Gross no período | Conta como Activated? |
|----------|------------------|-----------------------|
| Afiliado A | €3.200,00 | ✅ Sim |
| Afiliado B | €2.000,00 | ✅ Sim (exatamente no threshold) |
| Afiliado C | €1.950,00 | ❌ Não (abaixo do threshold) |
| Afiliado D | €800,00 | ❌ Não |
| (sem nome) | €5.000,00 | ❌ Ignorado |

```
Activated 2K = 2
```

---

## Diferença para Novos Qualificados

| Métrica | Threshold | Normaliza por dias? | Foco |
|---------|-----------|---------------------|------|
| **Activated 2K** | ≥ €2.000 total | Não | Atividade mínima absoluta |
| **Novos Qualificados** | ≥ €1.000/dia de média | Sim | Alta velocidade e volume |

Um afiliado pode ser Activated mas não Qualificado (€2.000 em 30 dias = €67/dia) — e vice-versa (raro, mas possível em períodos muito curtos).

---

## Onde é Exibido
- Cartão KPI "Activated (≥ €2k)" no topo do dashboard

---

## Observações
- Esta métrica é **sensível ao período selecionado**: o mesmo afiliado pode estar "activated" nos 7d mas não nos 30d (se concentrou vendas na semana) ou o contrário
- O threshold de €2.000 não diferencia qualidade de tráfego — um afiliado com €2.000 em gross pode ter taxa de refund altíssima. Para qualidade, ver Status (Scale/Watch/Probation)
- Memoguard deve ter o campo de afiliado preenchido corretamente no CSV para ser contabilizado

---

## Implementação no Código

**Arquivo**: `src/lib/csvParser.ts` — função `computePeriod()`

```typescript
// Acumula gross por afiliado (somente pagamentos positivos)
const affGross = new Map<string, number>();
for (const t of payTxs) {
  const n = t.affiliate.trim();
  if (!n) continue;  // ignora afiliados sem nome
  affGross.set(n, (affGross.get(n) ?? 0) + t.grossAmount);
}

// Contagem de afiliados com gross >= €2.000
const activated = Array.from(affGross.values()).filter(v => v >= 2000).length;
```

- `payTxs` — transações de pagamento (positivas) filtradas pelo período
- `t.affiliate` — coluna "affiliate" do CSV do Digistore24
- Afiliados com campo vazio são ignorados pelo `if (!n) continue`

**Exibido em**: `src/pages/Index.tsx` — cartão KPI "Activated (≥ €2k)" no topo do dashboard
