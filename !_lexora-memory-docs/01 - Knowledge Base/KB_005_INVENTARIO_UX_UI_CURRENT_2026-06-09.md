---
tipo: knowledge-base
status: current
projeto: lexora
fase: kb-005
data_criacao: 2026-06-09
ultima_atualizacao: 2026-06-09
fonte: claude-code
baseado_em:
  - "[[KB_004_PRODUCT_DISCOVERY_LEXORA_CURRENT_2026-06-09]]"
  - "frontend/src/*.tsx (todos os ecrãs)"
  - "frontend/src/dashboard/containers/DashboardContainer.tsx"
escopo: inventario-ux-ui
vault_oficial: "!_lexora-memory-docs"
---

# KB-005 — Inventário UX/UI: Estados, Componentes e Fluxos por Ecrã

> **Fonte de verdade:** leitura directa do código em `frontend/src/`. Este KB documenta o que está implementado — não o que foi especificado.

---

## 1. Padrões Transversais

Estes padrões são comuns a todos (ou quase todos) os ecrãs e devem ser considerados como a base de design do produto.

### 1.1 Estados Standard por Ecrã

| Estado | Implementação típica | Duração |
|---|---|---|
| **Loading** | `<div className="spinner">` + `aria-live="polite"` | Até API responder |
| **Error** | `role="alert"` + mensagem + botão retry | Persistente até acção |
| **Success** | Toast com auto-dismiss | 3 000 ms |
| **Empty** | `<EmptyState>` com variante contextual | Até dados existirem |

### 1.2 Padrão de Filtros e Persistência

- Filtros guardados em `localStorage` com chave `lexora_{screen}_filter` ou `lexora_{screen}_saved_filter`
- Serialização JSON com validação e migração de filtros legados (suporte a estruturas antigas)
- Reset de página (page → 0/1) ao alterar qualquer filtro
- Quick filter buttons com contadores derivados via `useMemo`

### 1.3 Padrão de Modais e Drawers

```
Estado: showModal/showDrawer (boolean)
         selectedItem (objeto ou null)
         form (objecto tipado com EMPTY_FORM template)
         openMenuId (string — menu de contexto por linha)

Fluxo: abrir → preencher form → submeter → success/error → fechar
       drawer: openItem → drawerLoading → renderizar → fechar (Escape ou botão)
```

### 1.4 Padrão de Exportação CSV

Todos os ecrãs com lista suportam export via:
```typescript
Blob + URL.createObjectURL → download automático
Header row + data rows com quoting para CSV seguro
trackEvent('export_{screen}') para analytics
```

### 1.5 Paginação

- `itemsPerPage`: 10–12 por ecrã
- `page` e `pageCount` calculados via `useMemo`
- Reset automático ao filtrar

### 1.6 Operações em Lote (Bulk)

Padrão implementado em Prazos e parcialmente em Triagem:
- `selectedIds: number[]` para checkboxes
- Filtro de elegibilidade antes de executar batch
- `processingIds` durante execução
- Audit trail após conclusão

### 1.7 Context Badges de Automação

Badges visuais indicando origem automática, presentes em Tarefas, Atendimentos, Triagem, Publicações e Prazos:
- `linkedToDeadline`, `linkedToPublication`, `linkedToDocument`, `linkedToAttendance`
- `immediateAction`, `slaBreached`
- `automationContext` (summary + tags)

---

## 2. Inventário por Ecrã

---

### 2.1 Dashboard (`/`) — Meu Dia

**Título adaptado por role:**

| Role | Título | Subtítulo |
|---|---|---|
| ADV | Meu Dia | Priorize prazos críticos, avance tarefas-chave e monitore gargalos |
| ADM | Visão do Escritório | Acompanhe performance, urgências e alocação da equipe |
| FIN | Operação Financeira | Monitore receitas, cobranças pendentes e saúde financeira |
| ATD | Atendimento do Dia | Gerencie atendimentos, retornos e pendências com clientes |

**KPI Strip (6 cartões):**

| KPI | Valor | Tom |
|---|---|---|
| Prazos Hoje | count items type=hoje | warning |
| Tarefas Pendentes | count status≠concluido | info |
| Processos Aguardando Ação | count status=pausado | error |
| Clientes em Retorno | count hoje+1 | primary |
| Financeiro do Dia | R$ calculado | success |
| Produtividade da Equipe | % calculado | info |

> **Nota:** KPIs do Dashboard são actualmente **derivados localmente** dos dados de fila — não chamam endpoints dedicados de métricas.

**Secções principais:**

| Secção | Componente | Função |
|---|---|---|
| Hero | `DashboardShell > header` | Data, título, subtítulo do dia |
| Painel de Responsabilidades | `section.responsibility-panel` | Insights operacionais com tons (warning/error/info/success) |
| Próxima Melhor Acção | `section.next-best-action` | Acção prioritária contextual com CTA |
| Fila Operacional | `OperationalQueueContainer` | Lista filtrada de itens do dia |
| Rail de Contexto | `ContextRailContainer` | Agenda, movimentos e alertas laterais |

**Quick Drawer (item da fila):**
- Abre ao clicar em item da fila operacional
- Fecha com botão "Fechar" ou tecla Escape
- Focus trap: `closeDrawerRef` + `previousFocusRef` (acessibilidade)
- Campos: processo #id, fase (chip), SLA (badge), próxima acção, cliente, responsável, status, fila
- CTAs: "Abrir processo completo" → `/processos/:id`, "Registar atendimento" → `/atendimentos`

**Hooks do Dashboard:**
- `useDashboardHomeData(role, userId, email)` — dados da fila
- `useContextFeed(items)` — agenda, movimentos, alertas
- `useKpiActions()` — handlers de KPI click
- `useOperationalFilters(items)` — filtros e fase seleccionada

---

### 2.2 Processos (`/processos`)

**Modos de visualização:** `table` (default) | `kanban`

**Filtros disponíveis:**

| Filtro | Tipo | Valores |
|---|---|---|
| query | texto | pesquisa livre |
| area | select | área jurídica |
| phase | select | fase do processo |
| tribunal | select | tribunal |
| priority | select | prioridade |
| status | select | status operacional |
| prazo | select | todos / critico / hoje / 7dias |
| pendingDocsOnly | checkbox | só com docs pendentes |
| newPublicationOnly | checkbox | só com nova publicação |
| staleDays | número | sem movimento há N dias |

**Presets de filtro rápido:**
- `critical_today` — prazos críticos hoje
- `stale_15` — sem movimento há 15+ dias
- `pending_docs` — documentos em falta
- `new_publications` — novas publicações

**Kanban — 7 colunas (estágios operacionais):**
1. `aguardando_acao`
2. `aguardando_documentos`
3. `protocolar`
4. `aguardando_audiencia`
5. `em_acompanhamento`
6. `bloqueado`
7. `encerrado`

**Modais/Drawers:**

| Modal/Drawer | Trigger | Conteúdo |
|---|---|---|
| Quick Drawer | click na linha | resumo do processo + acções rápidas |
| Formulário criação/edição | "+ Novo" / edit icon | form com entryMode (novo / andamento) |
| Process Lookup | ícone de busca | pesquisa por número CNJ, loading, resultado |
| WhatsApp Confirm | acção whatsapp | confirmação antes de enviar |
| Document Modal | clip icon | `ProcessDocumentModal` (upload) |

**Acções principais:**
- Criar processo (modo `novo` ou `andamento`)
- Editar processo
- Registar andamento
- Solicitar documento
- Upload de ficheiro (quick attach)
- Exportar CSV
- WhatsApp integration

**Ordenação:** `nextDeadline` | `priority` | `lastMovement` (asc/desc)

**Dados exibidos por linha:**
id, título, número CNJ, cliente, área, tribunal, parte contrária, fase, status, prioridade, próximo prazo, último movimento, documentos pendentes, publicação nova

---

### 2.3 Detalhe do Processo (`/processos/:id`)

**9 abas:**
1. `visao_geral` — timeline + métricas + acções rápidas
2. `andamentos` — movimentos do processo
3. `prazos` — prazos associados
4. `audiencias` — audiências marcadas
5. `documentos` — documentos do processo
6. `tarefas` — tarefas associadas
7. `publicacoes` — publicações vinculadas
8. `atendimento` — atendimentos do cliente no processo
9. `comentarios` — comentários internos

**Layout:**
- **Timeline central** — eventos cronológicos com ícone por tipo (cadastro, andamento, fase, prazo, documento, publicação, atendimento, tarefa, comentário)
- **Rail direito** — pendências activas (prazo, tarefa, documento, publicação, interação, alerta)
- **Quick Facts** — métricas chave com tons e ícones

**Componentes de destaque:**
- `PipelineTimeline` — linha temporal do caso
- `ClientPortalPanel` — portal do cliente
- `ClientCommunicationPanel` — comunicação
- `TeamAssignmentsPanel` — atribuições de equipa
- `ActionModal` — modal de acção contextual

---

### 2.4 Tarefas (`/tarefas`)

**Modos de visualização:** `lista` (default) | `kanban`

**Filtros:**
query, status, priority, owner, scope (minha/delegada_por_mim), process, client, prazo (atrasado/hoje), origin, vinculada (prazo/publicacao/documento/atendimento), period (hoje/7/30)

**Origens de tarefa:**
`processo` | `prazo` | `documento` | `publicacao` | `atendimento` | `interno`

**Status normalizados (API → UI):**

| API | UI |
|---|---|
| backlog, triagem | pendente |
| em_execucao | em_andamento |
| aguardando_cliente, aguardando_interno | aguardando |
| cancelada | (filtrada) |
| done | concluida |
| overdue | atrasada |

**Kanban — 4 colunas:**
1. `pendente`
2. `em_andamento`
3. `aguardando`
4. `concluida`

**Quick KPI filters:**
- Hoje, Atrasadas, Alta prioridade, Delegadas, Concluídas na semana

**Drawer de tarefa:**
- Campos: título, descrição, processo vinculado, cliente, origem, data limite, status, prioridade, responsável
- Context badges de automação (Publication, Prazo, Documento, Atendimento, Ação imediata, SLA rompido)
- Chips operacionais: workflowStage, followupState, rawStatus

**Acções:** Criar, Marcar concluída, Reatribuir, Editar, Quick comment, Exportar CSV

---

### 2.5 Prazos (`/prazos`)

**Modos de visualização:** `lista` | `kanban` | `calendario`

**Filtros:**
query, period (todos/hoje/semana/mes/atrasados), status, priority, responsible, area, process, origin (publicacao/audiencia/interno/cliente), dueTodayOnly, dueInDays

**Quick views:** todos | hoje | atrasados | criticos | publicacao | meus

**KPIs de saúde:**
hoje, semana, criticos, atrasados, concluídos, auditados, sincronizados com agenda

**Funcionalidades únicas:**
- **Bulk complete** — selecção múltipla de prazos elegíveis + conclusão com justificação + audit log
- **Agenda sync** — criar evento na Agenda a partir de um prazo (`agendaSyncStatus`: synced/error/pending)
- **Completion audit** — registo de quem, quando e com que justificação concluiu

**Export CSV campos:** Prazo, Processo, Cliente, Origem, Vencimento, Risco, Status, Prioridade, Responsável

---

### 2.6 Agenda (`/agenda`)

**Modos de visualização:** `dia` | `semana` (compacta/completa) | `mes` | `lista`

**Tipos de evento:**
`audiencia` | `prazo_calendario` | `reuniao_cliente` | `retorno_agendado` | `compromisso_interno` | `diligencia` | `protocolo` | `tarefa_horario` | `evento_manual`

**Status de evento:**
`agendado` | `confirmado` | `atencao` | `realizado` | `cancelado`

**Filtros:** search, type, period, client, process, responsible, priority, audienciaOnly, retornoOnly, prazoOnly

**Funcionalidades:**
- Exportar calendário (`.ics`)
- Criar evento manual
- Ligar evento a processo
- Toggle semana: compacta vs completa

---

### 2.7 Documentos (`/documentos`)

**Modos de visualização:** `lista` | `grade`

**Filtros:**
query, client, process, category (Peticao/Contrato/Prova/Financeiro/Checklist), status (pendente/aguardando_validacao/validado/rejeitado), version (todas/mais_recente/historicas), origin (upload/cliente/publicacao/interno), period, pendingOnly, requiredOnly

**Workflow de validação:**
```
pendente → aguardando_validacao → validado
                               ↘ rejeitado
```

**Templates de checklist por área (~100 itens totais):**
Trabalhista, Cível, Tributário, Empresarial, Previdenciário + 2 áreas adicionais

**Distinção:** documento `obrigatório` vs `bloqueia andamento`

**Upload:** via `ProcessDocumentModal` — integrado com Vercel Blob (activo em produção desde 2026-06-09)

---

### 2.8 Modelos de Peças (`/modelos-pecas`)

**Modos de visualização:** `lista` | `cards`

**Filtros:**
query, area, tipoPeca, status (ativo/revisao/rascunho/arquivado), oficialOuRascunho, favorito, autoFill, fase, autor, versao

**Ciclo de vida do template:**
```
rascunho → revisao → ativo → arquivado
```

**Fluxo de geração de documento (4 passos):**
1. Seleccionar processo
2. Preencher campos (autoFill disponível)
3. Rever output
4. Criar documento

**Badge AutoFill** — indica que a IA pode pré-preencher campos (backend: `DocumentDraftingService` — endpoint a confirmar, BL-082)

**Paginação:** 12 itens por página

---

### 2.9 Publicações e Intimações (`/publicacoes-intimacoes`)

**Modos de visualização:** `lista` | `timeline`

**Tipos:** intimacao | citacao | despacho | sentenca | acordao | edital | outros

**Níveis de impacto:** critico | alto | medio | baixo | informativo

**Workflow de status:**
```
nova → lida → em_analise → tratada
                         ↘ ignorada
```

**Quick filter presets:** nova, crítico, exigeAcao, nãoLida, semTrat

**Acções:**
- Marcar como lida / tratada
- Converter em prazo
- Criar tarefa
- Criar oportunidade CRM
- Adicionar observações
- Exportar CSV

**Origin bundle:** integração com `OriginInsightPanel` para auditoria de origem da captura

---

### 2.10 Triagem (`/triagem`)

**Tabs de fila:**
- `critica` — prioridade crítica, pendentes
- `normal` — prioridade normal, pendentes
- `tratados` — itens resolvidos

**KPIs de topo (clicáveis — filtram a fila):**
- Críticos pendentes → tab critica + status=pendente
- Normais pendentes → tab normal + status=pendente
- Tratados hoje → tab tratados
- Leads CRM gerados → tab tratados

**Workflow de decisão (multi-step):**
```
Seleccionar item → Escolher decisão → Payload condicional → Confirmar

Decisões possíveis:
  confirmado → [criar prazo] + [criar tarefa] + [criar lead CRM]
  descartado → motivo: duplicada/irrelevante/sem_relacao/falso_positivo/ja_tratada/outro
  revisao_manual → encaminhar
  adiado → postergar
```

**Operações em lote:** selecção múltipla + processamento batch com `batchRunning`

**Execução manual de fontes:**
`cnj` | `cpf` | `diario` | `oab` — cada uma com indicador visual de execução (`runningSource`)

**Métricas de qualidade:** taxa de confirmação, taxa de falsos positivos por fonte

**Confiança IA:** `aiConfidenceBand` — alta | media | baixa (visualização por banda)

---

### 2.11 Atendimentos (`/atendimentos`)

**Modos de visualização:** `lista` | `conversa` | `timeline`

**Canais:**
`whatsapp` | `telefone` | `email` | `presencial` | `portal` | `interno`

**Tipos:**
`consulta` | `urgencia` | `rotina` | `triagem` | `acompanhamento`

**Status normalizados:**

| Raw | Normalizado UI |
|---|---|
| triagem, em_atendimento, aberto | aberto |
| resolvido | resolvido |
| pendente_cliente | aguardando_cliente |
| sem_resposta | sem_resposta |
| retorno_agendado | agendado |

**Conversão de atendimentos:**
- `elegível_tarefa` → botão "Converter em tarefa" activo
- `elegível_prazo` → botão "Converter em prazo" activo
- `convertido_tarefa` / `convertido_prazo` → badge de estado

**Filtros:** query, client, process, canal, status, responsible, period, area, pendingRetorno, semProximoPasso, priority

**Prefill via route state:** atendimentos podem ser abertos pré-preenchidos via `location.state` (origem: Clientes)

---

### 2.12 Clientes (`/clientes`)

**Modos de visualização:** `lista` | `cards`

**Filtros:**
query, status (ativo/inativo/prospecto/encerrado), responsible, tipo (PF/PJ), period, comProcessoAtivo, aguardandoRetorno, comDocumentoFaltante

**Drawer de cliente (5 abas):**
1. `Resumo` — KPIs inline (processos, pendências, docs faltantes, último contacto)
2. `Portal` — `ClientPortalPanel` (submissões do portal)
3. `Comunicação` — `ClientCommunicationPanel` (WhatsApp, email)
4. `Processos` — lista de processos vinculados
5. `Cadastro` — dados de registo (CPF/CNPJ, telefone, email, endereço)

**Ciclo de vida:** ativo → inativo → prospecto → encerrado

**Ordenação:** nome | ultima_interacao | processos | pendencias (asc/desc)

---

### 2.13 CRM Jurídico (`/crm-juridico`)

**Tabs:** `opportunities` (default) | `leads`

**Kanban de oportunidades — estágios:**
1. `acao_recomendada`
2. `em_contato`
3. `proposta_enviada`
4. `negociacao`
5. `ganha`
6. `perdida`

**Status de lead:** novo | qualificado | contatado | convertido | perdido

**Drawer de oportunidade (5 abas):**
1. `overview` — sumário, timeline de jornada (identificado→analisado→acção→proprietário→contactos)
2. `history` — histórico de eventos de contacto
3. `commercial` — dados comerciais, próximo contacto, status
4. `documents` — documentos da oportunidade (obrigatórios vs pendentes para avançar)
5. `process` — processo jurídico associado

**Tipos de contacto comercial:**
`contato` | `follow_up` | `reuniao` | `proposta` | `documentos` | `ligacao` | `whatsapp` | `email`

**Estado de próximo contacto:**
`sem_contato` | `hoje` | `vencido` | `futuro`

**Fluxos de conversão:**
- Lead → Oportunidade
- Oportunidade → Cliente + Processo (novo) ou → Processo existente

**Integração com Triagem:** `CrmOriginSummary` mostra a origem automática da captura

---

### 2.14 Financeiro (`/financeiro`)

**5 Tabs:**

| Tab | Conteúdo |
|---|---|
| `receber` | Contas a receber filtradas |
| `pagar` | Contas a pagar filtradas |
| `inadimplencia` | `FinanceDelinquencyCard` por devedor |
| `conciliacao` | Relatório de cash flow por mês |
| `parcelamentos` | `FinanceInstallmentPlanCard` por plano |

**Modal de criação — 2 modos:**
- `avulso` — lançamento único (tipo, valor, data, cliente, processo, categoria, notas)
- `parcelado` — criação de plano (parcelas, taxa de juro, PMT calculado com juro composto)

**Filtros:** status, from/to (datas), clientId, processId

**Aging Report:**
Buckets: 0-30 | 31-60 | 61-90 | 90+ dias

**Indicadores:** totalReceivables, overdueAmount, overdueCount, overdueRate, currentAmount, oldestDaysPastDue

**Permissões internas:**
`canEntry` | `canBilling` | `canSettlement` | `canReconciliation`

---

### 2.15 Usuários (`/usuarios`) — ADM only

**Componentes:**
- Lista de utilizadores com role labels
- `PermissionsMatrix` — matrix com scope por permissão (denied/own/team/global) e flag `sensitive`
- `TeamAssignmentsPanel` — atribuições de equipa
- Gap cards — funcionalidades com configuração em falta

**KPIs:** utilizadores activos, admins, equipas, permissões sensíveis

**Sem modais de edição** — componente de visualização puro (criação/edição de utilizadores não implementada nesta tela)

---

## 3. Componentes de Produto Reutilizáveis

### 3.1 Componentes de `components/product/`

| Componente | Usos confirmados |
|---|---|
| `KpiCard` | Dashboard, Financeiro, Triagem |
| `KpiStrip` | Dashboard |
| `EmptyState` | Transversal (variantes: default, error, permission) |
| `PageHeader` | Todos os ecrãs (via AppShell) |
| `FilterBar` | Processos, Tarefas, Clientes, CRM |
| `KanbanColumn` | Processos, Tarefas, CRM |
| `DrawerSection` | Clientes, CRM, Processos detalhe |
| `Timeline` | Atendimentos, CRM, Prazos |
| `StatusPill` | Transversal (5 tones) |
| `PriorityBadge` | Transversal (4 levels) |
| `ExecutiveCard` | CRM |
| `OpportunityCard` | CRM |

### 3.2 Componentes de Auditoria

| Componente | Função |
|---|---|
| `OriginBadgeRow` | Badge de origem de captura auditável |
| `OriginInsightPanel` | Painel de análise de origem com capture+timeline+actions |
| `PipelineTimeline` | Timeline cronológica de processo |
| `AuditTimeline` | Timeline de auditoria (CRM, platform-admin) |

### 3.3 Componentes de Contexto Empresarial

| Componente | Função |
|---|---|
| `AccessStateBanner` | Banner de estado de acesso restrito |
| `CompanyStatusBadge` | Badge de status da empresa |
| `CompanyStatusPanel` | Painel de status multi-tenant |
| `ReadOnlyModeSurface` | Superfície read-only para empresa suspensa |
| `MutationGuardNotice` | Aviso de guarda de mutação |

---

## 4. Divergências UX Identificadas

| # | Ecrã | Divergência | Impacto |
|---|---|---|---|
| U1 | Financeiro | Sem guard de role — acessível por qualquer utilizador via URL directa | Médio — dados financeiros visíveis para ADV/ATD |
| U2 | Utilizadores | Sem UI de criação/edição de utilizadores na tela `/usuarios` | Alto — ADM não consegue criar utilizadores pelo produto |
| U3 | Sidebar | `manager` (role canônica) não tem entrada na sidebar nem label definido | Médio — utilizadores com role manager vêem sidebar genérica |
| U4 | Modelos Peças | Badge AutoFill presente mas endpoint `DocumentDraftingService` não confirmado (BL-082) | Médio — funcionalidade pode falhar silenciosamente |
| U5 | Dashboard | KPIs calculados localmente a partir da fila — não reflectem dados reais do BD (ex: Financeiro do Dia é mock) | Alto — métricas do dashboard não são fiáveis |
| U6 | Configurações | Item "Configurações" na sidebar apenas dispara `trackEvent` — sem tela implementada | Baixo — dead end para utilizador |
| U7 | Ajuda | Item "Ajuda" apenas dispara `trackEvent` — sem tela implementada | Baixo — dead end para utilizador |
| U8 | Platform Admin | 4 telas (`companies`, `memberships`, `support`, `audit`) existem mas sem rota activa (BL-022) | Alto — gestão de tenants inacessível pelo produto |

---

## 5. O que Este KB Desbloqueia

| Item | O que desbloqueia |
|---|---|
| KB-006 | Design System — agora com contexto real de quais componentes são usados onde |
| BL-027/031 | Unificação de `KpiCard`, `EmptyState`, `PageHeader` com mapeamento de uso real |
| BL-022 | Decisão sobre rotas platform-admin com contexto completo das 4 telas |
| U2 | Implementar UI de criação/edição de utilizadores |
| U5 | Ligar KPIs do Dashboard a endpoints reais do backend |

---

*Criado em: 2026-06-09 | Status: current | Vault: !_lexora-memory-docs*
*Baseado em: leitura directa de todos os ecrãs em `frontend/src/` e `[[KB_004_PRODUCT_DISCOVERY_LEXORA_CURRENT_2026-06-09]]`*
*Próximo: [[KB_006]] — Design System e Constituição Visual*
