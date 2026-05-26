# KPI: Gross Revenue (Receita Bruta)

## O que e

Receita bruta de TODOS os pagamentos no periodo selecionado. Representa o valor total pago pelos clientes (incluindo IVA/VAT) em transacoes do tipo `payment` (front + upsells + bumps). Alinhado com o "Gross Amount" do dashboard Digistore24 que inclui upsells.

---

## Origem e Extracao
- **Fonte**: API Digistore24 — endpoint `listTransactions`
- **Campo utilizado**: `amount` — valor bruto pago pelo comprador (inclui VAT)
- **Filtro**: transacoes com `transaction_type === "payment"` — **todos** os valores de `upsell_no` (front + upsells + bumps)
- Upsells e bumps (upsell_no >= 1) **entram** no Gross Revenue — alinhado com Digistore24 "Gross Amount" (Phase 8 correcao)
- Refunds e chargebacks **nao** afetam o Gross

---

## Formula

```
Gross Revenue = SUM(amount WHERE payment — ALL upsell_no values)
              = payTxs.reduce(grossAmount)
```

> **Nota (Phase 8 correcao):** Anteriormente, Gross usava apenas pagamentos frontais (upsell_no=0). Corrigido para incluir todos os pagamentos, alinhando com "Gross Amount" do Digistore24. A diferenca era de -13.4%.

---

## Diferenca entre `gross` e `grossBruto`

| Campo | Escopo | Uso |
|-------|--------|-----|
| `gross` | Todos os pagamentos (front + upsells) | KPI display, alinhado com Digistore |
| `grossBruto` | Alias de gross | Backward compat, taxas de reembolso internas |

> Desde Phase 8, `gross === grossBruto`. Ambos incluem front + upsells.

---

## Regras

- Inclui TODOS os pagamentos (front + upsells + bumps) — alinhado com Digistore24
- Inclui todos os produtos: **Slimjara**, **LipoGandha**, **LipoSkin**, **Erectus X**, **MemoGuard**
- Refunds e chargebacks nao reduzem o Gross — seu impacto vai para o Earnings via `earned_amount` negativo
- O periodo filtrado segue horario **UTC**

---

## Exemplo Pratico

| Tipo | transaction_type | upsell_no | amount | Entra no Gross? |
|------|-----------------|-----------|--------|-----------------|
| Venda frontal | payment | 0 | €150,00 | Sim |
| Upsell | payment | 1 | €80,00 | Sim (Phase 8 correcao) |
| Venda frontal | payment | 0 | €90,00 | Sim |
| Refund | refund | 0 | €150,00 | Nao (refund) |

```
Gross Revenue = €150 + €80 + €90 = €320,00
```

---

## Onde e Exibido
- Cartao KPI "Gross Revenue" no topo do dashboard
- Grafico diario de gross (area chart)

---

## Implementacao no Codigo

**Arquivo**: `src/lib/transactions.ts` — funcao `computePeriod()`

```typescript
const grossBruto = payTxs.reduce((s, t) => s + t.grossAmount, 0);
const gross = grossBruto; // alinhado com Digistore24 Gross Amount
```

**Exibido em**: `src/pages/Dashboard.tsx` — cartao "Gross Revenue"
