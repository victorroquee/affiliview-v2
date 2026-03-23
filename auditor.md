# AffiliView v3 — Auditor Contínuo

> Documento vivo. Atualizar após cada ciclo de auditoria.
> Formato: `[STATUS]` = 🔴 aberto · 🟡 parcial · ✅ resolvido

---

## Ciclo 1 — 2026-03-22 (primeira auditoria + fixes)

| # | Arquivo | Problema | Status |
|---|---------|----------|--------|
| 1 | `lib/csvParser.ts` | `parseDate` — verificar formato MM/DD vs DD/MM conforme CSV real | ✅ confirmado MM/DD correto |
| 2 | `hooks/useDigistoreAPI.ts` | API busca `"payment,refund,chargeback"` mas `isRefund` também aceita `"return"`, `"reversal"` | 🟡 monitorar |
| 3 | `lib/costTable.ts` | País desconhecido retorna COGS = €0 silenciosamente | ✅ `console.warn` adicionado |
| 4 | `lib/csvParser.ts` | `ProductSummaryRow.netRevenue === earnings` (errado) | ✅ corrigido para acumular `netAmount` |
| 5 | `lib/cpa/parseHelpers.ts` | `getBottles` incluía `10` sem entrada na tabela de custos | ✅ removido |
| 6 | `lib/csvParser.ts` | `AffiliateRow.gross7d` nome enganoso para qualquer período | ✅ renomeado para `gross` |
| 7 | `lib/csvParser.ts` | `topAffiliates.slice(0, 15)` — contagem na UI mostrava total errado | ✅ `.slice` removido |
| 8 | `lib/csvParser.ts` | `getDateRange` exportada mas sem nenhum consumidor | ✅ removida |
| 9 | `utils/digiNormalizer.ts` | `console.log` de debug expunha dados financeiros no console | ✅ removido |
| 10 | `hooks/useDigistoreAPI.ts` | Race condition: fetch anterior sobrescrevia resultados do novo | ✅ `AbortController` adicionado |
| 11 | `components/Charts.tsx` | `GrossEvolutionChart` subtítulo duplicava "X dias" do título | ✅ removido |
| 12 | `components/Charts.tsx` | `RefundByProductChart` dizia "X dias" para número de produtos | ✅ corrigido para "X produtos" |
| 13 | `components/ImportCSV.tsx` | Componente órfão sem nenhum importador | ✅ arquivo deletado |

---

## Ciclo 2 — 2026-03-22 (segunda auditoria)

### 🔴 P0 — Bugs que afetam dados ou estabilidade

| # | Arquivo | Linha | Problema |
|---|---------|-------|---------|
| C2-01 | `hooks/useDigistoreAPI.ts` | finally | **Race condition no `finally`**: ao abortar e iniciar novo fetch, o `finally` do fetch antigo chama `setLoading(false)`, sobrescrevendo o `loading=true` do novo fetch. UI mostra "carregado" enquanto ainda busca. |
| C2-02 | `lib/cpa/analyzeCSV.ts` | 177 | **NaN em `upsellConvOverall`**: divisão `buyersWithUpsell.size / buyers.size` sem guard quando `buyers.size === 0`. Resulta em `NaN%` exibido na UI. |

### 🟡 P1 — Inconsistências estruturais

| # | Arquivos | Problema |
|---|----------|---------|
| C2-03 | `lib/cpa/AffiliateDetail.tsx`<br>`lib/cpa/VariantCard.tsx`<br>`lib/cpa/CPATable.tsx` | **`fmtEur`, `fmtPct`, `fmtInt` redefinidos localmente** em 3 componentes, idênticos a `formatEur/formatPct/formatInt` já exportados por `lib/csvParser.ts`. 4 implementações do mesmo código. |
| C2-04 | `lib/csvParser.ts` vs `lib/cpa/constants.ts` | **`COUNTRY_ZONE` duplicado**: `costTable.ts` usa `COUNTRY_ZONE` (cálculo dinâmico) e `cpa/constants.ts` tem tabela hardcoded "espelho". Se frete atualizar, CPA Calculator diverge do Dashboard. |
| C2-05 | `lib/csvParser.ts` vs `lib/cpa/constants.ts` | **COGS duplicado**: `costTable.ts` calcula via `PRODUCT_COST_PER_BOTTLE × bottles + SHIPPING_TABLE[bottles][zone]`. `cpa/constants.ts` tem os mesmos valores pré-calculados hardcoded. Qualquer mudança de preço requer atualização em dois lugares. |
| C2-06 | `lib/csvParser.ts:100` vs `lib/cpa/parseHelpers.ts:33` | **Detecção de upsell inconsistente**: `isUpsellByName()` não reconhece `"dw"` (downsell). `isUpsell()` em parseHelpers reconhece `"dw"`. Downsells podem ser classificados diferente dependendo do caminho de código. |

### 🟡 P2 — Performance

| # | Arquivo | Linha | Problema |
|---|---------|-------|---------|
| C2-07 | `hooks/useFilters.ts` | 47-50 | **O(n log n) para encontrar min/max de datas**: `.map().sort()` em toda a lista a cada mudança de `rows`. Para 50k transações, sort completo desnecessário. Trocar por `reduce` O(n). |

### 🟡 P3 — Qualidade de código React

| # | Arquivo | Linha | Problema |
|---|---------|-------|---------|
| C2-08 | `components/Charts.tsx` | 142 | **`key={i}` (índice) em `.map()` no PieChart**: anti-pattern React. Se dados reordenarem, React faz reconciliação errada. Usar `key={entry.name}`. |
| C2-09 | `pages/CpaCalculator.tsx` | 42-44 | **`useEffect` sem dependency array correto**: `[selected, selectedAff]` são ambos usados, mas o efeito pode chamar `setSelected(null)` em loop se `selectedAff` estiver em computação. |
| C2-10 | `App.tsx` | 24-30 | **`lastParamsRef` gerenciado manualmente**: state derivado mantido em ref em paralelo com `period` state. Se divergirem (bug futuro), fetch usa params desatualizados. |

### 🟢 P4 — Acessibilidade (nice-to-have)

| # | Arquivo | Problema |
|---|---------|---------|
| C2-11 | `components/PeriodBar.tsx` | Inputs `type="date"` e botão "X" sem `aria-label`. |
| C2-12 | `components/Sidebar.tsx` | Botões de navegação sem `aria-label` descrevendo a página destino. |
| C2-13 | `components/ProductTable.tsx` | `<th>` sem `scope="col"`. |
| C2-14 | `components/Charts.tsx` | Containers de gráfico sem `aria-label` (leitores de tela não identificam o conteúdo). |

### 🟢 P5 — TypeScript / Segurança de tipos

| # | Arquivo | Problema |
|---|---------|---------|
| C2-15 | `hooks/useDigistoreAPI.ts:75` | `res.json() as DigiAPIResponse` — cast sem validação de schema. Se API mudar formato, crash em runtime sem TS warning. |
| C2-16 | `utils/digiNormalizer.ts:78` | `t as unknown as Record<string, unknown>` — duplo cast para contornar o tipo. |
| C2-17 | `components/Charts.tsx:152` | `formatter` com `any` explícito para contornar tipo do Recharts. |

---

## Fixes do Ciclo 2 — aplicados em 2026-03-22

| # | Fix |
|---|-----|
| C2-01 | `useDigistoreAPI.ts`: `finally` verifica `abortRef.current === controller` antes de chamar `setLoading(false)` |
| C2-02 | `analyzeCSV.ts`: guard `acc.buyers.size > 0` em `upsellConvOverall` |
| C2-03 | `AffiliateDetail.tsx`, `VariantCard.tsx`, `CPATable.tsx`: removidas funções locais, importam de `lib/csvParser` |
| C2-07 | `useFilters.ts`: `min/max` de datas via `reduce` O(n) |
| C2-08 | `Charts.tsx`: `key={i}` → `key={entry.name}` no PieChart |

---

---

## Ciclo 3 — 2026-03-23 (terceira auditoria)

### 🔴 P0 — Bugs que afetam dados ou estabilidade

| # | Arquivo | Linha | Problema |
|---|---------|-------|---------|
| C3-01 | `lib/csvParser.ts` | 306 | **Stack overflow em `Math.max(...dates)`**: `payTxs.map(t => t.date.getTime())` pode gerar dezenas de milhares de elementos. O spread `...dates` com 65k+ args ultrapassa o limite de argumentos do V8, causando `RangeError: Maximum call stack size exceeded`. Corrigir com `dates.reduce((a,b) => b > a ? b : a)`. |

### 🟡 P1 — Inconsistências estruturais

| # | Arquivos | Problema |
|---|----------|---------|
| C3-02 | `lib/costTable.ts:64` vs `lib/cpa/parseHelpers.ts:7` | **Duas funções paralelas para detectar frascos**: `detectBottles()` usa regex + busca numérica; `getBottles()` só busca numérica. `analyzeCSV.ts` usa `getBottles`, mas `costTable.ts` usa `detectBottles`. Para o mesmo produto, podem retornar resultados diferentes. Ex: `"6 Bottles Kit"` — ambas retornam `6` (OK); mas `"SixPack"` — `getBottles` retorna `null`, `detectBottles` retorna `1` (fallback). |
| C3-03 | `lib/costTable.ts` | 79 | **`detectBottles()` retorna `1` silenciosamente sem aviso**: produto não reconhecido (sem número no nome) recebe COGS de 1 frasco, inflando margem artificialmente. O `console.warn` para país desconhecido foi adicionado (C1-3), mas aqui não há alerta equivalente — falha silenciosa piora que `€0`. |

### 🟡 P3 — Qualidade de código React

| # | Arquivo | Linha | Problema |
|---|---------|-------|---------|
| C3-04 | `components/Charts.tsx` | 68, 114, 152 | **Mapping sem `useMemo` em componentes de gráfico**: `GrossEvolutionChart`, `TopAffiliatesChart` e outros fazem `.map()` sobre os dados props em cada render. Se o Dashboard re-renderiza por qualquer state (ex: hover, loading), todos os gráficos refazem o mapping mesmo sem mudança nos dados. |

---

## Pendências conhecidas (não corrigidas intencionalmente)

| Item | Motivo |
|------|--------|
| `COUNTRY_ZONE` / COGS duplicados (C2-04, C2-05) | Refactor estrutural — requer mover `analyzeCSV` para usar `costTable` diretamente; alto risco de regressão sem testes |
| `isUpsellByName` vs `isUpsell` (C2-06) | Baixo impacto prático: `isUpsellByName` é usado apenas no CSV parser que está em desuso (app usa API) |
| ~~Deploy em produção sem proxy server~~ | ✅ Resolvido em 2026-03-23 — `api/digistore.ts` (Vercel Serverless Function) + `vercel.json` criados |
| React Router para URL-based navigation | Mudança arquitetural — não é bug, é feature request |
| Acessibilidade (C2-11 a C2-14) | Backlog — não afeta funcionalidade |
| TypeScript casts (C2-15 a C2-17) | Requer schema validation (ex: zod) — investimento maior |
