---
tipo: knowledge-base
status: current
projeto: lexora
fase: kb-004
data_criacao: 2026-06-09
ultima_atualizacao: 2026-06-09
fonte: claude-code
baseado_em:
  - "frontend/src/App.tsx"
  - "frontend/src/sidebar/SidebarNav.tsx"
  - "frontend/src/Processes.tsx"
  - "frontend/src/Tasks.tsx"
  - "frontend/src/Atendimentos.tsx"
  - "frontend/src/Triagem.tsx"
  - "frontend/src/CrmJuridico.tsx"
  - "frontend/src/Financeiro.tsx"
  - "frontend/src/platform-admin/*"
  - "backend/src/roles/roles.ts"
  - "backend/src/permissions/matrix.ts"
escopo: product-discovery
vault_oficial: "!_lexora-memory-docs"
---

# KB-004 — Product Discovery: Inventário Funcional do Lexora

> **Fonte de verdade:** código actual em `frontend/src/`. Documentação criada por leitura directa — não derivada de specs ou roadmaps antigos.

---

## 1. O que é o Lexora

**Lexora** é um SaaS jurídico multi-tenant para escritórios de advocacia. Centraliza a operação jurídica diária (processos, prazos, tarefas, documentos), automação de publicações/intimações, gestão de clientes, CRM jurídico e financeiro — com camada de IA determinística sobre os dados operacionais.

---

## 2. Perfis de Utilizador (Roles)

### 2.1 Roles activas no sistema (canônicas)

| Role canônica | Legacy (BD/seed) | Label no frontend | Contexto |
|---|---|---|---|
| `company_admin` | `ADM` | Administrador | Tenant |
| `lawyer` | `ADV` | Advogado | Tenant |
| `company_finance` | `FIN` | Financeiro | Tenant |
| `assistant` | `ATD` | Atendimento | Tenant |
| `manager` | — | (sem label definido) | Tenant |
| `platform_admin` | — | — | Platform |
| `platform_billing` | — | — | Platform |
| `platform_support` | — | — | Platform |

> O frontend usa exclusivamente as legacy roles (`ADM`, `ADV`, `FIN`, `ATD`) para lógica de acesso. As roles canônicas são usadas no backend via `resolveRole()`. O perfil `manager` não tem equivalente legacy nem label no frontend.

### 2.2 Diferenças de acesso visíveis no frontend

| Comportamento | ADM | ADV | FIN | ATD |
|---|---|---|---|---|
| `/processos` label | "Processos" | "Meus Processos" | "Processos" | "Processos" |
| `/usuarios` visível | ✅ | ❌ | ❌ | ❌ |
| `/financeiro` acessível | ✅ | sem restrição visível | ✅ | sem restrição visível |
| Secção GESTÃO > Usuários | ✅ (adicionado dinamicamente) | ❌ | ❌ | ❌ |

> **Nota:** O controlo de acesso no frontend é maioritariamente por ocultação de item na sidebar ou redirect. Não existe um guard centralizado por rota para todos os módulos — apenas `/usuarios` tem `element={user.role === 'ADM' ? ... : <Navigate to="/" />}`.

---

## 3. Estrutura de Navegação

### 3.1 Sidebar — Secções e itens

```
OPERAÇÃO
  ├── Home          →  /
  ├── Processos     →  /processos
  ├── Tarefas       →  /tarefas
  ├── Prazos        →  /prazos
  ├── Agenda        →  /agenda
  ├── Documentos    →  /documentos
  ├── Modelos       →  /modelos-pecas
  ├── Publicações   →  /publicacoes-intimacoes
  ├── Triagem       →  /triagem
  └── Atendimentos  →  /atendimentos

CRM
  ├── Clientes      →  /clientes
  └── CRM Jurídico  →  /crm-juridico

GESTÃO
  ├── Usuários      →  /usuarios          [só ADM]
  └── Financeiro    →  /financeiro

SUPORTE
  ├── Ajuda         →  (evento tracking)
  └── Configurações →  (evento tracking)
```

### 3.2 Rotas declaradas no Router (`App.tsx`)

| Rota | Componente | Acesso |
|---|---|---|
| `/` | `Dashboard` | todos |
| `/processos` | `Processes` | todos |
| `/processos/:id` | `ProcessDetail` | todos |
| `/prazos` | `Deadlines` | todos |
| `/agenda` | `Agenda` | todos |
| `/documentos` | `Documents` | todos |
| `/modelos-pecas` | `PieceTemplates` | todos |
| `/tarefas` | `Tasks` | todos |
| `/atendimentos` | `Atendimentos` | todos |
| `/clientes` | `Clients` | todos |
| `/crm-juridico` | `CrmJuridico` | todos |
| `/financeiro` | `Financeiro` | todos (sem guard) |
| `/publicacoes-intimacoes` | `Publications` | todos |
| `/triagem` | `Triagem` | todos |
| `/usuarios` | `UsersList` | ADM (guard activo) |
| `*` | redirect `/` | — |

> **Risco activo (BL-022):** Os módulos `platform-admin/` e `admin/` existem como componentes mas não têm rota declarada no Router principal — inacessíveis via navegação normal.

---

## 4. Inventário Funcional por Módulo

### 4.1 Dashboard (`/`)
**Badge:** Dashboard | **Label:** Meu Dia

Ponto de entrada após login. Adaptado ao role do utilizador.

- **KPI Strip** — métricas de topo (prazos críticos, tarefas pendentes, etc.)
- **Painel de responsabilidades** — fila operacional do dia
- **Próxima Melhor Acção** — sugestão contextual com tom visual
- **Quick Drawer** — painel lateral rápido com secções de acção

Widgets do `DashboardContainer`:
- `TodayAgendaWidget` — agenda do dia
- `RecentMovementsWidget` — movimentos recentes
- `CriticalAlertsWidget` — alertas críticos
- `RecentCasesWidget` — casos recentes
- `LatestPublicationsWidget` — últimas publicações
- `MissingDocumentsWidget` — documentos em falta
- `TasksByStatusChart` — gráfico de tarefas por status
- `CasesByPhaseChart` — gráfico de casos por fase
- `ResponsibilityQueueTable` — fila de responsabilidade

---

### 4.2 Processos (`/processos`)
**Badge:** Operação

Lista e gestão de processos jurídicos da carteira.

**Modos de visualização:**
- `table` — tabela de processos
- `kanban` — quadro kanban por fase

**Funcionalidades:**
- Filtros por status, responsável, fase, urgência
- Criação de novo processo
- Exportação
- Upload de documentos (`ProcessDocumentModal`)
- Acesso a detalhe do processo (`/processos/:id`)
- Combobox de processo (`ProcessCombobox`)

**Detalhe do Processo (`/processos/:id`) — `ProcessDetail`:**
- Timeline do caso (`PipelineTimeline`)
- Secções: documentos, tarefas, prazos, atendimentos, publicações
- `ClientPortalPanel` — painel de portal do cliente
- `ClientCommunicationPanel` — comunicação com cliente
- `TeamAssignmentsPanel` — atribuições de equipa
- Acções rápidas operacionais

---

### 4.3 Tarefas (`/tarefas`)
**Badge:** Operação

**Modos de visualização:**
- `lista` — lista ordenável
- `kanban` — quadro por status

**Funcionalidades:**
- Filtros, ordenação
- Criação de tarefa
- Delegação e reatribuição
- `ActionModal` — modal de acção rápida

---

### 4.4 Prazos (`/prazos`)
**Badge:** Operação

Controlo de prazos processuais e administrativos. Componente: `Deadlines`.

---

### 4.5 Agenda (`/agenda`)
**Badge:** Operação

Visão temporal de compromissos, audiências e prazos. Componente: `Agenda`.
Widget relacionado: `AgendaTimelineItem`.

---

### 4.6 Documentos (`/documentos`)
**Badge:** Operação

Gestão de documentos da carteira, upload via Vercel Blob (activo em produção desde 2026-06-09).
Componente: `Documents`.

---

### 4.7 Modelos de Peças (`/modelos-pecas`)
**Badge:** Produtividade

Templates de peças jurídicas com autopreenchimento contextual.
Componente: `PieceTemplates`. Backend: `DocumentDraftingService` (endpoint HTTP a confirmar — BL-082).

---

### 4.8 Publicações e Intimações (`/publicacoes-intimacoes`)
**Badge:** Operação

Monitorização de publicações judiciais (DataJud), identificação de impacto e criação de acções.
Componente: `Publications`.
Painel: `PublicationSignalSplitPanel`.

---

### 4.9 Triagem (`/triagem`)
**Badge:** Automação

Central de triagem automática de publicações e capturas. Motor de automação jurídica.

**Tabs:**
- `critica` — itens de prioridade crítica pendentes
- `normal` — itens normais pendentes
- `tratados` — itens já resolvidos

**KPIs de topo:** críticos pendentes, normais pendentes, tratados hoje, leads CRM gerados.

**Funcionalidades:**
- Captura automatizada de publicações (`ApiPublicationCapture`)
- Pipeline de processamento (`ApiPublicationPipelineItem`)
- Decisões de triagem (`ApiTriageDecision`)
- Itens de triagem com origem auditável (`ApiTriageItem`, `ApiTriageJob`)
- `OriginBadgeRow` — badge de origem auditável
- `OriginInsightPanel` — painel de análise de origem
- Acções derivadas (`ApiDerivedActionRecord`)
- Geração automática de leads CRM a partir de triagem

---

### 4.10 Atendimentos (`/atendimentos`)
**Badge:** Operação

Registo e acompanhamento de interações com clientes.

**Modos de visualização:**
- `lista` — lista de atendimentos
- `conversa` — vista de conversa/thread
- `timeline` — linha temporal de interações

---

### 4.11 Clientes (`/clientes`)
**Badge:** Operação (label: "Gestão de carteira")

Gestão da carteira de clientes com vínculo a processos.
Componente: `Clients`.
Painel relacionado: `ClientPortalPanel`.

---

### 4.12 CRM Jurídico (`/crm-juridico`)
**Badge:** Relacionamento

CRM com contexto jurídico, alimentado pela triagem automática.

**Tabs principais:**
- `opportunities` — oportunidades em pipeline (kanban por etapa)
- `leads` — leads capturados

**Drawer de oportunidade (5 tabs):**
- `overview` — visão geral
- `history` — histórico de movimentações
- `commercial` — dados comerciais
- `documents` — documentos anexos (`ApiCrmOpportunityDocument`)
- `process` — processo jurídico associado

**Componentes:**
- `KanbanColumn` — coluna kanban por etapa
- `OpportunityCard` — card de oportunidade
- `ExecutiveCard` — card executivo de resumo
- `CrmOriginSummary` — sumário de origem (link com triagem)
- `AuditTimeline` — timeline de auditoria

---

### 4.13 Financeiro (`/financeiro`)
**Badge:** Financeiro

Controlo financeiro do escritório.

**Tabs:**
- `receber` — contas a receber
- `pagar` — contas a pagar
- `inadimplencia` — devedores e contacto
- `conciliacao` — conciliação bancária
- `parcelamentos` — planos de parcelamento

**Modais de criação:**
- `avulso` — lançamento avulso
- `parcelado` — criação de plano parcelado

**Componentes:**
- `FinanceMetricCard` — KPI financeiro
- `FinanceInstallmentPlanCard` — card de plano parcelado
- `FinanceDelinquencyCard` — card de inadimplência
- `ProcessCombobox` — vinculação a processo

**Tipos API:** `ApiFinanceEntry`, `ApiFinanceAgingReport`, `ApiFinanceCashflowReport`, `ApiFinanceCategory`, `ApiFinanceInstallmentPlan`, `ApiFinanceDelinquencyContact`, `ApiFinanceAuditEvent`.

---

### 4.14 Usuários (`/usuarios`)
**Badge:** Administração | **Acesso:** ADM only

Gestão de utilizadores e permissões do escritório.
Componente: `UsersWorkspace`.
Guard activo: `user.role === 'ADM'` — redirect para `/` para outros roles.
`PermissionsMatrix` — matriz de permissões.

---

### 4.15 Módulos Platform Admin (sem rota activa — BL-022)

Os seguintes módulos existem como componentes mas **não estão acessíveis via rota no Router principal**:

| Módulo | Componente | Função |
|---|---|---|
| Empresas | `PlatformAdminCompaniesScreen` | Gestão de tenants (empresas) |
| Memberships | `PlatformAdminMembershipsScreen` | Gestão de membros por workspace, convites, roles |
| Suporte | `PlatformAdminSupportScreen` | Contexto de suporte por tenant |
| Auditoria | `PlatformAdminAuditScreen` | Timeline de auditoria de plataforma |

**Componentes de suporte:**
- `CompanyStatusPanel` — status da empresa (activa/suspensa/trial)
- `CompanyStatusBadge` — badge de status
- `AccessStateBanner` — banner de estado de acesso restrito
- `ReadOnlyModeSurface` — superfície de modo apenas leitura
- `MutationGuardNotice` — aviso de guarda de mutação
- `PlatformTenantBadge` — badge de tenant de plataforma
- `PlatformBillingPanel` — painel de billing de plataforma

---

### 4.16 Admin Empresa (sem rota activa — BL-022)

| Módulo | Componente | Função |
|---|---|---|
| Fundação empresa | `CompanyFoundationPanel` | Setup inicial da empresa/tenant |

---

## 5. Funcionalidades Transversais

### 5.1 Topbar
- `TopbarSearch` — pesquisa global
- `NotificationsDropdown` — notificações em tempo real (integrado com BD via BL-046)
- `ShortcutsLauncher` — lançador de atalhos
- `TopbarUserMenu` — menu do utilizador (logout, perfil)
- `TopbarActions` — acções rápidas contextuais

### 5.2 IA (camada transversal)
Disponível em vários módulos. Estado actual: **determinístico** (sem LLM externo activo).

| Permissão IA | Roles com acesso |
|---|---|
| `ai.view` | company_admin, lawyer, assistant |
| `ai.summary.generate` | company_admin, lawyer, assistant |
| `ai.recommendation.generate` | company_admin, lawyer |
| `ai.draft.generate` | company_admin, lawyer |
| `ai.checklist.suggest` | company_admin, lawyer, assistant |
| `ai.audit.view` | company_admin |
| `ai.budget.manage` | company_admin |

Serviços backend com estado a confirmar (BL-082):
- `DocumentDraftingService` — geração de peças
- `ChecklistSuggestionService` — sugestão de checklist

### 5.3 Auditoria de Origem
Componentes `OriginBadgeRow` e `OriginInsightPanel` são usados transversalmente (Triagem, CRM, Processos) para rastreabilidade da origem de cada registo.

### 5.4 Multi-tenancy
- Isolamento por empresa via `companyScope` middleware no backend
- `CompanyContextState` propagado via contexto React no frontend
- `AccessStateBanner` e `ReadOnlyModeSurface` para empresas em estado restrito

---

## 6. Stack Técnica Resumida

| Camada | Tecnologia |
|---|---|
| Frontend | React 19.2.4, Vite 8.x, TypeScript 5.9, React Router 7.x |
| UI | Radix UI 1.x/2.x, Tailwind 3.4, Lucide React |
| Backend | Node.js, Express (monolito ~8.500 linhas em `main.ts`) |
| ORM | Prisma 4.16.2 |
| Base de dados | PostgreSQL (Render — `juridico-api-staging.onrender.com`) |
| Frontend deploy | Vercel (branch `main`) |
| Storage documentos | Vercel Blob (activo desde 2026-06-09) |
| Autenticação | JWT com cookies `httpOnly` + `secure` |

---

## 7. O que Este KB Desbloqueia

| Item | O que desbloqueia |
|---|---|
| KB-005 | Inventário UX/UI detalhado por módulo (wireframes, fluxos, estados vazios) |
| KB-006 | Design System formalizado com contexto de uso real por componente |
| BL-022 | Decisão sobre rotas `platform-admin/` e `admin/` — ligar ao Router ou remover |
| BL-027/031 | Mapear uso real de `KpiCard`, `EmptyState`, `PageHeader` por tela |
| BL-049 | Refactor progressivo de `main.ts` com contexto de quais domínios são mais críticos |

---

## 8. Divergências e Riscos Identificados

| # | Tipo | Descrição |
|---|---|---|
| D1 | Acesso | `/financeiro` não tem guard de role no frontend — qualquer utilizador autenticado pode aceder via URL directa |
| D2 | Acessibilidade | `platform-admin/` e `admin/` existem como código mas sem rota activa (BL-022) |
| D3 | Roles | Frontend usa legacy roles (`ADM`, `ADV`, `FIN`, `ATD`); backend canônico usa `company_admin`, `lawyer`, etc. — mapeamento feito em dois sítios (`mapRoleToCompanyRole` no frontend, `resolveRole` no backend) |
| D4 | `manager` | Role `manager` existe no backend com permissões definidas mas sem equivalente legacy, sem label no frontend e sem presença visível na UI |
| D5 | IA | `DocumentDraftingService` e `ChecklistSuggestionService` existem no backend mas endpoint HTTP não confirmado (BL-082) |

---

*Criado em: 2026-06-09 | Status: current | Vault: !_lexora-memory-docs*
*Baseado em: leitura directa do código em `frontend/src/`, `backend/src/roles/roles.ts`, `backend/src/permissions/matrix.ts`*
*Próximo: [[KB_005]] — Inventário Funcional UX/UI | [[KB_006]] — Design System*
