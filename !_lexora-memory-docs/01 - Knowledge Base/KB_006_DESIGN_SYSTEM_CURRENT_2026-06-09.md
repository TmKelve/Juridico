---
tipo: knowledge-base
status: current
projeto: lexora
fase: kb-006
data_criacao: 2026-06-09
ultima_atualizacao: 2026-06-09
fonte: claude-code
baseado_em:
  - "frontend/src/tokens.css"
  - "frontend/src/index.css"
  - "frontend/src/components/ui/styles.css"
  - "frontend/src/components/ui/*.tsx"
  - "frontend/src/components/product/*.tsx"
  - "[[KB_005_INVENTARIO_UX_UI_CURRENT_2026-06-09]]"
escopo: design-system
vault_oficial: "!_lexora-memory-docs"
---

# KB-006 — Design System: Tokens, Componentes e Constituição Visual

> **Fonte de verdade:** `frontend/src/tokens.css` é a **única fonte autoritativa de tokens**. Decisão tomada em 2026-05-30 (BL-028). Não usar `slate-*` ou cores hardcoded — sempre tokens canónicos.

---

## 1. Arquitectura do Design System

O Design System do Lexora usa uma abordagem **híbrida**:

```
tokens.css          → variáveis CSS canónicas (hex) — fonte oficial
index.css           → variáveis shadcn/Radix em HSL, alinhadas com tokens.css
components/ui/      → primitivos Radix UI wrappers com classes CSS custom
components/product/ → componentes de produto Lexora usando tokens canónicos
Tailwind 3.4        → utilities estruturais (layout, spacing, flex, grid)
CSS por ecrã        → estilos específicos de tela (BEM-like naming)
```

**Regra de uso:**
- Layout/estrutura → Tailwind classes
- Cores/tipografia/sombras → variáveis CSS de `tokens.css`
- Nunca hardcode de cores; nunca `slate-*`, `gray-*`, `blue-*` do Tailwind para cores semânticas

---

## 2. Sistema de Tokens — `tokens.css`

### 2.1 Cores de Marca (Brand Palette)

| Token | Hex | Uso |
|---|---|---|
| `--brand-950` | `#162633` | Fundos muito escuros |
| `--brand-900` | `#1D3448` | Fundos escuros |
| `--brand-800` | `#223B4D` | |
| `--brand-700` | `#2E4B63` | |
| `--brand-600` | `#3C607D` | |
| `--brand-500` | `#4C789A` | Cor de marca principal |
| `--brand-400` | `#6A97BA` | Focus ring, accents |
| `--brand-300` | `#95BAD4` | |
| `--brand-200` | `#C5D9E8` | |
| `--brand-100` | `#E8F0F6` | Fundos subtis de marca |
| `--brand-50`  | `#F5F8FB` | Fundos muito subtis |

### 2.2 Cores Neutras

| Token | Hex | Uso |
|---|---|---|
| `--neutral-950` | `#0F1720` | |
| `--neutral-900` | `#17212B` | Texto primário (via alias) |
| `--neutral-800` | `#25313D` | |
| `--neutral-700` | `#3A4754` | Texto secundário (via alias) |
| `--neutral-600` | `#556270` | |
| `--neutral-500` | `#73808E` | Texto muted (via alias) |
| `--neutral-400` | `#97A3AF` | |
| `--neutral-300` | `#C2CAD2` | Bordas fortes |
| `--neutral-200` | `#DDE3E8` | Bordas default |
| `--neutral-100` | `#EDF1F4` | Fundos subtis |
| `--neutral-50`  | `#F7F9FB` | Fundo de página |
| `--white`       | `#FFFFFF` | Superfícies |

### 2.3 Cores Semânticas

| Semântica | 700 (texto) | 600 (ícone/borda) | 100 (fundo) |
|---|---|---|---|
| `--success-*` | `#166534` | `#15803D` | `#DCFCE7` |
| `--warning-*` | `#B45309` | `#D97706` | `#FEF3C7` |
| `--error-*`   | `#B91C1C` | `#DC2626` | `#FEE2E2` |
| `--info-*`    | `#1D4ED8` | `#2563EB` | `#DBEAFE` |

**Padrão de uso semântico:**
```css
color: var(--success-700);
background-color: var(--success-100);
border-color: var(--success-100);
```

### 2.4 Tokens Funcionais (Aliases)

```css
/* Fundos */
--bg-page:    var(--neutral-50)   /* fundo da página */
--bg-surface: var(--white)        /* cards, painéis, modais */
--bg-subtle:  var(--neutral-100)  /* hover, thead, estados desactivados */

/* Texto */
--text-primary:   var(--neutral-900)  /* títulos, corpo */
--text-secondary: var(--neutral-700)  /* labels, subtítulos */
--text-muted:     var(--neutral-500)  /* placeholders, eyebrow */
--text-inverse:   var(--white)        /* texto sobre fundos escuros */

/* Bordas */
--border-default: var(--neutral-200)  /* bordas standard */
--border-strong:  var(--neutral-300)  /* bordas mais visíveis */

/* Acções */
--action-primary:       #1d4ed8       /* botão primário, links */
--action-primary-hover: #1e40af
--action-secondary:     var(--neutral-100)
--action-secondary-hover: var(--neutral-200)

/* Focus */
--focus-ring: #6A97BA               /* outline de foco (brand-400) */
```

### 2.5 Tokens de KPI

```css
/* Accent (ícone) por categoria */
--kpi-accent-warning: var(--warning-600)
--kpi-accent-info:    var(--info-600)
--kpi-accent-error:   var(--error-600)
--kpi-accent-primary: var(--brand-500)
--kpi-accent-success: var(--success-600)

/* Background do ícone por categoria */
--kpi-bg-warning: var(--warning-100)
--kpi-bg-info:    var(--info-100)
--kpi-bg-error:   var(--error-100)
--kpi-bg-primary: var(--brand-100)
--kpi-bg-success: var(--success-100)
```

### 2.6 Tipografia

**Fonte oficial:** IBM Plex Sans (Google Fonts, 400/500/600/700)

```css
--font-family-base: "IBM Plex Sans", ui-sans-serif, system-ui, ...

/* Escala de tamanhos */
--font-size-xs:  12px
--font-size-sm:  14px   /* labels, badges, tabelas */
--font-size-md:  16px   /* corpo de texto */
--font-size-lg:  18px
--font-size-xl:  20px
--font-size-2xl: 24px   /* h3 */
--font-size-2_5xl: 26px /* intermediário custom */
--font-size-3xl: 30px   /* h2 */
--font-size-4xl: 36px   /* h1 */

/* Pesos */
--font-weight-regular:  400
--font-weight-medium:   500
--font-weight-semibold: 600  /* default para títulos e botões */
--font-weight-bold:     700

/* Line-heights */
--line-height-tight:   1.2   /* títulos */
--line-height-normal:  1.5   /* corpo */
--line-height-relaxed: 1.65  /* texto longo */
```

### 2.7 Espaçamento (Base 4px)

```css
--space-1:  4px
--space-2:  8px
--space-3:  12px
--space-4:  16px
--space-5:  20px
--space-6:  24px
--space-8:  32px
--space-10: 40px
--space-12: 48px
--space-16: 64px
```

### 2.8 Border Radius

```css
--radius-sm:   4px
--radius-md:   6px
--radius-lg:   8px   /* botões, inputs, cards internos */
--radius-xl:   10px  /* cards principais */
--radius-2xl:  16px  /* drawers, modais grandes */
--radius-full: 9999px /* pills, badges redondos */
```

### 2.9 Sombras

```css
--shadow-sm:          0 1px 2px rgba(0,0,0,0.05)
--shadow-md:          0 4px 6px rgba(0,0,0,0.1)
--shadow-lg:          0 10px 15px rgba(0,0,0,0.1)
--shadow-xl:          0 20px 25px rgba(0,0,0,0.15)
--shadow-card:        0 1px 3px rgba(15,23,32,0.08), 0 1px 2px rgba(15,23,32,0.05)
--shadow-card-hover:  0 10px 24px rgba(15,23,32,0.08), 0 4px 10px rgba(15,23,32,0.05)
```

### 2.10 Layout — Sidebar e Topbar

```css
--topbar-height:           64px
--sidebar-width-open:      288px
--sidebar-width:           288px
--sidebar-width-collapsed: 88px
--sidebar-item-h:          40px
--sidebar-bg:              #0D1820  /* azul-escuro quase preto */
--sidebar-divider:         rgba(255,255,255,0.07)
--sidebar-text:            rgba(255,255,255,0.62)
--sidebar-text-hover:      rgba(255,255,255,0.90)
--sidebar-text-active:     #FFFFFF
--sidebar-muted:           rgba(255,255,255,0.34)
--sidebar-active-bg:       rgba(95,140,175,0.20)
--sidebar-hover-bg:        rgba(255,255,255,0.06)
```

### 2.11 Breakpoints

```css
--bp-sm:  640px
--bp-md:  768px
--bp-lg:  1024px
--bp-xl:  1280px
--bp-2xl: 1440px
```

---

## 3. Componentes UI Primitivos (`components/ui/`)

Wrappers finos sobre **Radix UI** com classes CSS custom de `styles.css`.

### 3.1 Button

```typescript
variant: 'default' | 'outline' | 'ghost'
size:    'sm' | 'md' | 'lg'           // alturas: 32px / 36px / 40px
```

**Classes CSS:**
```css
.ui-button              /* base: flex, border-radius 8px, font-weight 600 */
.ui-button--default     /* bg: --action-primary, texto branco */
.ui-button--outline     /* border: --border-default, bg: --bg-surface */
.ui-button--ghost       /* bg: transparent, texto: --text-primary */
```

**Botões globais (tokens.css, para fora do sistema ui/Button):**
```css
.btn-primary      /* --action-primary */
.btn-secondary    /* --action-secondary + border */
.btn-ghost        /* transparent + --action-primary text */
.btn-destructive  /* --error-600 */
.btn-compact      /* versão compacta — usado no Dashboard */
```

### 3.2 Badge

```typescript
variant: 'default' | 'neutral'
```

```css
.ui-badge          /* base: border-radius 999px, font-size 0.75rem, font-weight 600 */
.ui-badge--default /* bg: --action-primary, texto branco */
.ui-badge--neutral /* border: --border-default, bg: --bg-subtle */
```

### 3.3 Input / Textarea

```css
.ui-input    /* min-height 36px, padding horizontal, border --border-default */
.ui-textarea /* min-height 96px, resize vertical */
.ui-focus-ring /* outline: 2px solid --focus-ring, offset 2px */
```

### 3.4 Separator

```css
.ui-separator--horizontal /* width 100%, height 1px */
.ui-separator--vertical   /* width 1px, height 100% */
/* cor: --border-default */
```

### 3.5 Outros Primitivos Radix

| Componente | Ficheiro | Notas |
|---|---|---|
| `Dialog` | `Dialog.tsx` | Modal com overlay |
| `Sheet` | `Sheet.tsx` | Drawer lateral |
| `DropdownMenu` | `DropdownMenu.tsx` | Menu contextual |
| `Tabs` | `Tabs.tsx` | Tabs (usado em Financeiro, CRM, Clientes) |
| `Popover` | `Popover.tsx` | Popup ancorado |
| `ScrollArea` | `ScrollArea.tsx` | Scroll customizado |
| `Tooltip` | `Tooltip.tsx` | Hover tooltip |
| `Select` | `Select.tsx` | Select customizado |

---

## 4. Componentes de Produto (`components/product/`)

Componentes Lexora de nível de produto. **Usam sempre tokens canónicos.**

### 4.1 Surface Base Pattern

Padrão partilhado por todos os cards de produto:

```typescript
// styles.ts
export const productSurfaceBase = 'rounded-lg border'
export const productSurfaceStyle: CSSProperties = {
  backgroundColor: 'var(--bg-surface)',
  borderColor: 'var(--border-default)',
}
```

Uso:
```tsx
<section className={cn(productSurfaceBase, 'p-4', className)}
         style={{ ...productSurfaceStyle, ...style }}>
```

---

### 4.2 KpiCard

**Props:** `label`, `value`, `delta?`, `trend?`, `icon?`, `category?`

**Categorias (ligadas aos tokens `--kpi-*`):**
`warning` | `info` | `error` | `primary` | `success`

**Trend:**
- `up` → success-700 / success-100
- `down` → error-700 / error-100
- `neutral` → neutral-700 / neutral-100

**Usos:** Dashboard (6 KPIs), Triagem (4 KPIs), Financeiro (métricas topo)

---

### 4.3 MetricCard

**Props:** `label`, `value`, `helper?`, `icon?`

Versão mais simples que `KpiCard` — sem delta/trend/category. Usa `productSurfaceStyle + shadow-sm`.

---

### 4.4 ExecutiveCard

**Props:** `header?`, `title`, `description?`, `value?`, `footer?`, `children?`

Card executivo de alto nível — usado no CRM para sumário de oportunidade. Suporta footer com separador.

---

### 4.5 OpportunityCard

**Props:** `title`, `account?`, `accountSub?`, `accountSubClass?`, `value?`, `badges?`, `status?`, `statusLabel?`, `priority?`, `footer?`

Card de oportunidade para kanban do CRM. Compõe `StatusPill` + `PriorityBadge` internamente.

---

### 4.6 StatusPill

**Tipo:** `StatusTone = 'positive' | 'warning' | 'critical' | 'neutral' | 'info'`

| Tone | Cor texto | Cor fundo |
|---|---|---|
| `positive` | `--success-700` | `--success-100` |
| `warning`  | `--warning-700` | `--warning-100` |
| `critical` | `--error-700`   | `--error-100`   |
| `neutral`  | `--neutral-700` | `--neutral-100` |
| `info`     | `--info-700`    | `--info-100`    |

Shape: `border-radius: full`, `px-2 py-1`, `font-size xs`, `font-weight medium`

---

### 4.7 PriorityBadge

**Tipo:** `PriorityLevel = 'low' | 'medium' | 'high' | 'urgent'`

| Level | Ícone | Cor |
|---|---|---|
| `low`    | `ArrowDown` | neutral |
| `medium` | `Minus` | info |
| `high`   | `ArrowUp` | warning |
| `urgent` | `AlertTriangle` | error |

Shape: `border-radius: md`, `px-2 py-1`, `font-size xs`, `font-weight medium`

---

### 4.8 EmptyState

**Variantes:** `'default' | 'error' | 'permission'`

| Variante | Fundo | Borda |
|---|---|---|
| `default`    | `--bg-subtle`   | `--border-default` |
| `error`      | `--error-100`   | `--error-600`      |
| `permission` | `--neutral-100` | `--neutral-300`    |

**Props:** `title` (obrigatório), `description?`, `icon?`, `actionLabel?`, `onAction?`

Shape: `min-height 220px`, borda tracejada, conteúdo centrado.

---

### 4.9 FilterBar

Container de filtros. **Props:** `searchPlaceholder?`, `searchValue?`, `onSearchChange?`, `actions?`, `children?`

- `children` → filtros adicionais (selects, checkboxes)
- `actions` → alinhados à direita via `ml-auto`
- Search field: `.filterbar-search-wrap` + `.filterbar-search-input` (sem outline nativo, focus via `box-shadow`)

---

### 4.10 PageHeader

**Props:** `title`, `subtitle?`, `actions?`

Cabeçalho de página standard. Título em `text-2xl font-semibold`, subtítulo em `text-sm --text-secondary`. Actions alinhados à direita.

---

### 4.11 KanbanColumn

Coluna do quadro kanban. Usado em Processos, Tarefas e CRM.

---

### 4.12 DrawerSection

Secção de conteúdo dentro de drawers e painéis laterais.

---

### 4.13 Timeline

Componente de linha temporal — usado em Atendimentos (modo conversa/timeline) e CRM (jornada de oportunidade).

---

## 5. Componentes de Contexto Empresarial

| Componente | Propósito | Tokens usados |
|---|---|---|
| `AccessStateBanner` | Banner de estado de acesso restrito | error/warning semânticos |
| `CompanyStatusBadge` | Badge de status da empresa (ativa/suspensa/trial) | success/warning/error |
| `CompanyStatusPanel` | Painel completo de status com acções | error-100, warning-100 |
| `ReadOnlyModeSurface` | Overlay de modo apenas leitura | neutral-100, neutral-300 |
| `MutationGuardNotice` | Aviso de bloqueio de mutação | warning semânticos |
| `PlatformTenantBadge` | Badge de identificação de tenant | brand-100, brand-500 |

---

## 6. Classes CSS Globais (tokens.css)

### 6.1 Botões

| Classe | Uso |
|---|---|
| `.btn-primary` | Acção primária — `--action-primary` |
| `.btn-secondary` | Acção secundária — border + `--action-secondary` |
| `.btn-ghost` | Acção terciária — transparent |
| `.btn-destructive` | Acção destrutiva — `--error-600` |
| `.btn-compact` | Variante compacta (Dashboard) |

### 6.2 Cards

| Classe | Uso |
|---|---|
| `.card` | Card base — `--bg-surface`, `--border-default`, `--radius-xl`, padding 24px |

### 6.3 Tabelas

Estilos base globais: `thead bg-subtle`, `border-default` em todas as células, `tbody tr:hover bg-subtle`.

### 6.4 Utilities de Texto

`.text-xs`, `.text-sm`, `.text-md`, `.text-lg`, `.text-muted`, `.text-secondary`, `.font-semibold`, `.font-bold`

### 6.5 Utilities de Layout

`.flex`, `.flex-col`, `.flex-wrap`, `.items-center`, `.items-start`, `.justify-between`, `.justify-center`, `.grid`, `.grid-2`, `.grid-3`

`.grid-2` e `.grid-3` colapsam para 1 coluna abaixo de `900px`.

### 6.6 Utilities de Estado Semântico

`.error` → `--error-600` | `.success` → `--success-600` | `.warning` → `--warning-600` | `.info` → `--info-600`

---

## 7. Relação com shadcn/Radix (index.css)

`index.css` mantém variáveis HSL para compatibilidade com componentes Radix/shadcn:

| Variável shadcn | Alinhada com |
|---|---|
| `--border` | `--border-default` (#DDE3E8) |
| `--input` | `--border-default` |
| `--ring` | `--focus-ring` / `--brand-400` (#6A97BA) |
| `--primary` | `--action-primary` (#1d4ed8) |
| `--success` | `--success-600` |
| `--warning` | `--warning-600` |
| `--danger` | `--error-600` |

**Regra:** variáveis HSL de `index.css` nunca devem sobrepor as hex de `tokens.css`. Em conflito, `tokens.css` prevalece.

---

## 8. Acessibilidade

| Aspecto | Implementação |
|---|---|
| Focus ring | `outline: 2px solid var(--focus-ring)` em todos os interactivos (`.ui-focus-ring`) |
| States disabled | `opacity: 0.6; cursor: not-allowed` |
| aria-live | `role="alert"` em erros, `aria-live="polite"` em feedback |
| Input inválido | `aria-invalid="true"` → `border-color: --error-600` |
| Keyboard Escape | Fecha drawers e quick-drawers no Dashboard |
| Focus trap | Dashboard quick-drawer com `closeDrawerRef` + `previousFocusRef` |
| Screen reader | `.sr-only` com `aria-live="polite"` para feedback de fila no Dashboard |

---

## 9. Padrões Proibidos

Com base nas decisões tomadas (BL-028, BL-026, BL-033, commit `5797948`):

| Proibido | Usar em vez |
|---|---|
| `slate-*`, `gray-*`, `blue-*` do Tailwind para cores | tokens `--neutral-*`, `--brand-*`, etc. |
| `--brand-primary` (inexistente) | `--action-primary` |
| `--surface-primary` (inexistente) | `--bg-surface` |
| `--surface-secondary` (inexistente) | `--bg-subtle` |
| `--radius-sm/md/lg` em `index.css` | `--radius-sm/md/lg` de `tokens.css` |
| `--shadow-card` em `index.css` | `--shadow-card` de `tokens.css` |
| Cores hex hardcoded nos componentes | sempre token |

---

## 10. Gaps e Próximos Passos

| Gap | Impacto | Acção sugerida |
|---|---|---|
| Dark mode não implementado | Médio — produto só tem tema claro | Decidir se avança (BL-038 Fase 6) |
| Storybook não configurado | Médio — componentes não têm documentação visual | Decidir se avança (BL-038 Fase 7) |
| Responsividade (`tokens.css` tem breakpoints mas ecrãs não usam) | Alto — produto não está optimizado para mobile | BL-038 Fase 5 pendente |
| `KpiCard` usado com props inconsistentes | Baixo | Alinhar usos após KB-005 |
| CSS por ecrã não usa tokens em todos os locais | Médio | Auditoria progressiva por ecrã |

---

*Criado em: 2026-06-09 | Status: current | Vault: !_lexora-memory-docs*
*Baseado em: `frontend/src/tokens.css`, `frontend/src/components/ui/`, `frontend/src/components/product/`, `[[KB_005_INVENTARIO_UX_UI_CURRENT_2026-06-09]]`*
*Decisão de origem: BL-028 (2026-05-30) — `tokens.css` é fonte autoritativa única*
