---
tipo: kb
status: current
projeto: lexora
fase: design-system
area: design-system
data: 2026-05-30
ultima_atualizacao: '2026-05-30'
fonte: claude-code
baseado_em:
  - '[[KB_005_INVENTARIO_FUNCIONAL_UX_UI_LEXORA_CURRENT_2026-05-30]]'
  - '[[KB_004_PRODUCT_DISCOVERY_LEXORA_CURRENT_2026-05-30]]'
  - '[[KB_003B_FRONTEND_ESTADO_ATUAL_CURRENT_2026-05-29]]'
  - '[[BACKLOG_GERAL_LEXORA_CURRENT]]'
  - '[[00_START_HERE]]'
  - '[[MAPA_CANONICO_LEXORA_CURRENT]]'
  - '[[PROTOCOLO_CONTEXTO_ENXUTO_LEXORA_CURRENT]]'
  - '[[KB_003G_RISCOS_TECNICOS_E_DIVERGENCIAS_CONSOLIDADAS_CURRENT_2026-05-30]]'
escopo: design-system-constituicao-visual
vault_oficial: 'C:\Users\tomke\app Juridico\!_lexora-memory-docs'
autoridade: design-system
metodo: leitura-codigo-e-navegacao-real
---

# KB-006 — Design System e Constituição Visual Lexora

> [!important] Método combinado
> Este documento foi produzido por leitura direta dos arquivos de design (`tokens.css`, `index.css`, `tailwind.config.ts`, `components/ui/`, `components/product/`) combinada com navegação real do aplicativo (KB-005). Data: 2026-05-30.

> [!note] UPDATE-KB-006-001 — 2026-05-30
> Complemento de Constituição Visual, guidelines, acessibilidade, responsividade, padrões de layout, tabelas, formulários, feedback, IA, Do/Don't e roadmap de maturidade. Apoio analítico: skill ui-ux-pro-max.

> [!success] UPDATE-KB-006-002 — 2026-05-30
> Implementação das Fases 1–4 concluída. Commit `5797948`. Seções 9, 10, 11 e 12 atualizadas para refletir o estado real do código. Decisões de Tom registradas: IBM Plex Sans como fonte oficial; `tokens.css` como fonte canônica de tokens.

---

## 1. Resumo Executivo

O Lexora possui a **fundação de um Design System bem estruturado**, mas com uma **divergência crítica não resolvida**: dois sistemas de tokens CSS coexistindo com nomes de variáveis em conflito. O sistema `tokens.css` é o mais completo e coerente com a identidade do produto. O sistema `index.css` foi adicionado para suportar componentes shadcn/ui e usa o formato HSL do Tailwind.

### Estado atual

| Elemento | Estado |
|---|---|
| Paleta de cores de marca | ✅ Definida em `tokens.css` (11 tons brand + 11 neutros) |
| Tokens semânticos | ✅ Definidos (success/warning/error/info com 3 variantes) |
| Tokens funcionais (aliases) | ✅ Definidos (`--bg-page`, `--text-primary`, etc.) |
| Tokens de componente | ✅ Parcialmente (KPI, sidebar, card) |
| Tipografia | ⚠️ IBM Plex Sans declarada no Tailwind mas não no CSS base |
| Espaçamento | ✅ Escala base 4px (--space-1 a --space-16) |
| Border radius | ⚠️ **Conflito**: dois conjuntos com nomes iguais e valores diferentes |
| Sombras | ⚠️ **Conflito**: `--shadow-card` com valores diferentes em dois arquivos |
| Componentes UI (shadcn) | ✅ 13 primitivos implementados |
| Componentes produto | ✅ 9 componentes de produto extraídos |
| Dark mode | ⚠️ Infraestrutura presente (darkMode: 'class') mas sem tokens dark definidos |

### Decisão mais urgente
Resolver o conflito de tokens antes de criar qualquer novo componente ou tela. Sem isso, qualquer desenvolvimento de UI consome tokens com valores imprevisíveis.

---

## 2. Objetivo e Escopo

### Objetivo
Documentar o estado real do Design System do Lexora, identificar a fonte autoritativa de tokens, mapear componentes existentes e definir a constituição visual para orientar futuras implementações.

### Dentro do escopo
- Inventário de arquivos de design
- Análise do conflito entre sistemas de tokens
- Mapeamento de componentes existentes
- Identidade visual (cores, tipografia, espaçamento)
- Recomendações para constituição formal do DS
- Insumos para próximas decisões

### Fora do escopo
- Implementar novos componentes
- Alterar código existente
- Criar tokens Dark Mode
- Criar documentação Storybook ou Figma
- Validar com usuários

---

## 3. Arquitetura do Sistema de Tokens

### 3.1 Dois sistemas coexistentes

| Arquivo | Formato | Usado por | Propósito declarado |
|---|---|---|---|
| `frontend/src/tokens.css` | CSS custom properties (HEX) | `App.tsx` import direto | Design tokens canônicos da marca Lexora |
| `frontend/src/index.css` | Tailwind base + CSS HSL vars | `main.tsx` import | Configuração shadcn/ui + Tailwind |
| `frontend/tailwind.config.ts` | Tailwind theme | Classes Tailwind | Mapeia HSL vars do index.css para Tailwind |

### 3.2 O conflito — variáveis com nomes iguais, valores diferentes

| Variável | `tokens.css` | `index.css` | Diferença |
|---|---|---|---|
| `--radius-sm` | `4px` | `0.375rem (6px)` | 2px a mais no index.css |
| `--radius-md` | `6px` | `0.5rem (8px)` | 2px a mais no index.css |
| `--radius-lg` | `8px` | `0.75rem (12px)` | 4px a mais no index.css |
| `--shadow-card` | `0 1px 3px rgba(15,23,32,0.08)...` (sutil) | `0 8px 22px rgba(15,23,42,0.06)` (pronunciada) | Natureza diferente |

**Qual prevalece em runtime?** Depende da ordem de carregamento do CSS no bundle final. Como `main.tsx` importa `index.css` e `App.tsx` importa `tokens.css`, e `App.tsx` é renderizado DEPOIS de `main.tsx`, o `tokens.css` provavelmente sobrescreve o `index.css` para essas variáveis. Mas isso é frágil e não intencional.

### 3.3 Recomendação de resolução

**Opção A (recomendada):** Manter `tokens.css` como fonte única. Remover as variáveis conflitantes do `index.css` e atualizar o `tailwind.config.ts` para usar as variáveis do `tokens.css` diretamente.

**Opção B:** Unificar os dois arquivos em um único `design-tokens.css` com uma seção para Tailwind/shadcn e outra para tokens próprios.

---

## 4. Paleta de Cores

### 4.1 Paleta de marca (tokens.css — fonte canônica)

| Token | Valor HEX | Uso sugerido |
|---|---|---|
| `--brand-950` | `#162633` | Fundos extremamente escuros, texto sobre claro |
| `--brand-900` | `#1D3448` | Sidebar background principal |
| `--brand-800` | `#223B4D` | Variação escura da sidebar |
| `--brand-700` | `#2E4B63` | — |
| `--brand-600` | `#3C607D` | — |
| `--brand-500` | `#4C789A` | **Cor de marca principal** — ações secundárias |
| `--brand-400` | `#6A97BA` | Acentos e focus ring |
| `--brand-300` | `#95BAD4` | — |
| `--brand-200` | `#C5D9E8` | Fundos suaves de destaque |
| `--brand-100` | `#E8F0F6` | Fundos de KPI brand |
| `--brand-50` | `#F5F8FB` | — |

> [!note] Sidebar usa `#0D1820` — mais escuro que brand-950. Valor não mapeado na escala oficial.

### 4.2 Paleta neutra

| Token | Valor HEX | Alias funcional |
|---|---|---|
| `--neutral-950` | `#0F1720` | — |
| `--neutral-900` | `#17212B` | `--text-primary` |
| `--neutral-800` | `#25313D` | — |
| `--neutral-700` | `#3A4754` | `--text-secondary` |
| `--neutral-600` | `#556270` | — |
| `--neutral-500` | `#73808E` | `--text-muted` |
| `--neutral-400` | `#97A3AF` | — |
| `--neutral-300` | `#C2CAD2` | `--border-strong` |
| `--neutral-200` | `#DDE3E8` | `--border-default` |
| `--neutral-100` | `#EDF1F4` | `--bg-subtle`, `--action-secondary` |
| `--neutral-50` | `#F7F9FB` | `--bg-page` |
| `--white` | `#FFFFFF` | `--bg-surface`, `--text-inverse` |

### 4.3 Paleta semântica

| Categoria | Accent | Background | Uso |
|---|---|---|---|
| Success | `#15803D` | `#DCFCE7` | Confirmações, status concluído |
| Warning | `#D97706` | `#FEF3C7` | Alertas, prazos próximos |
| Error | `#DC2626` | `#FEE2E2` | Erros, prazos vencidos, críticos |
| Info | `#2563EB` | `#DBEAFE` | Informações, novidades |

### 4.4 Ação primária

| Token | Valor | Nota |
|---|---|---|
| `--action-primary` | `#1d4ed8` | **Azul diferente do brand** — botão primário |
| `--action-primary-hover` | `#1e40af` | — |

> [!warning] O azul de ação (`#1d4ed8`) é diferente da paleta de marca (`--brand-500: #4C789A`). Isso cria dois azuis concorrentes na interface. Decisão a tomar no KB-006: unificar ou distinguir intencionalmente.

---

## 5. Tipografia

### 5.1 Situação atual — conflito de fonte

| Arquivo | Declara | Observação |
|---|---|---|
| `tokens.css` — `--font-family-base` | `ui-sans-serif, system-ui, -apple-system, Segoe UI...` | **Sem IBM Plex Sans** |
| `tailwind.config.ts` — `fontFamily.sans` | `'"IBM Plex Sans"', 'Segoe UI', 'sans-serif'` | Declara IBM Plex Sans mas não tem @import |
| `tokens.css` — `html { font-family }` | Usa `var(--font-family-base)` — system fonts | Aplicado globalmente no html |

**Resultado em runtime:** O app provavelmente usa system fonts (`Segoe UI` no Windows) porque:
1. Não há `@import` de Google Fonts ou arquivo local de IBM Plex Sans confirmado
2. `html` aplica `--font-family-base` que é system fonts
3. Classes Tailwind com `font-sans` usariam IBM Plex Sans, mas só se carregada

**Ação necessária (BL-025):** Confirmar se IBM Plex Sans está carregando. Se não, ou adicionar o import ou remover da declaração e formalizar system fonts como escolha intencional.

### 5.2 Escala tipográfica (tokens.css)

| Token | Valor | Uso |
|---|---|---|
| `--font-size-xs` | 12px | Labels, badges, captions |
| `--font-size-sm` | 14px | Corpo de texto secundário, tabelas |
| `--font-size-md` | 16px | Corpo principal |
| `--font-size-lg` | 18px | Subtítulos |
| `--font-size-xl` | 20px | Títulos de módulo |
| `--font-size-2xl` | 24px | Títulos de seção |
| `--font-size-2_5xl` | 26px | Intermediário (adicionado para KPI) |
| `--font-size-3xl` | 30px | h2 |
| `--font-size-4xl` | 36px | h1 |

### 5.3 Pesos tipográficos

| Token | Valor | Uso |
|---|---|---|
| `--font-weight-regular` | 400 | Corpo |
| `--font-weight-medium` | 500 | Labels, inputs |
| `--font-weight-semibold` | 600 | Títulos, botões |
| `--font-weight-bold` | 700 | Destaques, h1 |

---

## 6. Espaçamento e Layout

### 6.1 Escala de espaçamento (base 4px)

| Token | Valor |
|---|---|
| `--space-1` | 4px |
| `--space-2` | 8px |
| `--space-3` | 12px |
| `--space-4` | 16px |
| `--space-5` | 20px |
| `--space-6` | 24px |
| `--space-8` | 32px |
| `--space-10` | 40px |
| `--space-12` | 48px |
| `--space-16` | 64px |

### 6.2 Layout estrutural

| Token | Valor | Uso |
|---|---|---|
| `--topbar-height` | 64px | Altura da topbar |
| `--sidebar-width` | 288px | Sidebar aberta |
| `--sidebar-width-collapsed` | 88px | Sidebar colapsada |
| `--sidebar-item-h` | 40px | Altura de item da sidebar |

### 6.3 Border Radius (tokens.css — fonte)

| Token | Valor | Uso |
|---|---|---|
| `--radius-sm` | 4px | Elementos pequenos |
| `--radius-md` | 6px | Badges, pills |
| `--radius-lg` | 8px | Botões, inputs |
| `--radius-xl` | 10px | Cards |
| `--radius-2xl` | 16px | Modais, drawers |
| `--radius-full` | 9999px | Avatares, chips |

---

## 7. Componentes UI — Inventário

### 7.1 Primitivos shadcn/ui (`src/components/ui/`)

| Componente | Arquivo | Baseado em | Uso confirmado |
|---|---|---|---|
| Badge | `Badge.tsx` | Radix / CVA | Status tags, role labels |
| Button | `Button.tsx` | CVA | Ações primárias e secundárias |
| Dialog | `Dialog.tsx` | Radix Dialog | Modais de confirmação |
| DropdownMenu | `DropdownMenu.tsx` | Radix Dropdown | Menu de usuário, filtros |
| Input | `Input.tsx` | HTML input | Formulários |
| Popover | `Popover.tsx` | Radix Popover | Filtros avançados, datepickers |
| ScrollArea | `ScrollArea.tsx` | Radix ScrollArea | Listas longas |
| Select | `Select.tsx` | Radix Select | Dropdowns de seleção |
| Separator | `Separator.tsx` | Radix Separator | Divisores visuais |
| Sheet | `Sheet.tsx` | Radix Dialog (lateral) | Drawers laterais |
| Tabs | `Tabs.tsx` | Radix Tabs | Abas de módulo (Processos, etc.) |
| Textarea | `Textarea.tsx` | HTML textarea | Campos de texto longo |
| Tooltip | `Tooltip.tsx` | Radix Tooltip | Dicas de contexto |

### 7.2 Componentes de produto (`src/components/product/`)

| Componente | Arquivo | Descrição | Telas que usam |
|---|---|---|---|
| **KpiCard** | `KpiCard.tsx` | Card de métrica com ícone, valor e descrição | Dashboard, Processos, Prazos, Agenda, Tarefas, Atendimentos, Clientes, Publicações, Financeiro |
| **FilterBar** | `FilterBar.tsx` | Barra de filtros operacionais com presets | Processos, Prazos, Tarefas, Documentos, Atendimentos, Clientes, Publicações |
| **StatusPill** | `StatusPill.tsx` | Pill/badge de status semântico | Processos, Tarefas, Documentos, Clientes |
| **PriorityBadge** | `PriorityBadge.tsx` | Badge de prioridade (Alta/Média/Baixa/Crítica) | Processos, Tarefas, Prazos |
| **EmptyState** | `EmptyState.tsx` | Estado vazio com ícone e CTA | Triagem, CRM (sem dados), Notificações |
| **PageHeader** | `PageHeader.tsx` | Cabeçalho de página com título e subtítulo | Todas as telas com AppShell |
| **Timeline** | `Timeline.tsx` | Linha do tempo de eventos | Processo detalhe, Atendimentos |
| **KanbanColumn** | `KanbanColumn.tsx` | Coluna de kanban | CRM Jurídico, Processos (view kanban) |
| **ExecutiveCard** | `ExecutiveCard.tsx` | Card executivo para BI | Dashboard ADM |
| **MetricCard** | `MetricCard.tsx` | Card de métrica alternativo | Dashboard |
| **OpportunityCard** | `OpportunityCard.tsx` | Card de oportunidade CRM | CRM Jurídico |
| **DrawerSection** | `DrawerSection.tsx` | Seção de drawer lateral | Detalhe de processo (drawer rápido) |

---

## 8. Identidade Visual Observada (navegação real)

### 8.1 Sidebar

- Background: `#0D1820` (mais escuro que brand-950 `#162633`)
- Texto inativo: branco 62% opacidade
- Texto ativo: branco 100%
- Item ativo: background azul translúcido (`rgba(95,140,175,0.20)`)
- Largura aberta: 288px, colapsada: 88px
- Seções: OPERAÇÃO / CRM / GESTÃO / SUPORTE

### 8.2 Topbar

- Background: branco com sombra sutil
- Altura: 64px
- Elementos: hamburguer, busca global, notificações, atalhos, ajuda, user menu
- Busca com placeholder: "Buscar processo, cliente, tarefa ou responsável"

### 8.3 Dashboard — visual confirmado

- Painel de responsabilidades com 4 KPIs de ação
- 6 KPIs de métricas do dia (Prazos, Tarefas, Processos, Clientes, Financeiro, Produtividade)
- View ADM: "Visão do Escritório" vs. View ADV: "Home Operacional" — **dashboard adaptativo por role**
- Cards de processo na fila com status e responsável
- Sidebar "Agenda de Hoje" com appointments

### 8.4 Botões observados

- Primário: azul `#1d4ed8` com texto branco — "Novo Processo", "Entrar", "Abrir prioridade"
- Secundário: fundo neutro claro com borda — "Exportar", "Mais filtros"
- Ícone: botões com ícone + texto alinhados (Lucide React)
- Todos têm `min-height: 40px` (tokens.css)

### 8.5 Cor dos status mais usados (observados)

| Status | Cor | Contexto |
|---|---|---|
| Aguardando documentos | Amarelo/warning | Processos |
| Em andamento | Azul/info | Tarefas |
| Vencido | Vermelho/error | Prazos |
| Crítico | Vermelho com badge | Prazos, processos |
| Novo | Verde outline | Publicações |
| Pago | Badge verde | Financeiro |
| Pendente | Cinza | Financeiro |

---

## 9. Conflitos e Inconsistências

| Conflito | Arquivos | Impacto | Status | Resolução aplicada |
|---|---|---|---|---|
| `--radius-sm/md/lg` com valores diferentes | `tokens.css` vs `index.css` | Médio | ✅ **Resolvido** | Removidas de `index.css` (Fase 1, commit `5797948`) |
| `--shadow-card` com valores diferentes | `tokens.css` vs `index.css` | Baixo | ✅ **Resolvido** | Removida de `index.css` (Fase 1, commit `5797948`) |
| Tokens inexistentes em `ui/styles.css` (`--brand-primary`, `--surface-primary`, `--surface-secondary`) | `components/ui/styles.css` | Alto | ✅ **Resolvido** | Substituídos por `--action-primary`, `--bg-surface`, `--bg-subtle`, `--focus-ring` (Fase 4) |
| HSL vars do shadcn desalinhadas com tokens Lexora (`--ring`, `--primary`, `--border`) | `index.css` | Médio | ✅ **Resolvido** | Alinhadas: `--ring` = brand-400 HSL, `--primary` = action-primary HSL, `--border` = border-default HSL (Fase 4) |
| IBM Plex Sans no Tailwind vs. system fonts no CSS base | `tailwind.config.ts` vs `tokens.css` | Médio | ✅ **Resolvido** | IBM Plex Sans adicionada via Google Fonts. `--font-family-base` atualizado (Fase 2, decisão de Tom) |
| `--action-primary` (#1d4ed8) vs paleta brand (`--brand-500` #4C789A) | `tokens.css` | Médio | ⚠️ **Pendente** | Decisão do usuário — documentar diferença intencional ou unificar |
| `PageHeader` do AppShell vs. `PageHeader.tsx` produto | `App.tsx` vs `components/product/PageHeader.tsx` | Baixo-médio | ✅ **Esclarecido** | Confirmado que são propósitos distintos: `dashboard/layout/PageHeader` para platform-admin (App.css), `product/PageHeader` para módulos operacionais (tokens) |
| `SidebarNav` raiz vs. `dashboard/layout/SidebarNav.tsx` | `src/sidebar/` vs `src/dashboard/layout/` | Médio | ⚠️ **Pendente** | Confirmar qual é usado, remover o outro |
| `TopbarGlobal.tsx` (dashboard) vs `Topbar.tsx` (raiz) | `src/dashboard/layout/` vs `src/topbar/` | Médio | ⚠️ **Pendente** | Confirmar qual é usado, remover o outro |

---

## 10. Decisões para Constituição Formal do DS

| Decisão | Status | Resultado | Data |
|---|---|---|---|
| **Fonte canônica de tokens** | ✅ Decidido | `tokens.css` é a única fonte. `index.css` tem apenas vars HSL do shadcn, alinhadas com tokens. | 2026-05-30 |
| **IBM Plex Sans ou system fonts?** | ✅ Decidido por Tom | IBM Plex Sans — adicionada via Google Fonts em `index.html`. | 2026-05-30 |
| **Azul de ação vs azul de marca** | ⚠️ Pendente | Manter `--action-primary` (#1d4ed8) separado de `--brand-500` (#4C789A) por enquanto. Documentar diferença intencional quando confirmado. | — |
| **Dark mode** | ⚠️ Pendente | Infraestrutura presente (`darkMode: 'class'`). Implementar ou adiar para v2. | — |
| **Storybook ou não** | ⚠️ Pendente | Avaliar após Fases 5–7 do roadmap. | — |

---

## 11. Candidatos Prioritários ao Design System Formal

| Prioridade | Componente | Status | Resultado |
|---|---|---|---|
| P0 | Resolver conflito de tokens | ✅ Concluído | Conflitos removidos de `index.css`. `tokens.css` é fonte única. (Fase 1) |
| P0 | IBM Plex Sans | ✅ Concluído | Fonte oficial. `@import` em `index.html`. `--font-family-base` atualizado. (Fase 2) |
| P1 | `StatusPill` + `PriorityBadge` | ✅ Concluído | Tokens canônicos. Tipos `StatusTone`/`PriorityLevel` exportados. (Fase 3) |
| P1 | `EmptyState` | ✅ Concluído | Tokens canônicos. Variantes `default`/`error`/`permission`. `EmptyStateVariant` exportado. (Fase 3) |
| P1 | `PageHeader` | ✅ Concluído | Tokens canônicos. Duplicata com `dashboard/layout/PageHeader` esclarecida — propósitos distintos. (Fase 3) |
| P1 | `KpiCard` | ✅ Concluído | Tokens canônicos. Prop `category` conecta `--kpi-accent-*`/`--kpi-bg-*`. `KpiCategory` exportado. (Fase 3) |
| P1 | `FilterBar` | ✅ Concluído | Padrão misto unificado. CSS vars incorretas corrigidas. `productSurfaceStyle` aplicado. (Fase 3) |
| P2 | `Button` (shadcn) + `btn-*` (tokens.css) | ✅ Concluído | Padrão `ui-button--*` confirmado. Tokens corrigidos em `ui/styles.css`. (Fase 4) |
| P2 | `MetricCard`, `ExecutiveCard`, `OpportunityCard` | ✅ Concluído | `productSurfaceStyle` + tokens de texto em todos. (Fase 3) |
| P2 | `Timeline` | ⚠️ Pendente | Fase 5+ |
| P3 | `KanbanColumn` | ⚠️ Pendente | Fase 5+ |
| P3 | `DrawerSection` | ⚠️ Pendente | Fase 5+ |

---

## 12. Insumos para Próximas Etapas

### Para implementação imediata (code)
1. ~~Resolver conflito `--radius-*` no `index.css`~~ ✅ Concluído (Fase 1)
2. ~~Resolver conflito `--shadow-card` no `index.css`~~ ✅ Concluído (Fase 1)
3. ~~Confirmar/adicionar @import IBM Plex Sans~~ ✅ Concluído (Fase 2)
4. `tailwind.config.ts` já referencia `var(--radius-*)` e `var(--shadow-card)` — após Fase 1, resolve para `tokens.css` automaticamente ✅

### Para roadmap de produto
1. Definir se dark mode é prioridade
2. Definir se Storybook/Figma é necessário antes de novos módulos
3. Validar com Tom: azul de ação vs azul de marca

### Para KB-005 (retroalimentação)
- **Dashboard adaptativo por role** confirmado — "Visão do Escritório" (ADM) vs "Home Operacional" (ADV): importante para UX de onboarding

---

## 13. Limitações desta Etapa

> [!warning] O que este documento não faz
>
> - Não implementa nenhuma mudança de código
> - Não cria tokens de dark mode
> - Não cria Storybook, Figma ou documentação visual formal
> - Não valida acessibilidade (contraste, ARIA) em profundidade — acessibilidade não foi validada por ferramenta automatizada
> - Análise visual foi baseada em navegação — não inclui medição precisa de pixels/espaçamentos
> - Mobile/responsividade não avaliada em profundidade — responsividade precisa de validação visual por breakpoint
> - Taxonomia de status deve ser confrontada com dados reais do backend e enum de roles
> - Padrões de IA dependem de decisão sobre LLM externo (BL-057) ainda pendente
> - Componentes ainda precisam de documentação de props e variantes formais
> - Backlog não foi atualizado nesta etapa (UPDATE-KB-006-001 é somente documental)

---

## 14. Princípios Visuais Oficiais

> [!note] Recomendação — não são decisões finais até aprovação do usuário
> Estes princípios foram derivados da análise do produto, do perfil de usuários jurídicos e das guidelines de SaaS enterprise. Devem ser validados com Tom antes de serem tratados como regra rígida.

| Princípio | Descrição | Como aplicar na UI | Anti-padrão |
|---|---|---|---|
| **Clareza operacional** | O usuário jurídico precisa encontrar a ação certa sem ambiguidade. Cada tela tem uma ação primária clara. | Um único botão primário por tela. Hierarquia visual explícita: título → KPIs → lista → ação. | Múltiplos botões primários concorrentes na mesma tela. |
| **Confiança jurídica** | O sistema deve transmitir seriedade, precisão e confiabilidade — qualidades esperadas em contexto legal. | Paleta sóbria (brand-900, neutros), tipografia legível, espaçamento generoso, sem elementos decorativos desnecessários. | Cores vibrantes ou playful sem propósito funcional. Animações excessivas. |
| **Densidade controlada** | Escritórios jurídicos lidam com muita informação. A densidade deve ser alta o suficiente para produtividade, mas sem sobrecarregar. | Tabelas compactas com 14px, KPIs em grid 3–4 colunas, filtros colapsáveis. Priorizar scanning visual. | Telas vazias com espaço excessivo. Ou, ao contrário, listas sem espaçamento que causam erros de leitura. |
| **Hierarquia forte** | O usuário deve saber imediatamente o que é mais importante em cada tela. | PageHeader claro, KPIs no topo, ações prioritárias destacadas, status visível na primeira coluna de tabelas. | Elementos de mesma ênfase visual disputando atenção. |
| **Ação contextual** | As ações disponíveis devem ser relevantes ao contexto atual do usuário (role, módulo, item selecionado). | Botões "Novo Processo", "Atribuir Prazo" aparecem apenas onde fazem sentido. Menus de ação por linha em tabelas. | Ações genéricas sem relação com o contexto. Botões que nunca mudam independentemente do estado. |
| **Risco visível** | Prazos vencidos, processos críticos e pendências financeiras devem ser visíveis imediatamente — sem necessidade de busca. | Uso consistente de error/warning na paleta semântica. Badges de prioridade na primeira coluna. KPIs de risco em destaque no dashboard. | Risco enterrado em detalhe de registro. Alerta visual apenas em modal. |
| **Consistência de status** | O mesmo status deve ter sempre a mesma cor, ícone e rótulo em todo o produto. | Taxonomia visual de status definida neste KB (seção 21). StatusPill e PriorityBadge como componentes únicos. | Diferentes cores para "Em andamento" em Processos vs. Tarefas. |
| **Sobriedade visual** | O produto não compete por atenção — serve como ferramenta. Elementos visuais existem para comunicar, não decorar. | Ícones Lucide sem cor, usados apenas para reforçar o texto. Nenhuma ilustração decorativa em telas operacionais. | Gradientes desnecessários. Ilustrações em telas de listagem. |
| **Produtividade para usuários jurídicos** | O usuário volta ao mesmo módulo dezenas de vezes por dia. A interface deve ser eficiente para uso repetido. | Filtros persistentes. Paginação previsível. Atalhos de teclado futuros. Ações em massa em tabelas. | Fluxos longos para tarefas comuns. Confirmações desnecessárias para ações não destrutivas. |
| **IA como assistente, não como decisão final** | Resultados de IA são sugestões revisáveis — nunca veredictos jurídicos. | Resultados de IA sempre acompanhados de badge "Revisão necessária" ou similar. Ações de IA nunca bloqueiam o fluxo. | IA apresentada como resultado definitivo. Usuário sem controle sobre o que foi gerado. |

---

## 15. Guidelines de Uso de Componentes

| Situação | Componente recomendado | Variante | Regra de uso | Evitar |
|---|---|---|---|---|
| Ação principal da página | `Button` | `variant="default"` (primário) | Um por tela. Posição: PageHeader direito ou rodapé de formulário. | Dois botões primários na mesma tela. |
| Ação secundária | `Button` | `variant="outline"` ou `variant="ghost"` | Usado junto ao primário, com menos peso visual. | Usar mesmo estilo do primário. |
| Ação destrutiva | `Button` + `Dialog` de confirmação | `variant="destructive"` | Sempre precedida de Dialog de confirmação com descrição do impacto. | Executar exclusão sem confirmação. |
| Filtros de listagem | `FilterBar` | Barra horizontal com presets | Acima da tabela/lista. Presets rápidos + "Mais filtros" via Popover. | Filtros embutidos dentro da tabela. |
| Status curto (1–2 palavras) | `StatusPill` | Por categoria semântica | Primeira ou segunda coluna em tabelas. Sempre com cor + texto. | Apenas cor sem texto. |
| Prioridade | `PriorityBadge` | Alta / Média / Baixa / Crítica | Junto ao nome do processo ou tarefa. | Usar apenas ícone sem rótulo. |
| Métrica / KPI | `KpiCard` | Com ícone, valor e rótulo | Grid 3–4 colunas no topo da tela. | KPIs em tabela ou lista. |
| Lista vazia | `EmptyState` | Com ícone, título e CTA | Centralizado na área de conteúdo. CTA deve levar à criação. | Área em branco sem explicação. |
| Erro | `EmptyState` (variante erro) + Toast | `variant="error"` | Para erros de carregamento de lista. Toast para ações. | Apenas console.error sem feedback visual. |
| Carregamento | Skeleton (shadcn) | Por tipo de conteúdo | Skeleton no lugar do conteúdo enquanto carrega. | Spinner bloqueante em tela inteira. |
| Confirmação crítica | `Dialog` | Com título, descrição e botões | Sempre modal. Botão destrutivo em vermelho. Escape para cancelar. | Confirmação inline sem modal. |
| Edição lateral | `Sheet` | `side="right"` | Drawer lateral para edição rápida sem sair da listagem. | Modal para edição leve. |
| Detalhe de processo | `Sheet` ou página dedicada | Drawer para preview rápido, página para detalhe completo | Drawer para consulta rápida. Navegação para página quando há muitas abas. | Drawer com muitas seções e scroll longo. |
| Detalhe de cliente | Página dedicada | Com abas (Dados, Processos, Financeiro) | Página própria com `Tabs`. | Modal para perfil completo. |
| Timeline de eventos | `Timeline` | Vertical, ordenado por data | Em abas "Histórico" de processo ou atendimento. | Lista não ordenada sem distinção visual. |
| Kanban | `KanbanColumn` | Com cards arrastáveis | CRM e visão kanban de processos. Máximo 5–6 colunas. | Kanban com mais de 7 colunas visíveis. |
| Notificações | Toast (Sonner) + badge na topbar | Toast para ação recente, badge para contagem | Toast auto-dismiss em 4s. Badge some ao visitar notificações. | Notificação que bloqueia a interface. |
| IA assistiva | Botão com ícone IA + loading + card de resultado | Ver seção 24 | Sempre com indicação de que o resultado é gerado por IA. | IA sem identificação visual. |

---

## 16. Estados Oficiais de Interface

> [!important] Regra crítica de acessibilidade
> Estados não devem depender apenas de cor. Sempre que o estado for crítico (error, warning, disabled, processing), combinar cor + texto + ícone ou mensagem descritiva.

| Estado | Quando usar | Padrão visual | Componentes afetados | Observações |
|---|---|---|---|---|
| **default** | Estado base, nenhuma interação | Sem modificação visual | Todos | — |
| **hover** | Cursor sobre elemento interativo | Background levemente mais escuro (neutral-100) ou borda visível | Button, TableRow, NavItem, Card | Não usar apenas hover como única indicação de clicabilidade. |
| **active / pressed** | Elemento sendo clicado | Leve escurecimento ou scale(0.98) | Button, NavItem, Card interativo | Feedback imediato — máximo 100ms. |
| **focus** | Elemento com foco por teclado ou tab | Anel de foco visível 2px, cor brand-400 | Todos os interativos | Nunca remover o focus ring. Obrigatório para acessibilidade. |
| **disabled** | Elemento não interativo no contexto atual | Opacidade 0.4–0.5, cursor not-allowed, sem hover | Button, Input, Select, Checkbox | Usar atributo `disabled` semântico além de estilo visual. |
| **loading** | Operação assíncrona em andamento | Spinner inline no botão ou skeleton na área de conteúdo | Button, TableRow, Card, Modal | Desabilitar o elemento durante o loading para evitar dupla submissão. |
| **skeleton** | Conteúdo ainda não carregado | Placeholder animado (shimmer) no lugar do conteúdo | KpiCard, TableRow, Card, PageHeader | Preferível ao spinner para carregamentos de lista. |
| **empty** | Nenhum dado disponível | `EmptyState` com ícone + mensagem + CTA | Tabelas, listas, módulos inteiros | Nunca deixar área em branco sem `EmptyState`. |
| **error** | Falha de carregamento ou validação | Ícone de erro + mensagem descritiva + ação de retry | Formulários, tabelas, cards de dados | Mensagem deve informar o que falhou e como resolver. |
| **success** | Operação concluída com êxito | Toast verde auto-dismiss (4s) + possível atualização inline | Formulários, ações de tabela | Não bloquear a interface com modal de sucesso para ações simples. |
| **warning** | Situação que requer atenção mas não impede operação | Badge/toast/banner amarelo + ícone de alerta | Prazos próximos, dados desatualizados | Combinado com texto explicativo. |
| **selected** | Item selecionado em lista, tabela ou kanban | Background brand-100, borda brand-400 ou checkmark | TableRow, KanbanCard, ListItem | Cor + ícone ou checkmark. Nunca apenas cor. |
| **expanded** | Conteúdo colapsável aberto | Ícone chevron rotacionado, área visível | Accordion, FilterBar avançado, DrawerSection | Transição suave (150–200ms). |
| **collapsed** | Conteúdo colapsável fechado | Ícone chevron padrão, área oculta | Accordion, Sidebar colapsada, FilterBar | Indicar que há mais conteúdo disponível. |
| **permission denied** | Usuário não tem acesso ao recurso | `EmptyState` com ícone de cadeado + "Você não tem permissão" + contato suporte | Módulos, rotas, ações específicas | Nunca redirecionar silenciosamente sem explicação. |
| **offline / network error** | Sem conexão ou falha de rede | Banner persistente no topo + retry nas ações | Global (topbar) + ações específicas | A ser implementado em versão futura. |
| **processing IA** | IA está processando a requisição | Spinner com label "Processando com IA..." + botão desabilitado | Botões de IA, área de resultado | Não bloquear o restante da interface durante o processamento. |

---

## 17. Acessibilidade Mínima Obrigatória

> [!important] Padrão mínimo do Lexora
> O Lexora deve atingir **WCAG 2.1 nível AA** como padrão mínimo. As regras abaixo são obrigatórias — não opcionais — para qualquer componente novo ou modificado.

| Tema | Regra obrigatória | Aplicação no Lexora | Risco se ignorar |
|---|---|---|---|
| **Contraste de texto** | Mínimo 4.5:1 para texto normal; 3:1 para texto grande (≥18px bold ou ≥24px) | Verificar especialmente: texto sobre brand-900 (sidebar), texto muted (neutral-500) sobre backgrounds claros, badges coloridos | Exclusão de usuários com baixa visão; falha em auditoria de acessibilidade |
| **Foco visível** | Anel de foco visível em todos os elementos interativos (2–4px, cor distinta) | Nunca usar `outline: none` sem substituto equivalente. Usar brand-400 como cor de foco. | Navegação por teclado inacessível — exclui usuários com mobilidade reduzida |
| **Navegação por teclado** | Todos os fluxos críticos navegáveis por Tab, Enter, Escape, setas | Formulários, filtros, tabelas, modais, drawers, menus dropdown | Produto inacessível para usuários que não usam mouse |
| **Labels em inputs** | Todo campo de formulário deve ter `<label>` visível associado ao campo | Usar `label` com `for` correspondente ao `id` do input. Não usar apenas placeholder. | Leitores de tela não anunciam o campo corretamente |
| **Botões com nome acessível** | Botões com apenas ícone devem ter `aria-label` ou texto visível | Botões da topbar (busca, notificações, user menu), ações de linha em tabelas | Usuários de leitor de tela não sabem para que serve o botão |
| **Ícones com significado textual** | Ícones que comunicam informação crítica devem ter texto ou `aria-label` complementar | StatusPill, PriorityBadge, ícones de alerta em tabelas | Daltonismo e leitores de tela não interpretam ícones isolados |
| **Estados não somente por cor** | Erro, sucesso, warning e seleção não podem ser indicados apenas por mudança de cor | Sempre combinar: cor + ícone + texto descritivo. Exemplo: campo de erro tem borda vermelha + ícone + mensagem. | Usuários com daltonismo não percebem o estado |
| **Tamanho mínimo de clique/toque** | Área clicável mínima de 44×44px para elementos interativos | Botões, links, ícones interativos, itens de menu — usar hitSlop ou padding interno para atingir o mínimo | Dificuldade de uso em touch e para usuários com tremor ou mobilidade reduzida |
| **Modais com foco controlado** | Ao abrir modal ou drawer, o foco deve ir para o primeiro elemento interativo interno. Ao fechar, retornar ao trigger. | Todos os `Dialog` e `Sheet` do Lexora | Usuários de leitor de tela ficam "perdidos" fora do contexto |
| **Tabelas com cabeçalhos claros** | Tabelas de dados devem usar `<th>` com `scope` adequado e cabeçalhos descritivos | Todas as tabelas de listagem (processos, clientes, tarefas, financeiro) | Leitores de tela não conseguem associar célula ao cabeçalho |
| **Mensagens de erro compreensíveis** | Erros de formulário devem informar o que está errado e como corrigir (não apenas "Campo inválido") | Validação de todos os formulários do produto | Usuário não consegue corrigir o erro; frustra a conclusão da tarefa |
| **Badges/status com texto legível** | StatusPill e PriorityBadge devem ter tamanho mínimo de 12px e contraste 4.5:1 | Verificar especialmente badges sobre fundo colorido (error-bg, warning-bg) | Badges ilegíveis em telas pequenas ou para usuários com baixa visão |

---

## 18. Responsividade

> [!note] Foco atual — desktop first
> O Lexora é predominantemente usado em desktop (escritório jurídico). Responsividade para mobile é secundária mas não deve ser ignorada — advogados acessam via celular em audiências e deslocamentos.

| Contexto | Comportamento esperado | Padrão recomendado | Risco |
|---|---|---|---|
| **Desktop grande (≥1440px)** | Layout completo com sidebar aberta + conteúdo em largura máxima | `max-w-screen-xl` para conteúdo, sidebar 288px fixa | Layout muito estreito no centro em monitores ultrawide |
| **Notebook (1024–1439px)** | Layout completo com sidebar aberta, conteúdo ligeiramente mais compacto | Breakpoint principal de design — tudo deve funcionar aqui | — |
| **Tablet (768–1023px)** | Sidebar colapsada por padrão ou oculta com hamburguer | Sidebar como overlay (Sheet) ativada por hamburguer | Colisão entre sidebar e conteúdo |
| **Mobile (< 768px)** | Sidebar oculta, topbar compacta, conteúdo em coluna única | Sidebar como drawer de baixo pra cima ou overlay lateral | Itens de topbar comprimidos sem fallback |
| **Sidebar aberta** | Conteúdo usa largura restante (viewport − 288px) | `margin-left: 288px` ou layout flexível | Conteúdo sobreposto pela sidebar em notebooks pequenos |
| **Sidebar colapsada** | Conteúdo expande para quase toda a largura | `margin-left: 88px` | KPIs e tabelas devem se ajustar automaticamente |
| **Topbar** | Fixa no topo, sempre visível | `position: fixed; top: 0` com padding compensatório no conteúdo | Topbar sobrepõe conteúdo sem offset correto |
| **Tabelas** | Em notebook, colunas prioritárias visíveis; em tablet/mobile, colunas secundárias ocultas | Prioridade de coluna: status → nome → prazo → responsável → ação | Scroll horizontal sem indicação |
| **Cards/KPIs** | Grid 4 colunas em desktop, 2 em tablet, 1 em mobile | Usar CSS Grid com `auto-fit` ou breakpoints explícitos | KPIs muito estreitos em mobile |
| **Filtros** | Em desktop: barra horizontal fixa acima da tabela; em tablet/mobile: botão "Filtros" abre Sheet | FilterBar horizontal em desktop; Sheet lateral em mobile | Filtros inacessíveis em mobile |
| **Formulários** | Em desktop: 2 colunas para campos relacionados; em mobile: 1 coluna | Grid responsivo com `md:grid-cols-2` | Formulários muito largos em mobile |
| **Dashboards** | Grid de KPIs e cards; em mobile empilhar verticalmente | Grid responsivo com prioridade para KPIs de risco | Dashboard ilegível em mobile |
| **Drawers** | Em desktop: slide da direita (Sheet); em mobile: ocupar 100% da largura | `Sheet` com `side="right"` em desktop, `side="bottom"` ou fullscreen em mobile | Drawer sobrepõe todo o conteúdo em mobile |
| **Modais** | Em desktop: centrado com max-width; em mobile: fullscreen ou bottom sheet | `Dialog` com `max-w-lg` em desktop; considerar Sheet em mobile para formulários | Modal muito pequeno ou muito largo em mobile |

> [!tip] Regra de ouro para mobile
> Em mobile, priorizar cards e listas empilhadas sobre tabelas densas. Filtros devem virar Sheet ou bloco colapsável. Nenhuma tabela deve ter scroll horizontal sem indicação visual clara.

---

## 19. Padrões de Layout por Tipo de Tela

| Tipo de tela | Estrutura recomendada | Componentes principais | Observações |
|---|---|---|---|
| **Dashboard (ADV/ADM)** | PageHeader → Grid KPIs (4 col) → Seção de listas/cards → Sidebar de agenda (ADV) | `KpiCard`, `FilterBar` opcional, `ExecutiveCard` (ADM) | ADM e ADV têm estruturas diferentes — ver KB-005 |
| **Listagem operacional** | PageHeader com ação primária → FilterBar → Tabela paginada | `PageHeader`, `FilterBar`, `StatusPill`, `PriorityBadge`, `EmptyState` | Ação primária ("Novo X") no canto direito do PageHeader |
| **Detalhe de entidade** | PageHeader com breadcrumb → Abas (Tabs) → Conteúdo da aba ativa → DrawerSection ou Sheet | `Tabs`, `Timeline`, `DrawerSection`, `StatusPill` | Abas evitam scroll longo — cada aba tem uma responsabilidade |
| **Formulário de criação/edição** | PageHeader → Formulário em seções agrupadas → Rodapé fixo com Salvar/Cancelar | `Input`, `Select`, `Textarea`, `Button` | Formulários longos devem ter seções com separador e título |
| **Kanban** | PageHeader com seletor de view → Colunas horizontais com cards | `KanbanColumn`, `PriorityBadge`, `StatusPill` | Scroll horizontal permitido no kanban; indicar visualmente |
| **Calendário / Agenda** | PageHeader com navegação de data → Grid de calendário → Painel lateral de detalhe | Componente de calendário + `Sheet` para detalhe | Visão mensal/semanal/diária configurável |
| **Financeiro** | PageHeader → KPIs financeiros → Tabela de lançamentos → Gráfico de resumo | `KpiCard`, `StatusPill` (Pago/Pendente/Vencido), tabela com filtro | Valores monetários em coluna com `font-tabular-nums` |
| **Documentos / Templates** | PageHeader → Grid de cards de documento → Preview lateral | Cards de documento + `Sheet` para preview | Diferente de listagem operacional — formato mais visual |
| **Publicações / Triagem** | PageHeader → Lista de publicações com status → Detalhe ao lado ou em drawer | `StatusPill` (Novo/Em análise), `EmptyState` se sem dados | Triagem com ação rápida inline na lista |
| **Admin / Platform-admin** | PageHeader → Formulário de configuração ou tabela de gestão | Sem KPIs de negócio — foco em configuração | Acesso restrito por role; indicar claramente |
| **Tela vazia** | Área central com `EmptyState` — ícone + título + subtítulo + CTA | `EmptyState` | CTA deve criar o primeiro item ou guiar o próximo passo |
| **Tela de erro / permissão** | `EmptyState` com ícone de erro ou cadeado + mensagem + ação | `EmptyState` (variante error ou permission) | Nunca página em branco sem explicação |
| **Tela com IA assistiva** | Tela base + botão de IA em PageHeader ou inline → Loading → Card de resultado | Botão IA + Skeleton + Card resultado com badge "IA" | Ver seção 24 para padrões completos de IA |

### Padrões estruturais recorrentes

| Elemento | Regra |
|---|---|
| **PageHeader** | Sempre no topo da área de conteúdo. Contém: título, subtítulo opcional, ação primária à direita, breadcrumb em telas de detalhe. |
| **Área de filtros** | Logo abaixo do PageHeader. FilterBar horizontal em desktop. Em mobile, botão "Filtros" que abre Sheet. |
| **Área de conteúdo** | Abaixo dos filtros. Tabela, kanban, grid de cards ou formulário. Com `EmptyState` quando vazio. |
| **Painel lateral / Drawer** | Sheet do lado direito para preview rápido, edição leve ou detalhe sem navegação. |
| **KPIs** | Grid horizontal no topo, antes dos filtros. Máximo 4–6 cards por linha em desktop. |
| **Ações primárias** | Posicionadas no canto direito do PageHeader (criação) ou no rodapé fixo de formulários. |
| **Ações secundárias** | Junto à ação primária, com menor destaque visual. Máximo 2–3 ações no header. |

---

## 20. Padrões de Tabelas e Listas

> [!tip] Regra central
> Tabelas do Lexora devem priorizar leitura rápida de status, responsável, prazo, risco e próxima ação. Colunas secundárias podem ser ocultadas em telas menores.

| Elemento | Regra recomendada | Aplicação |
|---|---|---|
| **Densidade** | Linhas compactas com 40–48px de altura. Fonte 14px. Padding horizontal 16px. | Tabelas de processos, tarefas, clientes, financeiro |
| **Cabeçalhos** | Texto 12–13px uppercase ou semibold, cor neutral-500 a neutral-700. Sticky em tabelas longas. | Todas as tabelas com mais de 10 linhas |
| **Ordenação** | Ícone de seta em colunas ordenáveis. Indicar coluna ativa e direção. `aria-sort` para acessibilidade. | Colunas: nome, prazo, valor, data |
| **Paginação** | Mostrar total de registros + páginas. Opção de itens por página (10, 25, 50). Paginação no rodapé da tabela. | Todas as listagens com mais de 25 itens |
| **Busca** | Campo de busca no FilterBar, acima da tabela. Debounce de 300ms. | Busca global por nome, número, responsável |
| **Filtros** | FilterBar com presets rápidos (Hoje, Esta semana, Urgente) + "Mais filtros" em Popover. | Processos, Prazos, Tarefas, Clientes |
| **Ações por linha** | Menu de ações (DropdownMenu) na última coluna, ativado por ícone de três pontos. Máximo 5–6 ações. | Ver, Editar, Atribuir, Arquivar, Excluir |
| **Ações em massa** | Checkbox na primeira coluna para seleção múltipla. Barra de ações em massa aparece ao selecionar. | Atribuição em massa, arquivamento, exportação |
| **Status em tabela** | `StatusPill` na segunda ou terceira coluna (após nome/número). Nunca apenas cor de fundo na linha. | Processos, Tarefas, Documentos, Clientes |
| **Colunas prioritárias** | Primeira: identificador (número/nome). Segunda: status. Terceira: prazo ou responsável. Última: ações. | Ordem padrão em todas as tabelas do produto |
| **Empty table** | `EmptyState` centralizado na área da tabela, com CTA de criação. Nunca tabela com zero linhas sem mensagem. | Qualquer listagem sem registros |
| **Loading table** | Skeleton de 5–8 linhas no lugar da tabela enquanto carrega. | Todas as tabelas com fetch de API |
| **Erro em tabela** | `EmptyState` variante error com botão "Tentar novamente". Mensagem explicativa. | Falha de API ou timeout |
| **Responsividade de tabela** | Em tablet/mobile: ocultar colunas de baixa prioridade (observações, datas secundárias). Manter status, nome e ações. | Versão responsiva de todas as tabelas |

---

## 21. Padrões de Formulários

| Padrão | Regra | Exemplo de uso |
|---|---|---|
| **Agrupamento por seções** | Campos relacionados agrupados com separador visual e título de seção. | Formulário de processo: "Dados do processo" / "Partes" / "Responsáveis" |
| **Labels** | Label visível acima de cada campo. Nunca usar apenas placeholder como label. | `<label>` com texto claro antes do `<input>` |
| **Placeholders** | Usar como exemplo de formato, não como instrução principal. | "Ex: 0001234-56.2024.8.26.0100" para número de processo |
| **Campos obrigatórios** | Marcar com asterisco (*) e incluir legenda "* Campo obrigatório" no topo ou rodapé do formulário. | Todos os formulários com campos obrigatórios |
| **Validação inline** | Validar no blur (quando o usuário sai do campo), não durante a digitação. Exibir erro abaixo do campo. | Campos de CPF, datas, valores monetários |
| **Mensagens de erro** | Abaixo do campo, em error-accent, com ícone e texto descritivo. Ex: "Data inválida. Use o formato DD/MM/AAAA." | Todos os campos com validação |
| **Ajuda contextual** | Helper text em neutral-500 abaixo do campo para formatos específicos ou restrições. | Número OAB, CPF/CNPJ, valores financeiros |
| **Ações no rodapé** | Botão primário (Salvar) à direita, Cancelar à esquerda ou como link. Rodapé fixo em formulários longos. | Todos os formulários |
| **Salvar / Cancelar** | Confirmar antes de cancelar se houver dados preenchidos. Usar Dialog de confirmação. | Formulários com mais de 3 campos preenchidos |
| **Formulário longo** | Dividir em etapas com indicador de progresso (passo 1 de 3) ou em seções colapsáveis. Autosave de rascunho quando possível. | Cadastro completo de processo, onboarding |
| **Formulário em modal vs página** | Modal para formulários simples (≤5 campos). Página dedicada para formulários complexos. | Novo prazo: modal. Novo processo completo: página. |
| **Campos sensíveis** | CPF, CNPJ, OAB, valores financeiros — mascarar durante digitação, validar formato. | Formulários de cliente, financeiro |
| **Upload de documentos** | Drag & drop + botão de seleção. Mostrar progresso de upload. Lista de arquivos anexados com possibilidade de remoção. | Documentos de processo, petições |
| **Formulários financeiros** | Campos de valor com formatação monetária automática (R$ 0,00). Campos de data com calendário. | Honorários, cobranças, despesas |

---

## 22. Padrões de Feedback

| Situação | Feedback recomendado | Componente | Observação |
|---|---|---|---|
| **Sucesso ao salvar** | Toast verde auto-dismiss (4s) com mensagem curta: "Processo salvo com sucesso." | Toast (Sonner) | Não bloquear a interface. Não usar modal para sucesso simples. |
| **Erro de API** | Toast vermelho persistente (não auto-dismiss) com "Erro ao salvar. Tente novamente." + botão de retry | Toast (Sonner) com ação | Logar o erro; não expor detalhes técnicos ao usuário. |
| **Validação de formulário** | Mensagens inline abaixo de cada campo. `aria-live` para leitores de tela. Foco no primeiro campo inválido após submit. | Mensagem de erro inline | Não usar apenas toast para erros de validação. |
| **Sem permissão** | `EmptyState` com ícone de cadeado + "Você não tem permissão para acessar este recurso." + link de suporte | `EmptyState` (variante permission) | Nunca redirecionar silenciosamente. |
| **Sessão expirada** | Modal ou toast persistente: "Sua sessão expirou. Faça login novamente." + botão de login | `Dialog` ou Toast persistente | Preservar URL atual para redirecionamento pós-login. |
| **Carregamento** | Skeleton na área de conteúdo ou spinner inline no botão | Skeleton / Spinner | Skeleton para listas e cards. Spinner para botões de ação. |
| **Processamento demorado (> 5s)** | Banner no topo com mensagem: "Processando... Isso pode levar alguns instantes." + spinner | Banner + Spinner | Não bloquear toda a tela — usar área específica. |
| **Operação destrutiva** | Dialog de confirmação com descrição do impacto + botão vermelho "Excluir definitivamente" | `Dialog` com `Button variant="destructive"` | Descrever o que será perdido. Permitir cancelar com Escape. |
| **Notificação nova** | Badge no ícone de sino da topbar + lista de notificações acessível por clique | Badge + Popover/Sheet de notificações | Não usar modal para exibir notificações. |
| **Dados vazios** | `EmptyState` com ícone temático + mensagem explicativa + CTA de criação | `EmptyState` | Nunca área em branco. |
| **Dados desatualizados** | Banner ou badge de aviso: "Dados de X. Atualizar" com ação de refresh | Banner inline ou Badge | Sinalizar sem bloquear a leitura dos dados atuais. |
| **Falha de IA** | Toast vermelho + fallback para modo manual: "Não foi possível gerar a sugestão. Preencha manualmente." | Toast + estado do componente de IA | Nunca bloquear o fluxo por falha de IA. |

---

## 23. Padrões de IA na Interface

> [!important] Princípio fundamental
> A IA no Lexora deve ser apresentada como **assistência revisável**, nunca como decisão jurídica final. Resultados de IA devem indicar claramente que precisam de revisão humana quando aplicável.

| Situação de IA | Padrão visual | Regra | Risco |
|---|---|---|---|
| **Botão / ação de IA** | Botão com ícone de faísca (Sparkles/Wand) + texto descritivo. Badge opcional "IA" em brand-100/400. | Identificar claramente que é uma ação de IA. Não misturar com ações determinísticas sem distinção. | Usuário não sabe que está usando IA e não revisa o resultado. |
| **Loading de IA** | Spinner com label "Processando com IA..." na área do resultado. Botão da ação desabilitado durante o processo. | Não bloquear o restante da tela. Manter o contexto visível. | Usuário clica novamente achando que não funcionou. |
| **Resultado gerado por IA** | Card de resultado com badge "Gerado por IA" + ícone + texto de aviso: "Revise antes de usar." Cor de borda brand-200 ou info. | Sempre diferenciar visualmente resultado de IA de conteúdo determinístico. | Resultado de IA tratado como verdade absoluta. |
| **Sugestão de IA** | Chip ou card de sugestão com fundo brand-50 + "Sugestão da IA:" + possibilidade de aceitar, editar ou ignorar. | Sempre dar controle ao usuário sobre o que fazer com a sugestão. | Sugestão aplicada automaticamente sem revisão. |
| **Recomendação jurídica** | Texto em card separado com disclaimer: "Esta recomendação é gerada por IA e não substitui análise jurídica profissional." | Disclaimer obrigatório em recomendações jurídicas. | Responsabilidade legal por decisão baseada em IA sem revisão. |
| **Resumo automático** | Seção colapsável "Resumo gerado por IA" com badge info + texto de aviso inline. | Permitir que o usuário collapse ou expanda. Não substituir o conteúdo original. | Resumo impreciso tomado como representação fiel. |
| **Drafting / documento** | Editor com área de "Rascunho gerado por IA" + possibilidade de edição completa antes de salvar. | O documento não é salvo sem ação explícita do usuário. | Documento incorreto salvo sem revisão. |
| **Auditoria de IA** | Log de ações de IA acessível em histórico/timeline, indicando: ação, data, usuário que iniciou, status. | Rastreabilidade de todas as ações de IA (quando implementada). | Impossibilidade de auditar ou reverter ações de IA. |
| **Erro de IA** | Toast vermelho: "Não foi possível processar a solicitação de IA. Tente novamente ou preencha manualmente." | Sempre oferecer fallback manual. Não bloquear o fluxo. | Usuário sem alternativa quando a IA falha. |
| **Fallback determinístico** | Quando RemoteAiProvider falha, DeterministicAiProvider assume. Sinalizar visualmente: "Modo offline — resultado aproximado." | Sinalizar ao usuário que houve fallback. | Usuário não sabe que o resultado veio de um modo degradado. |
| **Aviso de revisão humana** | Banner ou rodapé no card de resultado: "⚠ Revise este conteúdo antes de usar em documentos legais." | Obrigatório em documentos, recomendações e análises jurídicas. | Uso de conteúdo de IA sem revisão em peças legais. |
| **Dados sensíveis** | Nunca exibir CPF, OAB, valores ou nomes de partes em prompts visíveis ou logs de IA. Mascarar antes de enviar ao LLM externo. | Requer política de mascaramento (BL-075) antes de ativar LLM externo. | Violação de privacidade e LGPD. |

---

## 24. Taxonomia Visual de Status e Prioridade

> [!note] Recomendação inicial — validar contra backend
> Esta taxonomia foi derivada da análise de navegação (KB-005) e do código existente. Deve ser confrontada com os valores reais de enum no banco de dados e no backend antes de ser tratada como definitiva.

### 24.1 Status operacional

| Valor | Token/cor sugerida | Componente | Observação |
|---|---|---|---|
| Ativo | success-accent / verde | `StatusPill` | Entidades habilitadas (clientes, processos ativos) |
| Inativo | neutral-400 / cinza | `StatusPill` | Entidades desabilitadas ou arquivadas |
| Novo | info-accent / azul | `StatusPill` | Item recém-criado, ainda não processado |
| Em andamento | info-accent / azul | `StatusPill` | Processo, tarefa ou atendimento em execução |
| Pendente | warning-accent / amarelo | `StatusPill` | Aguardando ação ou informação |
| Aguardando documentos | warning-accent / amarelo | `StatusPill` | Específico para processos |
| Concluído | success-accent / verde | `StatusPill` | Tarefa ou processo finalizado com êxito |
| Arquivado | neutral-400 / cinza | `StatusPill` | Item encerrado, mantido para histórico |
| Bloqueado | error-accent / vermelho | `StatusPill` | Impedido por fator externo — requer ação |
| Vencido | error-accent / vermelho | `StatusPill` | Prazo expirado sem conclusão |
| Urgente | error-accent / vermelho + ícone | `StatusPill` + badge | Requer ação imediata |
| Crítico | error-accent / vermelho escuro | `StatusPill` + badge especial | Risco alto — destacar visualmente |

### 24.2 Prioridade

| Valor | Token/cor sugerida | Componente | Observação |
|---|---|---|---|
| Crítica | error-accent / vermelho | `PriorityBadge` | Máxima urgência |
| Alta | warning-accent / laranja/âmbar | `PriorityBadge` | — |
| Média | info-accent / azul claro | `PriorityBadge` | Padrão |
| Baixa | neutral-400 / cinza | `PriorityBadge` | Sem urgência |

### 24.3 Status financeiro

| Valor | Token/cor sugerida | Componente | Observação |
|---|---|---|---|
| Pago | success-accent / verde | `StatusPill` | Lançamento liquidado |
| Em aberto | warning-accent / amarelo | `StatusPill` | Aguardando pagamento |
| Vencido | error-accent / vermelho | `StatusPill` | Prazo de pagamento expirado |
| Cancelado | neutral-400 / cinza | `StatusPill` | Cobrança ou lançamento cancelado |

### 24.4 Status jurídico / processo

| Valor | Token/cor sugerida | Componente | Observação |
|---|---|---|---|
| Em análise | info-accent / azul | `StatusPill` | Processo sendo analisado pela equipe |
| Distribuído | info-accent / azul | `StatusPill` | Processo distribuído ao advogado |
| Em recurso | warning-accent / amarelo | `StatusPill` | Fase recursal |
| Transitado em julgado | success-accent / verde | `StatusPill` | Decisão definitiva |
| Encerrado | neutral-400 / cinza | `StatusPill` | Processo finalizado |

### 24.5 Status técnico / admin

| Valor | Token/cor sugerida | Componente | Observação |
|---|---|---|---|
| Processando | info-accent + spinner | Badge + Spinner | Operação em andamento (IA, upload, sync) |
| Erro | error-accent | `StatusPill` | Falha técnica |
| Sincronizado | success-accent | `StatusPill` | Dados em sincronia com fonte externa |
| Desatualizado | warning-accent | Badge | Dados potencialmente desatualizados |

---

## 25. Do / Don't do Design System Lexora

| Faça | Evite | Motivo |
|---|---|---|
| **Cores** | | |
| Usar tokens semânticos (`--action-primary`, `--success-accent`) | Usar hex diretamente no componente (`#1d4ed8`) | Tokens permitem mudança global sem busca e substituição |
| Combinar cor + texto + ícone para estados semânticos | Indicar erro ou sucesso apenas por cor | Acessibilidade: daltonismo e leitores de tela |
| Manter sidebar escura (brand-900/950) e conteúdo em neutro-50 | Usar cores vibrantes ou gradientes em áreas operacionais | Sobriedade visual esperada em SaaS jurídico |
| **Botões** | | |
| Um botão primário por tela/seção | Múltiplos botões primários concorrentes | Hierarquia de ação clara |
| Botão destrutivo com Dialog de confirmação | Ação destrutiva sem confirmação | Evitar perdas acidentais de dados |
| Botão com loading state durante operação async | Botão que some ou fica travado sem feedback | Usuário não sabe se a ação funcionou |
| **Badges e status** | | |
| `StatusPill` com cor + texto | Badge apenas com cor de fundo sem texto | Acessibilidade e clareza |
| Taxonomia unificada (seção 24) em todo o produto | Status diferentes para o mesmo valor em módulos distintos | Confusão do usuário entre módulos |
| **Filtros** | | |
| FilterBar acima da tabela com presets | Filtros embutidos dentro da tabela como colunas | Confunde filtro com dado |
| "Mais filtros" em Popover ou Sheet | Todos os filtros sempre visíveis | Sobrecarga visual em telas operacionais |
| **Tabelas** | | |
| StatusPill na segunda coluna, ações na última | Ações misturadas com dados no meio da tabela | Dificuldade de scanning visual |
| EmptyState quando tabela não tem dados | Tabela com zero linhas sem mensagem | Usuário não sabe se é bug ou ausência real de dados |
| Skeleton durante carregamento | Spinner bloqueante em tela inteira | Melhor percepção de performance |
| **Cards** | | |
| KpiCard com valor, rótulo e ícone | KPI apenas com número sem contexto | Valor sem contexto não comunica |
| Grid de 3–4 KPIs no topo | KPIs espalhados pela tela sem ordem | Hierarquia visual clara |
| **Empty states** | | |
| EmptyState com CTA que guia a próxima ação | Área em branco ou apenas "Nenhum resultado" | Engajamento e orientação do usuário |
| Ícone temático no EmptyState | Ícone genérico em todo EmptyState | Contextualiza melhor o estado vazio |
| **Modais** | | |
| Dialog apenas para confirmações e formulários curtos | Modal para navegação principal | Modal quebra o contexto de navegação |
| Escape fecha o modal | Modal sem forma de fechar | Acessibilidade e UX básico |
| **IA** | | |
| Badge "Gerado por IA" + aviso de revisão | Resultado de IA sem identificação | Responsabilidade legal e confiança do usuário |
| Fallback manual quando IA falha | Bloquear fluxo por falha de IA | IA é assistência — fluxo principal não pode depender dela |
| **Textos** | | |
| Mensagens de erro com causa + solução | "Ocorreu um erro" sem contexto | Usuário não sabe o que fazer |
| Labels visíveis em todos os campos de formulário | Placeholder como único label | Acessibilidade e usabilidade em formulários longos |
| **Hierarquia visual** | | |
| PageHeader claro + KPIs + filtros + conteúdo | Tela sem estrutura hierárquica clara | Desorientação do usuário |
| Uma ação primária por tela | Múltiplos CTAs de igual peso | Paralisia de escolha |
| **Responsividade** | | |
| Sidebar colapsável em tablet/mobile | Sidebar fixa em qualquer tamanho de tela | Conteúdo inacessível em telas menores |
| Colunas de tabela ocultas em mobile por prioridade | Scroll horizontal oculto sem indicação | Má experiência mobile |

---

## 26. Relação com Backlog

| Item backlog | Relação com Design System | Recomendação |
|---|---|---|
| **BL-025** — Confirmar carregamento IBM Plex Sans | Bloqueia decisão tipográfica final do DS | Resolver antes de formalizar escala tipográfica. Se IBM Plex Sans não carregar, adotar system fonts formalmente. |
| **BL-026** — Validar variantes de Button e Badge | Bloqueia formalização dos componentes primários do DS | Ler código de `Button.tsx` e `Badge.tsx` para confirmar CVA vs classes custom antes de documentar variantes. |
| **BL-027** — Resolver duplicidades KpiCard/EmptyState/PageHeader/SidebarNav | Bloqueia componentização formal | Mapear uso real (BL-031) e então definir componente canônico de cada. |
| **BL-028** — Unificar tokens CSS | Bloqueante para todo o DS — **pré-requisito** | Definir tokens.css como fonte única. Decisão do usuário requerida. Ver seção 3.3. |
| **BL-031** — Mapear uso real de KpiCard/EmptyState/PageHeader | Pré-requisito para BL-027 | KB-005 já mapeou parcialmente. Validar código antes de refatorar. |
| **BL-032** — Unificar EmptyState | Reduz variação não intencional no DS | Usar `product/EmptyState` como base canônica. Aguardar aprovação desta Constituição Visual. |
| **BL-033** — FilterBar como componente oficial | Formaliza componente de alta frequência (8+ telas) | Limpar mistura Tailwind + CSS custom. Documentar variantes. Ver seção 15 e 20. |
| **BL-037** — StatusPill e PriorityBadge no DS oficial | Formaliza feedbacks semânticos mais recorrentes | Aguardar taxonomia de status aprovada (seção 24). Mapear todas as variantes. |
| **BL-038** — Etapa IMPLEMENT de componentização | Permite refatoração planejada pós-Constituição Visual | Só iniciar após tokens definidos e variantes canônicas aprovadas neste KB. |
| **BL-070** — Vitest + Testing Library | Permite testes unitários de componentes do DS | Bloqueia cobertura de componentes. Implementar após formalização do DS para testar variantes. |

---

## 27. Roadmap de Maturidade do Design System

| Fase | Objetivo | Entregas | Dependências |
|---|---|---|---|
| **Fase 1 — Correção de tokens críticos** | Eliminar conflito de tokens que impede consistência visual | Remover variáveis conflitantes de `index.css`. Definir `tokens.css` como fonte única. | Decisão do usuário (BL-028). Execução: Claude Code. |
| **Fase 2 — Decisão tipográfica** | Definir fonte oficial do produto e aplicar globalmente | Confirmar IBM Plex Sans ou formalizar system fonts. Adicionar @import se necessário. Atualizar `--font-family-base`. | BL-025. Decisão do usuário. |
| **Fase 3 — Formalização de componentes essenciais** | Documentar props, variantes e uso dos 5 componentes mais críticos | Documentação formal de: `KpiCard`, `FilterBar`, `StatusPill`, `PriorityBadge`, `EmptyState`. Resolver duplicidades. | Fases 1 e 2 concluídas. BL-027, BL-031, BL-032, BL-033, BL-037. |
| **Fase 4 — Estados e acessibilidade** | Garantir que todos os estados oficiais (seção 16) estão implementados com acessibilidade mínima | Implementar estados loading/empty/error em todos os componentes principais. Adicionar focus ring global. Validar contraste. | Fase 3 concluída. Diretrizes da seção 17. |
| **Fase 5 — Responsividade e padrões de layout** | Garantir que todos os módulos funcionam nos breakpoints definidos | Validar responsividade de sidebar, topbar, tabelas e filtros. Corrigir gaps. | Fase 3 concluída. Diretrizes das seções 18 e 19. |
| **Fase 6 — Documentação interna** | Criar referência interna de uso do DS para o time | Atualizar este KB com variantes formalizadas. Criar README de componentes. | Fases 3–5 concluídas. |
| **Fase 7 — Testes visuais e de componentes** | Garantir que o DS não regride com novos desenvolvimentos | Implementar Vitest + Testing Library para componentes (BL-070). Avaliar visual regression testing. | Fase 3 concluída. BL-070. |
| **Fase 8 — Storybook / Figma** *(condicional)* | Documentação visual interativa e biblioteca de design | Storybook para os 10+ componentes formalizados. Figma apenas se houver designer dedicado. | Decisão do usuário (BL-010 Storybook). Fases 1–7 concluídas. |

---

## 28. Checklist de Qualidade Visual

| Critério | Pergunta de validação | Status esperado |
|---|---|---|
| **Consistência de tokens** | Todos os valores de cor, espaçamento e tipografia usam variáveis CSS de `tokens.css`? | ✅ Sim — nenhum hex ou valor arbitrário inline |
| **Hierarquia visual** | Cada tela tem uma ação primária clara, com KPIs no topo e conteúdo principal abaixo? | ✅ Sim — estrutura PageHeader → KPIs → Filtros → Conteúdo |
| **Clareza de ações** | O usuário sabe o que cada botão faz sem precisar de tooltip? | ✅ Sim — botões com texto descritivo, nunca só ícone em ações primárias |
| **Legibilidade** | O texto principal tem pelo menos 14px em tabelas e 16px em corpo? Contraste ≥ 4.5:1? | ✅ Sim — usando escala tipográfica e paleta semântica |
| **Responsividade** | A tela é usável em 1024px (notebook) sem scroll horizontal? | ✅ Sim — breakpoint principal de design |
| **Acessibilidade** | Todos os elementos interativos têm focus ring visível e label acessível? | ✅ Sim — nunca `outline: none` sem substituto |
| **Feedback** | Toda ação do usuário tem feedback visual (loading, sucesso ou erro)? | ✅ Sim — nenhuma ação sem resposta visual |
| **Uso correto de status** | Status usa `StatusPill` com cor + texto, nunca apenas cor? | ✅ Sim — taxonomia da seção 24 aplicada |
| **Uso correto de prioridade** | Prioridade usa `PriorityBadge` com rótulo, nunca apenas ícone colorido? | ✅ Sim — taxonomia da seção 24 aplicada |
| **IA com revisão humana** | Resultados de IA têm badge de identificação e aviso de revisão quando aplicável? | ✅ Sim — padrões da seção 23 aplicados |
| **Empty/Loading/Error states** | Toda área de conteúdo tem tratamento explícito para estado vazio, carregamento e erro? | ✅ Sim — `EmptyState` e Skeleton implementados |
| **Consistência com identidade Lexora** | A tela usa a paleta brand (azul escuro/sidebar, brand-500), neutros e semânticas sem cores externas? | ✅ Sim — sem cores fora da paleta oficial |

---

## 29. Validação desta Etapa (UPDATE-KB-006-001)

> [!success] Complemento executado em 2026-05-30
> Seções 14–28 adicionadas. Diagnóstico técnico original (seções 1–13) preservado integralmente.

### Decisões resolvidas (UPDATE-KB-006-002)

| Decisão | Resultado | Data |
|---|---|---|
| Fonte canônica de tokens | ✅ `tokens.css` — única fonte. `index.css` só tem HSL vars alinhadas. | 2026-05-30 |
| IBM Plex Sans vs system fonts | ✅ IBM Plex Sans — decisão de Tom. Google Fonts em `index.html`. | 2026-05-30 |

### Pontos que ainda exigem decisão do usuário

| Decisão pendente | Bloqueia |
|---|---|
| Azul de ação (#1d4ed8) vs azul de marca (brand-500) | Consistência de botões e links em todo o produto |
| Dark mode: implementar agora ou adiar para v2 | Tokens dark — infraestrutura já presente |
| Storybook: criar ou não | Fase 8 do roadmap |
| Taxonomia de status: validar contra enum real do backend | Seção 24 — tornar oficial |
| Política de mascaramento de dados para LLM externo | Padrões de IA (seção 23) — BL-075 |

---

*Criado em: 2026-05-30 | Atualizado em: 2026-05-30 | Status: current | Vault: !_lexora-memory-docs*
*Pasta: 09 - Design System | Fonte: Claude Code (leitura de código + navegação real + skill ui-ux-pro-max)*
*Baseado em: [[KB_005_INVENTARIO_FUNCIONAL_UX_UI_LEXORA_CURRENT_2026-05-30]], [[KB_004_PRODUCT_DISCOVERY_LEXORA_CURRENT_2026-05-30]], [[KB_003B_FRONTEND_ESTADO_ATUAL_CURRENT_2026-05-29]], [[BACKLOG_GERAL_LEXORA_CURRENT]], [[00_START_HERE]], [[MAPA_CANONICO_LEXORA_CURRENT]], [[PROTOCOLO_CONTEXTO_ENXUTO_LEXORA_CURRENT]], [[KB_003G_RISCOS_TECNICOS_E_DIVERGENCIAS_CONSOLIDADAS_CURRENT_2026-05-30]]*
*UPDATE-KB-006-001 — Complemento de Constituição Visual, guidelines, acessibilidade, responsividade, padrões de layout, tabelas, formulários, feedback, IA, Do/Don't e roadmap de maturidade.*
