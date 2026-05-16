# Mapeamento Tela x API - P0 Atual

Data: 12/05/2026
Status: baseline atual de contrato
Escopo: telas P0 e endpoints realmente consumidos pelo frontend atual

## 1. Objetivo

Este documento registra o contrato atual entre frontend e backend para as telas P0. Ele separa fatos observados no código de inferências futuras, reduz ambiguidade antes da migração para Postgres e deixa explícito onde o frontend ainda deriva dados localmente.

## 2. Fontes De Verdade

Frontend:

- `frontend/src/api.ts`
- `frontend/src/App.tsx`
- `frontend/src/Processes.tsx`
- `frontend/src/ProcessDetail.tsx`
- `frontend/src/Deadlines.tsx`
- `frontend/src/Documents.tsx`
- `frontend/src/Atendimentos.tsx`
- `frontend/src/Clients.tsx`
- `frontend/src/Tasks.tsx`
- `frontend/src/Agenda.tsx`
- `frontend/src/Publications.tsx`
- `frontend/src/PieceTemplates.tsx`
- `frontend/src/dashboard/hooks/useDashboardHomeData.ts`

Backend:

- `backend/src/main.ts`
- `backend/prisma/schema.prisma`

## 3. Endpoints Reais Atuais

Autenticacao e sessao:

- `POST /auth/login`
- `POST /auth/logout`
- `GET /me`
- `GET /permissions`
- `GET /home`

Administracao:

- `GET /users`

Carteiras operacionais:

- `GET /clients`
- `GET /clients/:id`
- `POST /clients`
- `PUT /clients/:id`
- `GET /publications`
- `GET /publications/:id`
- `POST /publications`
- `PUT /publications/:id`
- `POST /publications/:id/create-deadline`
- `GET /templates`
- `GET /templates/:id`
- `POST /templates`
- `PUT /templates/:id`
- `POST /templates/:id/generate-document`
- `GET /triage`
- `GET /triage/:id`
- `PUT /triage/:id`
- `POST /triage/:id/decision`
- `GET /attendances`
- `GET /attendances/:id`
- `POST /attendances`
- `PUT /attendances/:id`
- `GET /tasks`
- `GET /tasks/:id`
- `POST /tasks`
- `PUT /tasks/:id`
- `GET /agenda`
- `GET /agenda/:id`
- `POST /agenda`
- `PUT /agenda/:id`

Processos e agregados por processo:

- `GET /processes`
- `GET /processes/lookup`
- `POST /processes`
- `GET /processes/:id`
- `PUT /processes/:id`
- `DELETE /processes/:id`
- `GET /processes/:id/andamentos`
- `POST /processes/:id/andamentos`
- `GET /processes/:id/prazos`
- `POST /processes/:id/prazos`
- `GET /processes/:id/documentos`
- `POST /processes/:id/documentos`
- `GET /processes/:id/atendimentos`
- `POST /processes/:id/atendimentos`

## 4. Contrato Base De Entidades

### User

Campos observados:

- `id: number`
- `email: string`
- `role: string`

Origem:

- direto da API

### Process

Campos observados:

- `id: number`
- `title: string`
- `processNumber?: string | null`
- `client: string`
- `phase: string`
- `status: string`
- `ownerId: number`
- `owner?: { id, email, role }`

Origem:

- direto da API

### Andamento

Campos observados:

- `id`
- `processId`
- `title`
- `description`
- `date`
- `actorEmail`

Origem:

- direto da API

### Prazo

Campos observados:

- `id`
- `processId`
- `title`
- `dueDate`
- `status`
- `priority`
- `origin`
- `responsible`
- `notes`

Origem:

- direto da API

### Documento

Campos observados:

- `id`
- `processId`
- `title`
- `description`
- `status`
- `origin`
- `category`
- `version`

Origem:

- direto da API

### Atendimento

Campos observados:

- `id`
- `processId`
- `title`
- `description`
- `date`
- `actorEmail`

Origem:

- direto da API

### Task

Campos observados:

- `id`
- `title`
- `description`
- `processId`
- `processLabel`
- `processTitle`
- `client`
- `origin`
- `dueDate`
- `status`
- `priority`
- `owner`
- `createdBy`
- `notes`

Origem:

- direto da API

### Agenda Event

Campos observados:

- `id`
- `title`
- `type`
- `status`
- `priority`
- `date`
- `startTime`
- `endTime`
- `clientId`
- `client`
- `processId`
- `processLabel`
- `processTitle`
- `responsible`
- `locationOrChannel`
- `notes`
- `origin`

Origem:

- direto da API

### Publication

Campos observados:

- `id`
- `processId`
- `processLabel`
- `processTitle`
- `client`
- `tipo`
- `status`
- `impacto`
- `tribunal`
- `origem`
- `dataPublicacao`
- `resumo`
- `textoRelevante`
- `exigeAcao`
- `convertidaEmPrazo`
- `prazoDerivedoLabel`
- `derivedDeadlineId`

Origem:

- direto da API

### Triage Item

Campos observados:

- `id`
- `queueType`
- `status`
- `suggestedAction`
- `suggestedReason`
- `aiConfidenceBand`
- `aiScoreRaw`
- `postponeUntil`
- `assignedQueue`
- `handledBy`
- `handledAt`
- `discardReason`
- `discardNote`
- `sourceLabel`
- `processId`
- `processLabel`
- `processTitle`
- `clientId`
- `client`
- `crmLeadId`
- `crmOpportunityId`
- `capture`
- `event`
- `decisions?`
- `timeline?`

Origem:

- direto da API

### Template

Campos observados:

- `id`
- `nome`
- `area`
- `tipoPeca`
- `status`
- `oficial`
- `favorito`
- `autoFill`
- `fase`
- `autor`
- `versao`
- `ultimaAtualizacao`
- `usoRecente`

Origem:

- direto da API

## 5. Mapeamento Por Tela

### Login

Endpoints:

- `POST /auth/login`
- `GET /me`
- `GET /home`
- `POST /auth/logout`

Origem dos dados:

- direta da API

Observacoes:

- a sessao agora depende de cookie HttpOnly e `credentials: 'include'`

### Dashboard

Endpoints:

- `GET /home`
- `GET /processes`

Dados derivados no frontend:

- fila de responsabilidade
- resumo de pendencias
- rotulo de SLA
- classificacao `hoje`, `amanha`, `atrasados`

Classificacao:

- mistura de dado direto com dado derivado local

Gap:

- dashboard ainda nao possui endpoint proprio de agregacao

### Usuarios

Endpoints:

- `GET /users`

Origem:

- direta da API

Restricao:

- somente `ADM`

### Processos

Endpoints:

- `GET /processes`
- `POST /processes`
- `PUT /processes/:id`
- `DELETE /processes/:id`

Origem:

- direta da API

Dados derivados no frontend:

- filtros salvos
- agrupamentos de visualizacao
- parte da priorizacao visual

### Detalhe Do Processo

Endpoints:

- `GET /processes/:id`
- `GET /processes/:id/andamentos`
- `GET /processes/:id/prazos`
- `GET /processes/:id/documentos`
- `GET /processes/:id/atendimentos`
- `POST` correspondentes por agregado

Origem:

- direta da API

Gap:

- a tela compoe varias chamadas em cascata e nao possui endpoint consolidado

### Prazos

Endpoint consumido hoje:

- `GET /deadlines`
- `GET /deadlines/:id`
- `POST /deadlines`
- `PUT /deadlines/:id`
- compatibilidade mantida em:
  - `GET /processes/:id/prazos`
  - `POST /processes/:id/prazos`

Origem:

- direta da API

Gap:

- ainda falta integrar a criacao/edicao completa da tela com workflow operacional mais rico

### Documentos

Endpoint consumido hoje:

- `GET /documents`
- `GET /documents/:id`
- `POST /documents`
- `PUT /documents/:id`
- compatibilidade mantida em:
  - `GET /processes/:id/documentos`
  - `POST /processes/:id/documentos`

Origem:

- direta da API

Gap:

- ainda falta fechar upload real e fluxo de solicitacao externa ao cliente

### Atendimentos

Endpoint consumido hoje:

- `GET /processes`

Origem:

- derivada localmente a partir de processos

Gap:

- nao existe `GET /attendances` consolidado

### Clientes

Endpoints:

- `GET /clients`
- `POST /clients`
- `GET /clients/:id`
- `PUT /clients/:id`

Origem:

- direta da API com metricas derivadas no backend

Persistencia:

- `Client` agora e entidade persistente autonoma

Observacao:

- o vinculo basico com `Process` passa a usar `clientId`, preservando o campo textual `client` como compatibilidade de transicao

### Tarefas

Endpoints:

- `GET /tasks`
- `GET /tasks/:id`
- `POST /tasks`
- `PUT /tasks/:id`

Origem:

- direta da API

Persistencia:

- `Task` agora e entidade persistente autonoma

### Agenda

Endpoints:

- `GET /agenda`
- `GET /agenda/:id`
- `POST /agenda`
- `PUT /agenda/:id`

Origem:

- direta da API

Persistencia:

- `AgendaEvent` agora e entidade persistente autonoma

### Publicacoes E Intimacoes

Endpoints:

- `GET /publications`
- `GET /publications/:id`
- `POST /publications`
- `PUT /publications/:id`
- `POST /publications/:id/create-deadline`

Origem:

- direta da API

Persistencia:

- `Publication` agora e entidade persistente autonoma

Observacao:

- a conversao em prazo agora cria `Prazo` real e devolve o vinculo derivado no contrato da publicacao

### Modelos De Pecas

Endpoints:

- `GET /templates`
- `GET /templates/:id`
- `POST /templates`
- `PUT /templates/:id`
- `POST /templates/:id/generate-document`

Origem:

- direta da API, com fluxo de geracao persistido via backend

Persistencia:

- `Template` agora e entidade persistente autonoma

Observacao:

- a geracao de peca agora persiste artefato documental real em `Documento`

## 6. Classificacao De Maturidade Por Tela

### Telas com contrato mais estavel

- Login
- Usuarios
- Processos
- Detalhe do Processo

### Telas com contrato intermediario

- Dashboard

### Telas ainda sustentadas por derivacao local

- nenhuma tela P0 permanece sustentada apenas por derivacao local

## 7. Conflitos E Gaps Reais

- `Dashboard` ainda segue parcialmente dependente de `GET /processes` como fonte universal, o que cria acoplamento alto.
- `GET /permissions` retorna apenas lista simples de strings, insuficiente para politica granular de producao.
- o lookup de processo agora aceita integracao externa configuravel por ambiente, mas ainda depende da URL/token do provedor para operar fora do fallback local

## 8. Implicacao Para Postgres

Antes da migracao de banco, o escopo deve ser separado em dois grupos:

Grupo A - migracao estrutural sem ampliar dominio:

- mover `User`, `Process`, `Andamento`, `Prazo`, `Documento`, `Atendimento` para Postgres
- manter comportamento atual

Grupo B - evolucao de contrato:

- `Client`, `Task`, `Publication` e `Template` ja foram promovidas a entidades reais
- criar endpoints dedicados por modulo

Recomendacao:

- migrar primeiro o Grupo A
- so depois quebrar `GET /processes` como backend agregador universal

## 9. Risco Tecnico Imediato

Existe conflito de baseline Prisma no workspace:

- `backend/prisma/schema.prisma` usa `sqlite`
- `prisma/schema.prisma` na raiz usa `postgresql`

Decisao aplicada em 12/05/2026:

- `backend/prisma/schema.prisma` passa a ser o schema soberano
- `prisma.config.ts` da raiz passa a delegar para `backend/prisma/schema.prisma`
- migrations soberanas ficam em `backend/prisma/migrations`
- a raiz do workspace passa a atuar apenas como orquestrador de scripts

Pendencia residual:

- `prisma/schema.prisma` na raiz permanece como artefato legado e nao deve ser usado para migrate ou generate
- `prisma.config.ts` na raiz permanece apenas como ponte documental para o schema soberano

Evidencia observada em 12/05/2026:

- `npm run prisma:generate` em `backend` funciona
- `npm uninstall` removeu a toolchain Prisma 7 da raiz
- `npm run backend:prisma:generate` na raiz funciona por delegacao ao `backend`

## 10. Proxima Acao Recomendada

1. Escolher um schema Prisma soberano.
2. Congelar o dominio atual do Grupo A.
3. Criar plano de migracao SQLite -> Postgres sem ampliar entidades.
4. Em paralelo, abrir backlog para o artefato final de peça gerada e seu versionamento documental.
