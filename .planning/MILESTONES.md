# AffiliView — Milestones

## v1.1 Melhorias Dashboard (Shipped: 2026-04-28)

**Phases completed:** 5 phases, 12 plans, 7 tasks

**Key accomplishments:**

- Task 1 — transactions.ts changes:
- Task 1 — Dashboard.tsx changes:
- Task 1 — Affiliates.tsx changes:
- Removed R+CB column, stripped M-prefix from SKU names, added Reembolso % column with color encoding
- One-liner:
- One-liner:
- One-liner:
- One-liner:
- Change 1 — Gross:
- Change 1 — Gross Revenue tooltip:

---

## Completed Milestones

### v1.0 — CPA Variavel (2026-04-22)

**Goal:** Nova aba "CPA Variavel" que permite definir CPA personalizado por pote e por afiliado, calcular margens reais (LTV completo: front + upsells - COGS - refunds), e simular cenarios de CPA maximo por margem target.

**Phases:**

- Phase 1: Page Scaffold — CPA Variavel page wired into sidebar navigation
- Phase 2: Data Display — Affiliate table with LTV margins, AOV per funnel, KPI cards, detail drawer, search
- Phase 3: Simulation Engine — Bidirectional CPA/margin simulation with live delta comparison

**Delivered:**

- 3 phases, 5 plans, 9 requirements
- All requirements complete

**Key decisions:**

- Nova aba separada (nao substituir Calculator/CPA Fixo)
- Simulacao session-only (sem persistencia)
- LTV completo para margem (front + upsells)
- Dados reais Digistore (sem input manual)
