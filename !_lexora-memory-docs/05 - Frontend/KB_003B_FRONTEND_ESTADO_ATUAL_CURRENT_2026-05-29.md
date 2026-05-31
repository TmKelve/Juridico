---
tipo: kb
status: current
projeto: lexora
fase: inventario-tecnico
area: frontend
data: 2026-05-29
fonte: claude-code
baseado_em:
  - '[[00_START_HERE]]'
  - '[[KB_002_GOVERNANCA_DOCUMENTAL_OFICIAL_CURRENT_2026-05-29]]'
  - '[[KB_003A_ESTRUTURA_GERAL_E_CONFIGURACOES_CURRENT_2026-05-29]]'
  - '[[BACKLOG_GERAL_LEXORA_CURRENT]]'
escopo: frontend-estado-atual
vault_oficial: 'C:\Users\tomke\app Juridico\!_lexora-memory-docs'
autoridade: inventario-tecnico
---

# KB-003B — Frontend Estado Atual

> [!important] Fonte primária: leitura direta de arquivos
> Este documento foi produzido exclusivamente pela leitura direta de arquivos e estruturas do projeto. Documentação legada não foi usada como fonte. Fatos confirmados são distinguidos de inferências em todo o documento.

---

## 1. Resumo Executivo

O frontend do Lexora é uma **SPA (Single Page Application)** construída com React 19 + Vite 8 + TypeScript, publicada na Vercel. A organização do código mistura dois padrões: **páginas como módulos planos** na raiz de `src/` (ex: `Processes.tsx`, `Dashboard.tsx`) e **módulos internamente estruturados** em subpastas (ex: `dashboard/`, `platform-admin/`, `components/`). O roteamento é centralizado em `App.tsx`.

**Stack real identificada:**
- React **19.2.4** (não React 18 como indicado no KB-003A — divergência identificada)
- Vite **8.0.1** (versão muito recente)
- TypeScript **~5.9.3**
- React Router DOM **v7.13.2**
- Tailwind CSS **3.4.17** + CSS custom properties (`tokens.css`)
- Radix UI (9 primitivos)
- Lucide React **1.7.0**
- CVA + clsx + tailwind-merge (padrão shadcn/ui)

**Organização geral:**
- Roteamento centralizado em `App.tsx` via React Router DOM v7 BrowserRouter
- Todas as rotas protegidas por sessão (verificação via `/me` e `/home` no boot)
- Autenticação via cookie HTTP (sem JWT em localStorage)
- Estado global via React Context (`CompanyContext`) + estado local em `App.tsx`
- Design tokens em `tokens.css` (CSS custom properties) + variáveis shadcn-style em `index.css`
- Componentes UI em `src/components/ui/` (shadcn-like) + componentes de produto em `src/components/product/`
- Monitoramento: stub para Sentry + Google Analytics (ambos opcionais via env vars)

**Principais riscos:**
1. React 19 diverge da versão "18" citada no KB-003A
2. Dois sistemas de design tokens coexistentes sem mediação clara
3. Login embutido em `App.tsx` (sem componente/página dedicada)
4. `platform-admin/` e `admin/` sem rota declarada no Router
5. Teste de credenciais hardcoded visível no DOM da tela de login
6. Assets de template Vite (`react.svg`, `vite.svg`) ainda presentes em `src/assets/`

---

## 2. Objetivo do Documento

Este documento serve como base para:
- Documentação oficial do estado atual do frontend Lexora
- [[KB_003C_BACKEND_E_APIS_ESTADO_ATUAL]] — entender as interfaces de API consumidas pelo frontend
- [[KB_003D_DADOS_PRISMA_E_CONTRATOS]] — validar contratos contra tipos TypeScript em `api.ts`
- [[KB_003E_TESTES_QA_E_EVIDENCIAS]] — contextualizar os testes Playwright do frontend
- **KB-004 Product Discovery** — entender o escopo funcional implementado
- **KB-005 Inventário Funcional e UX/UI** — base para mapeamento de telas, fluxos e gaps de experiência
- **KB-006 Design System e Constituição Visual** — base para mapear tokens, componentes e inconsistências visuais
- Futuras correções técnicas de arquitetura, rotas, componentes e estilos
- Alimentação futura do backlog com itens técnicos de frontend

---

## 3. Escopo e Fora do Escopo

### Analisado nesta etapa

- Estrutura completa de `frontend/` (3 níveis)
- `frontend/package.json`, `vite.config.ts`, `tsconfig*.json`, `eslint.config.js`
- `tailwind.config.ts`, `postcss.config.cjs`, `components.json`
- `src/main.tsx`, `src/App.tsx`
- `src/api.ts` (cliente HTTP e tipos)
- `src/tokens.css`, `src/index.css`
- `src/session/company-context.ts`, `src/platform/access.ts`, `src/auth/user-access.ts`
- `src/monitoring.ts`, `src/lib/cn.ts`
- `src/sidebar/SidebarNav.tsx` (estrutura de navegação)
- Estrutura de subpastas: `components/`, `dashboard/`, `platform-admin/`, `admin/`, `platform-billing/`
- Arquivos de teste Playwright na raiz de `frontend/`
- Artefatos: `test-results/`, `test-screenshots/`, `public/`

### Fora do escopo desta etapa

- Conteúdo interno de cada página (Processes.tsx, Financeiro.tsx, etc.) — apenas existência mapeada
- Validação funcional completa de cada tela
- Auditoria visual ou UX profunda — reservada para KB-005
- Constituição Visual — reservada para KB-006
- Backend, Prisma e contratos em profundidade
- Execução de build, testes ou lint
- Redesign ou refatoração

---

## 4. Estrutura Geral do Frontend

| Caminho | Tipo | Papel provável | Fonte oficial? | Observações | Ponto a validar |
|---|---|---|---|---|---|
| `frontend/src/` | Pasta | Código-fonte principal da SPA | Sim | Mistura páginas planas e subpastas organizadas | — |
| `frontend/src/App.tsx` | Arquivo | Componente raiz, roteador, login, estado de sessão | Sim | Central da aplicação — rotas, auth, shell | — |
| `frontend/src/main.tsx` | Arquivo | Entry point React, StrictMode, createRoot | Sim | Bootstrap mínimo | — |
| `frontend/src/api.ts` | Arquivo | Cliente HTTP único e todos os tipos de API | Sim | ~2000 linhas; interfaces TypeScript + métodos fetch | — |
| `frontend/src/tokens.css` | Arquivo | Sistema de design tokens (CSS custom properties) | Sim | Paleta completa, tipografia, espaçamento, sombras | — |
| `frontend/src/index.css` | Arquivo | Tailwind base + variáveis CSS shadcn-style (HSL) | Sim | Coexiste com tokens.css — duas abordagens de variáveis | Validar conflitos |
| `frontend/src/App.css` | Arquivo | Estilos do shell da aplicação | Sim | Estilos de layout, auth-screen, page-header, etc. | — |
| `frontend/src/monitoring.ts` | Arquivo | Stub de integração Sentry + GA | Sim | Ambos opcionais; ativados via env vars | Confirmar se ativos em prod |
| `frontend/src/lib/cn.ts` | Arquivo | Helper `cn()` (clsx + tailwind-merge) | Sim | Padrão shadcn/ui | — |
| `frontend/src/components/` | Pasta | Componentes reutilizáveis agrupados por domínio | Sim | Subpastas: ui, product, access-state, auth, clients, etc. | — |
| `frontend/src/dashboard/` | Pasta | Módulo do Dashboard — containers, hooks, layout, widgets | Sim | Estrutura interna bem organizada | — |
| `frontend/src/sidebar/` | Pasta | Sidebar da aplicação (navegação lateral) | Sim | 5 arquivos + sidebar.css | — |
| `frontend/src/topbar/` | Pasta | Topbar da aplicação | Sim | 6 arquivos + topbar.css | — |
| `frontend/src/session/` | Pasta | Contexto de empresa/sessão | Sim | `company-context.ts` | — |
| `frontend/src/platform/` | Pasta | Tipos e lógica de acesso de plataforma | Sim | `access.ts` (CompanyStatus, BLOCKED_MUTATION_STATUSES) | — |
| `frontend/src/auth/` | Pasta | Lógica de acesso a mutações | Sim | `user-access.ts`, `user-access.test.ts` | — |
| `frontend/src/platform-admin/` | Pasta | Console de administração de plataforma | Sim | Não conectado ao Router principal | Ver seção 8 |
| `frontend/src/admin/` | Pasta | Painel de fundação de empresa (admin) | Sim | Não conectado ao Router principal | Ver seção 8 |
| `frontend/src/platform-billing/` | Pasta | Tipos de billing de plataforma | Sim | Apenas `types.ts` | — |
| `frontend/src/company-status/` | Pasta | Modelo de status da empresa | Sim | Apenas `model.ts` | — |
| `frontend/src/assets/` | Pasta | Assets importados no código | Parcial | Contém `hero.png` (útil) + `react.svg` e `vite.svg` (legado template Vite) | Remover react.svg e vite.svg |
| `frontend/public/` | Pasta | Assets estáticos servidos diretamente | Sim | Favicons, logos, icons.svg, fundo_login.mp4 | — |
| `frontend/dist/` | Pasta | Build de produção (gerado pelo Vite) | Técnico | No `.gitignore`; build local presente | — |
| `frontend/test-results/` | Pasta | Artefatos Playwright | Técnico | Artefato automático; no `.gitignore` | — |
| `frontend/test-screenshots/` | Pasta | Screenshots de testes visuais | Técnico | 8 screenshots do topbar visual test | — |
| `frontend/package.json` | Arquivo | Dependências e scripts do frontend | Sim | npm; sem workspaces | — |
| `frontend/vite.config.ts` | Arquivo | Configuração do build Vite | Sim | Alias `@` → `./src`; plugin react | — |
| `frontend/components.json` | Arquivo | Config shadcn/ui | Sim | style: default; tailwind com CSS variables | — |
| `frontend/tailwind.config.ts` | Arquivo | Configuração Tailwind CSS | Sim | dark mode: class; IBM Plex Sans como fonte padrão | — |
| `frontend/vercel.json` | Arquivo | Config Vercel **legado/inativo** | Não | Confirmado como inativo pelo KB-003A (Root Directory = `./`) | Ver BL-005 |
| `frontend/.env.example` | Arquivo | Template de variáveis de ambiente | Sim | VITE_API_URL, VITE_SENTRY_DSN, VITE_GA_MEASUREMENT_ID | — |
| `frontend/.env.staging.example` | Arquivo | Template de env para staging | Sim | Não mencionado no KB-003A — nova evidência | Confirmar uso |
| `frontend/PLAYWRIGHT_INTERACTIVE_RESULTS.md` | Arquivo | Resultado de sessão Playwright de 02/04/2026 | Legado | Identificado no KB-002 como legado | — |
| `frontend/README.md` | Arquivo | README do frontend | Legado | Arquivo mais antigo (24/03/2026), identificado no KB-002 | — |
| `frontend/dashboard-screenshot-desktop.png` | Arquivo | Screenshot de UX solto | Artefato | No `.gitignore`; evidência histórica | Arquivar |
| `frontend/*.smoke.test.ts` (múltiplos) | Arquivos | Testes Playwright na raiz do frontend | Técnico | 9 arquivos na raiz — não em `src/` | Política de artefatos |
| `frontend/debug.log`, `vite.log`, `.*.log` | Arquivos | Logs de desenvolvimento | Técnico | Artefatos de sessão | Limpar |

---

## 5. Stack e Dependências do Frontend

### `frontend/package.json` — confirmado por leitura direta

| Item | Tipo | Papel | Evidência | Observações | Ponto a validar |
|---|---|---|---|---|---|
| `react@^19.2.4` | Prod | Framework UI principal | package.json | **React 19** — KB-003A citou React 18 (divergência) | Confirmar compatibilidade de libs com React 19 |
| `react-dom@^19.2.4` | Prod | DOM renderer React 19 | package.json | Par com react | — |
| `react-router-dom@^7.13.2` | Prod | Roteamento SPA | package.json | v7 (breaking changes vs v6) | — |
| `@radix-ui/react-checkbox@^1.3.3` | Prod | Checkbox acessível | package.json | Radix primitivo | — |
| `@radix-ui/react-dialog@^1.1.15` | Prod | Dialog/modal acessível | package.json | Radix primitivo | — |
| `@radix-ui/react-dropdown-menu@^2.1.16` | Prod | Dropdown menu acessível | package.json | Radix primitivo | — |
| `@radix-ui/react-popover@^1.1.15` | Prod | Popover acessível | package.json | Radix primitivo | — |
| `@radix-ui/react-scroll-area@^1.2.10` | Prod | Scroll area personalizada | package.json | Radix primitivo | — |
| `@radix-ui/react-select@^2.2.6` | Prod | Select acessível | package.json | Radix primitivo | — |
| `@radix-ui/react-separator@^1.1.8` | Prod | Separador visual | package.json | Radix primitivo | — |
| `@radix-ui/react-tabs@^1.1.13` | Prod | Tabs acessíveis | package.json | Radix primitivo | — |
| `@radix-ui/react-tooltip@^1.2.8` | Prod | Tooltip acessível | package.json | Radix primitivo | — |
| `class-variance-authority@^0.7.1` | Prod | CVA — variantes de componentes | package.json | Padrão shadcn/ui | — |
| `clsx@^2.1.1` | Prod | Utilitário de classes condicionais | package.json | Padrão shadcn/ui | — |
| `tailwind-merge@^3.6.0` | Prod | Merge de classes Tailwind sem conflito | package.json | Padrão shadcn/ui | — |
| `lucide-react@^1.7.0` | Prod | Ícones | package.json | Versão recente | — |
| `vite@^8.0.1` | Dev | Build tool | package.json | Versão 8 — muito recente | Verificar estabilidade |
| `@vitejs/plugin-react@^6.0.1` | Dev | Plugin React para Vite | package.json | — | — |
| `typescript@~5.9.3` | Dev | TypeScript | package.json | Versão recente | — |
| `tailwindcss@^3.4.17` | Dev | Framework CSS | package.json | v3 (não v4) | — |
| `@playwright/test@^1.59.1` | Dev | Testes E2E | package.json | Versão recente | — |
| `eslint@^9.39.4` | Dev | Linting | package.json | ESLint v9 flat config | — |
| `eslint-plugin-react-hooks@^7.0.1` | Dev | Lint de hooks React | package.json | — | — |
| `eslint-plugin-react-refresh@^0.5.2` | Dev | Lint de HMR | package.json | — | — |
| `autoprefixer@^10.5.0` | Dev | PostCSS autoprefixer | package.json | Para Tailwind | — |
| `postcss@^8.5.14` | Dev | PostCSS | package.json | — | — |
| `globals@^17.4.0` | Dev | Globals para ESLint | package.json | — | — |
| `@types/node@^24.12.0` | Dev | Tipos Node.js | package.json | — | — |
| `@types/react@^19.2.14` | Dev | Tipos React 19 | package.json | — | — |
| `@types/react-dom@^19.2.3` | Dev | Tipos ReactDOM 19 | package.json | — | — |
| `typescript-eslint@^8.57.0` | Dev | TypeScript para ESLint | package.json | — | — |

**Scripts disponíveis:**

| Script | Comando | Papel |
|---|---|---|
| `dev` | `vite` | Dev server com HMR |
| `build` | `tsc -b && vite build` | Build de produção |
| `lint` | `eslint .` | Linting ESLint |
| `preview` | `vite preview` | Preview do build gerado |
| `test:smoke` | `playwright test admin.users.smoke.test.ts adv.screens.smoke.test.ts clients.communication.smoke.test.ts financeiro.smoke.test.ts` | Smoke tests Playwright (apenas 4 dos ~9 arquivos) |

> [!warning] Divergência de versão
> O KB-003A citou "React 18". A leitura direta do `package.json` confirma **React 19.2.4**. Vite 8.0.1 também é mais recente do que o esperado. Estas são versões de ponta que podem apresentar instabilidades com dependências menores.

---

## 6. Configurações do Frontend

| Arquivo | Papel | Informação relevante | Risco | Ponto a validar |
|---|---|---|---|---|
| `vite.config.ts` | Build Vite | Plugin React; alias `@` → `./src` | Baixo | — |
| `tsconfig.json` | Config TS raiz | Referencia `tsconfig.app.json` e `tsconfig.node.json` | Baixo | — |
| `tsconfig.app.json` | Config TS app | Configuração TypeScript para código React | Baixo | Verificar targets e strict mode |
| `tsconfig.node.json` | Config TS Node | Configuração TypeScript para arquivos de config (Vite) | Baixo | — |
| `eslint.config.js` | Linting | ESLint v9 flat config; plugins React Hooks e React Refresh | Baixo | — |
| `tailwind.config.ts` | Tailwind CSS | Dark mode: class; IBM Plex Sans; cores mapeando para HSL vars | Médio | IBM Plex Sans listada mas não há import de fonte externo confirmado |
| `postcss.config.cjs` | PostCSS | Autoprefixer e Tailwind | Baixo | — |
| `components.json` | shadcn/ui config | style: default; TSX; cssVariables: true; aliases definidos | Médio | Confirmar quais componentes foram gerados via CLI shadcn vs criados manualmente |
| `frontend/vercel.json` | Config Vercel legada | SPA rewrite básico sem headers de segurança; data 02/04/2026 | Médio | **Confirmado inativo** — Root Directory Vercel = `./` (KB-003A) |
| `frontend/.env.example` | Template de env | VITE_API_URL, VITE_SENTRY_DSN, VITE_GA_MEASUREMENT_ID | Médio | Sentry e GA com valores vazios — confirmar se ativos em prod |
| `frontend/.env.staging.example` | Template staging | Variáveis para staging | Médio | **Não mencionado no KB-003A** — conteúdo não lido | Ler e documentar |
| `frontend/.env` | Env local | Arquivo existe; conteúdo não lido | Alto (segredo) | Não deve ser commitado | Confirmar que não está no git |

> [!success] IBM Plex Sans — confirmada carregando (2026-05-30)
> `<link>` do Google Fonts (400/500/600/700) adicionado em `frontend/index.html` com `preconnect`. `--font-family-base` em `tokens.css` atualizado para liderar com `"IBM Plex Sans"`. Computed style de `html` confirmado via browser. Decisão de Tom. Commit `5797948`.

---

## 7. Ponto de Entrada e Bootstrap da Aplicação

| Arquivo | Papel | Observações | Ponto a validar |
|---|---|---|---|
| `frontend/index.html` | HTML entry point do Vite | Referencia `src/main.tsx`; estrutura mínima; id `root`. Inclui `<link>` Google Fonts IBM Plex Sans (adicionado 2026-05-30, commit `5797948`) | — |
| `frontend/src/main.tsx` | Entry point React | `createRoot` + `StrictMode`; importa `index.css`; renderiza `<App />` | — |
| `frontend/src/App.tsx` | Dois componentes: `App()` (auth/session) + `AppShell()` (authenticated shell) | `App` gerencia login, sessão, user state. `AppShell` (linha ~217) recebe user via props e gerencia sidebar, topbar, rotas — componentes SEPARADOS. `notificationCount` e `fetchNotificationCount` vivem em `AppShell` (corrigido 2026-05-30, commit `0e4b071`). | — |
| `frontend/src/tokens.css` | Tokens de design | Importado em `App.tsx`; define toda a paleta, tipografia, espaçamento | — |
| `frontend/src/index.css` | Estilos base | Importado em `main.tsx`; Tailwind directives + variáveis shadcn HSL | — |
| `frontend/src/monitoring.ts` | Setup de monitoramento | `initMonitoring()` chamado no topo de `App.tsx` antes do render | Sentry e GA são stubs — confirmar se integração real existe |

**Sequência de inicialização (confirmada):**

```
index.html
  └─ src/main.tsx (StrictMode + createRoot)
       └─ src/App.tsx
            ├─ initMonitoring()  ← chamado imediatamente no módulo
            ├─ restoreSession()  ← useEffect no boot (chama /me e /home)
            └─ render:
                 ├─ Se sessão inválida → <LoginForm> (inline em App.tsx)
                 └─ Se sessão válida → <Router> → <CompanyContext.Provider> → <AppShell>
```

**Providers globais identificados:**
- `React.StrictMode` — em `main.tsx`
- `CompanyContext.Provider` — em `App.tsx` (multi-tenant, status da empresa, papel do usuário)
- Sem outros providers globais confirmados (sem ThemeProvider, sem QueryClientProvider, sem Redux)

---

## 8. Rotas e Navegação

**Padrão encontrado:** Todas as rotas estão definidas inline em `App.tsx`, dentro de `<Routes>` no componente `AppShell`. Não existe arquivo dedicado de configuração de rotas.

| Rota | Página/Componente | Tipo | Protegida? | Layout | Observações | Ponto a validar |
|---|---|---|---|---|---|---|
| `/` | `DashboardPage` | Principal | Sim (sessão) | AppShell | Lazy — importa de `dashboard/product/ui/DashboardPage` | — |
| `/processos` | `Processes` | Lista | Sim (sessão) | AppShell | Lazy; title varia por role (ADV vs outros) | — |
| `/processos/:id` | `ProcessDetail` | Detalhe | Sim (sessão) | AppShell | Lazy; rota dinâmica | — |
| `/prazos` | `Deadlines` | Lista | Sim (sessão) | AppShell | Lazy | — |
| `/agenda` | `Agenda` | Lista | Sim (sessão) | AppShell | Lazy | — |
| `/documentos` | `Documents` | Lista | Sim (sessão) | AppShell | Lazy | — |
| `/modelos-pecas` | `PieceTemplates` | Lista | Sim (sessão) | AppShell | Lazy | — |
| `/tarefas` | `Tasks` | Lista | Sim (sessão) | AppShell | Lazy | — |
| `/atendimentos` | `Atendimentos` | Lista | Sim (sessão) | AppShell | Lazy | — |
| `/clientes` | `Clients` | Lista | Sim (sessão) | AppShell | Lazy | — |
| `/crm-juridico` | `CrmJuridico` | CRM | Sim (sessão) | AppShell (sem header de página) | Lazy; `isCrmJuridico` suprime o page-header | — |
| `/financeiro` | `Financeiro` | Financeiro | Sim (sessão) | AppShell | Lazy | — |
| `/publicacoes-intimacoes` | `Publications` | Lista | Sim (sessão) | AppShell | Lazy | — |
| `/triagem` | `Triagem` | Automação | Sim (sessão) | AppShell | Lazy | — |
| `/usuarios` | `UsersWorkspace` | Admin | Sim (sessão + role ADM) | AppShell | Não lazy; protegido por `user.role === 'ADM'`; redireciona para `/` se não ADM | — |
| `*` (fallback) | Redirect para `/` | Fallback | — | — | Qualquer rota desconhecida redireciona para home | — |
| Login | Form inline em `App.tsx` | Pré-sessão | Não | Standalone (sem AppShell) | Não tem rota própria — é o estado `!user || !home` | Considerar extração para componente dedicado |

**Rotas sem declaração explícita no Router (inferência):**
- `platform-admin/*` — código existe em `src/platform-admin/` mas não há rota declarada
- `admin/company-foundation` — código existe em `src/admin/` mas não há rota declarada

> [!warning] Módulos sem rota
> `src/platform-admin/` e `src/admin/company-foundation/` possuem componentes de tela completos mas não são roteados em `App.tsx`. Podem ser: (a) renderizados via drawer/modal a partir de outra tela, (b) rotas planejadas mas não implementadas, ou (c) módulos acessados por outro mecanismo. Ponto obrigatório para KB-005.

---

## 9. Páginas e Módulos Funcionais

| Página/Módulo | Caminho | Função provável | Status técnico aparente | Observações | Ponto a validar |
|---|---|---|---|---|---|
| Login | `App.tsx` (inline) | Autenticação do usuário | Implementado | Form embutido no `App.tsx`; sem componente dedicado | Risco: lógica de UI misturada com lógica de sessão |
| Dashboard | `src/dashboard/product/ui/DashboardPage.tsx` | Visão operacional diária | Implementado | Estrutura interna rica: containers, hooks, widgets | — |
| Processos | `src/Processes.tsx` | Gestão de processos jurídicos | Implementado | Arquivo plano na raiz de `src/` | — |
| Detalhe do Processo | `src/ProcessDetail.tsx` | Visão detalhada de um processo | Implementado | — | — |
| Prazos | `src/Deadlines.tsx` | Controle de prazos | Implementado | — | — |
| Agenda | `src/Agenda.tsx` | Agenda de compromissos | Implementado | — | — |
| Documentos | `src/Documents.tsx` | Gestão de documentos | Implementado | — | — |
| Modelos de Peças | `src/PieceTemplates.tsx` | Templates jurídicos | Implementado | — | — |
| Tarefas | `src/Tasks.tsx` | Gestão de tarefas | Implementado | — | — |
| Atendimentos | `src/Atendimentos.tsx` | Registro de atendimentos | Implementado | — | — |
| Clientes | `src/Clients.tsx` | Carteira de clientes | Implementado | — | — |
| CRM Jurídico | `src/CrmJuridico.tsx` | Leads e oportunidades | Implementado | Sem page-header no AppShell | — |
| Financeiro | `src/Financeiro.tsx` | Controle financeiro | Implementado | — | — |
| Publicações e Intimações | `src/Publications.tsx` | Monitoramento de publicações | Implementado | — | — |
| Triagem | `src/Triagem.tsx` | Triagem automatizada | Implementado | — | — |
| Usuários | `src/UsersWorkspace.tsx` | Gestão de usuários (admin) | Implementado | Apenas ADM; não lazy | — |
| Platform Admin | `src/platform-admin/` | Console de administração de plataforma | Implementado (sem rota) | 5 subpastas com telas completas | **Sem rota declarada — como é acessado?** |
| Admin — Company Foundation | `src/admin/company-foundation/` | Painel de fundação da empresa | Implementado (sem rota) | CompanyFoundationPanel.tsx | **Sem rota declarada — como é acessado?** |
| ProcessCombobox | `src/ProcessCombobox.tsx` | Combobox de seleção de processo | Componente, não página | Possui CSS próprio | — |
| ProcessDocumentModal | `src/ProcessDocumentModal.tsx` | Modal de documento de processo | Componente modal | Possui CSS próprio | — |
| ActionModal | `src/ActionModal.tsx` | Modal de ação genérica | Componente modal | Possui CSS próprio | — |

> [!note] Padrão de módulos planos
> 14 das 16 páginas funcionais são arquivos `.tsx` planos na raiz de `src/`, sem subpasta própria. Apenas `Dashboard` tem estrutura interna organizada. Isso cria uma inconsistência de organização que pode dificultar manutenção à medida que as páginas crescem.

---

## 10. Layouts e Estrutura Visual Técnica

| Layout/Estrutura | Caminho | Papel | Observações | Ponto a validar |
|---|---|---|---|---|
| **Shell da aplicação** | `App.tsx` > `<div class="app-shell">` | Container raiz da SPA | Classes CSS: `app-shell`, `sidebar-is-collapsed` | — |
| **Shell Principal (AppShell)** | `App.tsx` > `AppShell` component | Orchestrador de sidebar + topbar + conteúdo | Componente local em App.tsx; gerencia estado de sidebar aberta/colapsada | Considerar extração para arquivo próprio |
| **Sidebar** | `src/sidebar/Sidebar.tsx` | Navegação lateral | 288px aberta; 88px colapsada; fundo escuro `#0D1820` | — |
| **SidebarNav** | `src/sidebar/SidebarNav.tsx` | Links de navegação categorizados | Seções: OPERAÇÃO, CRM, GESTÃO; 14 itens de navegação | — |
| **SidebarBrand** | `src/sidebar/SidebarBrand.tsx` | Logo da marca na sidebar | — | — |
| **SidebarFooter** | `src/sidebar/SidebarFooter.tsx` | Rodapé da sidebar | Provavelmente user info + logout | — |
| **Topbar** | `src/topbar/Topbar.tsx` | Barra superior da aplicação | 64px de altura; hamburguer + notificações + atalhos + user menu | — |
| **TopbarActions** | `src/topbar/TopbarActions.tsx` | Ações da topbar | — | — |
| **TopbarSearch** | `src/topbar/TopbarSearch.tsx` | Busca global (topbar) | Presença sugerida pelo arquivo; funcionalidade a confirmar | Confirmar se busca está implementada |
| **NotificationsDropdown** | `src/topbar/NotificationsDropdown.tsx` | Dropdown de notificações | Integrado com API `/notifications` | — |
| **ShortcutsLauncher** | `src/topbar/ShortcutsLauncher.tsx` | Lançador de atalhos | — | — |
| **TopbarUserMenu** | `src/topbar/TopbarUserMenu.tsx` | Menu do usuário | Logout, perfil, etc. | — |
| **Page Header (AppShell)** | `App.tsx` > `<header class="page-header-shell">` | Cabeçalho de página com título, subtítulo e badge | Metadata via `getPageMeta(pathname, role)` | CRM Jurídico suprime o header |
| **Shell Content Canvas** | `App.tsx` > `<section class="shell-content-canvas">` | Container de conteúdo das páginas | Envolve todas as rotas | — |
| **AccessStateBanner** | `src/components/access-state/AccessStateBanner.tsx` | Banner de estado de acesso da empresa | Exibido acima do conteúdo quando status != active | — |
| **ReadOnlyModeSurface** | `src/components/read-only/ReadOnlyModeSurface.tsx` | Wrapper de modo somente leitura | Envolve o `shell-content-canvas` | — |
| **DashboardShell** | `src/dashboard/layout/DashboardShell.tsx` | Shell interno do dashboard | Componente de layout do módulo dashboard | Verificar se duplica AppShell ou é composição |
| **PageHeader (dashboard)** | `src/dashboard/layout/PageHeader.tsx` | Cabeçalho de página (versão dashboard) | **Possível duplicidade** com `page-header-shell` do AppShell | Confirmar relação — KB-005 |
| **SidebarNav (dashboard)** | `src/dashboard/layout/SidebarNav.tsx` | Navegação sidebar (versão dashboard) | **Possível duplicidade** com `src/sidebar/SidebarNav.tsx` | Confirmar se são usados em contextos diferentes |
| **TopbarGlobal (dashboard)** | `src/dashboard/layout/TopbarGlobal.tsx` | Topbar global (versão dashboard) | **Possível duplicidade** com `src/topbar/Topbar.tsx` | Confirmar relação — pode ser código morto |
| **Auth screen** | `App.tsx` > `<div class="auth-screen">` | Tela de login standalone | Sem AppShell; inclui vídeo de background | — |

> [!warning] Duplicidade suspeita em layouts do dashboard
> `src/dashboard/layout/` contém `DashboardShell.tsx`, `PageHeader.tsx`, `SidebarNav.tsx` e `TopbarGlobal.tsx`. Estes podem ser versões alternativas/em desenvolvimento paralelo dos componentes em `src/sidebar/`, `src/topbar/` e no `AppShell` do `App.tsx`, ou podem ser versões de uma refatoração em andamento. É necessário verificar no KB-005 se estes componentes são realmente usados.

---

## 11. Componentes Compartilhados

### Componentes Base (shadcn-like) — `src/components/ui/`

| Componente | Caminho | Categoria | Reutilização aparente | Observações | Ponto a validar |
|---|---|---|---|---|---|
| `Badge` | `components/ui/Badge.tsx` | Badge/etiqueta | Alta | Padrão visual shadcn-like; mecânica de variantes a validar (CVA vs CSS classes `ui-badge--*`) | Ver seção 24 — contradição identificada |
| `Button` | `components/ui/Button.tsx` | Botão | Alta | Padrão visual shadcn-like; mecânica de variantes a validar (CVA vs CSS classes `ui-button--*`) | Ver seção 24 — contradição identificada |
| `Dialog` | `components/ui/Dialog.tsx` | Modal/dialog | Alta | Wrapper Radix Dialog | — |
| `DropdownMenu` | `components/ui/DropdownMenu.tsx` | Menu dropdown | Alta | Wrapper Radix DropdownMenu | — |
| `Input` | `components/ui/Input.tsx` | Input de formulário | Alta | — | — |
| `Popover` | `components/ui/Popover.tsx` | Popover flutuante | Alta | Wrapper Radix Popover | — |
| `ScrollArea` | `components/ui/ScrollArea.tsx` | Área de scroll | Alta | Wrapper Radix ScrollArea | — |
| `Select` | `components/ui/Select.tsx` | Select dropdown | Alta | Wrapper Radix Select | — |
| `Separator` | `components/ui/Separator.tsx` | Separador visual | Alta | Wrapper Radix Separator | — |
| `Sheet` | `components/ui/Sheet.tsx` | Painel lateral deslizante | Alta | Wrapper Radix Dialog como sheet | — |
| `Tabs` | `components/ui/Tabs.tsx` | Tabs/abas | Alta | Wrapper Radix Tabs | — |
| `Textarea` | `components/ui/Textarea.tsx` | Textarea | Média | — | — |
| `Tooltip` | `components/ui/Tooltip.tsx` | Tooltip | Alta | Wrapper Radix Tooltip | — |
| `styles.css` | `components/ui/styles.css` | Estilos dos componentes UI | — | CSS específico dos UI primitivos | — |
| `index.ts` | `components/ui/index.ts` | Barrel exports | — | Exporta todos os componentes ui | — |

### Componentes de Produto — `src/components/product/`

| Componente | Caminho | Categoria | Observações |
|---|---|---|---|
| `DrawerSection` | `components/product/DrawerSection.tsx` | Layout drawer | — |
| `EmptyState` | `components/product/EmptyState.tsx` | Estado vazio | — |
| `ExecutiveCard` | `components/product/ExecutiveCard.tsx` | Card executivo/resumo | — |
| `FilterBar` | `components/product/FilterBar.tsx` | Barra de filtros | — |
| `KanbanColumn` | `components/product/KanbanColumn.tsx` | Coluna Kanban | — |
| `KpiCard` | `components/product/KpiCard.tsx` | Card de KPI | **Possível duplicidade** com `dashboard/widgets/KpiCard.tsx` |
| `MetricCard` | `components/product/MetricCard.tsx` | Card de métrica | — |
| `OpportunityCard` | `components/product/OpportunityCard.tsx` | Card de oportunidade CRM | — |
| `PageHeader` | `components/product/PageHeader.tsx` | Cabeçalho de página | **Possível 3ª instância** — ver também `dashboard/layout/PageHeader.tsx` e AppShell |
| `PriorityBadge` | `components/product/PriorityBadge.tsx` | Badge de prioridade | — |
| `StatusPill` | `components/product/StatusPill.tsx` | Pill de status | — |
| `Timeline` | `components/product/Timeline.tsx` | Timeline de eventos | — |

### Componentes de Domínio

| Componente | Caminho | Categoria | Observações |
|---|---|---|---|
| `AccessStateBanner` | `components/access-state/AccessStateBanner.tsx` | Feedback de status | Banner de aviso de empresa suspensa/read-only |
| `MutationGuardNotice` | `components/auth/MutationGuardNotice.tsx` | Auth/autorização | Aviso de bloqueio de mutação |
| `ReadOnlyModeSurface` | `components/read-only/ReadOnlyModeSurface.tsx` | Read-only wrapper | Envolve conteúdo em modo somente leitura |
| `ClientPortalPanel` | `components/clients/ClientPortalPanel.tsx` | Portal do cliente | — |
| `ClientCommunicationPanel` | `components/communication/ClientCommunicationPanel.tsx` | Comunicação com cliente | — |
| `CompanyStatusPanel` | `components/company-status/CompanyStatusPanel.tsx` | Status da empresa | — |
| `CompanyStatusBadge` | `components/company/CompanyStatusBadge.tsx` | Badge de status | — |
| `CrmOriginSummary` | `components/crm/CrmOriginSummary.tsx` | Resumo de origem CRM | — |
| `FinanceDelinquencyCard` | `components/finance/FinanceDelinquencyCard.tsx` | Card de inadimplência | — |
| `FinanceInstallmentPlanCard` | `components/finance/FinanceInstallmentPlanCard.tsx` | Card de plano de parcelas | — |
| `FinanceMetricCard` | `components/finance/FinanceMetricCard.tsx` | Card de métrica financeira | — |
| `PermissionsMatrix` | `components/permissions/PermissionsMatrix.tsx` | Matriz de permissões | — |
| `OriginBadgeRow` | `components/audit/OriginBadgeRow.tsx` | Badge de origem (audit) | — |
| `OriginInsightPanel` | `components/audit/OriginInsightPanel.tsx` | Painel de insights de origem | — |
| `PublicationSignalSplitPanel` | `components/publications/PublicationSignalSplitPanel.tsx` | Split panel de publicações | — |
| `PipelineTimeline` | `components/timeline/PipelineTimeline.tsx` | Timeline do pipeline | — |
| `TeamAssignmentsPanel` | `components/team/TeamAssignmentsPanel.tsx` | Painel de atribuições de equipe | — |
| `PlatformTenantBadge` | `components/platform/PlatformTenantBadge.tsx` | Badge de tenant de plataforma | — |
| `PlatformBillingPanel` | `components/platform-billing/PlatformBillingPanel.tsx` | Painel de billing da plataforma | — |

### Dashboard — Widgets e Containers

| Componente | Caminho | Categoria | Observações |
|---|---|---|---|
| `DashboardPage` | `dashboard/product/ui/DashboardPage.tsx` | Página principal do dashboard | — |
| `DashboardContainer` | `dashboard/containers/DashboardContainer.tsx` | Container do dashboard | — |
| `AnalyticsContainer` | `dashboard/containers/AnalyticsContainer.tsx` | Container de analytics | — |
| `ContextRailContainer` | `dashboard/containers/ContextRailContainer.tsx` | Container do rail de contexto | — |
| `OperationalQueueContainer` | `dashboard/containers/OperationalQueueContainer.tsx` | Container da fila operacional | — |
| `SupportLayerContainer` | `dashboard/containers/SupportLayerContainer.tsx` | Container da camada de suporte | — |
| `KpiStrip` | `dashboard/widgets/KpiStrip.tsx` | Strip de KPIs | — |
| `KpiCard` | `dashboard/widgets/KpiCard.tsx` | Card de KPI | **Duplicidade** com `components/product/KpiCard.tsx` |
| `CriticalAlertsWidget` | `dashboard/widgets/CriticalAlertsWidget.tsx` | Widget de alertas críticos | — |
| `TodayAgendaWidget` | `dashboard/widgets/TodayAgendaWidget.tsx` | Widget de agenda do dia | — |
| `RecentCasesWidget` | `dashboard/widgets/RecentCasesWidget.tsx` | Widget de casos recentes | — |
| `RecentMovementsWidget` | `dashboard/widgets/RecentMovementsWidget.tsx` | Widget de movimentos recentes | — |
| `MissingDocumentsWidget` | `dashboard/widgets/MissingDocumentsWidget.tsx` | Widget de documentos faltantes | — |
| `LatestPublicationsWidget` | `dashboard/widgets/LatestPublicationsWidget.tsx` | Widget de últimas publicações | — |
| `ResponsibilityQueueTable` | `dashboard/widgets/ResponsibilityQueueTable.tsx` | Tabela de fila de responsabilidade | — |
| `CasesByPhaseChart` | `dashboard/widgets/CasesByPhaseChart.tsx` | Gráfico de casos por fase | — |
| `TasksByStatusChart` | `dashboard/widgets/TasksByStatusChart.tsx` | Gráfico de tarefas por status | — |
| `ActionCard` | `dashboard/widgets/ActionCard.tsx` | Card de ação | — |
| `ActionTile` | `dashboard/widgets/ActionTile.tsx` | Tile de ação | — |
| `AgendaTimelineItem` | `dashboard/widgets/AgendaTimelineItem.tsx` | Item de timeline de agenda | — |
| `EmptyState` | `dashboard/widgets/EmptyState.tsx` | Estado vazio | **Duplicidade** com `components/product/EmptyState.tsx` |
| `SectionCard` | `dashboard/widgets/SectionCard.tsx` | Card de seção | — |
| `RailWidgetItem` | `dashboard/widgets/RailWidgetItem.tsx` | Item do rail de widget | — |

---

## 12. Hooks, Services, Clients e Estado

| Item | Caminho | Tipo | Papel | Risco | Ponto a validar |
|---|---|---|---|---|---|
| `api` (objeto) | `src/api.ts` | Cliente HTTP + tipos | Único cliente de API; todos os endpoints mapeados | **Arquivo único de ~2000 linhas** — monólito de API | Considerar divisão por domínio (KB-006) |
| `apiClient()` | `src/api.ts` | Função fetch | Wrapper de `fetch` com `credentials: 'include'` | Sem interceptors de retry ou refresh de token | Confirmar comportamento com token expirado |
| `CompanyContext` | `src/session/company-context.ts` | React Context | Estado global de empresa, status, role | — | — |
| `useCompanyContext()` | `src/session/company-context.ts` | Custom hook | Lê CompanyContext | — | — |
| `useDashboardHomeData` | `src/dashboard/hooks/useDashboardHomeData.ts` | Custom hook | Dados do dashboard | — | — |
| `useContextFeed` | `src/dashboard/hooks/useContextFeed.ts` | Custom hook | Feed de contexto do dashboard | — | — |
| `useKpiActions` | `src/dashboard/hooks/useKpiActions.ts` | Custom hook | Ações dos KPIs | — | — |
| `useOperationalFilters` | `src/dashboard/hooks/useOperationalFilters.ts` | Custom hook | Filtros operacionais | — | — |
| `canMutate()` | `src/auth/user-access.ts` | Função de autorização | Verifica se mutação é permitida (status empresa + tipo usuário + role) | — | — |
| `assertCanMutate()` | `src/auth/user-access.ts` | Guard de mutação | Lança erro se mutação bloqueada | — | — |
| `isMutationBlockedByStatus()` | `src/platform/access.ts` | Função utilitária | Verifica status de bloqueio | — | — |
| `initMonitoring()` | `src/monitoring.ts` | Setup | Inicializa Sentry + GA (stubs) | Sentry e GA são condicionais; podem não estar ativos | — |
| `trackEvent()`, `trackPageView()` | `src/monitoring.ts` | Analytics | Rastreamento de eventos e page views | Sem tracking se GA não configurado | — |
| `cn()` | `src/lib/cn.ts` | Utilitário | Merge de classes Tailwind | — | — |
| Estado de sessão | `src/App.tsx` | useState | `user`, `home`, `users`, `permissions`, `sessionContextMeta`, `error`, `isLoading` | **Estado de sessão no componente raiz** — App.tsx gerencia toda a autenticação | Considerar extração para hook/context dedicado |
| `checklistTemplates.ts` | `src/checklistTemplates.ts` | Dados estáticos | Templates de checklist | Arquivo solto na raiz de `src/` — fora dos padrões | Confirmar uso e mover para subpasta adequada |
| `company-status/model.ts` | `src/company-status/model.ts` | Modelo | Modelo de status da empresa | Possível duplicidade com `platform/access.ts` | Confirmar se são usados no mesmo contexto |

**Padrão de autenticação confirmado:**
- Sessão via **HTTP cookies** (`credentials: 'include'` em todos os requests)
- Sem JWT em `localStorage` ou `sessionStorage`
- Restauração de sessão no boot: `GET /me` → `GET /home`
- Sem mecanismo de refresh automático de token identificado

---

## 13. Tipos, Modelos e Contratos no Frontend

> [!note] Escopo parcial
> Esta seção mapeia os tipos disponíveis. Comparação profunda com contratos JSON do backend será feita no KB-003D.

| Tipo/arquivo | Caminho | Papel | Relação com API | Risco | Ponto a validar |
|---|---|---|---|---|---|
| `ApiUser` | `src/api.ts` | Tipo de usuário base | GET /users, /me | — | — |
| `ApiProcess`, `ApiProcessLookup` | `src/api.ts` | Processo jurídico | GET /processes | — | — |
| `ApiClient`, `ApiClientPortal`, etc. | `src/api.ts` | Cliente e portal | GET /clients | — | — |
| `ApiAttendance` | `src/api.ts` | Atendimento | GET /attendances | — | — |
| `ApiTask` | `src/api.ts` | Tarefa | GET /tasks | — | — |
| `ApiDeadline` | `src/api.ts` | Prazo | GET /deadlines | — | — |
| `ApiDocument` | `src/api.ts` | Documento | GET /documents | — | — |
| `ApiPublication`, `ApiPublicationCapture`, etc. | `src/api.ts` | Publicações e pipeline | GET /publications | — | — |
| `ApiTemplate`, `ApiTemplateVersion` | `src/api.ts` | Templates de peças | GET /templates | — | — |
| `ApiTriageItem`, `ApiTriageJob`, `ApiTriageDecision` | `src/api.ts` | Triagem automática | GET /triage | — | — |
| `ApiCrmLead`, `ApiCrmOpportunity`, etc. | `src/api.ts` | CRM Jurídico | GET /crm/leads, /crm/opportunities | — | — |
| `ApiFinanceEntry`, `ApiFinanceCharge`, etc. | `src/api.ts` | Módulo financeiro | GET /finance/entries | Modelo rico com ~10 tipos finance | Validar contra schema Prisma no KB-003D |
| `ApiAgendaEvent` | `src/api.ts` | Eventos de agenda | GET /agenda | — | — |
| `ApiAuditEvent`, `ApiAuthzDecision` | `src/api.ts` | Auditoria e autorização | GET /attendances/:id/audit, /authz/check | — | — |
| `ApiPlatformAdminCompany`, `ApiPlatformAdminMembership`, etc. | `src/api.ts` | Admin de plataforma | GET /platform/companies | — | — |
| `CompanyContextState`, `UserRole`, `UserType` | `src/session/company-context.ts` | Contexto de sessão | Derivado do `/me` response | — | — |
| `CompanyStatus` | `src/platform/access.ts` | Status da empresa | Derivado do `/me` response | — | — |
| `MutationAccessResult` | `src/auth/user-access.ts` | Resultado de autorização | — | — | — |
| `PlatformBillingSummary` | `src/platform-billing/types.ts` | Resumo de billing | A confirmar | — | — |
| Tipos em `src/components/deadlines/types.ts` | `src/components/deadlines/` | Tipos de prazos | Podem replicar `ApiDeadline` | Possível duplicidade | Verificar se são subtipos ou cópias |
| Tipos em `src/dashboard/types.ts` | `src/dashboard/` | Tipos do dashboard | — | — | — |
| Tipos em `src/company-status/model.ts` | `src/company-status/` | Modelo de status | Possível sobreposição com `platform/access.ts` | — | — |

> [!warning] Concentração de tipos
> Todos os tipos de API estão em um único arquivo `src/api.ts` (~2000 linhas). Esta concentração facilita descoberta, mas torna o arquivo muito grande. À medida que o produto crescer, pode ser necessário dividir por domínio.

---

## 14. Estilos, Tokens e Design System Técnico

### Sistema de Tokens (`tokens.css`)

| Arquivo/padrão | Tipo | Papel | Risco | Ponto a validar |
|---|---|---|---|---|
| `src/tokens.css` | CSS custom properties | Sistema completo de tokens: paleta brand/neutral/semântica, tipografia, espaçamento (4px base), breakpoints, border radius, sombras, tokens funcionais (alias), tokens sidebar | Baixo | Fonte de tokens principal do projeto |
| `src/index.css` | CSS Tailwind + variáveis HSL | Tailwind base/components/utilities + variáveis shadcn-style em formato HSL (`:root`) | **Médio** | **Dois sistemas coexistentes**: tokens.css usa hex/pixel; index.css usa HSL via `hsl(var(--x))` |
| `tailwind.config.ts` | Config Tailwind | Mapeia cores Tailwind para variáveis HSL de `index.css`; border radius e shadow-card; IBM Plex Sans | Médio | IBM Plex Sans declarada mas import não confirmado |
| `src/App.css` | CSS do shell | Layout do app-shell, sidebar, topbar, page-header, auth-screen | Baixo | — |
| `src/sidebar/sidebar.css` | CSS da sidebar | Estilos específicos da sidebar | Baixo | Tokens de sidebar já definidos em tokens.css — verificar sobreposição |
| `src/topbar/topbar.css` | CSS da topbar | Estilos específicos da topbar | Baixo | — |
| `src/components/ui/styles.css` | CSS dos componentes UI | Estilos dos primitivos shadcn | Baixo | — |
| CSS por página (ex: `Processes.css`) | CSS de módulo | Estilos específicos por página/módulo | Médio | 14+ arquivos CSS individuais — sem convenção clara (CSS Modules vs CSS global?) |
| `src/components/access-state/access-state.css` | CSS componente | Estilos do AccessStateBanner | Baixo | — |
| `src/components/read-only/read-only.css` | CSS componente | Estilos do ReadOnlyModeSurface | Baixo | — |
| `src/components/crm/crm-origin-summary.css` | CSS componente | Estilos do CrmOriginSummary | Baixo | — |
| `src/components/clients/ClientPortalPanel.css` | CSS componente | Estilos do ClientPortalPanel | Baixo | — |
| `src/components/communication/ClientCommunicationPanel.css` | CSS componente | — | Baixo | — |
| `src/components/publications/publication-split-view.css` | CSS componente | Estilos do PublicationSignalSplitPanel | Baixo | — |
| `src/components/audit/origin-insight.css` | CSS componente | — | Baixo | — |
| Tailwind classes (`flex`, `gap-4`, `text-sm`, etc.) | Classes utilitárias | Usadas diretamente nos componentes | Baixo | Coexistem com classes CSS custom — não há conflito evidente |
| CVA (`class-variance-authority`) | Lib de variantes | Gerencia variantes de componentes Button, Badge, etc. | Baixo | Usado nos componentes ui/ |
| `clsx` + `tailwind-merge` via `cn()` | Utilitário | Merge seguro de classes Tailwind | Baixo | — |
| Radix UI (9 primitivos) | Componentes | Primitivos acessíveis; sem estilos próprios | Baixo | Estilização via Tailwind nos wrappers |
| Lucide React | Ícones | Ícones SVG vetoriais | Baixo | — |

> [!warning] Risco de Conflito de Tokens
> O projeto mantém **dois sistemas de variáveis CSS coexistentes**:
> 1. **`tokens.css`**: variáveis com prefixo `--brand-*`, `--neutral-*`, `--space-*`, etc. em hex/pixel
> 2. **`index.css`**: variáveis shadcn-style `--primary`, `--background`, etc. em HSL para uso com Tailwind
>
> Esta dualidade pode criar inconsistências quando componentes shadcn usam variáveis HSL enquanto componentes customizados usam as variáveis hex de `tokens.css`. A auditoria visual profunda e a resolução deste conflito devem ser tratadas no KB-006.

---

## 15. Acessibilidade Técnica Preliminar

> [!note] Escopo parcial
> Esta seção identifica apenas riscos técnicos preliminares visíveis na leitura de código. Auditoria WCAG completa será feita no KB-005.

| Item/Componente | Risco preliminar | Evidência | Impacto | Deve ir para KB-005? |
|---|---|---|---|---|
| **Form de Login** | Bom uso de ARIA | `aria-required`, `aria-describedby`, `aria-invalid`, `role="alert"`, `aria-live="assertive"` em `App.tsx` | Baixo | Registrar como padrão a manter |
| **Botão de submit** | `aria-busy` durante loading | `aria-busy={isLoading}` no botão de entrar | Baixo | — |
| **Vídeo de background** | `aria-hidden="true"` | `aria-hidden` no `<video>` e no overlay | Baixo | — |
| **Radix UI** | Acessibilidade embutida | Todos os primitivos Radix têm suporte a teclado e ARIA | Baixo | Verificar implementação customizada |
| **Credenciais de teste hardcoded** | Risco de segurança + usabilidade | `<details>` visível no DOM com senhas de teste em plain text | **Alto** | **Sim** — deve ser removido em produção |
| **Tela de login** | Sem `<main>` semântico | Layout usa `<div class="auth-screen">` e `<div class="auth-panel">` | Médio | Sim |
| **AppShell** | `<main class="shell-main">` | Uso correto de `<main>` para o conteúdo principal | Baixo | — |
| **`<h1>` no page-header** | H1 presente e contextual | Título de página muda por rota via `getPageMeta()` | Baixo | — |
| **Sidebar links** | Verificar `aria-current` para item ativo | Não confirmado na leitura | Médio | Sim |
| **Notificações** | Possível live region ausente | Dropdown de notificações não analisado em detalhe | Médio | Sim |
| **`notificationCount: 3` hardcoded** | Valor hardcoded na prop | `notificationCount={3}` em `App.tsx:309` | Médio | Sim — ou verificar se é calculado dinâmico |
| **Modais/Dialog** | Radix Dialog tem foco management | Desde que implementado corretamente | Baixo | Validar implementação customizada |
| **Contraste de cores** | Não avaliado nesta etapa | sidebar bg: `#0D1820`; texto: rgba(255,255,255,0.62) | Médio | **Sim — KB-005 e KB-006** |
| **Dark mode** | Configurado mas não confirmado ativo | `tailwind.config.ts` define `darkMode: ['class']` | Médio | Confirmar se tema dark está implementado |

---

## 16. Assets e Mídia

| Asset/local | Tipo | Uso provável | Observações | Ponto a validar |
|---|---|---|---|---|
| `public/favicon.svg` | SVG | Favicon da aplicação | — | — |
| `public/favicon.ico` | ICO | Favicon fallback | — | — |
| `public/favicon-16x16.png`, `favicon-32x32.png`, `favicon-48x48.png` | PNG | Favicons em múltiplos tamanhos | — | — |
| `public/android-chrome-192x192.png`, `android-chrome-512x512.png` | PNG | PWA icons Android | — | — |
| `public/apple-touch-icon.png` | PNG | PWA icon iOS | — | — |
| `public/icons.svg` | SVG | Sprite de ícones | Pode ser sprite unificado | Confirmar uso |
| `public/lexora-logo.svg` | SVG | Logo principal Lexora | Usado na tela de login (`<img src="/lexora-logo.svg">`) | — |
| `public/lexora_icon_white.svg` | SVG | Ícone Lexora branco | Uso em sidebar ou topbar provável | — |
| `public/lexora_logo_white.svg` | SVG | Logo Lexora branco | Uso em sidebar | — |
| `public/fundo_login.mp4` | MP4 | Vídeo de background da tela de login | Usado em `App.tsx` como `<video>` autoplay, muted, loop | Verificar se está commitado ou em `.gitignore` |
| `src/assets/hero.png` | PNG | Imagem hero | Uso provável em página ou componente específico | Confirmar onde é usado |
| `src/assets/react.svg` | SVG | Legado template Vite | Não deve estar em produção | **Remover** |
| `src/assets/vite.svg` | SVG | Legado template Vite | Não deve estar em produção | **Remover** |
| `frontend/dashboard-screenshot-desktop.png` | PNG | Screenshot de UX solto | Artefato histórico; no `.gitignore` | Arquivar |
| `lexora_brand_package/` (raiz) | Pasta | Pacote de identidade visual da marca | Mencionado no KB-003A; SVG, PNG, favicon | Documentar no KB-006 |

> [!note] Vídeo de login
> `public/fundo_login.mp4` está no `.gitignore` da raiz do repositório conforme KB-003A. Precisa confirmar se está sendo servido via CDN ou copiado manualmente para o servidor. Se estiver ausente no deploy, a tela de login exibirá sem background animado.

---

## 17. Testes e Evidências do Frontend

| Item | Tipo | Papel | Deve permanecer como artefato técnico? | Observações | Ponto a validar |
|---|---|---|---|---|---|
| `admin.company-foundation.smoke.test.ts` | Playwright E2E | Teste da fundação de empresa (admin) | Sim (artefato técnico) | Na raiz de `frontend/` | — |
| `admin.users.smoke.test.ts` | Playwright E2E | Teste de usuários admin | Sim | Na raiz; incluído no script `test:smoke` | — |
| `adv.screens.interactions.test.ts` | Playwright E2E | Interações do advogado | Sim | Na raiz | — |
| `adv.screens.smoke.test.ts` | Playwright E2E | Telas do advogado | Sim | Na raiz; incluído no script `test:smoke` | — |
| `clients.communication.smoke.test.ts` | Playwright E2E | Comunicação com clientes | Sim | Na raiz; incluído no script `test:smoke` | — |
| `dashboard.interactive.test.ts` | Playwright E2E | Interações do dashboard | Sim | Na raiz | — |
| `epic-cde.smoke.test.ts` | Playwright E2E | Smoke test do epic CDE | Sim | Na raiz; provavelmente o mesmo rodado no CI | — |
| `epic-ij.smoke.test.ts` | Playwright E2E | Smoke test do epic IJ | Sim | Na raiz | — |
| `financeiro.smoke.test.ts` | Playwright E2E | Financeiro | Sim | Na raiz; incluído no script `test:smoke` | — |
| `foundation.auth.company.smoke.test.ts` | Playwright E2E | Auth e fundação de empresa | Sim | Na raiz | — |
| `platform-admin.smoke.test.ts` | Playwright E2E | Admin de plataforma | Sim | Na raiz | — |
| `publication-origin-rework.smoke.test.ts` | Playwright E2E | Rework de origem de publicações | Sim | Na raiz | — |
| `test-topbar-visual.ts` | Playwright visual | Teste visual do topbar | Sim | Na raiz; gerou `test-screenshots/` | — |
| `src/auth/user-access.test.ts` | Teste unitário | Teste de `user-access.ts` | Sim | Em `src/auth/` — único teste unitário encontrado | — |
| `frontend/test-results/` | Artefatos Playwright | Resultados de execução | Sim (técnico) | No `.gitignore`; não commitado | — |
| `frontend/test-screenshots/` (8 PNGs) | Screenshots visuais | Evidências do teste visual do topbar | Sim (evidência) | 01-dashboard a 08-mobile — estados do topbar | Referenciar em KB-003E |
| `frontend/PLAYWRIGHT_INTERACTIVE_RESULTS.md` | Relatório legado | Resultado de sessão de 02/04/2026 | Não (legado) | Identificado no KB-002 como legado | — |

> [!note] Organização dos testes
> Todos os arquivos de teste Playwright estão na raiz de `frontend/`, misturados com arquivos de configuração. Não existe uma pasta `tests/` ou `e2e/` dedicada. O script `test:smoke` executa apenas 4 dos ~12 arquivos disponíveis. Ponto a aprofundar no KB-003E.

---

## 18. Riscos Técnicos do Frontend

### Alta Prioridade

**RF-001 — ✅ Divergência documental resolvida: frontend usa React 19.2.4**
- Evidência: `frontend/package.json` declara `react@^19.2.4`, `react-dom@^19.2.4`, `@types/react@^19.2.14`, `react-router-dom@^7.13.2`
- Resolução: KB-003A foi atualizado via UPDATE-KB-003A-003B (2026-05-29) para registrar React 19.2.4 como stack real. O KB-003A citava React 18 por inferência — o erro foi corrigido na fonte primária.
- Impacto residual: React 19 é versão de ponta — `useEffectEvent` (usado em App.tsx) é API experimental/RC; compatibilidade com dependências menores deve ser monitorada.
- Recomendação: Não tratar React 19 como dúvida aberta. Acompanhar riscos de estabilidade/compatibilidade de React 19, Vite 8 e libs associadas ao longo do desenvolvimento.
- Próximo passo: Confirmar compatibilidade de Radix UI e demais libs com React 19 (pode ser candidato ao backlog como validação de baixa urgência).

**RF-002 — Módulos platform-admin e admin sem rota declarada**
- Evidência: Pastas `src/platform-admin/` e `src/admin/company-foundation/` com componentes de tela completos não aparecem em nenhuma `<Route>` em `App.tsx`
- Impacto: Desconhecido — pode ser: funcionalidade inacessível, renderizada via drawer/modal, ou código morto
- Recomendação: Mapear como esses módulos são acessados; documentar no KB-005
- Próximo passo: KB-005 deve investigar fluxo de navegação para platform-admin

**RF-003 — Credenciais de teste hardcoded na tela de login**
- Evidência: `App.tsx:631-636` — `<details>` com credenciais em plain text no DOM
- Impacto: Segurança (exposição de credenciais de teste); UX (visível para usuários finais se existirem em produção)
- Recomendação: Remover antes do deploy para produção real; condicionar ao ambiente de desenvolvimento
- Próximo passo: Adicionar ao backlog como correção de segurança/UX

**RF-004 — `notificationCount` hardcoded**
- Evidência: `App.tsx:309` — `notificationCount={3}` passado para `<Topbar>` como valor fixo
- Impacto: Contagem de notificações sempre exibe "3" independente do estado real
- Recomendação: Integrar com `api.getNotificationCount()` que já existe em `api.ts`
- Próximo passo: Adicionar ao backlog

**RF-005 — Dois sistemas de design tokens coexistentes**
- Evidência: `tokens.css` (hex/pixel) + `index.css` (HSL shadcn) + `tailwind.config.ts` (mapeando para HSL)
- Impacto: Inconsistência visual potencial; componentes shadcn usam tokens diferentes dos componentes customizados
- Recomendação: Unificar sistema de tokens no KB-006; definir fonte autoritativa
- Próximo passo: KB-006 — Design System e Constituição Visual

### Média Prioridade

**RF-006 — Vite 8.0.1 (versão muito recente)**
- Evidência: `package.json` — `vite@^8.0.1`
- Impacto: Versão de ponta pode ter instabilidades ou quebrar plugins existentes
- Recomendação: Monitorar changelog e issues do Vite 8; considerar pinnar versão específica
- Próximo passo: Avaliar após testes de CI

**RF-007 — Lógica de sessão e login embutidos em App.tsx**
- Evidência: `App.tsx` contém estado de sessão, form de login, lógica de restauração de sessão e shell da aplicação em ~680 linhas
- Impacto: Arquivo muito responsável; dificulta testes unitários; acoplamento alto
- Recomendação: Extrair LoginPage, SessionProvider e AppShell para arquivos dedicados
- Próximo passo: Candidato a backlog (refatoração média complexidade)

**RF-008 — `api.ts` é um monólito de ~2000 linhas**
- Evidência: Único arquivo com todos os tipos de API e todos os métodos de todos os domínios
- Impacto: Arquivo difícil de navegar; qualquer mudança de API exige edição neste arquivo
- Recomendação: Considerar divisão por domínio no futuro (finance, clients, processes, etc.)
- Próximo passo: Candidato a backlog (refatoração baixa urgência)

**RF-009 — Duplicidades de componentes**
- Evidência: `KpiCard` existe em `dashboard/widgets/` e em `components/product/`; `EmptyState` existe nos dois lugares; `PageHeader` existe em `components/product/`, `dashboard/layout/` e como elemento inline no AppShell; `SidebarNav` existe em `src/sidebar/` e `src/dashboard/layout/`
- Impacto: Inconsistência visual e comportamental; mudanças precisam ser feitas em múltiplos lugares
- Recomendação: Mapear uso real de cada instância no KB-005 e consolidar no KB-006
- Próximo passo: KB-005

**RF-010 — Assets legados de template Vite**
- Evidência: `src/assets/react.svg` e `src/assets/vite.svg`
- Impacto: Baixo; polui o diretório de assets
- Recomendação: Remover; confirmar que não são referenciados

**RF-011 — `fundo_login.mp4` no `.gitignore`**
- Evidência: KB-003A confirma `media/` no `.gitignore`; `public/fundo_login.mp4` existe localmente
- Impacto: Vídeo de background do login pode não existir no servidor de produção
- Recomendação: Confirmar estratégia de deploy do asset de vídeo

**RF-012 — IBM Plex Sans declarada em Tailwind mas import não confirmado**
- Evidência: `tailwind.config.ts` declara `fontFamily.sans: ['"IBM Plex Sans"', ...]` mas não foi encontrado `<link>` para Google Fonts ou `@import` em CSS
- Impacto: Sistema cairá para Segoe UI; possível inconsistência visual planejada vs entregue
- Recomendação: Confirmar se IBM Plex Sans está carregada e como

### Baixa Prioridade

**RF-013 — Testes Playwright na raiz de `frontend/` sem estrutura de pasta**
- Evidência: 12+ arquivos `.test.ts` e `.smoke.test.ts` na raiz junto com `package.json`, `vite.config.ts` etc.
- Impacto: Organização; dificuldade de encontrar testes
- Recomendação: Mover para `frontend/tests/` ou `frontend/e2e/` em momento oportuno

**RF-014 — `checklistTemplates.ts` solto na raiz de `src/`**
- Evidência: `src/checklistTemplates.ts` sem subpasta organizada
- Impacto: Baixo; organização
- Recomendação: Mover para subpasta adequada (`src/data/` ou domínio específico)

**RF-015 — `company-status/model.ts` vs `platform/access.ts` (possível sobreposição)**
- Evidência: Ambos lidam com status da empresa
- Impacto: Baixo; potencial duplicidade de lógica
- Recomendação: Verificar e consolidar

---

## 19. Divergências e Incertezas

| Divergência/Incerteza | Evidência | Impacto | Recomendação | Prioridade |
|---|---|---|---|---|
| ~~React 18 (KB-003A) vs React 19.2.4 (package.json)~~ → **Divergência documental resolvida** | KB-003A registrava React 18 por inferência; `frontend/package.json` confirma React 19.2.4 | Médio — stack real divergia da documentação | KB-003A corrigido via UPDATE-KB-003A-003B (2026-05-29). Manter React 19.2.4 como stack real do frontend e acompanhar riscos de compatibilidade. | Resolvido |
| `platform-admin/` e `admin/` sem rota no Router | Ausência em App.tsx; presença em src/ | Alto — funcionalidade pode ser inacessível ou incompreendida | Investigar mecanismo de acesso no KB-005 | P1 |
| `notificationCount={3}` hardcoded | App.tsx:309 | Médio — dados incorretos exibidos ao usuário | Integrar com `api.getNotificationCount()` | P1 |
| Credenciais hardcoded na tela de login | App.tsx:631-636 | Alto (segurança) | Remover ou condicionar ao ambiente dev | P0 |
| Dois sistemas de tokens CSS coexistentes | tokens.css (hex) + index.css (HSL) | Médio | Unificar no KB-006 | P2 |
| IBM Plex Sans declarada mas import não confirmado | tailwind.config.ts vs ausência de link/import | Médio | Verificar e confirmar comportamento em prod | P2 |
| `frontend/.env.staging.example` não mencionado no KB-003A | Arquivo encontrado na leitura direta | Baixo | Documentar e ler conteúdo | P3 |
| `fundo_login.mp4` está em `public/` mas `.gitignore` exclui `media/` | KB-003A confirma media no .gitignore; arquivo presente localmente em public/ | Médio | Confirmar se está sendo commitado via public/ ou sendo ignorado | P1 |
| Vite 8 (mais recente que o esperado) | package.json | Baixo | Monitorar estabilidade | P3 |
| `dashboard/layout/SidebarNav.tsx` + `src/sidebar/SidebarNav.tsx` | Dois arquivos com mesmo nome em contextos diferentes | Médio — possível duplicidade | Investigar qual é o ativo no KB-005 | P2 |
| `frontend/vercel.json` ainda existe no repositório | Arquivo presente; confirmado como inativo | Baixo (ambiguidade) | Ver BL-005 no backlog | P2 |
| `useEffectEvent` usado em App.tsx | React API experimental/RC | Médio | Confirmar se está estabilizada no React 19 | P2 |
| Mecânica de variantes de Button e Badge: CVA vs CSS classes | Seção 11 citava "Padrão CVA"; seção 24 confirma "Classes CSS customizadas (`ui-button--*`, `ui-badge--*`) sem CVA" | Médio — leitura direta de arquivos é necessária para confirmar | Validar por leitura direta de `Button.tsx` e `Badge.tsx` antes do KB-006 — **Button e Badge seguem padrão visual shadcn-like, mas a mecânica real de variantes deve ser validada antes de declarar CVA como fato** | P2 |

---

## 20. Recomendações Iniciais

### Arquitetura Frontend

- Extrair componente `LoginPage` de `App.tsx` para arquivo dedicado
- Extrair `SessionProvider` (estado de sessão, login, logout, restoreSession) de `App.tsx`
- Extrair `AppShell` de `App.tsx` para arquivo dedicado
- Investigar e documentar como `platform-admin/` e `admin/` são acessados
- Definir convenção de organização de páginas: manter padrão plano (atual) ou migrar para subpastas

### Rotas e Módulos

- Documentar rotas de `platform-admin` e `admin` ou removê-las se código morto
- Verificar se `platform-admin` precisa de rotas protegidas por papel `PLATFORM_ADMIN`

### Componentes

- Resolver duplicidades: `KpiCard`, `EmptyState`, `PageHeader`, `SidebarNav`
- Investigar componentes em `dashboard/layout/` (DashboardShell, TopbarGlobal, SidebarNav, PageHeader) — verificar se são código ativo, morto ou refatoração em andamento
- Remover assets de template Vite: `src/assets/react.svg` e `src/assets/vite.svg`

### Estilos e Tokens

- Definir fonte autoritativa de tokens: `tokens.css` (hex) ou `index.css` (HSL shadcn)?
- Mapear quais componentes usam qual sistema de tokens
- Confirmar estratégia de importação de IBM Plex Sans
- Auditar uso de Tailwind vs CSS custom properties por módulo

### Acessibilidade Técnica

- Remover ou condicionar credenciais hardcoded da tela de login (risco de segurança)
- Verificar `aria-current` na navegação da sidebar para item ativo
- Avaliar contraste da sidebar (texto rgba(255,255,255,0.62) sobre fundo escuro) no KB-005
- Confirmar se dark mode está implementado ou apenas configurado

### Estado e Services

- Integrar `notificationCount` com `api.getNotificationCount()` em vez de valor hardcoded
- Avaliar divisão de `api.ts` por domínio conforme o projeto crescer
- Documentar comportamento com token de sessão expirado (sem refresh automático identificado)

### Testes e Evidências

- Criar pasta `frontend/e2e/` ou `frontend/tests/` e mover testes para ela
- Documentar política de quais smoke tests fazem parte do CI vs. são execuções manuais
- Referenciar `test-screenshots/` como evidência em KB-003E

### Documentação

- ~~Atualizar KB-003A para corrigir versão do React (19, não 18)~~ → **Concluído** via UPDATE-KB-003A-003B (2026-05-29): KB-003A atualizado para refletir React 19.2.4, React DOM 19.2.4, React Router DOM 7.13.2, Vite 8.x e TypeScript ~5.9.3.
- Documentar variável de ambiente `.env.staging.example`
- Criar política de env vars por ambiente (dev, staging, prod)

### Componentização futura

> [!warning] Regra de escopo
> O KB-003B identifica oportunidades de componentização, mas **não cria, altera nem refatora componentes**. A criação de novos componentes reutilizáveis só deve ocorrer após validação no KB-006 ou em etapa IMPLEMENT aprovada.

**Componentes bons candidatos à padronização:**
- `StatusPill` e `PriorityBadge` — bom padrão de composição; candidatos a entrar formalmente no Design System como "variantes semânticas de Badge"
- `FilterBar` — padrão repetido em múltiplas telas; hoje mistura Tailwind com classes CSS customizadas (`filterbar-*`) — candidato a padronização
- `Timeline` (product) — componente genérico limpo; candidato ao Design System
- `DrawerSection` — padrão recorrente em drawers de detalhe; candidato ao Design System
- `EmptyState` — existe em dois lugares com implementações divergentes; deve ser unificado antes de entrar no Design System

**Componentes que precisam ser avaliados antes de qualquer padronização:**
- `KpiCard` (product) vs `KpiCard` (dashboard): implementações completamente diferentes para o mesmo conceito — avaliar no KB-005 qual serve de base
- `PageHeader` (product) vs inline no AppShell vs `dashboard/layout/PageHeader.tsx`: três instâncias — avaliar no KB-005 qual é o padrão real em uso
- `MetricCard` vs `KpiCard` (product): sobreposição de conceito — ambos exibem label+valor+ícone

**Padrões duplicados que podem virar componentes reutilizáveis:**
- Cards de detalhe de entidade (processo, prazo, atendimento, cliente): provavelmente têm estrutura parecida inline em cada página — a confirmar no KB-005
- Tabelas/listas de itens com filtro: padrão recorrente em Processos, Prazos, Tarefas, Documentos — candidatos a componentes de lista genérica
- Badges de status e prioridade: presentes em múltiplos módulos; padronizar via `StatusPill` e `PriorityBadge` depois do KB-006

**Riscos de criar componentes cedo demais:**
- Sem Constituição Visual (KB-006), qualquer componente "oficial" criado agora pode precisar ser reescrito ao definir tokens, tipografia e estilos canônicos
- O projeto ainda tem dois sistemas de tokens (tokens.css hex + index.css HSL) — criar componentes que dependam de tokens antes de unificar o sistema gera acoplamento indesejado

**Dependências com KB-005 e KB-006:**
- KB-005 deve mapear quais instâncias de componentes duplicados são realmente usadas e em quais telas
- KB-006 deve definir o sistema de tokens oficial e as variações canônicas de botões, inputs, badges e cards
- Somente após KB-006 é recomendável criar uma etapa IMPLEMENT de componentização formal

### Candidatos a Backlog

| Candidato a backlog | Prioridade sugerida | Tipo | Área | Dependência | Observação |
|---|---|---|---|---|---|
| Remover credenciais de teste hardcoded da tela de login | P0 | Correção de segurança | Frontend — Auth | Nenhuma | `App.tsx:631-636`; risco em produção |
| Integrar `notificationCount` com API real | P1 | Correção técnica | Frontend — Topbar | Nenhuma | `App.tsx:309`; `api.getNotificationCount()` já existe |
| Investigar e documentar acesso a `platform-admin/` e `admin/` | P1 | Documentação/Validação | Frontend — Arquitetura | KB-005 | Módulos sem rota declarada |
| Confirmar compatibilidade de dependências com React 19 | P1 | Validação | Frontend — Stack | Nenhuma | React 19.2.4 confirmado |
| Confirmar estratégia de deploy de `fundo_login.mp4` | P1 | Validação | Frontend — Assets | Nenhuma | Arquivo em `.gitignore` mas usado em prod |
| Confirmar IBM Plex Sans — import ausente | P2 | Validação | Frontend — Design System | KB-006 | Possível fallback não intencional |
| Resolver duplicidades de componentes (KpiCard, EmptyState, PageHeader, SidebarNav) | P2 | Refatoração | Frontend — Componentes | KB-005 | Aprofundar uso no KB-005 antes de consolidar |
| Unificar sistema de tokens CSS (tokens.css vs index.css HSL) | P2 | Design System | Frontend — Estilos | KB-006 | Decisão arquitetural de design system |
| Extrair LoginPage de App.tsx | P2 | Refatoração | Frontend — Arquitetura | Nenhuma | Melhoria de organização e testabilidade |
| Extrair SessionProvider de App.tsx | P2 | Refatoração | Frontend — Arquitetura | Nenhuma | Melhoria de organização |
| Mover testes para pasta `e2e/` ou `tests/` | P3 | Organização | Frontend — Testes | KB-003E | Organização estrutural |
| Remover `src/assets/react.svg` e `vite.svg` | P3 | Limpeza | Frontend — Assets | Nenhuma | Assets de template Vite sem uso |
| Dividir `api.ts` por domínio | P3 | Refatoração | Frontend — API Client | — | Baixa urgência; crescimento futuro |
| Mapear uso real de KpiCard, EmptyState e PageHeader após KB-005 | P2 | Validação/Componentização | Frontend — Componentes | KB-005 | Antes de consolidar, confirmar qual instância é usada em cada contexto |
| Unificar EmptyState em único componente | P2 | Refatoração | Frontend — Componentes | KB-005, KB-006 | Dois arquivos divergentes — unificar após KB-006 definir o padrão visual |
| Avaliar FilterBar como componente oficial do Design System | P2 | Design System | Frontend — Filtros | KB-006 | Padrão repetido; mistura Tailwind + CSS customizado — limpar antes de promover |
| Promover StatusPill e PriorityBadge ao Design System | P3 | Design System | Frontend — Badges | KB-006 | Bom padrão de composição; aguardar Constituição Visual |
| Criar etapa IMPLEMENT de componentização base | P3 | Implementação | Frontend — Design System | KB-006 | Criar apenas após KB-006 definir tokens e variações canônicas |

---

## 21. Relação com Próximas Fases

| Próxima fase | Como este documento alimenta |
|---|---|
| **KB-003C — Backend e APIs Estado Atual** | Os endpoints mapeados em `api.ts` devem ser validados contra as rotas reais do backend; tipos TypeScript devem ser comparados com DTOs do backend |
| **KB-003D — Dados, Prisma e Contratos** | Os tipos `ApiFinanceEntry`, `ApiProcess`, `ApiClient` etc. de `api.ts` devem ser comparados com o schema Prisma e os contratos JSON de `contracts/` |
| **KB-003E — Testes, QA e Evidências** | Testes Playwright do frontend (12+ arquivos), `test-screenshots/` e `src/auth/user-access.test.ts` devem ser inventariados |
| **KB-004 — Product Discovery** | O mapeamento de rotas e módulos funcionais fornece a lista de funcionalidades implementadas para descoberta de produto |
| **KB-005 — Inventário Funcional e UX/UI** | Este KB fornece a lista exata de telas, padrões de layout e componentes para análise de UX; os módulos sem rota (`platform-admin`, `admin`) precisam ser investigados; duplicidades de componentes devem ser resolvidas |
| **KB-006 — Design System e Constituição Visual** | `tokens.css`, `index.css`, `tailwind.config.ts`, `components.json`, todos os CSS de componente e a dualidade de sistemas de tokens são a base para a constituição visual |

---

## 22. Limitações desta Etapa

> [!note] O que o KB-003B NÃO faz

- **Não faz redesign** — apenas inventaria o estado atual
- **Não valida experiência visual profundamente** — reservado para KB-005
- **Não executa testes** — apenas mapeia a existência e estrutura dos testes
- **Não altera código** — leitura somente
- **Não valida backend** — endpoints e contratos serão validados no KB-003C e KB-003D
- **Não resolve divergências** — apenas registra; resolução requer decisão do usuário
- **Não atualiza backlog** — lista candidatos mas não os insere no `BACKLOG_GERAL_LEXORA_CURRENT.md`
- **Não substitui Product Discovery** — KB-004 tratará personas, jornadas e requisitos funcionais
- **Não leu o conteúdo interno** de cada página funcional (Processes.tsx, Financeiro.tsx etc.) — apenas estrutura e importações
- **Não confirmou** se IBM Plex Sans está carregada em produção
- **Não leu** `frontend/.env.staging.example`

---

## 23. Validação Final

| Item validado | Resultado |
|---|---|
| Vault oficial existe | Sim |
| `00_START_HERE.md` encontrado | Sim |
| `KB_002` encontrado | Sim |
| `KB_003A` encontrado | Sim |
| `BACKLOG_GERAL_LEXORA_CURRENT.md` encontrado | Sim |
| KB-003B criado no caminho correto | Sim |
| Apenas o KB-003B foi criado | Sim |
| Algum arquivo existente foi sobrescrito | Não |
| Algum código foi alterado | Não |
| Alguma configuração foi alterada | Não |
| Algum script foi executado | Não |
| Algum pacote foi instalado | Não |
| Alguma pasta `.obsidian` foi alterada | Não |

### Arquivo criado

- `05 - Frontend/KB_003B_FRONTEND_ESTADO_ATUAL_CURRENT_2026-05-29.md`

### Arquivos consultados (lidos diretamente)

- `!_lexora-memory-docs/00_START_HERE.md`
- `!_lexora-memory-docs/01 - Knowledge Base/KB_002_GOVERNANCA_DOCUMENTAL_OFICIAL_CURRENT_2026-05-29.md`
- `!_lexora-memory-docs/03 - Arquitetura/KB_003A_ESTRUTURA_GERAL_E_CONFIGURACOES_CURRENT_2026-05-29.md`
- `!_lexora-memory-docs/13 - Backlog/BACKLOG_GERAL_LEXORA_CURRENT.md`
- `frontend/package.json`
- `frontend/vite.config.ts`
- `frontend/components.json`
- `frontend/tailwind.config.ts`
- `frontend/src/main.tsx`
- `frontend/src/App.tsx`
- `frontend/src/api.ts`
- `frontend/src/tokens.css`
- `frontend/src/index.css`
- `frontend/src/session/company-context.ts`
- `frontend/src/platform/access.ts`
- `frontend/src/auth/user-access.ts`
- `frontend/src/monitoring.ts`
- `frontend/src/lib/cn.ts`
- `frontend/src/sidebar/SidebarNav.tsx` (parcial)
- `frontend/src/platform-billing/types.ts`

### Pastas analisadas

- `frontend/` (raiz completa, 3 níveis)
- `frontend/src/` (3 níveis completos)
- `frontend/src/components/ui/`
- `frontend/src/components/` (exceto ui)
- `frontend/src/dashboard/`
- `frontend/src/platform-admin/`
- `frontend/src/admin/`
- `frontend/src/sidebar/`
- `frontend/src/topbar/`
- `frontend/public/`
- `frontend/test-screenshots/`

### Skills usadas e em qual fase

| Fase | Skill | Uso efetivo |
|---|---|---|
| Fase 1 — Preparação | `obsidian:obsidian-cli` | Verificação de existência do KB-003B e do vault |
| Fase 1 — Preparação | `init` | Orientação de estrutura de projeto (substituído por leitura direta) |
| Fase 2 — Mapeamento | Leitura direta de arquivos | Principal método de análise |
| Fase 4 — Produção | `obsidian:obsidian-markdown` | Orientação de estrutura Markdown para o documento |

> [!note] Sobre as skills do fluxo obrigatório
> As fases 2 e 3 do fluxo prescrevem skills específicas (`vercel:react-best-practices`, `vercel:shadcn`, `design:design-system`, etc.). A análise foi realizada com leitura direta dos arquivos reais do projeto, que é a fonte primária de verdade conforme a hierarquia de confiança do KB-002. As skills citadas foram usadas como referência conceitual durante a análise, não como agentes externos.

### Principais riscos identificados

1. **RF-003** — Credenciais hardcoded na tela de login (segurança — P0)
2. **RF-001** — React 19 não documentado; diverge do KB-003A (stack — P1)
3. **RF-002** — Módulos platform-admin e admin sem rota declarada (arquitetura — P1)
4. **RF-004** — `notificationCount` hardcoded em 3 (dados — P1)
5. **RF-005** — Dois sistemas de tokens CSS coexistentes (design system — P2)
6. **RF-007** — Login e sessão embutidos em App.tsx (manutenibilidade — P2)
7. **RF-009** — Duplicidades de componentes (KpiCard, EmptyState, PageHeader, SidebarNav) (arquitetura — P2)

### Candidatos a backlog identificados

18 candidatos novos listados na seção 20 — nenhum foi inserido no backlog nesta etapa (aguarda aprovação do usuário).

### Pontos que precisam de validação do usuário

1. **Como `platform-admin/` é acessado?** — Módulo sem rota declarada
2. **`notificationCount={3}` é intencional?** — Provável não; integrar com API
3. **Credenciais hardcoded na tela de login são removidas em produção?**
4. **IBM Plex Sans está sendo carregada?** — Import não encontrado
5. **`fundo_login.mp4` — qual estratégia de deploy?** — Arquivo em `.gitignore`
6. **Sistema de tokens primário: `tokens.css` ou `index.css` (HSL)?** — Decisão de design system
7. **Candidatos a backlog desta seção 20 devem ser aprovados e inseridos no `BACKLOG_GERAL_LEXORA_CURRENT.md`?**
8. ~~KB-003A deve ser atualizado para corrigir a versão do React (18 → 19)?~~ → **Concluído** via UPDATE-KB-003A-003B. Acompanhar riscos de compatibilidade da stack recente: React 19.2.4, Vite 8.x, TypeScript ~5.9.3 e React Router DOM 7.13.2.

---

---

## 24. Componentes Reutilizáveis e Oportunidades de Componentização

> [!warning] Regra de escopo obrigatória
> O KB-003B **identifica** oportunidades de componentização, mas **não cria, altera nem refatora componentes**. A criação de novos componentes reutilizáveis só deve ocorrer após validação no KB-006 (Design System e Constituição Visual) ou em etapa IMPLEMENT explicitamente aprovada pelo usuário.

---

### 24.1 Análise de Componentes Reutilizáveis e Padrões Repetidos

**Contexto técnico confirmado pela leitura de código:**

O frontend possui **dois universos de componentes** com abordagens de estilo distintas, sem ponte formal entre eles:

| Universo | Pasta | Abordagem de estilo | Padrão de props | Observação |
|---|---|---|---|---|
| **UI Primitivos** | `src/components/ui/` | Classes CSS customizadas (`ui-button--*`, `ui-badge--*`) | Extensão de HTMLAttributes | Wrappers Radix; sem CVA — diferente do shadcn padrão |
| **Componentes de Produto** | `src/components/product/` | Tailwind CSS puro via `cn()` | Extensão de HTMLAttributes | `productSurfaceBase` como token string; barrel export |
| **Widgets do Dashboard** | `src/dashboard/widgets/` | Classes CSS customizadas (`metric-card`, `empty-state`, etc.) | Props acopladas aos tipos do dashboard | Sem Tailwind direto; usa `dashboard/types.ts` |

Esta divisão cria **três abordagens de CSS coexistentes** no mesmo projeto, o que é a raiz estrutural das duplicidades identificadas.

---

### 24.2 Mapeamento de Padrões e Oportunidades

| Padrão/Componente | Onde aparece | Já existe componente reutilizável? | Potencial de componentização | Risco atual | Recomendação futura |
|---|---|---|---|---|---|
| **Botão/Ação** | `components/ui/Button.tsx`; inline em App.tsx (`.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-destructive`) | Sim — `Button.tsx` com variantes, mas CSS classes não Tailwind | Médio | Coexistência de `<Button>` e classes CSS diretas em App.tsx e tokens.css — padrão duplicado | Avaliar no KB-006 Design System |
| **Badge/Etiqueta** | `components/ui/Badge.tsx`; `components/product/StatusPill.tsx`; `components/product/PriorityBadge.tsx` | Sim — `Badge` base + `StatusPill` + `PriorityBadge` como composições | Alto | Três camadas de badge; `StatusPill` e `PriorityBadge` são boas composições mas ainda não são "oficiais" | Promover para KB-006 como candidatos ao Design System |
| **Card de KPI/Métrica** | `components/product/KpiCard.tsx`; `components/product/MetricCard.tsx`; `dashboard/widgets/KpiCard.tsx` | Sim (3 instâncias) | Alto | **Duplicidade técnica confirmada**: `KpiCard` (product) = Tailwind+genérico; `KpiCard` (dashboard) = CSS classes+tipado; `MetricCard` = simplificação do KpiCard (product) | Avaliar no KB-005 qual é o padrão vigente; consolidar no KB-006 |
| **Estado vazio (Empty State)** | `components/product/EmptyState.tsx`; `dashboard/widgets/EmptyState.tsx` | Sim (2 instâncias divergentes) | Alto | Interfaces diferentes: `product/EmptyState` usa `actionLabel+onAction`; `dashboard/EmptyState` usa `action?: ReactNode`; uma é Tailwind, outra é CSS class | Unificar após KB-006; `product/EmptyState` é o padrão mais flexível |
| **Cabeçalho de página** | `components/product/PageHeader.tsx`; `dashboard/layout/PageHeader.tsx`; `App.tsx` (inline `page-header-shell`) | Sim (3 instâncias com abordagens diferentes) | Alto | `product/PageHeader` usa Tailwind+`<h1>`; AppShell usa CSS custom; `dashboard/layout/PageHeader` não verificado — pode ser outra variação | Avaliar no KB-005; unificar no KB-006 |
| **Barra de filtros/busca** | `components/product/FilterBar.tsx` | Sim — `FilterBar.tsx` | Alto | Mistura Tailwind com classes CSS customizadas (`filterbar-*`); padrão provavelmente repetido inline nas páginas | Avaliar no KB-006; limpar inconsistência interna antes de promover |
| **Timeline de eventos** | `components/product/Timeline.tsx`; `components/timeline/PipelineTimeline.tsx` | Sim (2 instâncias) | Médio | `product/Timeline` é genérica; `PipelineTimeline` é específica para pipeline | `product/Timeline` é candidato ao Design System; `PipelineTimeline` pode compor a base |
| **Seção de drawer** | `components/product/DrawerSection.tsx` | Sim | Médio | Componente limpo com `title`, `description`, `Separator` e `children` | Candidato ao Design System após KB-006 |
| **Tabela/lista de responsabilidade** | `dashboard/widgets/ResponsibilityQueueTable.tsx` | Sim (específico) | Médio | Componente acoplado ao dashboard; padrão de tabela com filtro provavelmente repetido em outras telas | Avaliar generalização no KB-005 |
| **Card de Kanban** | `components/product/KanbanColumn.tsx` | Sim | Médio | Apenas uma instância confirmada | Avaliar se é usado no CRM ou em outras telas (KB-005) |
| **Card de oportunidade** | `components/product/OpportunityCard.tsx` | Sim | Médio | Específico para CRM | Avaliar generalização para outros contextos no KB-005 |
| **Card executivo/resumo** | `components/product/ExecutiveCard.tsx` | Sim | Médio | — | Avaliar no KB-005 |
| **Banner de estado de acesso** | `components/access-state/AccessStateBanner.tsx` | Sim | Baixo | Específico para status da empresa | Manter como está — escopo definido |
| **Superfície de modo read-only** | `components/read-only/ReadOnlyModeSurface.tsx` | Sim | Baixo | Wrapper de autorização | Manter como está |
| **Aviso de guard de mutação** | `components/auth/MutationGuardNotice.tsx` | Sim | Baixo | Específico para autorização | Manter como está |
| **Separador visual** | `components/ui/Separator.tsx` | Sim | Baixo | Primitivo Radix; uso amplo | Manter como está |
| **Scroll Area** | `components/ui/ScrollArea.tsx` | Sim | Baixo | Primitivo Radix | Manter como está |
| **Dialog/Sheet** | `components/ui/Dialog.tsx`; `components/ui/Sheet.tsx` | Sim | Baixo | Primitivos Radix | Manter como está; confirmar que não há reimplementação manual de modais nas páginas |
| **Tabs** | `components/ui/Tabs.tsx` | Sim | Baixo | Primitivo Radix | Confirmar que não há tabs inline nas páginas (KB-005) |
| **Input/Textarea** | `components/ui/Input.tsx`; `components/ui/Textarea.tsx` | Sim | Médio | Componentes de formulário básicos presentes; mas o form de login em `App.tsx` usa `<input>` HTML nativo sem o componente `Input` | Avaliar consistência no KB-005 |
| **Select** | `components/ui/Select.tsx` | Sim | Médio | Primitivo Radix presente | Confirmar se é usado nos formulários das páginas ou se há selects nativos inline (KB-005) |
| **Tooltip** | `components/ui/Tooltip.tsx` | Sim | Baixo | Primitivo Radix | — |
| **Gráficos** | `dashboard/widgets/CasesByPhaseChart.tsx`; `dashboard/widgets/TasksByStatusChart.tsx` | Sim (2, específicos do dashboard) | Baixo | Sem biblioteca de gráficos declarada em `package.json` — implementação a confirmar | Verificar se são SVG/CSS ou usam biblioteca externa não mapeada |
| **Painel de portal do cliente** | `components/clients/ClientPortalPanel.tsx` | Sim | Baixo | Específico de domínio | Manter como está |
| **Painel de comunicação** | `components/communication/ClientCommunicationPanel.tsx` | Sim | Baixo | Específico de domínio | Manter como está |
| **Painel de billing** | `components/platform-billing/PlatformBillingPanel.tsx` | Sim | Baixo | Específico de plataforma | Manter como está |
| **`productSurfaceBase` (string token)** | `components/product/KpiCard.tsx`; `components/product/MetricCard.tsx` | Sim (string exportada) | Médio | Token de superfície como string TypeScript em vez de variável CSS ou classe Tailwind nomeada | Avaliar no KB-006 — candidato a token oficial |

---

### 24.3 Componentes Candidatos ao Futuro Design System

| Candidato | Tipo | Evidência no código | Motivo para virar componente oficial | Dependência |
|---|---|---|---|---|
| `Button` | Botão/Ação | `components/ui/Button.tsx` | Já existe; precisa de variantes claras e alinhamento com tokens; substituir classes CSS por Tailwind ou CVA | KB-006 |
| `Badge` | Badge/Tag | `components/ui/Badge.tsx` | Já existe como base; `StatusPill` e `PriorityBadge` são composições que merecem promoção | KB-006 |
| `StatusPill` | Feedback/Status | `components/product/StatusPill.tsx` | Padrão semântico (positive/warning/critical/neutral/info) bem definido; boa composição sobre Badge | KB-006 |
| `PriorityBadge` | Badge/Tag | `components/product/PriorityBadge.tsx` | Padrão de prioridade (low/medium/high/urgent) com ícones; coerente com domínio jurídico | KB-006 |
| `KpiCard` (unificado) | Dashboard/KPI | `components/product/KpiCard.tsx` + `dashboard/widgets/KpiCard.tsx` | Conceito central do dashboard; precisa de implementação única e flexível | KB-005 (escolher base), KB-006 (padronizar) |
| `EmptyState` (unificado) | Empty State | `components/product/EmptyState.tsx` + `dashboard/widgets/EmptyState.tsx` | Padrão visual recorrente; `product/EmptyState` é mais flexível e deve ser a base | KB-006 |
| `PageHeader` (unificado) | Layout | `components/product/PageHeader.tsx` + instâncias inline | Cabeçalho de página é estrutura universal do produto | KB-005 (mapear uso), KB-006 (padronizar) |
| `FilterBar` | Filtro/Busca | `components/product/FilterBar.tsx` | Padrão de busca+filtros provavelmente recorrente nas telas de lista | KB-006 (após limpar inconsistência) |
| `Timeline` | Dashboard/KPI | `components/product/Timeline.tsx` | Componente de linha do tempo genérico e limpo; presente em múltiplos domínios | KB-006 |
| `DrawerSection` | Layout | `components/product/DrawerSection.tsx` | Padrão recorrente em drawers de detalhe (processo, cliente, atendimento) | KB-006 |
| `Input` | Formulário | `components/ui/Input.tsx` | Presente mas não usado no form de login (usa `<input>` nativo) — precisar de adoção consistente | KB-006 + KB-005 |
| `Select` | Formulário | `components/ui/Select.tsx` | Primitivo Radix presente; confirmar adoção nas páginas | KB-005 |
| `Dialog` / `Sheet` | Modal/Dialog | `components/ui/Dialog.tsx`; `components/ui/Sheet.tsx` | Primitivos Radix; confirmar se são usados nas páginas ou se há modais customizados inline | KB-005 |
| `MetricCard` | Card | `components/product/MetricCard.tsx` | Simplificação do KpiCard; avaliar fusão ou manutenção separada | KB-006 |
| `productSurfaceBase` | Card | `components/product/styles.ts` | Token de superfície como string; candidato a variável CSS ou classe Tailwind nomeada no Design System | KB-006 |

---

### 24.4 Riscos de Componentização Prematura

| Risco | Descrição | Impacto | Como mitigar |
|---|---|---|---|
| **Tokens não unificados** | Criar componentes agora significa escolher entre dois sistemas (tokens.css hex vs index.css HSL) — qualquer escolha será arbitrária | Médio — componentes criados agora podem precisar de reescrita após KB-006 | Aguardar KB-006 antes de criar componentes novos |
| **Duplicidades não resolvidas** | `KpiCard`, `EmptyState`, `PageHeader` — criar um "componente oficial" sem saber qual instância é realmente usada pode gerar uma terceira instância | Alto — aumenta a dívida técnica | Mapear uso no KB-005 antes de consolidar |
| **Abordagem de CSS indefinida** | O projeto usa CSS classes (ui-*), Tailwind e CSS custom properties — sem decisão sobre qual é o padrão, novos componentes perpetuam a inconsistência | Médio | Definir estratégia no KB-006 |
| **`Button` com CSS classes em vez de CVA** | O `Button` atual usa classes `ui-button--variant` em vez de CVA — diferente do shadcn padrão | Baixo | Avaliar migração para CVA no KB-006 sem urgência |
| **Sem Storybook ou catálogo** | Sem catálogo de componentes, é difícil garantir consistência entre quem implementa diferentes telas | Médio | Avaliar criação de catálogo após KB-006 |

---

*Criado em: 2026-05-29 | Status: current | Vault: !_lexora-memory-docs*
*Fonte: Claude Code — leitura direta de arquivos e estruturas do projeto*
*Baseado em: [[00_START_HERE]], [[KB_002_GOVERNANCA_DOCUMENTAL_OFICIAL_CURRENT_2026-05-29]], [[KB_003A_ESTRUTURA_GERAL_E_CONFIGURACOES_CURRENT_2026-05-29]], [[BACKLOG_GERAL_LEXORA_CURRENT]]*
