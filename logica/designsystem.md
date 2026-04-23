# OG Group — Design System v1.1
> Ecosistema de Afiliação · React / Next.js · Light-first com sidebar e acentos escuros

**Changelog v1.1**
- Sidebar atualizada para fundo escuro `#111418` (dark, não verde)
- Botão primário atualizado para dark `#111418` com texto branco
- Banners de destaque agora usam verde-escuro `#091A0F` (não preto neutro)
- Tipografia principal atualizada para **Inter** (sem monoespaçado nos KPIs)
- Regras de ícone formalizadas: lucide-react, stroke 1.4, reconhecíveis e não abstratos
- Prompt Template para Claude Code atualizado (Seção 14)

---

## 1. Filosofia Visual

O design do ecossistema OG Group segue três princípios inegociáveis:

1. **Clareza antes de estética** — toda informação precisa ser lida em menos de 2 segundos
2. **Confiança institucional** — o visual comunica seriedade, escala e profissionalismo
3. **Verde como linguagem de sucesso** — verde não é só cor de marca, é sinônimo de aprovação, crescimento e resultado

O estilo visual é **light-first, data-dense e limpo** — inspirado em ferramentas SaaS modernas como Linear, Vercel e Raycast, com sidebar escura para separação estrutural clara e blocos de destaque em verde-escuro profundo.

---

## 2. Paleta de Cores

### Cores Base (Tokens)

```css
/* Backgrounds — conteúdo principal (light) */
--color-bg-primary:     #FFFFFF;       /* fundo principal de página */
--color-bg-secondary:   #F8F9FB;       /* fundo de cards, áreas de dados */
--color-bg-tertiary:    #F0F2F5;       /* hover de linhas, separadores */

/* Bordas */
--color-border-default: #E5E8EE;       /* bordas padrão de cards e inputs */
--color-border-strong:  #D0D5DF;       /* bordas com mais peso visual */

/* Texto */
--color-text-primary:   #0C0E13;       /* títulos, dados principais */
--color-text-secondary: #4A5165;       /* labels, subtítulos, metadados */
--color-text-tertiary:  #9299A8;       /* placeholders, texto desabilitado */
--color-text-inverse:   #FFFFFF;       /* texto sobre fundos escuros */

/* Verde — Cor Primária OG Group */
--color-primary-50:     #EDFAF3;
--color-primary-100:    #C6F0D3;
--color-primary-200:    #8FDFAC;
--color-primary-300:    #4DC87A;
--color-primary-400:    #22B157;
--color-primary-500:    #15803D;       /* verde principal */
--color-primary-600:    #0D6330;
--color-primary-700:    #085024;
--color-primary-800:    #053D1B;
--color-primary-900:    #02200F;

/* Sidebar — Dark UI */
--color-sidebar-bg:          #111418;              /* fundo da sidebar */
--color-sidebar-surface:     #1C2128;              /* hover / active nav items */
--color-sidebar-border:      rgba(255,255,255,0.07); /* divisores internos */
--color-sidebar-text:        rgba(255,255,255,0.45); /* nav items inativos */
--color-sidebar-text-active: #FFFFFF;              /* nav item ativo */

/* Banner / Destaque — Verde-escuro profundo */
--color-banner-bg:       #091A0F;               /* fundo de blocos de destaque */
--color-banner-surface:  #132210;               /* surface secundária dentro do banner */
--color-banner-border:   rgba(255,255,255,0.08);

/* Botão primário dark */
--color-btn-primary-bg:    #111418;
--color-btn-primary-text:  #FFFFFF;
--color-btn-primary-hover: #1C2128;

/* Lima — CTA exclusivo sobre fundos escuros */
--color-lime:      #BFEF5A;   /* SOMENTE sobre #111418 ou #091A0F */
--color-lime-dark: #A3E635;

/* Status semântico */
--color-success:      #15803D;
--color-success-bg:   #EDFAF3;
--color-success-text: #0D5C2E;
--color-warning:      #B45309;
--color-warning-bg:   #FFFBEB;
--color-danger:       #C92A2A;
--color-danger-bg:    #FFF0F0;
--color-info:         #1D4ED8;
--color-info-bg:      #EFF6FF;
```

### Uso das Cores

| Contexto | Token(s) |
|---|---|
| Fundo de página | `--color-bg-primary` |
| Card de dado / painel | `--color-bg-secondary` + borda `--color-border-default` |
| **Sidebar** | `--color-sidebar-bg` (#111418) |
| Nav item inativo | `--color-sidebar-text` + ícone opacidade 0.7 |
| Nav item ativo | bg `--color-sidebar-surface`, texto `--color-sidebar-text-active` |
| **Botão primário** | bg `--color-btn-primary-bg` (#111418), texto branco |
| Botão secundário | bg transparente, borda `--color-border-default`, texto `--color-text-secondary` |
| **Banner / bloco destaque** | bg `--color-banner-bg` (#091A0F), texto branco |
| CTA dentro de banner | bg `--color-lime` (#BFEF5A), texto `--color-banner-bg` |
| Badge positivo | bg `--color-success-bg` + texto `--color-success-text` |
| Badge crítico | bg `--color-danger-bg` + texto `--color-danger` |
| Badge alerta | bg `--color-warning-bg` + texto `--color-warning` |

> **Lima (#BFEF5A) é exclusivo para fundos escuros.** Nunca use lima sobre fundo branco ou cinza claro.

---

## 3. Tipografia

### Fonte Principal

```
Interface / Body:  "Inter" — pesos 300, 400, 500, 600
Headlines / KPIs:  "Inter" — peso 600, letter-spacing -0.4px a -0.6px
```

> **Sem fonte monoespaçada nos KPIs.** Números de dashboard usam Inter com `font-variant-numeric: tabular-nums` para alinhamento sem o aspecto typewriter. Disponível via `npm install @fontsource/inter` ou Google Fonts.

```css
/* Ativar alinhamento tabular em números */
.og-numeric {
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum";
}
```

### Escala Tipográfica

```css
/* Tamanhos */
--text-xs:   11px;   /* labels de tabela, metadados, badges */
--text-sm:   12px;   /* body secundário, timestamps, subtítulos de card */
--text-base: 13px;   /* body principal de interface */
--text-md:   15px;   /* subtítulos de seção */
--text-lg:   17px;   /* títulos de card */
--text-xl:   20px;   /* títulos de página */
--text-2xl:  24px;   /* KPI médio */
--text-3xl:  32px;   /* KPI principal / hero interno */
--text-4xl:  42px;   /* headlines de landing/banner */

/* Pesos */
--font-light:    300;
--font-regular:  400;
--font-medium:   500;
--font-semibold: 600;

/* Letter-spacing para títulos e KPIs */
--tracking-tight:   -0.4px;
--tracking-tighter: -0.6px;

/* Altura de linha */
--leading-tight:  1.2;
--leading-normal: 1.5;
--leading-loose:  1.75;
```

### Hierarquia de Texto

```
Page Title (h1):      --text-xl,  --font-semibold, --color-text-primary, tracking-tight
Section Title (h2):   --text-lg,  --font-semibold, --color-text-primary
Card Title (h3):      --text-base, --font-semibold, --color-text-primary
Label (uppercase):    --text-xs,  --font-semibold, --color-text-tertiary, uppercase + letter-spacing 0.06em
Body:                 --text-base, --font-regular,  --color-text-primary
Caption / Meta:       --text-sm,  --font-regular,  --color-text-tertiary
KPI Number:           --text-2xl ou --text-3xl, --font-semibold, og-numeric, tracking-tighter
```

---

## 4. Espaçamento e Grid

```css
/* Escala de espaçamento (base 4px) */
--space-1:   4px;
--space-2:   8px;
--space-3:   12px;
--space-4:   16px;
--space-5:   20px;
--space-6:   24px;
--space-8:   32px;
--space-10:  40px;
--space-12:  48px;
--space-16:  64px;
--space-20:  80px;

/* Layout */
--sidebar-width:    216px;
--topbar-height:    50px;
--content-max-width: 1280px;
--card-padding:     var(--space-5);   /* 20px */
--page-padding:     var(--space-6);   /* 24px */
--section-gap:      var(--space-4);   /* 16px entre seções */
```

### Grid de Dashboard

```
Shell: flex-row
Sidebar dark 216px (fixa) + main content fluido
Grid KPI: 4 colunas desktop, gap 10–12px
Grid main: 1fr + coluna fixa 300px para listas
Grid bottom: 1fr 1fr para tabela + distribuição
```

---

## 5. Border Radius e Sombras

```css
/* Raio de borda */
--radius-sm:   4px;    /* badges, tags */
--radius-md:   8px;    /* botões, inputs, nav items */
--radius-lg:   12px;   /* cards de dado */
--radius-xl:   14px;   /* banners, modais */
--radius-full: 9999px; /* pills, avatares */

/* Sombras — minimalistas */
--shadow-card: 0 1px 2px rgba(0,0,0,0.05);
--shadow-md:   0 2px 8px rgba(0,0,0,0.07);
--shadow-lg:   0 4px 16px rgba(0,0,0,0.09);
```

---

## 6. Componentes

### 6.1 Botões

```css
/* PRIMARY — dark, ação principal */
.og-btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: var(--color-btn-primary-bg);    /* #111418 */
  color: var(--color-btn-primary-text);        /* #fff */
  padding: 7px 14px;
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  font-family: 'Inter', sans-serif;
  border: none;
  cursor: pointer;
  letter-spacing: -0.1px;
  transition: background 120ms ease;
}
.og-btn-primary:hover { background: var(--color-btn-primary-hover); }

/* SECONDARY — contorno, ação secundária */
.og-btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: var(--color-bg-primary);
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border-default);
  padding: 6px 12px;
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: var(--font-regular);
  cursor: pointer;
  transition: border-color 120ms ease, background 120ms ease;
}
.og-btn-secondary:hover {
  background: var(--color-bg-secondary);
  border-color: var(--color-border-strong);
}

/* LIME — CTA exclusivo dentro de banners escuros */
.og-btn-lime {
  background: var(--color-lime);       /* #BFEF5A */
  color: var(--color-banner-bg);       /* #091A0F */
  padding: 8px 16px;
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  border: none;
  cursor: pointer;
  letter-spacing: -0.1px;
}
```

> **Verde `#15803D` nunca é fundo de botão.** Verde aparece apenas em badges de status e elementos de dado positivo.

---

### 6.2 Sidebar de Navegação (Dark)

A sidebar é escura em todas as aplicações do ecossistema — separação estrutural entre navegação e conteúdo.

```tsx
<aside className="og-sidebar">

  {/* Logo area — espaço reservado para a logo do produto */}
  <div className="og-sidebar-logo">
    <div className="og-logo-mark">
      {/* Logo SVG do produto aqui — 16x16px ideal */}
    </div>
    <span className="og-logo-name">OG Group</span>
    <span className="og-logo-module">Ads</span>
  </div>

  <nav className="og-sidebar-nav">
    <div className="og-nav-group">
      <span className="og-nav-group-label">Visão geral</span>
      <a className="og-nav-item og-nav-item--active" href="/dashboard">
        <LayoutDashboard size={15} strokeWidth={1.4} />
        Dashboard
      </a>
      <a className="og-nav-item" href="/campanhas">
        <BarChart2 size={15} strokeWidth={1.4} />
        Campanhas
      </a>
    </div>
  </nav>

  <div className="og-sidebar-footer">
    <div className="og-user-row">
      <div className="og-avatar">VN</div>
      <div>
        <div className="og-user-name">Victor N.</div>
        <div className="og-user-role">Admin</div>
      </div>
    </div>
  </div>

</aside>
```

```css
.og-sidebar {
  width: var(--sidebar-width);
  height: 100vh;
  background: var(--color-sidebar-bg);        /* #111418 */
  border-right: 1px solid var(--color-sidebar-border);
  display: flex;
  flex-direction: column;
  position: sticky;
  top: 0;
  align-self: flex-start;
}

.og-sidebar-logo {
  padding: 18px 16px 14px;
  border-bottom: 1px solid var(--color-sidebar-border);
  display: flex;
  align-items: center;
  gap: 9px;
}

.og-logo-mark {
  width: 30px; height: 30px;
  border-radius: 7px;
  background: #1C2128;
  border: 1px solid rgba(255,255,255,0.10);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}

.og-logo-name {
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  letter-spacing: -0.2px;
}

.og-logo-module {
  margin-left: auto;
  font-size: 10px;
  font-weight: 500;
  color: var(--color-lime);
  background: rgba(191,239,90,0.12);
  padding: 2px 7px;
  border-radius: 20px;
  letter-spacing: 0.02em;
}

.og-sidebar-nav { padding: 16px 10px 0; }

.og-nav-group { margin-bottom: 20px; }

.og-nav-group-label {
  font-size: 10px;
  font-weight: 500;
  color: rgba(255,255,255,0.25);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 0 8px;
  display: block;
  margin-bottom: 3px;
}

.og-nav-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 9px;
  border-radius: var(--radius-md);
  font-size: 12.5px;
  font-weight: 400;
  color: var(--color-sidebar-text);
  text-decoration: none;
  transition: all 110ms ease;
  margin-bottom: 1px;
}
.og-nav-item svg { opacity: 0.7; }
.og-nav-item:hover {
  background: rgba(255,255,255,0.06);
  color: rgba(255,255,255,0.8);
}
.og-nav-item--active {
  background: rgba(255,255,255,0.09);
  color: var(--color-sidebar-text-active);
  font-weight: 500;
}
.og-nav-item--active svg { opacity: 1; }

.og-sidebar-footer {
  margin-top: auto;
  padding: 12px 10px;
  border-top: 1px solid var(--color-sidebar-border);
}

.og-avatar {
  width: 26px; height: 26px;
  border-radius: 50%;
  background: rgba(191,239,90,0.15);
  border: 1px solid rgba(191,239,90,0.3);
  display: flex; align-items: center; justify-content: center;
  font-size: 10px;
  font-weight: 600;
  color: var(--color-lime);
}

.og-user-name { font-size: 12px; font-weight: 500; color: rgba(255,255,255,0.75); }
.og-user-role  { font-size: 11px; color: rgba(255,255,255,0.30); }
```

---

### 6.3 Cards de KPI

```css
.og-kpi-card {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-lg);
  padding: 14px 16px;
  box-shadow: var(--shadow-card);
}
.og-kpi-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.og-kpi-label {
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--color-text-tertiary);
  letter-spacing: 0.02em;
}
.og-kpi-icon {
  width: 28px; height: 28px;
  border-radius: var(--radius-md);
  background: var(--color-bg-tertiary);
  display: flex; align-items: center; justify-content: center;
  color: var(--color-text-secondary);
}
.og-kpi-value {
  font-size: var(--text-2xl);
  font-weight: 600;
  color: var(--color-text-primary);
  letter-spacing: var(--tracking-tighter);
  margin-bottom: 6px;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum";
}
.og-delta {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  font-weight: 500;
  padding: 2px 7px;
  border-radius: 20px;
}
.og-delta--up   { background: var(--color-success-bg);  color: var(--color-success-text); }
.og-delta--down { background: var(--color-danger-bg);   color: var(--color-danger); }
.og-delta--warn { background: var(--color-warning-bg);  color: var(--color-warning); }
```

---

### 6.4 Banners e Blocos de Destaque

Banners usam **verde-escuro profundo `#091A0F`** — não preto neutro. Mantém identidade cromática OG Group em todos os momentos de ênfase.

**Quando usar:**
- Alertas críticos que requerem ação imediata
- CTAs de fim de seção no dashboard
- Avisos importantes do sistema
- Heroes internos de páginas de conversão dentro do produto

```tsx
<div className="og-banner">
  <div className="og-banner-icon">
    <AlertTriangle size={18} strokeWidth={1.4} />
  </div>
  <div className="og-banner-content">
    <p className="og-banner-title">2 campanhas abaixo do ROAS mínimo (3,0×)</p>
    <p className="og-banner-sub">
      BurnSlim IT e Wellness Box ES precisam de atenção — orçamento sem retorno adequado.
    </p>
  </div>
  <button className="og-btn-lime">Ver diagnóstico →</button>
</div>
```

```css
.og-banner {
  background: var(--color-banner-bg);   /* #091A0F */
  border-radius: var(--radius-xl);      /* 14px */
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 14px;
}

.og-banner-icon {
  width: 36px; height: 36px;
  background: rgba(255,255,255,0.07);
  border-radius: var(--radius-md);
  display: flex; align-items: center; justify-content: center;
  color: #fff;
  flex-shrink: 0;
}

.og-banner-content { flex: 1; }

.og-banner-title {
  font-size: var(--text-base);
  font-weight: 600;
  color: #fff;
  margin-bottom: 2px;
}

.og-banner-sub {
  font-size: var(--text-sm);
  color: rgba(255,255,255,0.45);
  line-height: 1.5;
}

/* Variante hero — para CTAs de seção */
.og-banner-hero {
  background: var(--color-banner-bg);
  border-radius: var(--radius-xl);
  padding: var(--space-10) var(--space-12);
  text-align: center;
}
.og-banner-hero h2 {
  font-size: var(--text-4xl);
  font-weight: 600;
  color: #fff;
  letter-spacing: var(--tracking-tighter);
  line-height: var(--leading-tight);
  margin-bottom: var(--space-4);
}
.og-banner-hero p {
  font-size: var(--text-base);
  color: rgba(255,255,255,0.5);
  margin-bottom: var(--space-6);
}
```

---

### 6.5 Tabelas

```css
.og-table { width: 100%; border-collapse: collapse; font-size: var(--text-sm); }

.og-table thead th {
  text-align: left;
  padding: 8px 16px;
  font-size: 10px;
  font-weight: 600;
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  border-bottom: 1px solid var(--color-border-default);
  background: var(--color-bg-secondary);
}

.og-table tbody td {
  padding: 9px 16px;
  color: var(--color-text-primary);
  border-bottom: 1px solid var(--color-border-default);
}
.og-table tbody tr:last-child td { border-bottom: none; }
.og-table tbody tr:hover td { background: var(--color-bg-secondary); }
.og-table .td-num { font-weight: 600; font-variant-numeric: tabular-nums; }
```

---

### 6.6 Badges e Status Tags

```css
.og-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 20px;
  font-size: 10px;
  font-weight: 600;
  line-height: 1.6;
}
.og-badge--success { background: var(--color-success-bg);  color: var(--color-success-text); }
.og-badge--warning { background: var(--color-warning-bg);  color: var(--color-warning); }
.og-badge--danger  { background: var(--color-danger-bg);   color: var(--color-danger); }
.og-badge--info    { background: var(--color-info-bg);     color: var(--color-info); }
.og-badge--neutral { background: var(--color-bg-tertiary); color: var(--color-text-secondary); }
```

---

### 6.7 Inputs e Formulários

```css
.og-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-family: 'Inter', sans-serif;
  color: var(--color-text-primary);
  background: var(--color-bg-primary);
  outline: none;
  transition: border-color 150ms ease, box-shadow 150ms ease;
}
.og-input::placeholder { color: var(--color-text-tertiary); }
.og-input:focus {
  border-color: var(--color-primary-400);
  box-shadow: 0 0 0 3px var(--color-primary-50);
}
.og-label {
  display: block;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-secondary);
  margin-bottom: var(--space-2);
}
```

---

### 6.8 Topbar

```css
.og-topbar {
  height: var(--topbar-height);
  background: var(--color-bg-primary);
  border-bottom: 1px solid var(--color-border-default);
  display: flex;
  align-items: center;
  padding: 0 var(--page-padding);
  gap: 10px;
  position: sticky;
  top: 0;
  z-index: 100;
}
.og-topbar-title {
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--color-text-primary);
  letter-spacing: var(--tracking-tight);
  flex: 1;
}
```

---

## 7. Iconografia

### Regras

- **Biblioteca:** `lucide-react`
- **strokeWidth:** `1.4` sempre — nunca `1.6` ou `2`
- **Tamanhos:**
  - `14px` — ícone dentro de KPI badge
  - `15px` — nav items da sidebar
  - `16px` — ícones em tabelas e listas
  - `18px` — ícones em banners e alertas
  - `20px` — ícones em títulos de card

### Ícones por Contexto

| Contexto | Ícone | Justificativa |
|---|---|---|
| Dashboard / Home | `LayoutDashboard` | 4 quadrantes = visão geral |
| Campanhas | `BarChart2` | barras = performance |
| Ad Sets | `Layers` | camadas = conjuntos |
| Criativos | `Image` ou `Monitor` | tela = conteúdo visual |
| Afiliados | `Users` | pessoas direto |
| Performance | `TrendingUp` | linha crescente |
| Audiências | `Target` | alvo = segmentação |
| Relatórios | `FileText` | documento |
| Configurações | `Settings` | engrenagem |
| Receita | `CircleDollarSign` | moeda |
| ROAS | `Percent` | porcentagem |
| Alertas | `AlertTriangle` | triângulo universal |
| Sucesso | `CheckCircle2` | check = aprovado |
| Pausado | `PauseCircle` | pause = parado |
| Novo / Adicionar | `Plus` | mais = criar |
| Filtrar | `SlidersHorizontal` | controles |
| Data / Período | `Calendar` | calendário |
| Download | `Download` | seta para baixo |

```tsx
import { LayoutDashboard, TrendingUp, AlertTriangle } from 'lucide-react'

// Sidebar:
<LayoutDashboard size={15} strokeWidth={1.4} />

// Banner:
<AlertTriangle size={18} strokeWidth={1.4} />

// KPI badge:
<TrendingUp size={14} strokeWidth={1.4} />
```

---

## 8. Motion e Microinterações

```css
--duration-fast:   110ms;   /* hover de nav items */
--duration-normal: 150ms;   /* transições de estado, inputs */
--duration-slow:   220ms;   /* modais, drawers */

--ease-out: cubic-bezier(0.16, 1, 0.3, 1);
--ease-std: cubic-bezier(0.4, 0, 0.2, 1);
```

---

## 9. Aplicações do Ecossistema

### Identidade por Produto

Sidebar sempre dark `#111418`. Diferenciação apenas no badge de módulo e nos itens de navegação.

| Produto | Badge módulo | Ícone de referência |
|---|---|---|
| Backoffice Operação | `Ops` | `Settings` |
| Dashboard Afiliados | `Stats` | `TrendingUp` |
| Hub de Afiliados | `Hub` | `Users` |
| Controle de Páginas | `Pages` | `LayoutTemplate` |
| Controle de Ads | `Ads` | `BarChart2` |

Badge: `color: var(--color-lime)` + `background: rgba(191,239,90,0.12)`

### Hierarquia de Acesso Visual

```
ADMIN / OPERAÇÃO    → sidebar completa, tabelas densas, ações destrutivas visíveis
AFILIADO            → sidebar reduzida, KPIs grandes, sem ações de config
HUB (self-service)  → sem sidebar, layout full-width, linguagem direta
```

---

## 10. Regras de Layout por Tipo de Página

### Dashboard

```
Shell: flex-row
├── Sidebar dark 216px (sticky)
└── Main (flex-col, bg #F0F2F5)
    ├── Topbar 50px (bg branco)
    └── Content (padding 18px 22px)
        ├── KPI grid (4 cols, gap 10px)
        ├── Main row (chart + lista, 1fr 300px)
        ├── Bottom row (tabela + distribuição, 1fr 1fr)
        └── Banner alerta (full-width, bg #091A0F)
```

### Backoffice

```
Shell: flex-row
├── Sidebar dark 216px
└── Main
    ├── Topbar
    └── Content
        ├── Tabs de seção
        ├── Formulários em cards
        └── Ações no rodapé do card (não flutuantes)
```

### Hub de Afiliados

```
Topbar full-width (sem sidebar)
└── Hero KPIs (3 cards grandes)
    └── Grid de ferramentas
        └── Feed de novidades
```

---

## 11. Padrões de Dados e Gráficos

- **Biblioteca:** `recharts`
- **Linha principal:** `#15803D`, strokeWidth `1.5`
- **Área fill:** `#15803D` com `fillOpacity: 0.07`
- **Linha secundária:** `#1D4ED8`, tracejada `strokeDasharray="5 3"`, `strokeWidth: 1`
- **Grid lines:** `#E5E8EE`, `strokeDasharray="4 3"`, `strokeWidth: 0.5`
- **Tooltips:** bg `#091A0F`, texto branco, `border-radius: 8px`, sem borda
- **Eixos:** Inter, `fontSize: 9`, cor `#9299A8`

```tsx
<AreaChart>
  <defs>
    <linearGradient id="og-fill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%"  stopColor="#15803D" stopOpacity={0.10} />
      <stop offset="95%" stopColor="#15803D" stopOpacity={0.01} />
    </linearGradient>
  </defs>
  <CartesianGrid strokeDasharray="4 3" stroke="#E5E8EE" strokeWidth={0.5} />
  <Area stroke="#15803D" strokeWidth={1.5} fill="url(#og-fill)" />
</AreaChart>
```

---

## 12. Estados de Interface

### Loading Skeleton

```css
.og-skeleton {
  background: linear-gradient(90deg,
    var(--color-bg-tertiary) 25%,
    var(--color-bg-secondary) 50%,
    var(--color-bg-tertiary) 75%
  );
  background-size: 200% 100%;
  animation: og-shimmer 1.5s linear infinite;
  border-radius: var(--radius-md);
}
@keyframes og-shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

### Empty State

```css
.og-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  padding: var(--space-16);
  color: var(--color-text-tertiary);
  text-align: center;
  font-size: var(--text-sm);
}
```

### Alertas Inline

```css
.og-alert {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-4);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  border: 1px solid transparent;
}
.og-alert--danger  { background: var(--color-danger-bg);  color: var(--color-danger);       border-color: #fecaca; }
.og-alert--warning { background: var(--color-warning-bg); color: var(--color-warning);      border-color: #fde68a; }
.og-alert--success { background: var(--color-success-bg); color: var(--color-success-text); border-color: #bbf7d0; }
```

---

## 13. Configuração Tailwind (tailwind.config.ts)

```ts
import type { Config } from 'tailwindcss'

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        og: {
          primary: {
            50:  '#EDFAF3',
            100: '#C6F0D3',
            500: '#15803D',
            600: '#0D6330',
            700: '#085024',
          },
          sidebar: {
            bg:      '#111418',
            surface: '#1C2128',
          },
          banner: {
            bg:      '#091A0F',
            surface: '#132210',
          },
          btn: {
            dark:  '#111418',
            hover: '#1C2128',
          },
          lime: '#BFEF5A',
          border: {
            default: '#E5E8EE',
            strong:  '#D0D5DF',
          },
          text: {
            primary:   '#0C0E13',
            secondary: '#4A5165',
            tertiary:  '#9299A8',
          },
          bg: {
            primary:   '#FFFFFF',
            secondary: '#F8F9FB',
            tertiary:  '#F0F2F5',
          },
          success: { DEFAULT: '#15803D', bg: '#EDFAF3', text: '#0D5C2E' },
          warning: { DEFAULT: '#B45309', bg: '#FFFBEB' },
          danger:  { DEFAULT: '#C92A2A', bg: '#FFF0F0' },
          info:    { DEFAULT: '#1D4ED8', bg: '#EFF6FF' },
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        sm:  '4px',
        md:  '8px',
        lg:  '12px',
        xl:  '14px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(0,0,0,0.05)',
        md:   '0 2px 8px rgba(0,0,0,0.07)',
      },
      letterSpacing: {
        tight:   '-0.4px',
        tighter: '-0.6px',
      }
    }
  }
} satisfies Config
```

---

## 14. Prompt Template para Claude Code

Cole este bloco diretamente no VSCode / Claude Code ao solicitar atualização de qualquer frontend do ecossistema OG Group:

```
Atualize o frontend desta aplicação seguindo o OG Group Design System v1.1.

=== ESTRUTURA OBRIGATÓRIA ===
- Layout: sidebar fixa 216px (dark) + main content fluido (light)
- Topbar: 50px, bg #FFFFFF, border-bottom 1px solid #E5E8EE

=== SIDEBAR — SEMPRE DARK ===
- Background: #111418 (não verde, não cinza — dark carvão)
- Nav items inativos: cor rgba(255,255,255,0.45), ícone opacidade 0.7
- Nav item ativo: background rgba(255,255,255,0.09), cor #FFFFFF, font-weight 500
- Hover: background rgba(255,255,255,0.06), cor rgba(255,255,255,0.8)
- Logo mark: 30x30px, bg #1C2128, border 1px rgba(255,255,255,0.10), border-radius 7px
- Badge de módulo: cor #BFEF5A, bg rgba(191,239,90,0.12), border-radius 20px, font-size 10px
- Avatar de usuário: bg rgba(191,239,90,0.15), border rgba(191,239,90,0.3), texto #BFEF5A
- Grupos de nav com label uppercase, font-size 10px, cor rgba(255,255,255,0.25)
- Divisores internos: 1px solid rgba(255,255,255,0.07)

=== BOTÕES ===
- Botão primário: bg #111418, texto #FFFFFF, border-radius 8px, font-size 12px, font-weight 500
- Botão primário hover: bg #1C2128
- Botão secundário: bg #FFFFFF, border 1px #E5E8EE, texto #4A5165, border-radius 8px
- NUNCA use #15803D como fundo de botão

=== TIPOGRAFIA ===
- Fonte única: Inter (400, 500, 600)
- ZERO fontes monoespaçadas (sem Geist Mono, JetBrains, Courier)
- KPIs e números: Inter 600, font-variant-numeric: tabular-nums, letter-spacing -0.6px
- Labels de tabela/seção: uppercase, font-size 10px, letter-spacing 0.06em, cor #9299A8
- Títulos de página: font-weight 600, letter-spacing -0.4px

=== CARDS E CONTEÚDO LIGHT ===
- Fundo de página: #F0F2F5
- Cards: bg #FFFFFF, border 1px solid #E5E8EE, border-radius 12px
- KPI icon badge: 28x28px, bg #F0F2F5, border-radius 8px, ícone cor #4A5165
- Deltas positivas: bg #EDFAF3, texto #0D5C2E
- Deltas negativas: bg #FFF0F0, texto #C92A2A
- Deltas atenção: bg #FFFBEB, texto #B45309

=== BANNERS DE DESTAQUE ===
- Background: #091A0F (verde-escuro profundo — NÃO preto neutro #000 ou #111)
- Texto principal: #FFFFFF, font-weight 600
- Texto secundário: rgba(255,255,255,0.45)
- Ícone container: 36x36px, bg rgba(255,255,255,0.07), border-radius 8px, ícone branco
- Botão CTA dentro do banner: bg #BFEF5A, texto #091A0F, font-weight 600
- border-radius do banner: 14px
- padding: 16px 20px
- gap entre elementos: 14px

=== ÍCONES ===
- Biblioteca: lucide-react exclusivamente
- strokeWidth: 1.4 sempre (nunca 1.6, nunca 2)
- Tamanho sidebar: 15px
- Tamanho KPI icon badge: 14px
- Tamanho banner/alerta: 18px
- Tamanho tabela/lista: 16px
- Ícones devem ser reconhecíveis e literais:
  dashboard=LayoutDashboard, campanhas=BarChart2, pessoas=Users,
  alerta=AlertTriangle, performance=TrendingUp, config=Settings,
  data=Calendar, filtro=SlidersHorizontal, novo=Plus

=== GRÁFICOS (recharts) ===
- Linha/área principal: #15803D, strokeWidth 1.5
- Area fill: #15803D com fillOpacity 0.07–0.10
- Linha secundária: #1D4ED8, strokeDasharray="5 3", strokeWidth 1
- Grid lines: #E5E8EE, strokeDasharray="4 3", strokeWidth 0.5
- Eixos: Inter, fontSize 9, cor #9299A8
- Tooltip: bg #091A0F, texto branco, border-radius 8px

=== PROIBIDO ===
- Qualquer fonte monoespaçada na UI
- #15803D como fundo de botão
- #BFEF5A (lima) sobre fundo branco ou cinza
- Sidebar clara, branca ou verde
- Preto neutro #000 ou #111 em banners (use #091A0F)
- strokeWidth diferente de 1.4 nos ícones
- border-radius > 14px em cards
- Gradientes decorativos
- box-shadow com blur > 16px
- Animações > 220ms
```

---

## 15. Anti-Patterns (O Que Nunca Fazer)

| ❌ Proibido | ✅ Correto |
|---|---|
| Sidebar clara, verde ou cinza | Sidebar sempre `#111418` |
| Botão primário verde `#15803D` | Botão primário `#111418` (dark) |
| KPI em Geist Mono ou Courier | Inter + `font-variant-numeric: tabular-nums` |
| Banner em preto neutro `#000` ou `#111` | Verde-escuro `#091A0F` |
| Lima `#BFEF5A` sobre fundo claro | Lima apenas sobre `#111418` ou `#091A0F` |
| Ícones abstratos / geométricos | lucide-react reconhecível, `strokeWidth={1.4}` |
| `strokeWidth={2}` nos ícones | `strokeWidth={1.4}` sempre |
| Gradientes decorativos | Superfícies flat, bordas finas |
| Cards sem borda visível | `border: 1px solid #E5E8EE` sempre |
| Botões pill `border-radius: 9999px` | `border-radius: 8px` |
| Label genérica "Total" | Label precisa "Receita Bruta 30d" |
| Status sem cor semântica | Badge colorido com fundo tinted sempre |
| Animações > 220ms | Máximo `220ms` |

---

*OG Group Design System v1.1 — próxima versão ao adicionar: modais, drawers, onboarding steps, notificações*