# Painel de Configurações — Design

**Data:** 2026-07-07
**Branch:** feat/costs-payout-auth
**Status:** Aprovado para planejamento

---

## 1. Objetivo

Adicionar uma seção de **Configurações** acessível pela sidebar (abaixo do bloco de conta/acesso),
onde o usuário final controla preferências básicas da conta e consulta um **guia completo de como
cada dado do sistema é calculado**, dentro da própria plataforma.

Entregas:

1. **Unidade de medida (moeda)** — EUR (base), BRL ou USD, convertendo a partir do EUR pela cotação atual.
2. **Idioma da interface** — PT-BR ou Inglês (troca o *texto* da UI; independente da moeda).
3. **Nome da conta** e **nome exibido** — substituem o "OG Group" fixo no rodapé da sidebar.
4. **Guia de Lógicas** — documentação bilíngue (PT/EN) de todos os KPIs, derivada de `logica/*.md`.

## 2. Não-objetivos (fora de escopo agora)

- Trocar senha (removido a pedido do usuário).
- Tradução de **todas** as telas de uma vez — traduzimos só o núcleo agora (ver §7); demais telas
  migram para `t()` incrementalmente depois.
- Multi-tenant / múltiplas contas. O app é single-tenant ("OG Group"); as configurações são uma
  linha única compartilhada.
- Conversão de moeda em thresholds fixos citados em texto de tooltip (ex.: "≥ €2K"). Ver §5 (limitações).

## 3. Decisões (resultado do brainstorming)

| Tema | Decisão |
|------|---------|
| Local do painel | Aba dedicada "Configurações" na sidebar → página inteira. |
| Idioma | Seletor troca o texto da UI (PT-BR/EN); moeda é campo **separado**. |
| Câmbio | API ao vivo (`frankfurter.app`), cache diário, **+ override manual**. |
| Persistência | Supabase (tabela de settings + RLS), sincroniza entre dispositivos. |
| Alcance i18n | Núcleo agora (sidebar, topbar, Configurações, Dashboard, rótulos/tooltips de KPI); resto depois. |
| Guia em EN | Sim — conteúdo do guia traduzido para inglês. |

**Suposição confirmada:** *nome da conta* = organização; *nome exibido* = como aparece no rodapé da
sidebar (hoje "OG Group" hardcoded em `Sidebar.tsx:76`).

## 4. Arquitetura — visão geral

```
Supabase: tabela app_settings (linha única, RLS authenticated)
        │  load/upsert
        ▼
SettingsProvider  (React Context, irmão do AuthProvider)
        │  expõe { currency, language, displayName, accountName, fxRates, t, setSetting }
        │  espelha estado em ▼
settingsStore (singleton module-level)  ← lido de forma síncrona por formatMoney
        │
        ├── formatMoney/formatEur/formatInt (transactions.ts)   → exibição de valores
        ├── i18n dictionaries (pt.ts / en.ts) + t()             → texto da UI
        ├── fxService (frankfurter.app + cache + manual)        → taxas EUR→BRL/USD
        └── guide content (guide.pt.ts / guide.en.ts)           → guia de lógicas
        ▼
pages/Settings.tsx  (nova Page "settings" em App.tsx)
Sidebar: novo item "Configurações" no rodapé; rodapé usa displayName/accountName
```

## 5. Moeda e conversão

- **Fonte da verdade:** todos os valores continuam calculados/armazenados em **EUR**. A conversão
  acontece **apenas na exibição**: `valorExibido = valorEUR × taxa[moeda]` (taxa do EUR = 1).
- **Chokepoint:** `formatEur` (`src/lib/transactions.ts:1069`) é importado em ~18 arquivos. Passa a
  delegar para um novo `formatMoney(eurValue)` que lê `currency`, `rate` e `locale` do `settingsStore`.
  O nome `formatEur` é **mantido** (re-export/alias) para não tocar os 18 imports — todos ficam
  currency-aware automaticamente.
- **Formatação:** mantemos o estilo atual de símbolo-prefixado para não regredir o visual:
  `€1.234,56` (EUR/de-DE) → `R$ 1.234,56` (BRL/pt-BR) → `$1,234.56` (USD/en-US).
  Metadados por moeda: `{ EUR:{symbol:'€',locale:'de-DE'}, BRL:{symbol:'R$',locale:'pt-BR'}, USD:{symbol:'$',locale:'en-US'} }`.
- **`formatInt`** passa a usar o locale do **idioma** ativo (contagens não convertem valor).
- **Câmbio (`fxService`):**
  - `GET https://api.frankfurter.app/latest?from=EUR&to=BRL,USD` (grátis, sem key, CORS habilitado).
  - Resultado gravado em `app_settings` (`fx_brl`, `fx_usd`, `fx_updated_at`).
  - Atualiza automaticamente quando `fx_manual = false` e `fx_updated_at` tem > 24h (ou é nulo).
  - **Override manual:** `fx_manual = true` congela as taxas nos valores digitados pelo usuário.
  - Fallback: se a API falhar, usa a última taxa salva; se nunca houve, usa `1` (mostra EUR) e sinaliza no painel.
- **Estado inicial (antes do load):** EUR, pt-BR, taxa 1 → `formatEur` se comporta exatamente como hoje.
- **Limitação assumida:** menções fixas de threshold em textos de tooltip (ex.: "Ativados ≥ €2K",
  "média ≥ €1.000/dia" em `Dashboard.tsx`) permanecem em € nesta entrega. Onde o valor já é numérico
  e passa por `formatEur`, converte; onde é string fixa, fica em € (documentado como follow-up).

## 6. Persistência — Supabase

Tabela **`app_settings`** (linha única, id fixo `'singleton'`):

| Coluna | Tipo | Default | Nota |
|--------|------|---------|------|
| `id` | text PK | `'singleton'` | garante linha única |
| `account_name` | text | `'OG Group'` | organização |
| `display_name` | text | `'OG Group'` | rótulo do rodapé |
| `currency` | text | `'EUR'` | `EUR` \| `BRL` \| `USD` |
| `language` | text | `'pt-BR'` | `pt-BR` \| `en` |
| `fx_brl` | numeric | `null` | taxa EUR→BRL |
| `fx_usd` | numeric | `null` | taxa EUR→USD |
| `fx_manual` | boolean | `false` | congela taxas manuais |
| `fx_updated_at` | timestamptz | `null` | controle de cache diário |
| `updated_at` | timestamptz | `now()` | auditoria |

- **RLS:** habilitada. Políticas para `authenticated`: `select` e `insert`/`update` com `using (true)`
  / `with check (true)` (app single-tenant; linha compartilhada). `CHECK` em `currency` e `language`.
- **Migração:** aplicada via Supabase MCP (`apply_migration`). Semear a linha `'singleton'` na migração.
- **Acesso:** app faz `select ... eq('id','singleton')`; upsert no mesmo id em cada alteração (optimistic).

## 7. i18n (núcleo)

- Sem lib externa. Dicionários planos em `src/i18n/pt.ts` e `src/i18n/en.ts` (mapa `chave → texto`).
- `t(key, params?)` exposto pelo `useSettings` (resolve pelo `language` ativo; fallback para PT e
  para a própria chave se faltar tradução).
- **Traduzir agora:** `Sidebar`, topbar (`PeriodBar`/`RefreshStatus`/`HeaderClock` — rótulos),
  `pages/Settings.tsx`, `pages/Dashboard.tsx` e os rótulos/tooltips dos KPIs do Dashboard.
- Demais páginas seguem em PT (hardcoded) e migram para `t()` depois — infra pronta.

## 8. Guia de Lógicas (bilíngue)

- Conteúdo estruturado em `src/i18n/guide.pt.ts` e `src/i18n/guide.en.ts`: array de entradas
  `{ id, title, category, summary, howItsCalculated, example? }`, **uma por KPI**, redigido em
  linguagem de usuário final e derivado de `logica/*.md` + `logica/README.md`.
- KPIs cobertos (de `logica/README.md`): Gross Revenue, Earnings, Valor Líquido, AOV, Vendas,
  Refund/Chargeback %, Custo de Produto, Custo de Frete, Custos Operacionais, Payout Semanal, CPA,
  Margem %, Activated ≥ €2K, Novos Qualificados, Status do Afiliado. Mais regras globais
  (período UTC, Produto M vs. Upsell, cancelamento com upsell, frete Z6).
- Renderizado dentro de Configurações como lista navegável/acordeão (sem dependência de markdown).
  Sem parser externo — o conteúdo já é texto/JSX estruturado.
- `logica/*.md` permanece como documentação de dev / fonte da verdade (não é removido).

## 9. Página Configurações — seções

`src/pages/Settings.tsx`, com layout consistente com o design system atual (tema dark, cards).

1. **Conta** — nome da conta, nome exibido (persistem e refletem no rodapé da sidebar), e-mail (read-only, de `session.user.email`).
2. **Preferências** — moeda (EUR/BRL/USD); painel de câmbio (taxa atual, data da última atualização,
   botão "atualizar agora", toggle "definir manualmente" + inputs); idioma (PT-BR/Inglês).
3. **Guia de Lógicas** — navegação por KPI com explicação bilíngue (§8).

Integração:
- `App.tsx`: adiciona `"settings"` ao tipo `Page` e ao switch de renderização; envolve a árvore com
  `<SettingsProvider>` (dentro do gate de auth, junto do `AuthProvider`).
- `Sidebar.tsx`: novo item "Configurações" (engrenagem) no rodapé, abaixo do bloco de conta; rodapé
  passa a exibir `displayName`/`accountName` do settings em vez do texto fixo.

## 10. Tratamento de erros

- **Falha ao carregar settings:** usa defaults (EUR/pt-BR) e mostra aviso discreto; app não quebra.
- **Falha na API de câmbio:** mantém última taxa salva; se inexistente, cai para EUR e sinaliza no
  painel ("cotação indisponível — exibindo em EUR").
- **Falha ao salvar:** feedback inline (toast/linha de status); reverte o valor otimista.
- **Chave de i18n ausente:** fallback para PT e depois para a própria chave (nunca exibe vazio).

## 11. Testes (Vitest, padrão do repo)

- `formatMoney`: conversão por moeda (símbolo, locale, arredondamento), EUR inalterado, `formatInt` por idioma.
- `fxService`: decisão de cache (>24h atualiza; `fx_manual` congela), fallback em falha.
- `t()`: resolução PT/EN, fallback de chave ausente, interpolação de params.
- Extensão de `src/components/smoke.test.tsx`: renderiza `Settings` sem crash (mocks nulos/vazios).

## 12. Riscos e mitigações

- **Refator do chokepoint de moeda** — mitigado mantendo o nome/assinatura de `formatEur` e default EUR.
- **Escopo de i18n crescendo** — limitado ao núcleo; `t()` com fallback evita quebra em telas não migradas.
- **Volume de tradução do guia** — conteúdo curado (não os 20 .md brutos), uma entrada por KPI.
- **CORS/estabilidade do frankfurter.app** — cache no Supabase + override manual como plano B.
