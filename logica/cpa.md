# KPI: CPA (Custo por Aquisição)

## O que é
Custo médio para adquirir uma venda frontal. Representa a comissão paga ao afiliado por cada pedido realizado. Com a API Digistore24, usa o campo exato `affiliate_amount` — sem estimativa.

---

## Fórmula

### Primária (API — usa affiliate_amount exato):
```
CPA = SUM(affiliate_amount WHERE payment) / Quantidade de Vendas Frontais (upsell_no === 0)
```

### Fallback (quando affiliate_amount indisponível, ex: dados CSV):
```
CPA = (Gross − Earnings) / Quantidade de Vendas Frontais
```

---

## Campos utilizados

| Campo API | Descrição |
|-----------|-----------|
| `affiliate_amount` | Comissão exata paga ao afiliado por transação (`payment`) |
| `upsell_no` | 0 = venda frontal (denominador); ≥ 1 = upsell (excluído do denominador) |

---

## O que está dentro do CPA (fórmula de fallback)

A diferença entre Gross e Earnings representa todos os valores retidos pelo Digistore antes de repassar ao produtor:

```
Gross − Earnings = Comissão do Afiliado + Taxas Digistore + Reserva Digistore + IVA/VAT
```

Ao usar `affiliate_amount` diretamente (fórmula primária), o CPA representa **apenas a comissão do afiliado**, sem incluir taxas da plataforma.

---

## Regras

- O denominador conta apenas **vendas frontais** (`upsell_no === 0`) — sem upsells, downsells
- Inclui os três produtos: **Erectus X**, **Slimjara** e **Memoguard**
- O período filtrado segue horário **UTC** (00:00 até 23:59 UTC)

---

## Exemplo Prático

| Item | Valor |
|------|-------|
| SUM(affiliate_amount) — 5 vendas frontais | €380,00 |
| Quantidade de Produtos M (upsell_no = 0) | 5 |
| **CPA (primário)** | **€76,00 por venda** |

Interpretação: cada venda frontal custou €76 em comissão direta ao afiliado.

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
- Com a API, o CPA usa `affiliate_amount` exato — é mais preciso que a estimativa `(gross - earnings) / sales` do CSV
- O fallback `(gross - earnings)` inclui taxas da plataforma além da comissão — superestima o CPA comparado ao `affiliate_amount` direto

---

## Implementação no Código

**Arquivo**: `src/lib/transactions.ts` — cálculo de CPA por afiliado (`topAffiliates`)

```typescript
// CPA: usa affiliate_amount real se disponível; fallback para estimativa via gross-earnings
const cpa = d.sales > 0
  ? (d.affiliateAmt > 0 ? d.affiliateAmt / d.sales : (d.gross - d.earnings) / d.sales)
  : 0;
```

Onde:
- `d.affiliateAmt` — soma de `affiliate_amount` do afiliado no período (campo direto da API)
- `d.sales` — contagem de vendas frontais (`upsell_no === 0`) do afiliado
- `d.gross` / `d.earnings` — usados apenas como fallback quando `affiliateAmt === 0`

**Arquivo**: `src/utils/digiNormalizer.ts` — normalização de `affiliate_amount`:

```typescript
// affiliateAmount: actual CPA paid to the affiliate for this transaction
const affiliateAmount = parseMoney(raw["affiliate_amount"]);

return {
  // ...
  affiliateAmount,
};
```

**Exibido em**: `src/pages/Affiliates.tsx` — tabela "Métricas Principais por Afiliado", coluna "CPA (€)", por período selecionado
