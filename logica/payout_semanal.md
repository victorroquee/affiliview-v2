# Componente: Payout Semanal (Saque Digistore24)

## O que é
Motor que projeta o **payout semanal esperado** da Digistore24: quanto o vendedor deve receber em cada sexta-feira de saque, a partir do ledger de eventos de liberação de saldo. O objetivo é **comparar o payout esperado com o valor real que a Digistore paga** (validação manual).

---

## Fórmula

```
Payout da sexta = Σ eventos de saldo em (sexta ativa anterior, esta sexta]
                = liberações de 90% (clear, D+14)
                + liberações de reserva 10% (reserve, D+60)
                + refunds/CB (negativos, na data do estorno)
```

---

## Regras Digistore24

- **Base**: `earned_amount` (líquido do vendedor).
- **Modelo D+14**: de cada pagamento, **90%** libera em **D0 + 14 dias**; os **10%** de reserva liberam em **D0 + 60 dias**.
- **Saque**: **toda sexta-feira**, sem mínimo e sem taxa — varre o saldo inteiro disponível.
- **Cap de 4 saques/mês**: a **5ª sexta** do mês é pulada e o valor rola para a próxima sexta **ativa**.

| Constante | Valor | Significado |
|-----------|-------|-------------|
| `RESERVE_PCT` | `0.10` | 10% retido como reserva |
| `RESERVE_DAYS` | `60` | reserva liberada em D+60 |
| `CLEARING_DAYS` | `14` | 90% liberado em D+14 |
| `PAYOUT_WEEKDAY` | `5` | sexta-feira (`getUTCDay`: 0=Dom … 5=Sex) |
| `MAX_PAYOUTS_PER_MONTH` | `4` | até 4 saques/mês (5ª sexta pulada) |

---

## Passo a Passo

### 1. Ledger por eventos (`buildPayoutEvents`)
Cada transação gera eventos de saldo com uma **data** em que afetam o saldo:
- **Pagamento** → dois eventos:
  - `clear`: `+90% × earned_amount` em **D+14**
  - `reserve`: `+10% × earned_amount` em **D+60**
- **Refund / Chargeback** → um evento `refund`: `earned_amount` (negativo) na **própria data do estorno**.

### 2. Sextas de saque com cap (`listPayoutFridays`)
- Percorre o intervalo dia a dia e coleta as sextas (`getUTCDay === 5`).
- Ordinal da sexta no mês = `floor((dia − 1) / 7)` (0-based) → independe de onde a janela começa.
- Sexta **ativa** se `ordinal < 4`; a 5ª sexta (`ordinal === 4`) é **pulada** (`skippedFridays`).

### 3. Varredura semanal (`computePayoutSchedule`)
- Cada evento é atribuído à **primeira sexta ATIVA ≥ a data do evento** (sextas puladas rolam para a próxima ativa).
- O payout de uma sexta = Σ dos eventos atribuídos a ela (`cleared + reserveReleased + refunds`).

### 4. Schedule resultante (`PayoutSchedule`)
- `weeks[]`: cada `PayoutWeek` com `cleared`, `reserveReleased`, `refunds`, `expectedPayout`.
- `pendingReserve`: reserva ainda retida (D+60 > `asOf`).
- `pendingClearing`: 90% ainda em clearing (D+14 > `asOf`).
- `nextPayoutDate` / `nextPayoutAmount`: próxima sexta ativa > `asOf` e seu valor.
- `totalExpected`: Σ de todas as semanas.
- `skippedFridays`: sextas puladas pelo cap.

---

## Simplificações Declaradas

- **Refund posta o negativo na data do estorno** — não cancela retroativamente a liberação da reserva da venda original. A diferença é só de **timing** perto da fronteira de 60 dias.
- **5ª sexta pulada** (cap de 4/mês) — modelo simplificado do comportamento da Digistore.
- **Feriados não deslocam a sexta** — assume que toda sexta é dia útil de saque.

---

## Exemplo Prático

### Ciclo de um pagamento — earned €1000 em 2026-03-02

| Evento | % | Data do evento | Sexta de pagamento |
|--------|---|----------------|--------------------|
| `clear` | 90% → €900 | 2026-03-16 (D+14) | 1ª sexta ≥ → **2026-03-20** |
| `reserve` | 10% → €100 | 2026-05-01 (D+60) | **2026-05-01** (é sexta) |

### Cap de 4 saques — maio/2026

Maio/2026 tem **5 sextas**: 01, 08, 15, 22, **29**.

| Sexta | Ordinal `floor((dia−1)/7)` | Ativa? |
|-------|----------------------------|--------|
| 01 | 0 | ✅ |
| 08 | 1 | ✅ |
| 15 | 2 | ✅ |
| 22 | 3 | ✅ |
| 29 | 4 | ❌ pulada (rola p/ próxima ativa) |

---

## Auditoria (dados reais)

Auditado em **2026-07-07** sobre **10.463 transações reais** (20.294 eventos): a conservação `totalExpected == earnings` fecha com resíduo **€0,00** e a identidade por semana (`expectedPayout == 90% + reserva + refunds`) vale em todas as sextas. Próximo payout projetado 2026-07-10 = €44.963,52. Detalhes completos e schedule em `logica/auditoria_custos.md`. Rode `npx tsx scripts/audit-payout.ts` para reauditar.

---

## Onde é Usado
- Projeção de payout semanal para comparação com o valor real pago pela Digistore24 (validação manual)

---

## Implementação no Código

**Arquivo**: `src/lib/payout.ts`

- `buildPayoutEvents(rows)` → `PayoutEvent[]` — gera os eventos `clear` (D+14), `reserve` (D+60) e `refund` (data do estorno).
- `listPayoutFridays(start, end)` → `{ date, active }[]` — sextas do intervalo com flag do cap de 4/mês.
- `computePayoutSchedule(rows, { asOf })` → `PayoutSchedule` — varredura semanal, pendências e próxima sexta.

```typescript
// buildPayoutEvents: cada pagamento → clear (D+14) + reserve (D+60)
events.push({ date: addDaysUTC(t.date, CLEARING_DAYS), amount: (1 - RESERVE_PCT) * t.earnings, kind: "clear", ... });
events.push({ date: addDaysUTC(t.date, RESERVE_DAYS),  amount: RESERVE_PCT * t.earnings,       kind: "reserve", ... });
// refund/CB → negativo na própria data
events.push({ date: atMidnightUTC(t.date), amount: t.earnings, kind: "refund", ... });

// listPayoutFridays: ordinal da sexta no mês → cap de 4/mês
const ordinal = Math.floor((cur.getUTCDate() - 1) / 7);
res.push({ date: key(cur), active: ordinal < MAX_PAYOUTS_PER_MONTH });

// computePayoutSchedule: cada evento → 1ª sexta ATIVA ≥ data do evento
const assignFriday = (evKey) => { for (const f of activeFridays) if (f >= evKey) return f; return null; };
```
