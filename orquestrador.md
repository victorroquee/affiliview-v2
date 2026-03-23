# AffiliView v3 — Dashboard Orchestrator

> Este arquivo é o guia completo de implementação para o agente de desenvolvimento.  
> Leia **na ordem apresentada**. Cada fase depende da anterior. Não pule etapas.

---

## 0. Visão Geral do Projeto

| Campo | Valor |
|---|---|
| **Produto** | Dashboard de analytics para afiliados Digistore24 |
| **Framework** | Next.js 14 (App Router) |
| **Linguagem** | TypeScript (strict mode) |
| **Estilização** | Tailwind CSS v3 |
| **Charts** | Chart.js v4 + react-chartjs-2 |
| **Parser CSV** | PapaParse |
| **Ícones** | lucide-react |
| **Node mínimo** | 18.17.0 (requisito Next.js 14) |
| **Fonte de dados** | Upload de CSV exportado do Digistore24 |
| **Paleta** | `#0E1016` bg base · `#13151C` bg card · `#EFF2F5` texto primário |
| **Versão semântica** | Persistida em `localStorage` com chave `affiliview_version` |

---

## 1. Estrutura de Pastas

```
affiliview-v3/
├── app/
│   ├── layout.tsx                    # RootLayout — metadata, fontes, globals
│   ├── page.tsx                      # Página principal (rota "/")
│   └── globals.css                   # CSS variables + Tailwind directives
├── components/
│   ├── ui/
│   │   ├── Card.tsx
│   │   ├── Badge.tsx
│   │   └── Tooltip.tsx
│   ├── KPICard.tsx
│   ├── KPIGrid.tsx
│   ├── CSVUploader.tsx
│   ├── FilterBar.tsx
│   ├── DashboardShell.tsx
│   └── charts/
│       ├── RevenueChart.tsx          # Chart.js Line
│       ├── MarginChart.tsx           # Chart.js Bar
│       └── AffiliateTable.tsx
├── logica/
│   ├── types.ts                      # NormalizedRow, KPIResult, etc.
│   ├── index.ts                      # Re-exporta tudo
│   ├── vendas.ts
│   ├── gross_revenue.ts
│   ├── earnings.ts
│   ├── cpa.ts
│   ├── aov.ts
│   ├── custo_produto.ts
│   ├── custo_frete.ts
│   ├── margem.ts
│   ├── valor_liquido.ts
│   ├── refund_chargeback.ts
│   ├── novos_qualificados.ts
│   ├── activated_2k.ts
│   └── status_afiliado.ts
├── hooks/
│   ├── useCSVParser.ts
│   ├── useKPIs.ts
│   └── useFilters.ts
├── utils/
│   ├── formatters.ts
│   ├── csvColumnMap.ts
│   └── version.ts
├── docs/logica/                      # Arquivos .md de referência (não alterar)
│   └── *.md
├── ORCHESTRATOR.md
├── next.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

---

## 2. Fase 1 — Setup do Projeto

### 2.1 Instalação
```bash
npx create-next-app@14 affiliview-v3 \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir=false \
  --import-alias="@/*"

cd affiliview-v3

npm install \
  chart.js@4 \
  react-chartjs-2 \
  papaparse \
  lucide-react

npm install -D @types/papaparse
```

### 2.2 `tsconfig.json` — ajustes obrigatórios
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "paths": { "@/*": ["./*"] }
  }
}
```

### 2.3 `tailwind.config.ts`
```ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './hooks/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        base:    '#0E1016',
        card:    '#13151C',
        primary: '#EFF2F5',
        accent:  '#3B82F6',
        success: '#22C55E',
        danger:  '#EF4444',
        warning: '#F59E0B',
        muted:   '#6B7280',
      },
    },
  },
  plugins: [],
};

export default config;
```

### 2.4 `app/globals.css`
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --bg-base:      #0E1016;
  --bg-card:      #13151C;
  --text-primary: #EFF2F5;
  --accent:       #3B82F6;
  --success:      #22C55E;
  --danger:       #EF4444;
  --warning:      #F59E0B;
  --muted:        #6B7280;
}

html, body {
  background-color: var(--bg-base);
  color: var(--text-primary);
}
```

### 2.5 `next.config.ts`
```ts
import type { NextConfig } from 'next';
const nextConfig: NextConfig = {};
export default nextConfig;
```

---

## 3. Fase 2 — Tipos Compartilhados (`logica/types.ts`)

Criar **antes** de qualquer lógica ou hook. Todos os módulos importam daqui.

```ts
// logica/types.ts

export interface NormalizedRow {
  order_id:      string;
  date:          string;        // ISO 8601: "YYYY-MM-DD"
  product:       string;
  affiliate:     string;
  gross_revenue: number;
  net_revenue:   number;
  earnings:      number;
  refund:        number;
  chargeback:    number;
  status:        string;
  country:       string;
  quantity:      number;
  shipping_cost: number;
  product_cost:  number;
}

export interface AffiliateStatus {
  affiliate:    string;
  vendas:       number;
  grossRevenue: number;
  earnings:     number;
  margem:       number;
  status:       'ativo' | 'qualificado' | 'inativo';
}

export interface KPIResult {
  vendas:            number;
  grossRevenue:      number;
  earnings:          number;
  refundChargeback:  number;
  custoProduto:      number;
  custoFrete:        number;
  valorLiquido:      number;
  aov:               number;
  cpa:               number;
  margem:            number;       // percentual 0–100
  novosQualificados: number;
  activated2k:       number;
  statusAfiliado:    AffiliateStatus[];
}

export interface ParseMeta {
  totalRows:   number;
  headers:     string[];
  parseErrors: string[];
}
```

---

## 4. Fase 3 — Mapeamento de Colunas CSV (`utils/csvColumnMap.ts`)

> ⚠️ **PASSO CRÍTICO**: Abrir `export (4).csv` e verificar os nomes reais das colunas antes de fixar este arquivo.

```ts
// utils/csvColumnMap.ts
import type { NormalizedRow } from '@/logica/types';

// Chave = nome exato da coluna no CSV do Digistore24
// Valor = nome interno usado em NormalizedRow
export const CSV_COLUMN_MAP: Record<string, keyof NormalizedRow> = {
  'Order ID':      'order_id',
  'Date':          'date',
  'Product':       'product',
  'Affiliate':     'affiliate',
  'Gross Revenue': 'gross_revenue',
  'Net Revenue':   'net_revenue',
  'Earnings':      'earnings',
  'Refund':        'refund',
  'Chargeback':    'chargeback',
  'Status':        'status',
  'Country':       'country',
  'Quantity':      'quantity',
  'Shipping':      'shipping_cost',
  'Product Cost':  'product_cost',
};

export const NUMERIC_FIELDS: Array<keyof NormalizedRow> = [
  'gross_revenue', 'net_revenue', 'earnings',
  'refund', 'chargeback', 'quantity',
  'shipping_cost', 'product_cost',
];
```

---

## 5. Fase 4 — Parser CSV (`hooks/useCSVParser.ts`)

```ts
// hooks/useCSVParser.ts
'use client';

import { useState, useCallback } from 'react';
import Papa from 'papaparse';
import type { NormalizedRow, ParseMeta } from '@/logica/types';
import { CSV_COLUMN_MAP, NUMERIC_FIELDS } from '@/utils/csvColumnMap';

interface UseCSVParserReturn {
  rows:    NormalizedRow[];
  meta:    ParseMeta | null;
  loading: boolean;
  parse:   (file: File) => void;
  reset:   () => void;
}

export function useCSVParser(): UseCSVParserReturn {
  const [rows, setRows]       = useState<NormalizedRow[]>([]);
  const [meta, setMeta]       = useState<ParseMeta | null>(null);
  const [loading, setLoading] = useState(false);

  const parse = useCallback((file: File) => {
    setLoading(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        const errors = results.errors.map(e => e.message);
        const normalized = (results.data as Record<string, string>[])
          .map(normalizeRow)
          .filter((r): r is NormalizedRow => r !== null);

        setRows(normalized);
        setMeta({ totalRows: normalized.length, headers: results.meta.fields ?? [], parseErrors: errors });
        setLoading(false);
      },
      error(err) {
        setMeta({ totalRows: 0, headers: [], parseErrors: [err.message] });
        setLoading(false);
      },
    });
  }, []);

  const reset = useCallback(() => { setRows([]); setMeta(null); }, []);

  return { rows, meta, loading, parse, reset };
}

function normalizeRow(raw: Record<string, string>): NormalizedRow | null {
  try {
    const row = {} as NormalizedRow;
    for (const [csvKey, internalKey] of Object.entries(CSV_COLUMN_MAP)) {
      const value = raw[csvKey] ?? '';
      if (NUMERIC_FIELDS.includes(internalKey as keyof NormalizedRow)) {
        (row as Record<string, unknown>)[internalKey] =
          parseFloat(value.replace(/[^0-9.-]/g, '')) || 0;
      } else {
        (row as Record<string, unknown>)[internalKey] = value.trim();
      }
    }
    return row;
  } catch {
    return null;
  }
}
```

---

## 6. Fase 5 — Implementação das Lógicas (`logica/*.ts`)

Cada arquivo implementa **uma função pura TypeScript**. Seguir **exatamente** o arquivo `.md` correspondente em `docs/logica/`.

### Ordem de implementação (respeitar dependências)

```
1.  vendas.ts             ← contagem de pedidos válidos
2.  gross_revenue.ts      ← soma de gross_revenue
3.  earnings.ts           ← soma de earnings
4.  refund_chargeback.ts  ← soma de refund + chargeback
5.  custo_produto.ts      ← soma de product_cost
6.  custo_frete.ts        ← soma de shipping_cost
7.  valor_liquido.ts      ← depende: earnings, refund_chargeback, custo_produto, custo_frete
8.  aov.ts                ← depende: gross_revenue, vendas
9.  novos_qualificados.ts ← filtra por status qualificado
10. cpa.ts                ← depende: custo total, novos_qualificados
11. margem.ts             ← depende: valor_liquido, gross_revenue
12. activated_2k.ts       ← afiliados com earnings >= 2000
13. status_afiliado.ts    ← agrega todas as métricas por afiliado → AffiliateStatus[]
```

### Template padrão
```ts
// logica/[metrica].ts
// Referência: docs/logica/[metrica].md

import type { NormalizedRow } from './types';

/**
 * [Descrição conforme o .md]
 */
export function calcular[NomeMetrica](rows: NormalizedRow[]): number {
  if (!rows.length) return 0;
  // TODO: implementar conforme [metrica].md
}
```

### Re-exportação (`logica/index.ts`)
```ts
export type { NormalizedRow, KPIResult, AffiliateStatus, ParseMeta } from './types';
export { calcularVendas }            from './vendas';
export { calcularGrossRevenue }      from './gross_revenue';
export { calcularEarnings }          from './earnings';
export { calcularRefundChargeback }  from './refund_chargeback';
export { calcularCustoProduto }      from './custo_produto';
export { calcularCustoFrete }        from './custo_frete';
export { calcularValorLiquido }      from './valor_liquido';
export { calcularAOV }               from './aov';
export { calcularCPA }               from './cpa';
export { calcularMargem }            from './margem';
export { calcularNovosQualificados } from './novos_qualificados';
export { calcularActivated2k }       from './activated_2k';
export { calcularStatusAfiliado }    from './status_afiliado';
```

---

## 7. Fase 6 — Hook `useKPIs.ts`

```ts
// hooks/useKPIs.ts
'use client';

import { useMemo } from 'react';
import type { NormalizedRow, KPIResult } from '@/logica/types';
import * as logica from '@/logica/index';

export function useKPIs(rows: NormalizedRow[]): KPIResult | null {
  return useMemo(() => {
    if (!rows.length) return null;
    return {
      vendas:            logica.calcularVendas(rows),
      grossRevenue:      logica.calcularGrossRevenue(rows),
      earnings:          logica.calcularEarnings(rows),
      refundChargeback:  logica.calcularRefundChargeback(rows),
      custoProduto:      logica.calcularCustoProduto(rows),
      custoFrete:        logica.calcularCustoFrete(rows),
      valorLiquido:      logica.calcularValorLiquido(rows),
      aov:               logica.calcularAOV(rows),
      cpa:               logica.calcularCPA(rows),
      margem:            logica.calcularMargem(rows),
      novosQualificados: logica.calcularNovosQualificados(rows),
      activated2k:       logica.calcularActivated2k(rows),
      statusAfiliado:    logica.calcularStatusAfiliado(rows),
    };
  }, [rows]);
}
```

---

## 8. Fase 7 — Hook `useFilters.ts`

```ts
// hooks/useFilters.ts
'use client';

import { useState, useMemo } from 'react';
import type { NormalizedRow } from '@/logica/types';

export interface Filters {
  dateFrom:  string;   // 'YYYY-MM-DD' ou ''
  dateTo:    string;
  affiliate: string;
  product:   string;
}

const INITIAL: Filters = { dateFrom: '', dateTo: '', affiliate: '', product: '' };

export function useFilters(rows: NormalizedRow[]) {
  const [filters, setFilters] = useState<Filters>(INITIAL);

  const filteredRows = useMemo(() => rows.filter(row => {
    if (filters.dateFrom && row.date < filters.dateFrom) return false;
    if (filters.dateTo   && row.date > filters.dateTo)   return false;
    if (filters.affiliate && row.affiliate !== filters.affiliate) return false;
    if (filters.product   && row.product   !== filters.product)   return false;
    return true;
  }), [rows, filters]);

  const affiliateOptions = useMemo(() => [...new Set(rows.map(r => r.affiliate))].sort(), [rows]);
  const productOptions   = useMemo(() => [...new Set(rows.map(r => r.product))].sort(),   [rows]);

  return { filters, setFilters, filteredRows, affiliateOptions, productOptions };
}
```

---

## 9. Fase 8 — Utilitários

### `utils/formatters.ts`
```ts
export const formatCurrency = (value: number, currency = 'EUR'): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(value);

export const formatPercent = (value: number): string => `${value.toFixed(2)}%`;

export const formatCount = (value: number): string =>
  new Intl.NumberFormat('pt-BR').format(value);

export const formatNumber = (value: number, decimals = 2): string =>
  value.toFixed(decimals);
```

### `utils/version.ts`
```ts
const VERSION_KEY    = 'affiliview_version';
export const VERSION = '3.0.0';

export function getStoredVersion(): string {
  if (typeof window === 'undefined') return VERSION;
  return localStorage.getItem(VERSION_KEY) ?? VERSION;
}

export function persistVersion(v: string): void {
  localStorage.setItem(VERSION_KEY, v);
}
```

> ⚠️ Sempre usar guard `typeof window !== 'undefined'` ou acessar dentro de `useEffect` — Next.js renderiza Server-side onde `localStorage` não existe.

---

## 10. Fase 9 — Componentes de UI

> Todos os componentes com hooks ou interatividade precisam de `'use client'` no topo.

### `components/CSVUploader.tsx`
- `'use client'`
- Drag & drop + click — aceita apenas `.csv`
- Exibe nome do arquivo e `meta.totalRows` após parse
- Props: `{ onFileSelected: (file: File) => void; loading: boolean }`

### `components/KPICard.tsx`
```ts
interface KPICardProps {
  label:   string;
  value:   number;
  format:  'currency' | 'percent' | 'count' | 'number';
  trend?:  { value: number; direction: 'up' | 'down' | 'neutral' };
  icon?:   React.ReactNode;
  accent?: 'success' | 'danger' | 'warning' | 'accent';
}
```
- `bg-card`, `border border-white/5`
- Trend: `▲` verde / `▼` vermelho / `—` muted

### `components/KPIGrid.tsx`
Grid responsivo — 4 colunas desktop, 2 tablet, 1 mobile:
```
[ Vendas ]         [ Gross Revenue ]  [ Earnings ]       [ Valor Líquido ]
[ AOV ]            [ CPA ]            [ Margem % ]       [ Refund/CB ]
[ Novos Qualif. ]  [ Activated 2K ]   [ Custo Produto ]  [ Custo Frete ]
```

### `components/FilterBar.tsx`
- `'use client'`
- 2 inputs `type="date"` (dateFrom / dateTo)
- Select de afiliado (opções dinâmicas)
- Select de produto (opções dinâmicas)
- Botão "Limpar filtros"
- Props: `{ filters, setFilters, affiliateOptions, productOptions }`

### `components/DashboardShell.tsx`
- Header: logo "AffiliView" + badge de versão
- Botão "Trocar CSV" chama `onReset()`
- Props: `{ meta: ParseMeta | null; onReset: () => void; children: ReactNode }`

### `components/charts/RevenueChart.tsx`
- `'use client'` obrigatório
- Registrar Chart.js no topo do arquivo:
```ts
import { Chart as ChartJS, CategoryScale, LinearScale,
  PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);
```
- Tipo: `<Line>` do `react-chartjs-2`
- Datasets: `gross_revenue` e `earnings` agrupados por `date`
- Eixo X: datas ordenadas · Eixo Y: valores EUR

### `components/charts/MarginChart.tsx`
- `'use client'` obrigatório
- Registrar: `BarElement`, `CategoryScale`, `LinearScale`, `Tooltip`, `Legend`
- Tipo: `<Bar>` — margem por afiliado

### `components/charts/AffiliateTable.tsx`
- Colunas: Afiliado · Vendas · Gross Revenue · Earnings · Margem % · Status
- Ordenação client-side (useState: `sortKey` + `sortDir`)
- Badge colorido: `ativo` verde · `qualificado` azul · `inativo` cinza
- Props: `{ data: AffiliateStatus[] }`

---

## 11. Fase 10 — Composição Final

### `app/layout.tsx`
```tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title:       'AffiliView v3',
  description: 'Dashboard de analytics para afiliados Digistore24',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="bg-base text-primary antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
```

### `app/page.tsx`
```tsx
'use client';

import { useCSVParser }    from '@/hooks/useCSVParser';
import { useFilters }      from '@/hooks/useFilters';
import { useKPIs }         from '@/hooks/useKPIs';
import { CSVUploader }     from '@/components/CSVUploader';
import { DashboardShell }  from '@/components/DashboardShell';
import { FilterBar }       from '@/components/FilterBar';
import { KPIGrid }         from '@/components/KPIGrid';
import { RevenueChart }    from '@/components/charts/RevenueChart';
import { MarginChart }     from '@/components/charts/MarginChart';
import { AffiliateTable }  from '@/components/charts/AffiliateTable';

export default function HomePage() {
  const { rows, meta, loading, parse, reset } = useCSVParser();
  const { filters, setFilters, filteredRows, affiliateOptions, productOptions } = useFilters(rows);
  const kpis = useKPIs(filteredRows);

  if (!rows.length) {
    return <CSVUploader onFileSelected={parse} loading={loading} />;
  }

  return (
    <DashboardShell meta={meta} onReset={reset}>
      <FilterBar
        filters={filters}
        setFilters={setFilters}
        affiliateOptions={affiliateOptions}
        productOptions={productOptions}
      />
      <KPIGrid kpis={kpis} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <RevenueChart rows={filteredRows} />
        <MarginChart  kpis={kpis} />
      </div>
      <AffiliateTable data={kpis?.statusAfiliado ?? []} />
    </DashboardShell>
  );
}
```

---

## 12. Checklist de Implementação

**Setup**
- [ ] `create-next-app@14` com flags: `--typescript --tailwind --eslint --app --import-alias="@/*"`
- [ ] `chart.js@4`, `react-chartjs-2`, `papaparse`, `@types/papaparse`, `lucide-react` instalados
- [ ] `tailwind.config.ts` com cores da paleta
- [ ] `globals.css` com CSS variables e Tailwind directives
- [ ] `tsconfig.json` com `strict: true` e alias `@/*`

**Tipos e utilitários**
- [ ] `logica/types.ts` — `NormalizedRow`, `KPIResult`, `AffiliateStatus`, `ParseMeta`
- [ ] `utils/csvColumnMap.ts` — **inspecionar CSV real antes de fixar**
- [ ] `utils/formatters.ts`
- [ ] `utils/version.ts` com guard de SSR (`typeof window !== 'undefined'`)

**Parser**
- [ ] `hooks/useCSVParser.ts` implementado com PapaParse
- [ ] Testado com `export (4).csv` — `NormalizedRow[]` retornado sem NaN

**Lógicas (na ordem obrigatória)**
- [ ] `logica/vendas.ts` conforme `docs/logica/vendas.md`
- [ ] `logica/gross_revenue.ts` conforme `docs/logica/gross_revenue.md`
- [ ] `logica/earnings.ts` conforme `docs/logica/earnings.md`
- [ ] `logica/refund_chargeback.ts` conforme `docs/logica/refund_chargeback.md`
- [ ] `logica/custo_produto.ts` conforme `docs/logica/custo_produto.md`
- [ ] `logica/custo_frete.ts` conforme `docs/logica/custo_frete.md`
- [ ] `logica/valor_liquido.ts` conforme `docs/logica/valor_liquido.md`
- [ ] `logica/aov.ts` conforme `docs/logica/aov.md`
- [ ] `logica/novos_qualificados.ts` conforme `docs/logica/novos_qualificados.md`
- [ ] `logica/cpa.ts` conforme `docs/logica/cpa.md`
- [ ] `logica/margem.ts` conforme `docs/logica/margem.md`
- [ ] `logica/activated_2k.ts` conforme `docs/logica/activated_2k.md`
- [ ] `logica/status_afiliado.ts` conforme `docs/logica/status_afiliado.md`
- [ ] `logica/index.ts` re-exporta tipos e funções

**Hooks**
- [ ] `hooks/useKPIs.ts` compõe todas as 13 lógicas
- [ ] `hooks/useFilters.ts` filtra por data, afiliado, produto

**Componentes**
- [ ] `CSVUploader.tsx` drag & drop funcional
- [ ] `KPICard.tsx` com trend e formatação por tipo
- [ ] `KPIGrid.tsx` 13 KPIs no grid responsivo correto
- [ ] `FilterBar.tsx` selects dinâmicos + date range
- [ ] `DashboardShell.tsx` com header + versão
- [ ] `RevenueChart.tsx` — Chart.js `Line` registrado, `'use client'`
- [ ] `MarginChart.tsx` — Chart.js `Bar` registrado, `'use client'`
- [ ] `AffiliateTable.tsx` com ordenação por coluna

**App**
- [ ] `app/layout.tsx` com metadata e body `bg-base`
- [ ] `app/page.tsx` orquestra todos os hooks e componentes
- [ ] `'use client'` em todos os componentes com hooks/interatividade
- [ ] Nenhum Server Component acessando `localStorage` diretamente
- [ ] `npm run build` sem erros TypeScript

---

## 13. Regras de Desenvolvimento

1. **Lógicas são funções puras** — sem hooks, sem estado, sem side effects
2. **Um arquivo por métrica** — nunca misturar cálculos de métricas distintas
3. **Leia o `.md` antes de implementar** — `docs/logica/[metrica].md` é a fonte de verdade da fórmula
4. **Sem `any`** — TypeScript strict mode; usar tipos de `logica/types.ts`
5. **`'use client'` apenas onde necessário** — Chart.js e hooks exigem; preferir Server Components por padrão
6. **Chart.js: `register()` no topo do componente** — não em módulo separado, não no `layout.tsx`
7. **`localStorage` com guard SSR** — sempre `typeof window !== 'undefined'` ou dentro de `useEffect`
8. **Sem dependências não listadas** — não adicionar libs fora das aprovadas na Fase 1
9. **Se o `.md` for ambíguo** — adicionar `// TODO: confirmar com spec [metrica].md` e continuar

---

## 14. Notas para o Agente

- **Inspecionar `export (4).csv`** é o passo mais crítico — fixar `csvColumnMap.ts` só depois de ver as colunas reais
- Se uma coluna não existir no CSV, registrar em `README.md` como limitação conhecida
- Chart.js no Next.js App Router **sempre** exige `'use client'` — nunca em Server Component
- `useCSVParser` e `useFilters` devem ser instanciados **apenas** em `page.tsx` — não duplicar estado em subcomponentes
- A ordem do checklist na seção 12 é a ordem correta de execução — não implementar componentes antes de validar as lógicas