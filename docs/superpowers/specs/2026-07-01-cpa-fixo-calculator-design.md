# Integração da Calculadora de CPA na página CPA Fixo — Design

**Data:** 2026-07-01
**Origem:** `~/Downloads/calculadora_cpa.html` (ferramenta entregue pelo usuário, com lógica e interface de referência)

## 1. Objetivo

Substituir a página **CPA Fixo** (rota `cpa-fixo`, `src/pages/CpaFixo.tsx`) por uma nova calculadora
de CPA portada fielmente do arquivo `calculadora_cpa.html`, adaptada ao design system claro do app
e integrada com dados reais da API Digistore24.

## 2. Decisões (confirmadas com o usuário)

- **Página alvo:** substitui **CPA Fixo**. No Sidebar, adicionar badge **NOVO** (verde) ao lado do item.
- **Visual:** adaptar ao **tema claro** do app (verde OG `#15803D` no lugar do lima `#d4ff3e`);
  usar as fontes já existentes do app (não importar Fraunces/JetBrains Mono).
- **Dados (híbrido):** ao selecionar um afiliado, auto-preencher **AOV**, **taxa de reembolso** e
  **mix M1/M2/M3** a partir da API (campos permanecem editáveis). Todo o resto é **manual** com os
  defaults do HTML. Manter também um **modo "sem afiliado"** = calculadora 100% manual como no HTML.
- **Abordagem A:** módulo de cálculo puro + hook + página reescrita + testes (segue o padrão de
  `analyzeCPA.ts` + `transactions.test.ts`).
- **Lógica:** porte **fiel** do `calculate()` do HTML — nenhuma mudança de fórmula.

## 3. Lógica de cálculo (porte fiel de `calculate()`)

### Constantes (centralizadas no módulo)

```
MIX_PRICES      = { M1: 156, M2: 207, M3: 294 }   // preço FE por variante (€, com VAT)
MIX_POTS        = { M1: 2,   M2: 3,   M3: 6 }      // potes por variante
UPSELL_AVG_PRICE = 175                             // preço médio de upsell (€)
MARGINS          = [5, 7, 8, 10, 12, 15]           // níveis de margem (%) da tabela
VAT_PRESETS      = { DE: 7, AT: 10, CH: 2.6 }      // atalhos de VAT por país (%)
```

### Defaults dos inputs (idênticos ao HTML)

| Campo | Default | | Campo | Default |
|---|---|---|---|---|
| aov | 300 | | digi (Digistore %) | 10.34 |
| refund (%) | 10 | | retention (%) | 10 |
| mixMode | `auto` | | vat (%) | 7 |
| mixM1 / M2 / M3 (%) | 6 / 27 / 67 | | pctDE / AT / CH (%) | 85 / 9 / 5 |
| upsellRate (%) | 25 | | capitalRate (%) | 20 |
| upsellPots | 7.6 | | retentionDays | 60 |
| costPerPot (€) | 3.26 | | testCPA (€) | 180 |
| shipping (€) | 7.58 | | volume (vendas/mês) | 300 |

### Fórmulas (por venda FE)

```
effCapital = retPct * (retDays / 365) * capRate           // custo de capital efetivo

// MIX
auto:   mix = {M1:.06, M2:.27, M3:.67}; upsellPots = 7.6
        fePrice = Σ mix·MIX_PRICES ; fePots = Σ mix·MIX_POTS
        upsellRate = max(0, (aov - fePrice) / UPSELL_AVG_PRICE)   // derivado do AOV
manual: normaliza sliders p/ somar 1; fePrice/fePots dos sliders; upsellRate/upsellPots dos inputs

realAOV     = fePrice + upsellRate * UPSELL_AVG_PRICE
gross       = realAOV                                     // gross COM VAT (como vem da Digistore)
vatCost     = gross - gross / (1 + vat)                   // VAT extraído do gross
totalPots   = fePots + upsellRate * upsellPots
productCost = totalPots * costPot
shipCost    = ship                                        // 1 shipping por venda FE
digiCost    = gross * digi
capitalCost = gross * effCapital
netRevenue  = gross * (1 - refund)
totalCosts  = vatCost + productCost + shipCost + digiCost + capitalCost
sobra       = netRevenue - totalCosts

// Tabela CPA por margem (para cada m em MARGINS)
marginTarget = (m/100) * netRevenue
cpaMax       = sobra - marginTarget
profit       = marginTarget

// Simulador de CPA fixo
profitPerSale = sobra - testCPA
marginPct     = netRevenue > 0 ? (profitPerSale / netRevenue) * 100 : 0
monthlyProfit = profitPerSale * volume
monthlyRevenue = netRevenue * volume
```

### Alertas (idênticos ao HTML)

- `auto` **e** `upsellRate > 0.6` → **warning** (upsell alto; usar modo manual)
- `auto` **e** `upsellRate <= 0` → **danger** (AOV < preço FE puro)
- CPA da linha de **10%** de margem `< 0` → **danger** (operação inviável)
- `refund > 0.15` → **warning** (reembolso acima do normal)

### Status de margem (simulador)

`>= 10%` saudável (verde) · `>= 5%` apertada (amarelo) · `>= 0%` crítica (vermelho) · `< 0` prejuízo (vermelho)

## 4. Arquitetura e arquivos

### `src/lib/cpa/cpaFixoModel.ts` (novo — cálculo puro)
- Constantes acima.
- `interface CpaFixoInputs` (todos os campos numéricos + `mixMode: 'auto' | 'manual'`).
- `interface CpaFixoOutputs` (`realAOV`, `sobra`, `netRevenue`, `effCapital`, `fePrice`, `upsellRate`,
  `mix`, `breakdown` {vatCost, productCost, shipCost, digiCost, capitalCost, totalPots}, `rows`
  [{margin, cpa, profit}], `alerts` [{type, text}], `simulator` {profitPerSale, marginPct, monthlyProfit, monthlyRevenue}).
- `function computeCpaFixo(inputs): CpaFixoOutputs` — função pura, sem DOM/estado.
- `function aggregateAffiliateInputs(rows): AffiliateInput[]` (ver §5).

### `src/lib/cpa/cpaFixoModel.test.ts` (novo — testes)
- Verifica `computeCpaFixo` com os defaults (valores conferidos rodando o HTML mentalmente/manual).
- Casos: modo auto vs manual, gatilhos de cada alerta, VAT mix ponderado, custo de capital efetivo,
  simulador (margem/lucro), e `aggregateAffiliateInputs` com linhas sintéticas.

### `src/hooks/useCpaFixo.ts` (novo)
- Estado dos inputs (defaults do §3).
- Deriva a lista de afiliados via `aggregateAffiliateInputs(filteredRows)`.
- `selectAffiliate(name | null)`: se nome, faz merge de `{aov, refund, mixM1/M2/M3}` reais nos inputs
  (mantém demais campos e edições); se `null`, entra no modo manual puro (não sobrescreve nada).
- Persiste **apenas as premissas globais** (costPerPot, shipping, digi, retention, vat, pctDE/AT/CH,
  capitalRate, retentionDays) em `localStorage` (chave `cpa_fixo_settings_v1`); AOV/refund/mix e
  testCPA/volume ficam só em estado.
- Retorna `outputs = computeCpaFixo(inputs)` (memoizado).

### `src/pages/CpaFixo.tsx` (reescrito)
- Consome `useCpaFixo(filteredRows)`. Layout de 2 colunas (§6). Reutiliza os estados de loading/empty
  do padrão atual (`empty-state`, `LoadingDot`).

### `src/index.css` (append)
- Estilos novos sob prefixo **`cpacalc-`** (evita colisão com o `cpaf-` legado, que será removido junto
  com o CpaFixo antigo). Tema claro (§7).

### `src/components/Sidebar.tsx` (editar)
- Badge **NOVO** no botão "CPA Fixo": `<span className="sidebar-link-badge">NOVO</span>` + estilo em CSS.

## 5. Auto-fill: `aggregateAffiliateInputs(rows)`

Para cada afiliado (exclui `(direto)` e Maileonardo, via `isMaileonardo`):
- **Front orders:** `isPayment(t) && t.upsellNo === 0`, variante via `getFrontVariant(t.productName)`
  → conta por variante (mix) e soma `grossAmount` (frontGross), incrementa frontCount.
- **Upsells:** `isPayment(t) && t.upsellNo > 0` → soma `grossAmount` (upsellGross).
- **Reembolsos:** `isRefund(t) || isChargeback(t)` → soma `grossAmount` (refundAmt).
- **Gross total pagamentos:** frontGross + upsellGross (denominador do refund rate).

Saída por afiliado:
```
name
aov        = (frontGross + upsellGross) / frontCount          // gross c/ VAT, incl. upsell, por front order
refundRate = refundAmt / (frontGross + upsellGross)           // fração da receita
mix        = { M1, M2, M3 } em % (a partir das contagens de front por variante)
frontOrders
```
Ordenado por `frontOrders` desc. Afiliados sem front order são descartados.

> Observação: `grossAmount` é VAT-inclusive (confirmado pelo commit "switch AOV from net to gross
> (VAT-inclusive) to match Digistore24"), coerente com a premissa do modelo.

## 6. UI / Layout (2 colunas, espelhando o HTML)

**Header:** ícone + "Gestão de Afiliados" / "Calculadora CPA Fixo" (padrão `cpa-shell-header`).

**Coluna esquerda — Inputs:**
1. **Seletor de afiliado** (buscável) + botão/opção **"Manual (sem afiliado)"**. Ao selecionar, chips
   mostram AOV/reembolso reais aplicados.
2. **Faturamento e mix:** AOV (€), taxa de reembolso (%).
3. **Modo de cálculo do mix:** abas Automático / Manual. Auto mostra alerta informativo do mix fixo;
   Manual mostra sliders M1/M2/M3 + upsell rate/pots.
4. **`<details>` Premissas globais:** custos (pote, shipping), taxas Digistore (comissão, retenção),
   VAT (atalhos DE/AT/CH/mix + painel de distribuição por país + VAT efetivo readonly), custo de
   capital (taxa anual, dias, custo efetivo readonly).

**Coluna direita — Resultados:**
1. **KPIs:** AOV real (+ sub com mix) · Sobra antes do CPA (+ sub com total no volume).
2. **Tabela CPA por margem:** Margem | CPA máximo | Lucro/venda.
3. **Área de alertas** (§3).
4. **`<details>` Breakdown completo** por venda FE.
5. **Card Simulador de CPA fixo:** inputs CPA pretendido + volume; KPIs margem resultante (com status
   colorido), lucro/venda, lucro mensal, faturamento líquido/mês.

Responsivo: 1 coluna abaixo de 1024px (igual ao HTML).

## 7. Mapeamento de estilo (dark → claro)

| HTML (var) | App (token) |
|---|---|
| `--bg` #0f1115 (página) | `--bg-secondary` #F8F9FB |
| `--panel` #161922 (card) | `--bg-primary` #FFFFFF + `--shadow-card` |
| `--panel-2` #1c2030 (inset) | `--bg-tertiary` #F0F2F5 |
| `--border` #2a2f42 | `--border` #E5E8EE |
| `--text` #e6e8ef | `--text-1` #0C0E13 |
| `--text-dim` #8b91a7 | `--text-2` #4A5165 |
| `--text-muted` #5c6278 | `--text-3` #9299A8 |
| `--accent` #d4ff3e (lima) | `--green` #15803D |
| `--accent-dim` | `rgba(21,128,61,0.12)` / `--green-bg` |
| `--green/--yellow/--red/--blue` | `--green`/`--amber`/`--red`/`--blue` |

Inputs readonly usam texto verde (`--green`). Sem fontes externas (usa a stack do app).

## 8. Persistência

- **`localStorage` chave `cpa_fixo_settings_v1`:** apenas as premissas globais (§4, `useCpaFixo`).
- Dados por-afiliado (AOV/reembolso/mix) **sempre** vêm da API no período ativo.
- **Sem** "perfis" nomeados — substituídos pelo seletor de afiliado real.

## 9. Testes

- `cpaFixoModel.test.ts`: `computeCpaFixo` (auto/manual, alertas, VAT mix, capital, simulador),
  `aggregateAffiliateInputs` (mix/AOV/refund a partir de linhas sintéticas).
- Rodar suíte completa (`npm test`) e `tsc`/build para garantir que a remoção do CpaFixo antigo não
  quebra imports.

## 10. Fora de escopo (YAGNI)

- Perfis nomeados em localStorage (substituídos pelo seletor).
- Importar fontes Fraunces/JetBrains Mono.
- Alterações nas páginas Dashboard, Afiliados, CPA Variável, CPA Calculator.
- Exportação PDF do resultado da calculadora.
