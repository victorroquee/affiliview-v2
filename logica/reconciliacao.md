# Componente: Reconciliação de Payout (Net → Transfer)

## O que é
Camada de **conferência financeira** sobre o Payout Semanal. Enquanto o
`payout_semanal.md` projeta o **Net Amount** esperado (o que a Digistore24 paga),
esta camada leva até o **Transfer Amount** — o valor que efetivamente cai na conta
bancária — e detecta **anomalias** de payout (semanas em que o recebido ficou muito
abaixo do esperado ou foi zerado).

Vive na página **Payout & Reconciliação** (`src/pages/Payout.tsx`), estendendo a
tabela semanal existente. Origem: relatório de alinhamento §3.3, §4.3 e §7.1.

---

## Fórmula (relatório §3.3)

```
Transfer Amount (o que cai na conta)
    = Net Amount (payout esperado da semana)
    − Invoice ShipOffers da semana
    − SEPA Transfer Fee (€2,50 fixo por saque)
```

Validação com o Overview #018 real (relatório §9.2):

```
Net Amount    51.316,98
ShipOffers  − 50.357,93
SEPA        −      2,50
──────────────────────
Transfer         956,55   ✓
```

Coberto pelo teste `REC-TA-01`.

---

## Entradas manuais vs. computadas

| Campo | Origem | Onde |
|-------|--------|------|
| Esperado (Net) | **Computado** — `computePayoutSchedule()` (ledger D+14/D+60) | `payout.ts` |
| 90% / Reserva / Refunds | **Computado** — breakdown do Net esperado | `payout.ts` |
| **Real (Net)** | **Manual** — Net Amount que a Digistore realmente pagou na semana | tabela Payout |
| **ShipOffers** | **Manual** — invoice ShipOffers da semana (fonte: e-mail/portal ShipOffers) | tabela Payout |
| SEPA | **Constante** — `SEPA_FEE = 2.50` | `payout.ts` |
| Δ Net | **Computado** — `Esperado − Real` | `Payout.tsx` |
| Transfer (est.) | **Computado** — `computeTransferAmount(Esperado, ShipOffers)` | `payout.ts` |
| Status (anomalia) | **Computado** — `classifyPayoutAnomaly(Esperado, Real)` | `payout.ts` |

Os valores manuais são em **EUR** (a Digistore paga em EUR, independentemente da
moeda de exibição do app) e persistem por sexta de saque.

---

## Detecção de anomalia (relatório §4.3)

Compara o **Net real recebido** com o **Net esperado** da semana:

```
ratio = Real ÷ Esperado
```

| Nível | Condição | Cor | Significado |
|-------|----------|-----|-------------|
| `none` | Real não preenchido, ou nada esperado (Esperado ≤ 0) | — | sem classificação |
| `ok` | ratio ≥ 90% | verde | normal |
| `watch` | 50% ≤ ratio < 90% | âmbar | observar |
| `critical` | ratio < 50% | vermelho | **anomalia** — investigar |
| `skipped` | Real = 0 com Esperado > 0 | vermelho | **payout pulado** |

Constantes: `ANOMALY_WATCH_RATIO = 0.90`, `ANOMALY_CRITICAL_RATIO = 0.50`.
Calibradas pelos casos reais do relatório §4.3:

| Semana | Esperado | Real | ratio | Nível |
|--------|----------|------|-------|-------|
| 08–14/06 | 41.815,86 | 13.369,01 | 32% | `critical` |
| 15–21/06 | 39.605,26 | 37.947,97 | 96% | `ok` |
| 22–28/06 | ~25.000 | 0 | 0% | `skipped` |

Quando há ≥1 semana `critical`/`skipped` com Real preenchido, um **banner de alerta**
aparece no topo da página (relatório §7.1, componente 4). Testes `REC-AN-01..05`.

---

## Persistência (Supabase)

Tabela **`public.payout_reconciliation`** (migração
`supabase/migrations/20260708_create_payout_reconciliation.sql`):

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `payout_date` | `date` (PK) | sexta de saque (YYYY-MM-DD) |
| `real_net_amount` | `numeric` | Net Amount real (EUR) |
| `shipoffers_invoice` | `numeric` | invoice ShipOffers da semana (EUR) |
| `notes` | `text` | livre |
| `updated_at` | `timestamptz` | atualizado no upsert |

- **RLS**: habilitada, restrita ao papel `authenticated` (não exposta ao `anon`).
  O linter ainda aponta as políticas de escrita como permissivas (`WITH CHECK(true)`)
  — mesma postura de `app_settings`; o endurecimento final é uma allow-list por
  e-mail do operador (auditoria item #1 / #19).
- **Hook**: `src/hooks/usePayoutReconciliation.ts` — carrega o mapa por `payout_date`
  e faz `upsert` otimista no blur dos inputs (espelha o padrão de `useSettings`).

---

## Simplificações Declaradas

- **Transfer usa o Net _esperado_**, não o Real, como base (`Esperado − ShipOffers − SEPA`).
  É a projeção do que deveria cair; o Real do Net serve à detecção de anomalia (Δ e ratio).
- **Grão semanal (por sexta)**: um Overview real da Digistore pode agregar comissões de
  várias semanas e várias invoices ShipOffers num único saque — aqui a conferência é
  por sexta, alinhada ao schedule do `payout_semanal.md`.
- **Crédito de retorno (refund Tipo B)** — restock −€2 / crédito +€3,26/pote (relatório §4.4)
  **não** está modelado: só existe na invoice mensal da ShipOffers (dado manual sem fonte na API).
  Fica embutido no valor de `ShipOffers` que o operador digita.

---

## Implementação no Código

**Cálculo** — `src/lib/payout.ts`:
- `SEPA_FEE = 2.50`
- `computeTransferAmount(net, shipOffersInvoice, sepaFee?) → number | null` — `null` enquanto a invoice não for preenchida.
- `classifyPayoutAnomaly(expected, real) → { level, ratio }`
- `ANOMALY_WATCH_RATIO`, `ANOMALY_CRITICAL_RATIO`

**Persistência** — `src/hooks/usePayoutReconciliation.ts` (`data`, `loading`, `saveError`, `save`).

**UI** — `src/pages/Payout.tsx`: colunas Real (Net), Δ Net, Status, ShipOffers, Transfer (est.),
banner de anomalia e linha de totais.

**Testes** — `src/lib/payout.test.ts`: `REC-TA-01..03` (Transfer), `REC-AN-01..05` (anomalia).

---

## Onde é Usado
- Conferência semanal do payout até o valor bancário (Transfer) e alerta de payouts anômalos,
  cobrindo o gap de rastreamento apontado no relatório de alinhamento (§4.3, §7.1).
