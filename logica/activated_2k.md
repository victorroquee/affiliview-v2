# KPI: Activated ≥ €2k (Afiliados Ativados)

## O que é
Contagem de afiliados únicos que receberam pelo menos €2.000 em comissões (`affiliate_amount`) no período selecionado. Indica quantos afiliados estão ativos e produtivos na campanha — o "piso mínimo" de atividade relevante.

---

## Fórmula

```
Activated 2K = Contagem de afiliados onde SUM(affiliate_amount) ≥ €2.000 no período
```

**Fallback** (quando `affiliate_amount` não disponível, ex: dados de CSV):
```
Activated 2K = Contagem de afiliados onde SUM(grossAmount) ≥ €2.000 no período
```

---

## Origem e Extração
- **Fonte**: API Digistore24 — endpoint `listTransactions`
- **Campo principal**: `affiliate_amount` — valor exato da comissão paga ao afiliado por transação
- **Campo de fallback**: `amount` (grossAmount) — usado somente quando `affiliate_amount` está ausente (dados CSV)

---

## Como é Calculado

1. Agrupar todas as transações de pagamento (`transaction_type === "payment"`) por `affiliate_name`
2. Somar o `affiliate_amount` recebido por cada afiliado no período
3. Contar quantos afiliados atingiram €2.000 ou mais

Afiliados com `affiliate_name` vazio são ignorados. Vendas diretas sem afiliado (`"(direto)"`) são ignoradas.

---

## Regras

- Usa `affiliate_amount` (CPA exato pago pela API) — mais preciso que estimar pelo gross
- Fallback automático para gross-based se nenhum dado de `affiliate_amount` estiver disponível
- O threshold de €2.000 é fixo
- Inclui os três produtos: **Erectus X**, **Slimjara** e **Memoguard**
- O período filtrado segue horário **UTC** (00:00 até 23:59 UTC)

---

## Exemplo Prático (período 7 dias)

| Afiliado | SUM(affiliate_amount) | Conta como Activated? |
|----------|-----------------------|----------------------|
| Afiliado A | €2.300,00 | ✅ Sim |
| Afiliado B | €2.000,00 | ✅ Sim (exatamente no threshold) |
| Afiliado C | €1.950,00 | ❌ Não (abaixo do threshold) |
| Afiliado D | €800,00 | ❌ Não |
| (sem nome / direto) | €5.000,00 | ❌ Ignorado |

```
Activated 2K = 2
```

---

## Diferença para Novos Qualificados

| Métrica | Base | Threshold | Normaliza por dias? | Foco |
|---------|------|-----------|---------------------|------|
| **Activated 2K** | affiliate_amount | ≥ €2.000 total | Não | Atividade mínima absoluta |
| **Novos Qualificados** | grossAmount | ≥ €1.000/dia de média | Sim | Alta velocidade e volume |

---

## Onde é Exibido
- Cartão KPI "Activated (≥ €2k)" no topo do dashboard

---

## Observações
- Esta métrica é **sensível ao período selecionado**: o mesmo afiliado pode estar "activated" nos 7d mas não nos 30d se concentrou vendas na semana
- O campo `affiliate_amount` vem diretamente da API — é o valor exato da comissão, não uma estimativa

---

## Implementação no Código

**Arquivo**: `src/lib/transactions.ts` — função `computePeriod()`

```typescript
// Acumula affiliate_amount e gross por afiliado (somente pagamentos)
const affCpa   = new Map<string, number>();
const affGross = new Map<string, number>();
for (const t of payTxs) {
  const n = t.affiliate.trim();
  if (!n) continue;  // ignora afiliados sem nome / direto
  affCpa.set(n,   (affCpa.get(n)   ?? 0) + t.affiliateAmount);
  affGross.set(n, (affGross.get(n) ?? 0) + t.grossAmount);
}

// Usa affiliate_amount se disponível; fallback para gross (dados CSV)
const hasAffiliateAmt = Array.from(affCpa.values()).some((v) => v > 0);
const activated = hasAffiliateAmt
  ? Array.from(affCpa.values()).filter((v) => v >= 2000).length
  : Array.from(affGross.values()).filter((v) => v >= 2000).length;
```

**Arquivo**: `src/utils/digiNormalizer.ts` — normalização de `affiliate_amount`:

```typescript
// affiliateAmount: actual CPA paid to the affiliate for this transaction
const affiliateAmount = parseMoney(raw["affiliate_amount"]);

return {
  // ...
  affiliateAmount,
};
```

**Exibido em**: `src/pages/Index.tsx` — cartão KPI "Activated (≥ €2k)" no topo do dashboard
