# 🧱 Skill: lexora-design-system

> Padrões de design, tokens, componentes e nomenclatura CSS para o projeto Lexora.
> Consulte este arquivo sempre que criar ou modificar qualquer interface visual.

---

## 1. Princípios Fundamentais

1. **Token-first**: Toda cor, espaçamento, tipografia e sombra DEVE usar variáveis CSS de `tokens.css`. Nunca hardcode.
2. **Consistência > Criatividade**: Prefira reutilizar padrões existentes a inventar novos.
3. **Responsividade obrigatória**: Todo componente DEVE funcionar em 5 breakpoints (640, 768, 1024, 1280, 1440px).
4. **Acessibilidade mínima**: Focus-visible, aria-labels, contraste WCAG AA.

---

## 2. Sistema de Estilos — Resolução do Conflito CSS + Tailwind

O projeto usa **dois sistemas de estilo em paralelo**. Siga estas regras:

### Quando usar CSS Custom Properties (tokens.css)
- Páginas de domínio (Processos, Prazos, CRM, Dashboard, etc.)
- Componentes com estilo complexo (cards com hover, tabelas, formulários)
- Qualquer elemento que precise de tema/dark mode
- Arquivo: `NomeComponente.css` ao lado do `.tsx`

### Quando usar Tailwind
- Componentes de infraestrutura (Sidebar, Topbar, Auth)
- Componentes da pasta `components/ui/` e `components/product/`
- Layout rápido e prototipagem
- Usa `cn()` (clsx + tailwind-merge) para composição

### ❌ NUNCA misture no mesmo componente
```tsx
// ❌ ERRADO — mistura Tailwind e CSS custom no mesmo elemento
<div className="flex gap-4" style={{ color: 'var(--text-primary)' }}>

// ✅ CORRETO — escolha um sistema e use consistentemente
// Opção A: CSS custom
<div className="process-header">  // definido no Processes.css

// Opção B: Tailwind
<div className="flex items-center gap-4 text-slate-900">
```

---

## 3. Catálogo de Design Tokens

### 3.1 Cores de Marca
```
--brand-950: #162633  (mais escuro — sidebar bg alternativo)
--brand-900: #1D3448
--brand-800: #223B4D
--brand-700: #2E4B63
--brand-600: #3C607D
--brand-500: #4C789A  (primária)
--brand-400: #6A97BA
--brand-300: #95BAD4
--brand-200: #C5D9E8
--brand-100: #E8F0F6
--brand-50:  #F5F8FB  (mais claro — backgrounds sutis)
```

### 3.2 Cores Semânticas (usar para status e feedback)
| Contexto | Fundo | Texto | Uso |
|---|---|---|---|
| Sucesso | `--success-100` | `--success-700` | Conclusão, validado, pago |
| Aviso | `--warning-100` | `--warning-700` | Atenção, em revisão, pendente |
| Erro | `--error-100` | `--error-700` | Crítico, atrasado, rejeitado |
| Info | `--info-100` | `--info-700` | Novo, em análise, informativo |

### 3.3 Tokens Funcionais (usar preferencialmente)
```css
/* Backgrounds */
--bg-page: var(--neutral-50)       /* Fundo da página */
--bg-surface: var(--white)         /* Cards, modais */
--bg-subtle: var(--neutral-100)    /* Hover, zebra stripes */

/* Texto */
--text-primary: var(--neutral-900)   /* Títulos, conteúdo principal */
--text-secondary: var(--neutral-700) /* Subtítulos, labels */
--text-muted: var(--neutral-500)     /* Placeholders, metadados */
--text-inverse: var(--white)         /* Texto sobre fundo escuro */

/* Bordas */
--border-default: var(--neutral-200) /* Bordas padrão */
--border-strong: var(--neutral-300)  /* Bordas de ênfase */

/* Ações */
--action-primary: #1d4ed8          /* Botões primários, links */
--action-primary-hover: #1e40af   /* Hover de primários */
```

### 3.4 Espaçamento (Base 4px)
```
--space-1:  4px    --space-6:  24px
--space-2:  8px    --space-8:  32px
--space-3:  12px   --space-10: 40px
--space-4:  16px   --space-12: 48px
--space-5:  20px   --space-16: 64px
```

**Regras de espaçamento:**
- Padding interno de cards: `--space-6` (24px)
- Gap entre cards: `--space-6` (24px)
- Padding de inputs: `--space-3 --space-4` (12px 16px)
- Gap entre form fields: `--space-4` (16px)
- Margem entre seções: `--space-8` ou `--space-10`

### 3.5 Tipografia
```
Font family: ui-sans-serif, system-ui, ... (system stack)
Font sizes:  xs(12) sm(14) md(16) lg(18) xl(20) 2xl(24) 2.5xl(26) 3xl(30) 4xl(36)
Weights:     regular(400) medium(500) semibold(600) bold(700)
Line heights: tight(1.2) normal(1.5) relaxed(1.65)
```

**Hierarquia de texto:**
| Elemento | Size | Weight | Line Height |
|---|---|---|---|
| Page title (h1) | `4xl` (36px) | bold | tight |
| Section title (h2) | `3xl` (30px) | semibold | tight |
| Card title (h3) | `2xl` (24px) | semibold | tight |
| Body text | `md` (16px) | regular | normal |
| Labels | `sm` (14px) | medium | normal |
| Captions/metadata | `xs` (12px) | regular | normal |

### 3.6 Sombras
```
--shadow-sm:   0 1px 2px rgba(0,0,0,0.05)           /* Botões, inputs */
--shadow-card: 0 1px 3px + 0 1px 2px (composta)      /* Cards em repouso */
--shadow-card-hover: 0 10px 24px + 0 4px 10px         /* Cards em hover */
--shadow-md:   0 4px 6px rgba(0,0,0,0.1)              /* Dropdowns, popovers */
--shadow-lg:   0 10px 15px rgba(0,0,0,0.1)            /* Modais */
--shadow-xl:   0 20px 25px rgba(0,0,0,0.15)           /* Overlays */
```

### 3.7 Border Radius
```
--radius-sm:   4px    /* Tags, chips pequenos */
--radius-md:   6px    /* Inputs, selects */
--radius-lg:   8px    /* Botões, cards internos */
--radius-xl:   10px   /* Cards principais */
--radius-2xl:  16px   /* Modais, drawers */
--radius-full: 9999px /* Avatares, pills */
```

### 3.8 Breakpoints
```
--bp-sm:  640px   /* Mobile landscape */
--bp-md:  768px   /* Tablet (sidebar collapse) */
--bp-lg:  1024px  /* Desktop pequeno */
--bp-xl:  1280px  /* Desktop padrão */
--bp-2xl: 1440px  /* Desktop grande */
```

---

## 4. Catálogo de Componentes

### 4.1 Componentes UI Base (`components/ui/`)
| Componente | Base | Uso |
|---|---|---|
| `Badge` | Custom | Status labels com cor semântica |
| `Button` | CVA | 3 variantes: default, outline, ghost × 3 tamanhos: sm, md, lg |
| `Dialog` | Radix | Modais com overlay blur, portal, focus trap |
| `DropdownMenu` | Radix | Menus de contexto, ações |
| `Input` | Custom | Campos de texto com estados (error, disabled) |
| `Popover` | Radix | Tooltips ricos, filtros flutuantes |
| `ScrollArea` | Radix | Scroll customizado (listas longas) |
| `Select` | Radix | Dropdowns de seleção |
| `Separator` | Radix | Divisores horizontal/vertical |
| `Sheet` | Radix Dialog | Drawers laterais |
| `Tabs` | Radix | Navegação por abas |
| `Textarea` | Custom | Campos de texto multilinha |
| `Tooltip` | Radix | Tooltips simples |

### 4.2 Componentes de Produto (`components/product/`)
| Componente | Uso |
|---|---|
| `DrawerSection` | Seções dentro de drawers |
| `EmptyState` | Estados vazios com ícone + mensagem + CTA |
| `ExecutiveCard` | Cards executivos com métricas |
| `FilterBar` | Barra de busca + filtros |
| `KanbanColumn` | Colunas de Kanban (CRM) |
| `KpiCard` | Cards de KPI com acento de cor |
| `MetricCard` | Cards de métrica compactos |
| `OpportunityCard` | Cards de oportunidade CRM |
| `PageHeader` | Cabeçalho de página com título + ações |
| `PriorityBadge` | Badge de prioridade (crítica/alta/média/baixa) |
| `StatusPill` | Pill de status com cor semântica |
| `Timeline` | Linha do tempo vertical |

---

## 5. Padrões de Componente

### 5.1 Card Padrão
```css
.meu-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-xl);
  padding: var(--space-6);
  box-shadow: var(--shadow-card);
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}

.meu-card:hover {
  box-shadow: var(--shadow-card-hover);
  transform: translateY(-1px);
}
```

### 5.2 Tabela Padrão
```css
.minha-tabela {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-sm);
}

.minha-tabela thead {
  background: var(--bg-subtle);
  border-bottom: 1px solid var(--border-default);
  position: sticky;
  top: 0;
  z-index: 1;
}

.minha-tabela th {
  font-weight: var(--font-weight-semibold);
  color: var(--text-secondary);
  text-transform: uppercase;
  font-size: var(--font-size-xs);
  letter-spacing: 0.05em;
  padding: var(--space-3) var(--space-4);
  text-align: left;
}

.minha-tabela td {
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--border-default);
}

.minha-tabela tbody tr:hover {
  background: var(--bg-subtle);
}
```

### 5.3 Badge de Status
```css
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: 2px var(--space-2);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  line-height: 1;
  white-space: nowrap;
}

/* Variantes semânticas */
.status-badge--success { background: var(--success-100); color: var(--success-700); }
.status-badge--warning { background: var(--warning-100); color: var(--warning-700); }
.status-badge--error   { background: var(--error-100);   color: var(--error-700);   }
.status-badge--info    { background: var(--info-100);     color: var(--info-700);    }
.status-badge--neutral { background: var(--neutral-100);  color: var(--neutral-700); }
```

### 5.4 Botões (classes existentes em tokens.css)
```
.btn-primary      → Ação principal (salvar, criar, confirmar)
.btn-secondary    → Ação alternativa (cancelar, voltar)
.btn-ghost        → Ação terciária (expandir, ver mais)
.btn-destructive  → Ação destrutiva (excluir, remover)
```

**Regras de botões:**
- Máximo 1 botão primário por seção visível
- Botão destrutivo sempre requer confirmação
- Ícone à esquerda do texto, nunca sozinho sem tooltip
- Mínimo 40px de altura (já no token)

---

## 6. Padrões Responsivos

### Layout de Tabela → Cards em Mobile
```css
/* Desktop: tabela normal */
.data-table { display: table; }

/* Mobile: cada row vira um card */
@media (max-width: 768px) {
  .data-table { display: block; }
  .data-table thead { display: none; }
  .data-table tr {
    display: block;
    background: var(--bg-surface);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-lg);
    padding: var(--space-4);
    margin-bottom: var(--space-3);
  }
  .data-table td {
    display: flex;
    justify-content: space-between;
    padding: var(--space-2) 0;
    border: none;
  }
  .data-table td::before {
    content: attr(data-label);
    font-weight: var(--font-weight-semibold);
    color: var(--text-secondary);
    font-size: var(--font-size-xs);
  }
}
```

### Grid Responsivo
```css
/* 3 colunas → 2 → 1 */
.responsive-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-6);
}

@media (max-width: 1024px) {
  .responsive-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 768px) {
  .responsive-grid { grid-template-columns: 1fr; }
}
```

---

## 7. Nomenclatura CSS

### Para arquivos de página (CSS custom properties)
Usar **BEM simplificado** com prefixo do módulo:

```css
/* Bloco */
.process-list { }

/* Elemento */
.process-list__header { }
.process-list__row { }
.process-list__cell { }

/* Modificador */
.process-list__row--active { }
.process-list__row--critical { }
```

### Para componentes compartilhados
Usar prefixo `lx-` (Lexora):

```css
.lx-card { }
.lx-card--elevated { }
.lx-table { }
.lx-badge { }
```

---

## 8. Regras de Acessibilidade

### Obrigatório em TODO componente interativo:
- `focus-visible` outline (já global via tokens.css)
- `aria-label` quando o texto visual não é suficiente
- `role` semântico quando o elemento HTML não é suficiente
- Contraste mínimo 4.5:1 para texto, 3:1 para elementos grandes

### Padrões de ARIA por componente:
| Componente | Atributos obrigatórios |
|---|---|
| Modal/Dialog | `role="dialog"`, `aria-modal="true"`, `aria-label` |
| Dropdown | `aria-expanded`, `aria-haspopup` |
| Tab | `role="tablist"` + `role="tab"` + `aria-selected` + `role="tabpanel"` |
| Alerta | `role="alert"`, `aria-live="assertive"` |
| Loading | `role="status"`, `aria-live="polite"` |
| Nav link ativo | `aria-current="page"` |
| Ícone decorativo | `aria-hidden="true"` |
| Botão com ícone | `aria-label="Descrição da ação"` |

---

## 9. Sidebar Tokens
```css
--sidebar-bg:           #0D1820
--sidebar-width:        288px
--sidebar-width-collapsed: 88px
--sidebar-text:         rgba(255, 255, 255, 0.62)
--sidebar-text-hover:   rgba(255, 255, 255, 0.90)
--sidebar-text-active:  #FFFFFF
--sidebar-active-bg:    rgba(95, 140, 175, 0.20)
--sidebar-hover-bg:     rgba(255, 255, 255, 0.06)
--topbar-height:        64px
```

---

## 10. Anti-Padrões (EVITAR)

```css
/* ❌ Cores hardcoded */
color: #333;
background: white;

/* ✅ Usar tokens */
color: var(--text-primary);
background: var(--bg-surface);

/* ❌ Espaçamento arbitrário */
padding: 13px 17px;
margin: 22px;

/* ✅ Usar escala de espaçamento */
padding: var(--space-3) var(--space-4);
margin: var(--space-6);

/* ❌ Font-size arbitrário */
font-size: 15px;

/* ✅ Usar escala tipográfica */
font-size: var(--font-size-sm);

/* ❌ Z-index aleatório */
z-index: 99999;

/* ✅ Z-index com sistema (definir camadas) */
/* base: 0, dropdown: 10, sticky: 20, modal-backdrop: 30, modal: 40, toast: 50 */
```
