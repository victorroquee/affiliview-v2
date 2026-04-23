# AffiliView

Dashboard de analytics para gestao de afiliados Digistore24. Monitoriza transacoes, calcula margens CPA por afiliado e variante de produto, acompanha taxas de reembolso e simula cenarios de otimizacao de CPA.

## Stack

- **Frontend**: React 19 + TypeScript + Vite 5
- **Charts**: Recharts
- **Styling**: CSS custom (design system OG Group)
- **Deploy**: Vercel (serverless functions para API proxy)
- **Data**: Digistore24 API (listTransactions)

## Setup

```bash
npm install
cp .env.example .env.local   # adicionar DIGISTORE_API_KEY
npm run dev                   # http://localhost:5173
```

## Paginas

| Pagina | Descricao |
|--------|-----------|
| Dashboard | KPIs de receita, vendas, reembolsos, grafico diario, mix de produtos |
| Affiliates | Tabela de afiliados com gross, earnings, margem, CPA, status |
| CPA Calculator | Analise de margem LTV por variante (M1/M2/M3) por afiliado |
| CPA Fixo | Simulacao de valores CPA fixos por variante com sensibilidade AOV |
| CPA Variavel | CPA personalizado por pote por afiliado com simulacao bidirecional |
| Mail Sales | Tracking de vendas recuperadas pelo Maileonardo |

## Metricas Principais

- **Gross Revenue**: Receita bruta dos pedidos frontais (upsell_no=0), alinhado com Digistore
- **Earnings**: earned_amount dos pedidos frontais + estornos de reembolsos/chargebacks
- **AOV**: Valor medio por pedido (net total sem IVA / pedidos frontais)
- **Valor Liquido**: Earnings - COGS (custo produto + frete)
- **CPA**: Custo por aquisicao por afiliado

## Estrutura

```
src/
  components/    # Componentes reutilizaveis (KPICard, Sidebar, tables, drawers)
  hooks/         # useDigistoreAPI, useFilters, useCpaVariavel
  lib/           # transactions.ts (core), costTable.ts, cpa/
  pages/         # Dashboard, Affiliates, CpaCalculator, CpaFixo, CpaVariavel, MailSales
  styles/        # CSS por pagina
api/             # Vercel serverless proxy para Digistore24
logica/          # Documentacao de logica de negocio por KPI
.planning/       # GSD project planning (roadmap, requirements, state)
```

## Documentacao

A pasta `logica/` contem a documentacao detalhada de cada KPI:

- Como cada metrica e calculada
- Regras de negocio e edge cases
- Exemplos praticos
- Mapeamento para o codigo fonte

Ver `logica/README.md` para o indice completo.
