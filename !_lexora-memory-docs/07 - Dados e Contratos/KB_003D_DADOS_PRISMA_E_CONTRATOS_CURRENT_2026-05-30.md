---
tipo: kb
status: current
projeto: lexora
fase: inventario-tecnico
area: dados-prisma-contratos
data: 2026-05-30
fonte: claude-code
baseado_em:
  - '[[00_START_HERE]]'
  - '[[KB_002_GOVERNANCA_DOCUMENTAL_OFICIAL_CURRENT_2026-05-29]]'
  - '[[KB_003A_ESTRUTURA_GERAL_E_CONFIGURACOES_CURRENT_2026-05-29]]'
  - '[[KB_003B_FRONTEND_ESTADO_ATUAL_CURRENT_2026-05-29]]'
  - '[[KB_003C_BACKEND_E_APIS_ESTADO_ATUAL_CURRENT_2026-05-30]]'
  - '[[BACKLOG_GERAL_LEXORA_CURRENT]]'
escopo: dados-prisma-contratos
vault_oficial: 'C:\Users\tomke\app Juridico\!_lexora-memory-docs'
autoridade: inventario-tecnico
---

# KB-003D — Dados, Prisma e Contratos

> [!important] Fonte primária: leitura direta de arquivos
> Este documento foi produzido pela leitura direta dos arquivos reais do projeto. Fatos confirmados e inferências são distinguidos ao longo de todo o texto. Nenhum código foi alterado, executado ou instalado.

---

## 1. Resumo Executivo

O projeto Lexora usa **Prisma 4.16.2 com PostgreSQL** como camada de dados oficial. O schema ativo é `backend/prisma/schema.prisma`, com **30 migrations aplicadas** entre 2026-05-14 e 2026-05-29, cobrindo desde os modelos básicos (User, Process) até os domínios mais recentes de multi-tenancy, BI, Timesheet e SaaS billing.

### Pontos confirmados

- **Schema ativo**: `backend/prisma/schema.prisma` — 50+ modelos, enums, relações.
- **Schema paralelo**: `backend/prisma/schema.postgres.prisma` — schema muito mais simples (6 modelos), com env var diferente (`POSTGRES_DATABASE_URL`). **Provavelmente legado do período de migração SQLite → PostgreSQL.** Não deve ser usado como fonte.
- **Schema raiz**: `prisma/schema.prisma` — arquivo quase vazio (generator + datasource sem url), sem modelos. É placeholder ou resíduo.
- **Pasta `prisma-postgres/`**: **não existe fisicamente**, mas está referenciada em 5 scripts `prisma:cutover:*` no `backend/package.json`. Scripts quebrados.
- **`backend/prisma.config.ts`**: aponta para `prisma/schema.prisma` (relativo ao CWD do backend, ou seja `backend/prisma/schema.prisma`) — **config ativa**.
- **`prisma.config.ts` raiz**: aponta explicitamente para `backend/prisma/schema.prisma` — **config ativa da raiz**.
- **Multi-tenancy**: implementado via `Company` + `CompanyMembership`. Modelos operacionais (`Client`, `Process`, `Task`) **não têm `companyId` direto** — isolamento é feito por middleware/scope context.
- **Notificações**: modelo `Notification` existe no schema, mas endpoints `/notifications` e `/notifications/count` **usam `devMockNotifications` em memória** — **divergência crítica**.
- **Storage de documentos**: `DocumentUploadService` usa padrão de `storageAdapter` injetado externamente. Implementação concreta **não identificada** — pode ser disco local (não persistente no Render).
- **Auth claims**: dois arquivos com claims diferentes — `auth.ts` (simples: sub, role, email) e `auth/auth-claims.ts` (rico: sub, email, role, userType, companyId, membershipId). Ambos com fallback JWT hardcoded.
- **Contratos**: 9 arquivos `*.contract.ts` no backend, 12 JSON em `contracts/`, 10 Markdown em `docs/*/contracts.md`. Fonte autoritativa não está formalmente declarada.
- **Validators**: customizados por domínio, sem biblioteca externa (sem Zod, Joi ou class-validator).
- **Seed**: `seed.sql` usa roles `admin`, `coordinator`, `assistant` — enquanto o sistema real usa `ADM`, `ADV`, `FIN`, `ATD`. Divergência de roles entre seed e produção.

### Riscos principais

1. Endpoints de notificações em memória (`devMockNotifications`) provavelmente chegam a produção.
2. `prisma-postgres/` inexistente com 5 scripts quebrados.
3. Storage adapter de documentos indefinido — risco de perda de arquivos no Render.
4. Roles no seed (`admin`, `coordinator`, `assistant`) divergem dos roles no sistema real.
5. JWT_SECRET com fallback hardcoded em dois arquivos de auth.
6. Ausência de `companyId` direto em modelos operacionais — isolamento depende de middleware correto em cada endpoint.

---

## 2. Objetivo do Documento

Este documento serve como base para:

- Documentação oficial do estado atual da camada de dados e contratos do Lexora.
- Decisões sobre fonte autoritativa de contratos (BL-006).
- Validação de schemas Prisma e configurações (BL-007, BL-008, BL-055, BL-056).
- Desbloqueio de itens do backlog bloqueados por KB-003D.
- **[[KB_003E_TESTES_QA_E_EVIDENCIAS]]** — contextualizar testes da camada de dados.
- **KB-003F — IA, Agentes e Automações** — modelo `AiExecution`, `AiBudgetLedger`, `AiExecutionTarget`.
- **KB-003G — Riscos Técnicos e Divergências** — consolidar riscos desta camada.
- **KB-004 — Product Discovery** — entender domínios implementados.
- Futuras correções técnicas de schema, contratos, validators, storage e notificações.

---

## 3. Escopo e Fora do Escopo

### Analisado nesta etapa

- `backend/prisma/schema.prisma` (leitura completa)
- `backend/prisma/schema.postgres.prisma` (leitura completa)
- `prisma/schema.prisma` raiz (leitura completa)
- `backend/prisma/migrations/` (listagem + leitura da primeira e de uma intermediária)
- `backend/prisma/seed.sql` (leitura completa)
- `backend/prisma/seed-finance.ts` (parcial)
- `backend/prisma/seed-finance.sql` (existência confirmada)
- `backend/prisma/schema_init.sql` (parcial)
- `backend/prisma/dev.db` (existência confirmada, não aberta)
- `backend/prisma.config.ts` (leitura completa)
- `prisma.config.ts` raiz (leitura completa)
- `prisma-postgres/` (inexistência confirmada)
- `backend/package.json` scripts Prisma (leitura via grep)
- `backend/src/*.contract.ts` (listagem + leituras parciais)
- `frontend/src/api.ts` (parcial — tipos e métodos)
- `contracts/*.json` (listagem + leitura parcial de `foundation-multitenant.contract.json`)
- `docs/*/contracts.md` (listagem — 10 arquivos encontrados)
- `backend/src/auth.ts` (leitura completa)
- `backend/src/auth/auth-claims.ts` (leitura completa)
- `backend/src/documents/upload/document-upload.service.ts` (leitura completa)
- `backend/src/documents/upload/document-upload.types.ts` (leitura completa)
- `backend/src/documents/upload/document-upload.validators.ts` (leitura completa)
- `backend/src/main.ts` (grep para notificações)
- Validators: listagem de todos os arquivos `*validator*`
- Documentos oficiais: KB-003A, KB-003B, KB-003C, BACKLOG_GERAL_LEXORA_CURRENT

### Fora do escopo desta etapa

- Leitura completa de todas as migrations (30 arquivos)
- Comparação campo a campo de todos os contratos com o schema
- Leitura completa de `frontend/src/api.ts`
- Leitura dos contratos JSON e Markdown na íntegra
- Validação de dados reais no banco
- Execução de qualquer comando Prisma ou script
- Acesso ao banco de dados
- Auditoria de segurança completa
- Refatoração ou correção de código
- Atualização do backlog

---

## 4. Estrutura de Dados e Prisma

| Caminho | Tipo | Papel provável | Status aparente | Fonte oficial? | Observações | Ponto a validar |
|---|---|---|---|---|---|---|
| `backend/prisma/schema.prisma` | Schema Prisma | Schema ativo de produção | Ativo | **Sim** | 50+ modelos, PostgreSQL, DATABASE_URL | Confirmar com `prisma migrate status` |
| `backend/prisma/schema.postgres.prisma` | Schema Prisma alternativo | Legado de migração SQLite→Postgres | Provável legado | **Não** | 6 modelos simples, env `POSTGRES_DATABASE_URL` | BL-056 |
| `backend/prisma/migrations/` | Pasta de migrations | Histórico de alterações no schema ativo | Ativo | **Sim** | 30 migrations de 20260514 a 20260529 | — |
| `backend/prisma/seed.sql` | SQL seed | Dados fictícios dev (clientes, processos, tarefas) | Ativo para dev | Não (dev only) | Roles divergentes do sistema | Validar roles |
| `backend/prisma/seed-finance.sql` | SQL seed | Seed financeiro — conteúdo não verificado | Desconhecido | Não (dev only) | — | Verificar conteúdo |
| `backend/prisma/seed-finance.ts` | TypeScript seed | Seed financeiro via PrismaClient | Ativo para dev | Não (dev only) | Sem credenciais hardcoded aparentes | — |
| `backend/prisma/schema_init.sql` | SQL init | Setup inicial do banco antes das migrations | Artefato de migração | **Não** | Contém DDL de tabelas completas — pode ser sobreposto pelas migrations | BL-055 |
| `backend/prisma/dev.db` | SQLite DB | Banco legado local SQLite | Legado | **Não** | Ainda presente localmente; não usado em produção | Pode ser arquivado/gitignored |
| `backend/prisma.config.ts` | Config Prisma | Config ativa do backend — aponta para `prisma/schema.prisma` (relativo) | Ativo | **Sim** | Lido pelo Prisma CLI quando executado no contexto `backend/` | — |
| `prisma.config.ts` (raiz) | Config Prisma | Delegate config da raiz — aponta para `backend/prisma/schema.prisma` | Ativo | **Sim** | Comentário explica delegação ao backend sovereign schema | — |
| `prisma/schema.prisma` (raiz) | Schema Prisma | Placeholder / resíduo | Provável legado | **Não** | Sem modelos, sem datasource URL, generator aponta para `../generated/prisma` | BL-007 |
| `prisma-postgres/` | Pasta | Referenciada em scripts `prisma:cutover:*` | **Não existe** | **Não** | Pasta ausente fisicamente — scripts quebrados | BL-055 |

---

## 5. Schema Prisma Ativo

**Arquivo:** `backend/prisma/schema.prisma`

### Configuração

| Campo | Valor |
|---|---|
| Provider | `postgresql` |
| Datasource URL | `env("DATABASE_URL")` |
| Generator | `prisma-client-js` |
| Client output | Padrão (node_modules) |

### Modelos por Domínio

| Modelo/Enum | Domínio | Papel | Relações principais | Risco | Ponto a validar |
|---|---|---|---|---|---|
| `User` | Auth / Membership | Identidade global do usuário | CompanyMembership, TimeEntry, Notification | Role como `String` (sem enum) — validação manual | Quais roles existem de fato no banco |
| `CompanyStatus` (enum) | Multi-tenancy | Status do tenant | Company | — | — |
| `SubscriptionStatus` (enum) | SaaS Billing | Status da assinatura | Subscription | — | — |
| `Company` | Multi-tenancy | Empresa/tenant | CompanyMembership, Subscription, BillingInvoice | @@unique([name]) duplica name e slug | — |
| `Plan` | SaaS Billing | Plano do produto | Subscription | — | — |
| `Subscription` | SaaS Billing | Assinatura empresa×plano | Company, Plan, SubscriptionTransition | — | — |
| `SubscriptionTransition` | SaaS Billing | Histórico de transições de status | Subscription | idempotencyKey para deduplicação | — |
| `CompanyMembership` | Multi-tenancy | Vínculo usuário×empresa + role | User, Company | role como String (sem enum) | Quais roles de membership existem |
| `Team` | Org Structure | Equipe jurídica | TeamMember, Portfolio, Task, Atendimento | — | — |
| `TeamMember` | Org Structure | Membro de equipe | Team, User | role como String | — |
| `Portfolio` | Org Structure | Carteira de clientes | Team, User (primary/backup), Task, Atendimento | — | — |
| `PortfolioMember` | Org Structure | Membro de carteira | Portfolio, User | — | — |
| `Client` | CRM / Operacional | Cliente da empresa jurídica | Process, Atendimento, Task, financeEntries, etc. | **Sem companyId** — isolamento por scope | BL-045 / multi-tenancy |
| `Process` | Processos | Processo jurídico | Client, User (owner), andamentos, prazos, publicações, etc. | **Sem companyId** | Multi-tenancy |
| `Publication` | Publicações | Publicação judicial | Process, Client | convertedToDeadline, correlationId | — |
| `PublicationCapture` | Publicações / Pipeline | Captura bruta de publicação | PublicationSourceJob, PublicationEvent, TriageItem | fingerprint único | — |
| `PublicationEvent` | Publicações / Pipeline | Evento de publicação normalizado | PublicationCapture, Process, Client, Publication, TriageItem | — | — |
| `PublicationSourceJob` | Publicações / Pipeline | Job de captura | PublicationCapture | — | — |
| `CrmLead` | CRM | Lead de negócio | Client, CrmContactEvent, TriageItem | **Sem companyId** | — |
| `CrmOpportunity` | CRM | Oportunidade de negócio | Client, CrmContactEvent, documentAttachments, TriageItem | **Sem companyId** | — |
| `CrmContactEvent` | CRM | Evento de contato no CRM | CrmLead, CrmOpportunity | — | — |
| `CrmOpportunityDocumentAttachment` | CRM / Documentos | Anexo de documento à oportunidade | CrmOpportunity, Documento | — | — |
| `CrmAuditEvent` | CRM / Audit | Evento de auditoria do CRM | — | id: String (UUID?) | — |
| `CrmIdempotencyRequest` | CRM / Idempotência | Deduplicação de requests CRM | — | — | — |
| `TriageItem` | Triagem | Item de triagem de publicação | PublicationCapture, PublicationEvent, Process, Client, CrmLead, CrmOpportunity | **Sem companyId** | — |
| `TriageDecision` | Triagem | Decisão tomada em triagem | TriageItem | generatedTaskId, generatedDeadlineId, etc. | — |
| `Andamento` | Processos | Andamento/histórico de processo | Process | — | — |
| `Prazo` | Deadlines | Prazo jurídico | Process, AgendaEvent | agendaSyncStatus — integração bidirecional | — |
| `Documento` | Documentos | Documento/checklist de processo | Process, CrmOpportunityDocumentAttachment | previewUrl — storage indefinido | BL-045 |
| `Atendimento` | Atendimentos | Atendimento ao cliente | Process, Client, User, Team, Portfolio, AgendaEvent, TimeEntry | SLA (slaTargetAt, slaBreachedAt) | — |
| `AttendanceHistory` | Atendimentos | Histórico de atendimento | Atendimento | idempotencyKey | — |
| `Task` | Tarefas | Tarefa operacional | Process, Client, User, Team, Portfolio, AgendaEvent, TimeEntry | followupState, SLA | — |
| `TaskLink` | Tarefas | Link de tarefa com entidade | Task | — | — |
| `TaskFollowupSchedule` | Tarefas | Agendamento de followup | Task | dedupeKey único, channel | — |
| `TaskHistory` | Tarefas | Histórico de tarefa | Task | — | — |
| `WorkAuditEvent` | Tarefas / Atendimentos | Evento de auditoria work | — | — | — |
| `WorkIdempotencyRequest` | Tarefas / Atendimentos | Deduplicação work | — | — | — |
| `AiExecution` | IA | Execução de IA (comando AI) | AiExecutionTarget | idempotencyKey, guardrailStatus, estimatedCostUsd | — |
| `AiExecutionTarget` | IA | Alvo de execução de IA | AiExecution | — | — |
| `AiBudgetLedger` | IA | Controle de orçamento IA | — | softLimitUsd, hardLimitUsd | — |
| `BiMetricDefinition` | BI | Definição de métrica BI | — | version, active | — |
| `BiMetricSnapshot` | BI | Snapshot de métrica BI | — | dimensions, series (Json) | — |
| `BiExportJob` | BI | Job de exportação BI | — | artifactPath — storage indefinido | BL-045 |
| `TimeEntry` | Timesheet | Entrada de tempo | User, Team, Portfolio, Client, Process, Task, Atendimento, AgendaEvent | billable, approvals, conflicts | — |
| `TimeEntryApproval` | Timesheet | Aprovação de entrada de tempo | TimeEntry, User | — | — |
| `TimesheetClosure` | Timesheet | Fechamento de timesheet | User | @@unique por scope/period | — |
| `TimeEntryConflict` | Timesheet | Conflito de sobreposição | TimeEntry | fingerprint único | — |
| `TimeEntryFinanceLink` | Timesheet / Finance | Link timesheet→finança | TimeEntry, FinanceEntry | — | — |
| `ProductivitySnapshot` | Timesheet / BI | Snapshot de produtividade | — | — | — |
| `AgendaEvent` | Agenda | Evento de agenda | Process, Client, Atendimento, Task, TimeEntry | bidirecional com Prazo | — |
| `Template` | Templates | Template de peça jurídica | — | tags/placeholders como Json | — |
| `FinanceCategory` | Finance | Categoria financeira | FinanceEntry, FinanceInstallmentPlan | — | — |
| `FinanceEntry` | Finance | Lançamento financeiro (receita/despesa) | Client, Process, FinanceInstallmentPlan, FinanceCharge, TimeEntryFinanceLink | amountCents (centavos) | — |
| `FinanceInstallmentPlan` | Finance | Plano de parcelamento | Client, Process, FinanceCategory, FinanceEntry | — | — |
| `FinanceCharge` | Finance | Cobrança (PIX, boleto, link) | FinanceEntry | provider: "mock" default — produção real? | Confirmar provider |
| `FinanceChargeEvent` | Finance | Evento de cobrança | FinanceCharge | — | — |
| `FinanceReconciliationRun` | Finance | Conciliação bancária | FinanceReconciliationMatch | — | — |
| `FinanceReconciliationMatch` | Finance | Match de conciliação | FinanceReconciliationRun, FinanceEntry | — | — |
| `FinanceCollectionSchedule` | Finance | Régua de cobrança | FinanceEntry, FinanceCollectionAttempt | nextRunAt, active | — |
| `FinanceCollectionAttempt` | Finance | Tentativa de cobrança | FinanceCollectionSchedule | — | — |
| `FinanceAuditEvent` | Finance | Auditoria financeira | — | — | — |
| `FinanceIdempotencyRequest` | Finance | Deduplicação finance | — | — | — |
| `BillingInvoice` | SaaS Billing | Fatura SaaS | Company | — | — |
| `PaymentAttempt` | SaaS Billing | Tentativa de pagamento SaaS | BillingInvoice, Company | — | — |
| `BillingEvent` | SaaS Billing | Evento de billing SaaS | Company, BillingInvoice, PaymentAttempt | — | — |
| `Notification` | Notificações | Notificação ao usuário | User | **Endpoints usam mock em memória, não este modelo** | BL-046 |

---

## 6. Multi-tenancy, Escopo por Empresa e Isolamento de Dados

| Entidade/Regra | Evidência | Como isola dados | Risco | Ponto a validar |
|---|---|---|---|---|
| `Company` | Modelo no schema com status enum | Entidade raiz do tenant | Status (read_only, suspended) deve bloquear operações | — |
| `CompanyMembership` | Modelo com companyId + userId + role + active | Vínculo explícito usuário×empresa | role como String — sem enum tipado | Quais roles existem de fato |
| `CompanyStatus` enum | active, grace_period, read_only, suspended, cancelled | Status determina acesso ao tenant | Middleware deve checar status em toda requisição | — |
| `foundation-multitenant.contract.json` | Decisão: `global_identity_with_company_membership` + `hybrid_request_context_and_repository_helpers` | Scope por context de request + helpers de repositório | Dependência de middleware correto em **todos** os endpoints | Validar cobertura de companyScope em main.ts |
| `company-scope-prisma.adapter.ts` | Identificado em KB-003C | Adapter de scope por company para queries Prisma | Se não aplicado em endpoint, dados cross-tenant vazam | Confirmar aplicação em todos os domínios |
| Modelos operacionais sem companyId | `Client`, `Process`, `Task`, `Atendimento`, `CrmLead`, `CrmOpportunity`, `TriageItem`, `Publication` não têm companyId | Isolamento via scope de request, não via FK | **Risco alto**: qualquer endpoint sem companyScope pode expor dados cross-tenant | Auditoria de cobertura de companyScope |
| `auth/auth-claims.ts` | Claims incluem `companyId` e `membershipId` | JWT carrega contexto de empresa | Auth antiga (`auth.ts`) **não inclui companyId** — tokens antigos sem contexto de empresa | BL-048 |

---

## 7. Schemas Paralelos, Legados ou Alternativos

| Item | Evidência | Papel provável | Status recomendado | Risco | Próximo passo |
|---|---|---|---|---|---|
| `backend/prisma/schema.postgres.prisma` | 6 modelos básicos (User, Process, Andamento, Prazo, Documento, Atendimento), env `POSTGRES_DATABASE_URL` | Schema de transição criado durante migração SQLite→PostgreSQL; antes da adoção do schema atual | Provável legado — artefato de migração | Scripts `prisma:postgres:*` ainda apontam para ele — confusão | BL-056: validar e arquivar se confirmado legado |
| `prisma/schema.prisma` (raiz) | Quase vazio: generator com output `../generated/prisma`, datasource postgresql sem url, **sem modelos** | Placeholder ou resíduo de tentativa inicial | Provável legado | Pode ser executado acidentalmente se CWD for raiz | BL-007: validar e remover/arquivar |
| `prisma-postgres/` (pasta) | Referenciada em 5 scripts `prisma:cutover:*`, mas **não existe fisicamente** | Seria o schema de cutover/destino final de migração — nunca criado ou foi apagado | Não encontrado — scripts quebrados | Scripts `prisma:cutover:*` falham se executados | BL-055: documentar e remover scripts ou criar pasta |
| `backend/prisma/schema_init.sql` | SQL com CREATE TABLE e enums (Company, User, etc.) — parece setup inicial completo | SQL de inicialização antes das migrations Prisma, ou alternativa para setup rápido | Artefato de migração | Pode criar tabelas sem FK constraints corretos; não deve ser usado junto com Prisma migrations | BL-055: verificar se ainda é necessário |
| `backend/prisma/dev.db` | Arquivo SQLite presente em `backend/prisma/` | Banco local SQLite legado — usava durante fase de desenvolvimento antes de PostgreSQL | Legado local — precisa de validação | Existência confirma resíduo SQLite; não é usado em produção | Adicionar ao `.gitignore` local ou remover |

---

## 8. Configuração Prisma

| Config/Script | Caminho | Aponta para | Papel | Risco | Ponto a validar |
|---|---|---|---|---|---|
| `backend/prisma.config.ts` | `backend/prisma.config.ts` | `prisma/schema.prisma` (relativo = `backend/prisma/schema.prisma`) + `prisma/migrations` | Config ativa para CLI executado no contexto `backend/` | — | Config ativa confirmada |
| `prisma.config.ts` raiz | `prisma.config.ts` | `backend/prisma/schema.prisma` + `backend/prisma/migrations` | Config ativa para CLI executado na raiz | Comentário explica delegação | Config ativa confirmada |
| `start` script | `backend/package.json` | `prisma migrate deploy --schema=prisma/schema.prisma` + `node dist/main.js` | Startup do servidor — aplica migrations antes de iniciar | Se falhar, servidor não sobe | — |
| `prisma:generate` | `backend/package.json` | `prisma/schema.prisma` | Gera Prisma Client | — | — |
| `prisma:migrate:dev` | `backend/package.json` | `prisma/schema.prisma` | Migration em dev | — | — |
| `prisma:migrate:deploy` | `backend/package.json` | `prisma/schema.prisma` | Migration em CI/prod | Usado em CI | — |
| `prisma:postgres:validate` | `backend/package.json` | `prisma/schema.postgres.prisma` | Valida schema alternativo | Schema alternativo provavelmente legado | BL-056 |
| `prisma:postgres:generate` | `backend/package.json` | `prisma/schema.postgres.prisma` | Gera client do schema alternativo | — | BL-056 |
| `prisma:cutover:validate` | `backend/package.json` | `prisma-postgres/schema.prisma` | **Pasta não existe — script quebrado** | Qualquer execução falha | BL-055 |
| `prisma:cutover:generate` | `backend/package.json` | `prisma-postgres/schema.prisma` | **Pasta não existe — script quebrado** | — | BL-055 |
| `prisma:cutover:status` | `backend/package.json` | `prisma-postgres/schema.prisma` | **Pasta não existe — script quebrado** | — | BL-055 |
| `prisma:cutover:migrate:create` | `backend/package.json` | `prisma-postgres/schema.prisma` | **Pasta não existe — script quebrado** | — | BL-055 |
| `prisma:cutover:migrate:dev` | `backend/package.json` | `prisma-postgres/schema.prisma` | **Pasta não existe — script quebrado** | — | BL-055 |
| `db:seed:finance` | `backend/package.json` | `prisma/seed-finance.ts` | Executa seed financeiro via ts-node | — | — |

**Configuração ativa**: `backend/prisma.config.ts` e `prisma.config.ts` da raiz apontam ambos para o mesmo schema/migrations. São consistentes entre si.

---

## 9. Migrations

**Pasta:** `backend/prisma/migrations/`
**Total:** 30 migrations | **Provider:** postgresql (migration_lock.toml)

| Migration | Data | Domínio provável | O que adiciona/altera | Observações | Ponto a validar |
|---|---|---|---|---|---|
| `20260514224911_init_postgres` | 2026-05-14 | Core | User, Process, Andamento, Prazo, Documento, Atendimento | Baseline inicial PostgreSQL | — |
| `20260515042000_add_clients` | 2026-05-15 | Clients | Modelo Client | — | — |
| `20260515053000_expand_attendances` | 2026-05-15 | Atendimentos | Expansão do modelo Atendimento | — | — |
| `20260515064500_add_tasks` | 2026-05-15 | Tasks | Modelo Task | — | — |
| `20260515080000_add_agenda_events` | 2026-05-15 | Agenda | Modelo AgendaEvent | — | — |
| `20260515102000_expand_deadlines` | 2026-05-15 | Deadlines | Expansão de Prazo | — | — |
| `20260515104500_expand_documents` | 2026-05-15 | Documentos | Expansão de Documento | — | — |
| `20260515113000_add_process_number_lookup` | 2026-05-15 | Processos | processNumber e lookup | Integração DataJud CNJ | — |
| `20260515120500_add_publications` | 2026-05-15 | Publicações | Modelo Publication | — | — |
| `20260516001000_add_templates` | 2026-05-16 | Templates | Modelo Template | — | — |
| `20260516103000_publication_deadline_link` | 2026-05-16 | Publicações / Deadlines | Link Publication → Prazo | — | — |
| `20260516120000_add_triage_domain` | 2026-05-16 | Triagem | TriageItem, TriageDecision, PublicationCapture, PublicationEvent, PublicationSourceJob | Domínio completo de triagem | — |
| `20260516133000_add_crm_contact_history` | 2026-05-16 | CRM | CrmContactEvent | — | — |
| `20260517003000_add_crm_converted_process_id` | 2026-05-17 | CRM | convertedProcessId em Opportunity | — | — |
| `20260521103000_add_crm_audit_and_opportunity_attachments` | 2026-05-21 | CRM / Audit | CrmAuditEvent, CrmIdempotencyRequest, CrmOpportunityDocumentAttachment | — | — |
| `20260521120000_add_finance_epic_b` | 2026-05-21 | Finance | FinanceCategory, FinanceEntry, FinanceCharge, FinanceChargeEvent, FinanceReconciliationRun, FinanceReconciliationMatch, FinanceCollectionSchedule, FinanceCollectionAttempt, FinanceAuditEvent, FinanceIdempotencyRequest | Epic B completo | — |
| `20260521170000_add_finance_installment_plans` | 2026-05-21 | Finance | FinanceInstallmentPlan | — | — |
| `20260525070000_epic_ij_foundations` | 2026-05-25 | IA / BI / Timesheet | AiExecution, AiExecutionTarget, AiBudgetLedger, BiMetricDefinition, BiMetricSnapshot, BiExportJob, TimeEntry, TimeEntryApproval, TimesheetClosure, TimeEntryConflict, TimeEntryFinanceLink, ProductivitySnapshot, WorkAuditEvent, WorkIdempotencyRequest, TaskHistory, AttendanceHistory, etc. | Epic IJ — domínios complexos | — |
| `20260526123000_epic_klm_foundations` | 2026-05-26 | Org Structure | Team, TeamMember, Portfolio, PortfolioMember | Épic KLM | — |
| `20260526140000_publication_origin_rework` | 2026-05-26 | Publicações | Rework do modelo Publication (origin, correlationId, sourceType, etc.) | — | — |
| `20260527103000_add_company_membership_domain` | 2026-05-27 | Multi-tenancy | Company, CompanyMembership, CompanyStatus enum | Fundação SaaS multiempresa | — |
| `20260527121500_add_platform_billing_saas` | 2026-05-27 | SaaS Billing | Plan, Subscription, SubscriptionTransition, BillingInvoice, PaymentAttempt, BillingEvent, SubscriptionStatus enum | Billing SaaS completo | — |
| `20260527183000_add_plan_subscription_domain` | 2026-05-27 | SaaS Billing | Expansão do domínio de subscription | — | — |
| `20260529000000_add_user_avatar_phone_notification` | 2026-05-29 | Auth / Notificações | avatarUrl, phone em User; modelo Notification | Notification criado no banco — mas endpoints ainda usam mock | BL-046 |
| `20260529100000_add_process_area` | 2026-05-29 | Processos | Campo `area` em Process | — | — |
| Demais migrations não lidas | — | Vários | — | 5 migrations intermediárias não lidas individualmente | — |

**Observação crítica**: A migration `20260529000000_add_user_avatar_phone_notification` cria o modelo `Notification` no banco, mas o KB-003C confirmou que os endpoints de notificação usam `devMockNotifications` em memória. A tabela existe no banco mas **não é consumida pelos endpoints**.

---

## 10. Seeds

| Seed/Script | Caminho | Papel | Dados sensíveis? | Risco | Ponto a validar |
|---|---|---|---|---|---|
| `seed.sql` | `backend/prisma/seed.sql` | Dados fictícios dev: 3 usuários, 10 clientes, 10 processos, documentos, prazos, tarefas, atendimentos, publicações | **Sim** — hashes bcrypt presentes (aceitável para dev) | Roles no seed (`admin`, `coordinator`, `assistant`) divergem dos roles reais (`ADM`, `ADV`, `FIN`, `ATD`) — seed pode falhar em validações de role | Validar roles com sistema real |
| `seed-finance.ts` | `backend/prisma/seed-finance.ts` | Seed financeiro com ~60 lançamentos + 3 planos de parcelamento via PrismaClient | Não aparente | Depende de clientes/processos já serem seeded | Verificar se seed.sql deve ser executado antes |
| `seed-finance.sql` | `backend/prisma/seed-finance.sql` | Seed financeiro SQL — conteúdo não verificado | Desconhecido | — | Verificar conteúdo e relação com seed-finance.ts |
| `db:seed:finance` script | `backend/package.json` | Executa seed-finance.ts via ts-node | — | Roda em qualquer ambiente se DATABASE_URL estiver configurada | Adicionar guarda de ambiente |
| `/admin/seed-finance` endpoint | `backend/src/main.ts` | Endpoint para seed em dev | **Sim** — credenciais de acesso por role check | Role check usa `actor.role !== 'admin'` (lowercase) enquanto roles reais são `ADM`, `ADV`, etc. — **bug de autorização** (BL-041) | Verificar role check |
| `schema_init.sql` | `backend/prisma/schema_init.sql` | SQL de inicialização antes das migrations; contém DDL completo sem migrations | Não | Usar junto com migrations pode causar conflito | Verificar necessidade |

---

## 11. Contratos Backend

| Contrato backend | Caminho | Domínio | Papel | Relação com Prisma | Relação com frontend | Risco |
|---|---|---|---|---|---|---|
| `finance.contract.ts` | `backend/src/finance.contract.ts` | Finance | Tipos internos (`RawFinanceEntry`, `RawFinanceCharge`, etc.) e funções de build de payload | Mapeia campos do modelo Prisma para payload da API | Alinha com `ApiFinanceEntry`, `ApiFinanceCharge` em `api.ts` | Tipagem de `status` como `String` no Prisma vs enum literal no frontend |
| `documents.contract.ts` | `backend/src/documents.contract.ts` | Documentos | Função `buildDocumentPayload` — transformação de `RawDocumentRecord` para payload da API | Campo `previewUrl` mapeia diretamente do Prisma | Alinha com tipos de documento no frontend | `previewUrl` pode ser indefinida — storage adapter não confirmado |
| `crm.contract.ts` | `backend/src/crm.contract.ts` | CRM | Tipos `TriageOriginRecord`, `OriginReferenceRecord`, `RawCrmLead` | Mapeia CrmLead e CrmOpportunity | Parcialmente alinhado | — |
| `triage.contract.ts` | `backend/src/triage.contract.ts` | Triagem | Tipo `RawTriageItem` com campos de prioridade, SLA, fila | Mapeia TriageItem do Prisma | Alinha com tela de triagem | Campos como `priorityScore`, `priorityLabel`, `priorityReasons` e `queueRank` **não existem no schema Prisma** — calculados em runtime |
| `agenda.contract.ts` | `backend/src/agenda.contract.ts` | Agenda | Contratos do domínio de agenda | Mapeia AgendaEvent | — | — |
| `deadlines.contract.ts` | `backend/src/deadlines.contract.ts` | Deadlines | Contratos de prazos | Mapeia Prazo | — | — |
| `publications.contract.ts` | `backend/src/publications.contract.ts` | Publicações | Contratos de publicações | Mapeia Publication, PublicationCapture | — | — |
| `tasks.contract.ts` | `backend/src/tasks.contract.ts` | Tasks | Contratos de tarefas | Mapeia Task | — | — |
| `templates.contract.ts` | `backend/src/templates.contract.ts` | Templates | Contratos de templates | Mapeia Template | — | — |

**Padrão identificado**: Os contratos backend são arquivos TypeScript com tipos internos e funções de transformação (`buildXxxPayload`). Não são DTOs com decorators, nem validadores globais, nem classes de schema. São transformadores de dados de Prisma para payload de resposta HTTP.

**Domínios sem contract.ts identificado**: Auth, Users, Clients, Processes, Company, Platform, Notification, BI, Timesheet, Teams, Portfolios.

---

## 12. Tipos e Contratos no Frontend

**Arquivo:** `frontend/src/api.ts` (parcialmente lido — primeiros 100 linhas)

| Tipo/método frontend | Domínio | Endpoint relacionado | Contrato backend correspondente | Status | Ponto a validar |
|---|---|---|---|---|---|
| `ApiUser` | Auth / Users | `/auth/me` | Sem contract.ts dedicado | Alinhado (id, email, role) | `role` como string — sem enum tipado |
| `ApiFinancePermission` | Finance | — | `finance.contract.ts` | Alinhado | — |
| `ApiFinanceCategory` | Finance | `/finance/categories` | `finance.contract.ts` | Alinhado | `active`, `sortOrder` — verificar se backend retorna esses campos |
| `ApiFinanceEntry` | Finance | `/finance/entries` | `finance.contract.ts` | Parcialmente alinhado | `chargeStatus`, `billingMethod` — campos derivados, não no Prisma diretamente |
| `ApiFinanceCharge` | Finance | `/finance/entries/:id/charges` | `finance.contract.ts` | Alinhado | — |
| `ApiFinanceAuditEvent` | Finance | `/finance/audit` | `finance.contract.ts` | Alinhado | — |
| `ApiFinanceAgingBucket` | Finance | `/finance/aging` | `finance.contract.ts` | Precisa de comparação campo a campo | — |
| Tipos de Notificação | Notificações | `/notifications` | Sem contract.ts | Precisa de comparação | Endpoints usam mock — tipos podem divergir do modelo Prisma |
| Tipos de CRM | CRM | `/crm/*` | `crm.contract.ts` | Precisa de comparação campo a campo | — |
| Tipos de Triagem | Triagem | `/triage/*` | `triage.contract.ts` | Precisa de comparação campo a campo | Campos calculados não existem no Prisma |
| Tipos de Processo | Processos | `/processes/*` | Sem contract.ts | Precisa de validação | — |
| Tipos de Documento | Documentos | `/documents/*` | `documents.contract.ts` | Parcialmente alinhado | `previewUrl` depende de storage adapter |
| `getNotificationCount()` | Notificações | `/notifications/count` | Sem contract.ts | Precisa validar | Endpoint usa mock — dado não persiste |

---

## 13. Contratos JSON

**Pasta:** `contracts/` — **12 arquivos JSON**

| Arquivo JSON | Domínio/Fase | Papel aparente | Alinha com backend? | Alinha com frontend? | Status recomendado | Ponto a validar |
|---|---|---|---|---|---|---|
| `foundation-multitenant.contract.json` | Fase 1 — Fundação SaaS Multiempresa | Decisões de design e validação: `company.create`, `company.updateStatus`, cenários de integração | Parcialmente — decisões refletem o que foi implementado | Não verificado | Candidato a documentação auxiliar / histórico de design | Comparar com implementação real |
| `epic-a-publications.contract.json` | Epic A — Publicações | Contratos de design do epic de publicações | Parcialmente | Não verificado | Candidato a documentação auxiliar | — |
| `epic-b-finance.contract.json` | Epic B — Finance | Contratos de design do epic financeiro | Parcialmente | Não verificado | Candidato a documentação auxiliar | — |
| `epic-fgh.contract.json` | Epic FGH | Contratos de design dos epics FGH | Não verificado | Não verificado | Candidato a documentação auxiliar | — |
| `epic-ij.contract.json` | Epic IJ | Contratos de design dos epics IJ (IA, BI) | Não verificado | Não verificado | Candidato a documentação auxiliar | — |
| `epic-k.contract.json` | Epic K | Contratos de design do epic K | Não verificado | Não verificado | Candidato a documentação auxiliar | — |
| `epic-l-bi.contract.json` | Epic L — BI | Contratos de design do epic BI | Não verificado | Não verificado | Candidato a documentação auxiliar | — |
| `epic-m.contract.json` | Epic M | Contratos de design do epic M | Não verificado | Não verificado | Candidato a documentação auxiliar | — |
| `publication-origin-rework.contract.json` | Rework de origem de publicações | Contratos do rework de publicações | Não verificado | Não verificado | Candidato a documentação auxiliar | — |
| `fase-2-commercial-governance.contract.json` | Fase 2 — Governança Comercial | Contratos de design da fase 2 | Não verificado | Não verificado | Candidato a documentação auxiliar | — |
| `fase-3-platform-console.contract.json` | Fase 3 — Platform Console | Contratos de design da fase 3 | Não verificado | Não verificado | Candidato a documentação auxiliar | — |
| `fase-3-rollout-enforcement.contract.json` | Fase 3 — Rollout | Contratos do rollout enforcement | Não verificado | Não verificado | Candidato a documentação auxiliar | — |

**Observação**: Os contratos JSON parecem ser **contratos de design por epic/fase**, com decisões estruturais, cenários de validação e inputs/outputs de comandos. **Não são contratos de API HTTP diretamente** — são artefatos de design que precedem a implementação. A fonte de verdade para contratos de API HTTP é o código.

---

## 14. Contratos Markdown

**10 arquivos encontrados em `docs/*/contracts.md`**

| Arquivo Markdown | Local | Domínio/Fase | Papel aparente | Diverge do código? | Status recomendado | Ponto a validar |
|---|---|---|---|---|---|---|
| `docs/epic-a/contracts.md` | `docs/epic-a/` | Epic A — Publicações | Documentação de contratos do epic | Não verificado | Candidato a documentação auxiliar | Comparar com `publications.contract.ts` |
| `docs/epic-b/contracts.md` | `docs/epic-b/` | Epic B — Finance | Documentação de contratos do epic | Não verificado | Candidato a documentação auxiliar | Comparar com `finance.contract.ts` |
| `docs/epic-cde/contracts.md` | `docs/epic-cde/` | Epic CDE | Documentação de contratos dos epics CDE | Não verificado | Candidato a documentação auxiliar | — |
| `docs/epic-fgh/contracts.md` | `docs/epic-fgh/` | Epic FGH | Documentação de contratos dos epics FGH | Não verificado | Candidato a documentação auxiliar | — |
| `docs/epic-ij/contracts.md` | `docs/epic-ij/` | Epic IJ | Documentação de contratos dos epics IJ | Não verificado | Candidato a documentação auxiliar | — |
| `docs/epic-klm/contracts.md` | `docs/epic-klm/` | Epic KLM | Documentação de contratos dos epics KLM | Não verificado | Candidato a documentação auxiliar | — |
| `docs/publication-origin-rework/contracts.md` | `docs/publication-origin-rework/` | Rework publicações | Documentação do rework | Não verificado | Candidato a documentação auxiliar | — |
| `docs/fase-1-foundation/contracts.md` | `docs/fase-1-foundation/` | Fase 1 — Fundação | Documentação da fase 1 | Não verificado | Candidato a documentação auxiliar | — |
| `docs/fase-2-commercial-governance/contracts.md` | `docs/fase-2-commercial-governance/` | Fase 2 | Documentação da fase 2 | Não verificado | Candidato a documentação auxiliar | — |
| `docs/fase-3-platform-console/contracts.md` | `docs/fase-3-platform-console/` | Fase 3 | Documentação da fase 3 | Não verificado | Candidato a documentação auxiliar | — |

**Observação**: Os contratos Markdown parecem ser documentação de design e especificação por epic/fase — paralelo aos contratos JSON. Nenhum foi lido na íntegra nesta etapa. Status real e divergência com o código precisam ser verificados no KB-003G.

---

## 15. Comparação Inicial: Prisma × Backend Contracts × Frontend Types × JSON/Markdown

| Domínio | Prisma | Backend contract.ts | Frontend api.ts | JSON contract | Markdown contract | Status geral | Risco |
|---|---|---|---|---|---|---|---|
| Auth | User, CompanyMembership | Sem contract.ts | ApiUser | foundation-multitenant | fase-1-foundation | Parcialmente alinhado | Dois arquivos auth com claims divergentes |
| Users | User, CompanyMembership | Sem contract.ts | ApiUser | — | — | Parcialmente alinhado | — |
| Company | Company, CompanyStatus, CompanyMembership | Sem contract.ts | — | foundation-multitenant | fase-1-foundation | Precisa de validação | Sem companyId em modelos operacionais |
| Clients | Client | Sem contract.ts | Tipos em api.ts | epic-cde | epic-cde | Precisa de comparação campo a campo | — |
| Processes | Process, Andamento, Prazo | Sem contract.ts | Tipos em api.ts | epic-a, epic-cde | epic-cde, epic-a | Precisa de comparação campo a campo | — |
| Attendances | Atendimento, AttendanceHistory | Sem contract.ts | Tipos em api.ts | epic-cde | epic-cde | Precisa de comparação | SLA fields |
| Deadlines | Prazo | `deadlines.contract.ts` | Tipos em api.ts | epic-cde | epic-cde | Parcialmente alinhado | — |
| Documents | Documento | `documents.contract.ts` | Tipos em api.ts | epic-fgh | epic-fgh | Parcialmente alinhado | previewUrl + storage adapter |
| CRM | CrmLead, CrmOpportunity, CrmContactEvent, CrmAuditEvent, CrmIdempotencyRequest | `crm.contract.ts` | Tipos em api.ts | epic-fgh | epic-fgh | Parcialmente alinhado | Sem companyId |
| Publications | Publication, PublicationCapture, PublicationEvent, PublicationSourceJob | `publications.contract.ts` | Tipos em api.ts | epic-a, publication-origin-rework | epic-a, publication-origin-rework | Alinhado (parcial) | — |
| Triage | TriageItem, TriageDecision | `triage.contract.ts` | Tipos em api.ts | epic-fgh | epic-fgh | Parcialmente alinhado | Campos calculados não no Prisma |
| Templates | Template | `templates.contract.ts` | Tipos em api.ts | epic-fgh | epic-fgh | Precisa de validação | — |
| Tasks | Task, TaskLink, TaskFollowupSchedule, TaskHistory | `tasks.contract.ts` | Tipos em api.ts | epic-cde, epic-ij | epic-cde, epic-ij | Parcialmente alinhado | — |
| Agenda | AgendaEvent | `agenda.contract.ts` | Tipos em api.ts | epic-cde | epic-cde | Precisa de comparação | — |
| Finance | FinanceEntry, FinanceCharge, etc. | `finance.contract.ts` | ApiFinanceEntry, ApiFinanceCharge | epic-b | epic-b | Alinhado (parcial) | chargeStatus + billingMethod derivados |
| BI | BiMetricDefinition, BiMetricSnapshot, BiExportJob | Sem contract.ts | Tipos em api.ts | epic-ij, epic-l-bi | epic-ij | Precisa de validação | artifactPath — storage |
| Platform | Sem modelo específico | Sem contract.ts | Tipos em api.ts | fase-3-platform-console | fase-3-platform-console | Precisa de validação | — |
| Timesheet | TimeEntry, TimeEntryApproval, TimesheetClosure, etc. | Sem contract.ts | Tipos em api.ts | epic-ij | epic-ij | Precisa de validação | — |
| Mobile | Não identificado | Não identificado | Não verificado | epic-m | — | Desconhecido | — |
| AI | AiExecution, AiExecutionTarget, AiBudgetLedger | Sem contract.ts | Tipos em api.ts | epic-ij | epic-ij | Precisa de validação | — |
| Notifications | Notification | Sem contract.ts | `getNotificationCount()` | — | — | **Divergência crítica** | Endpoints usam mock em memória |

---

## 16. Storage de Documentos

| Evidência | Local | Interpretação | Risco | Próximo passo |
|---|---|---|---|---|
| Campo `previewUrl` em `Documento` | `backend/prisma/schema.prisma` | URL de acesso ao arquivo armazenado | Se for disco local no Render, URL pode ser interna/inválida externamente | Confirmar origem da URL |
| `DocumentUploadService` com `storageAdapter` injetado | `backend/src/documents/upload/document-upload.service.ts` | Padrão de port/adapter — implementação concreta não definida aqui | **Implementação concreta de storage não identificada** nesta etapa | Buscar instanciação do DocumentUploadService em main.ts |
| Interface `DocumentUploadStorageAdapter` | `backend/src/documents/upload/document-upload.types.ts` | Port de storage: `store()` retorna `storageKey`, `mimeType`, `sizeInBytes`, `previewUrl` | `storageKey` pode ser um path de disco ou uma chave cloud | Identificar implementação concreta |
| `StoredDocumentFile.storageKey` | `backend/src/documents/upload/document-upload.types.ts` | Chave de armazenamento — pode ser path de disco (`/uploads/...`) ou chave de bucket | Disco local no Render não é persistente entre deploys | Confirmar implementação |
| `BiExportJob.artifactPath` | `backend/prisma/schema.prisma` | Path de artefato de exportação BI | Mesmo risco de disco local | — |
| `seed.sql` — campo `previewUrl` não aparece | `backend/prisma/seed.sql` | Seed de Documento sem previewUrl | — | — |

**Conclusão para BL-045**: A arquitetura de upload usa um pattern correto (port/adapter), mas a implementação concreta do `storageAdapter` não foi identificada nesta etapa. Risco alto se for disco local no Render (não persistente). Requer leitura adicional em `main.ts` ou em `src/documents/`.

---

## 17. Notificações: Banco vs Mock/Dev Memory

| Evidência | Local | Interpretação | Risco | Próximo passo |
|---|---|---|---|---|
| `devMockNotifications` declarado | `backend/src/main.ts:144` | Array em memória com notificações fictícias | Não persiste — perde dados a cada restart | — |
| `/notifications` endpoint | `backend/src/main.ts:3973` | `GET /notifications` filtra `devMockNotifications` por userId | **Usa mock, não banco** | Substituir por query Prisma em `Notification` |
| `/notifications/count` endpoint | `backend/src/main.ts:4008` | Conta notificações não lidas de `devMockNotifications` | **Usa mock, não banco** | `api.getNotificationCount()` consome este endpoint |
| Modelo `Notification` no schema | `backend/prisma/schema.prisma` | Tabela criada pela migration `20260529000000_add_user_avatar_phone_notification` | Tabela existe no banco mas **não é usada pelos endpoints** | — |
| `App.tsx:309` no frontend | KB-003B | `notificationCount={3}` hardcoded no Topbar | Frontend não chama `getNotificationCount()` ainda | BL-021 |

**Conclusão para BL-046**: Os endpoints de notificação usam `devMockNotifications` em memória — não o banco. A tabela `Notification` existe mas não está integrada. Em produção, as notificações **não persistem** entre reinicializações do servidor. Este é um risco real de produção.

---

## 18. Auth Claims, Sessão e Dados

| Claim/Campo | Origem | Existe no Prisma? | Usado no frontend? | Risco | Recomendação |
|---|---|---|---|---|---|
| `sub` (userId) | `auth.ts` e `auth/auth-claims.ts` | Sim — `User.id` | Sim | — | — |
| `role` | `auth.ts` e `auth/auth-claims.ts` | Sim — `User.role` (String) | Sim | Role como String sem enum — sem validação de valores | Criar enum de roles ou validação explícita |
| `email` | `auth.ts` e `auth/auth-claims.ts` | Sim — `User.email` | Sim | — | — |
| `userType` | Apenas em `auth/auth-claims.ts` | Não existe no Prisma como campo — inferido no login | Não verificado | Tokens do `auth.ts` não têm `userType` | `auth/auth-claims.ts` é a versão correta |
| `companyId` | Apenas em `auth/auth-claims.ts` | Sim — via `CompanyMembership.companyId` | Não verificado | Tokens do `auth.ts` não carregam companyId — contexto multi-tenant ausente | `auth/auth-claims.ts` é a versão correta |
| `membershipId` | Apenas em `auth/auth-claims.ts` | Sim — `CompanyMembership.id` | Não verificado | Tokens do `auth.ts` não carregam membershipId | `auth/auth-claims.ts` é a versão correta |
| JWT_SECRET fallback | `auth.ts:10` e `auth/auth-claims.ts:15` | — | — | **Ambos usam `|| 's3cr3t-juridico'`** — risco crítico | BL-039: remover fallback |

**Conclusão para BL-048**: `auth/auth-claims.ts` é o arquivo canônico para multi-tenancy e sessão rica. `auth.ts` é simples e provavelmente legado ou usado apenas para fluxo simplificado. A coexistência de dois arquivos de auth com claims diferentes é uma divergência que precisa ser resolvida por decisão formal.

---

## 19. Validators e Validação de Input

| Validator/Arquivo | Domínio | Tipo de validação | Usa biblioteca externa? | Risco | Ponto a validar |
|---|---|---|---|---|---|
| `document-upload.validators.ts` | Documentos | Funções customizadas (`parsePositiveInteger`, `parseRequiredString`, `parseOptionalString`, `parseOptionalUrl`, `normalizeMetadata`) | **Não** — funções puras TypeScript | Cobertura depende de cobertura manual | Padrão consistente? |
| `crm-audit.validators.ts` | CRM / Audit | Customizado | **Não** | — | — |
| `opportunity-contact-history.validators.ts` | CRM | Customizado | **Não** | — | — |
| `opportunity-documents.validators.ts` | CRM | Customizado | **Não** | — | — |
| `link-process.validators.ts` | CRM | Customizado | **Não** | — | — |
| `opportunity-conversion.validators.ts` | CRM | Customizado | **Não** | — | — |
| `deadline-validators.ts` | Deadlines | Customizado | **Não** | — | — |
| `deadline-bulk-action.validators.ts` | Deadlines | Customizado | **Não** | — | — |
| `create-from-publication.validators.ts` | Publicações | Customizado | **Não** | — | — |
| `client-consent.validators.ts` | Clients | Customizado | **Não** | — | — |
| `client-portal.validators.ts` | Clients | Customizado | **Não** | — | — |
| `crm-prospecting.validators.ts` | CRM | Customizado | **Não** | — | — |
| `document-links.validators.ts` | Documentos | Customizado | **Não** | — | — |
| `document-artifacts.validators.ts` | Documentos | Customizado | **Não** | — | — |
| `document-approval.validators.ts` | Documentos | Customizado | **Não** | — | — |
| `communication.validators.ts` | Comunicação | Customizado | **Não** | — | — |
| `company.validators.ts` | Company | Customizado | **Não** | — | — |
| `plan.validators.ts` | Plans | Customizado | **Não** | — | — |
| `company-management.validators.ts` | Platform | Customizado | **Não** | — | — |
| `subscription.validators.ts` | Subscription | Customizado | **Não** | — | — |

**Conclusão para BL-053**: Todos os validators são **customizados por domínio**, sem biblioteca externa (sem Zod, Joi, class-validator ou similar). O padrão é consistente no que foi lido (`document-upload.validators.ts`). A ausência de uma biblioteca padronizada aumenta o risco de gaps de cobertura — cada desenvolvedor decide o que validar. A decisão de adotar uma biblioteca deve ser precedida de avaliação do padrão existente.

---

## 20. Riscos Técnicos de Dados e Contratos

### Alta Prioridade

**RISCO-001 — Notificações em memória chegam a produção**
- **Evidência**: `/notifications`, `/notifications/count` usam `devMockNotifications` — variável em memória de `main.ts`. Tabela `Notification` existe no banco mas não é consultada.
- **Impacto**: Em produção, notificações não persistem. A cada restart do servidor, todas as notificações são perdidas. O frontend exibe dados incorretos.
- **Recomendação**: Integrar endpoints de notificação com o modelo Prisma `Notification` antes do próximo deploy em produção.
- **Próximo passo**: BL-046.

**RISCO-002 — Storage adapter de documentos indefinido**
- **Evidência**: `DocumentUploadService` depende de `storageAdapter` injetado externamente. Implementação concreta não identificada nesta etapa.
- **Impacto**: Se for disco local, uploads são perdidos a cada deploy no Render (disco efêmero).
- **Recomendação**: Identificar implementação concreta em `main.ts` ou `src/documents/`. Se for disco local, migrar para cloud storage.
- **Próximo passo**: BL-045.

**RISCO-003 — `prisma-postgres/` inexistente com 5 scripts quebrados**
- **Evidência**: Scripts `prisma:cutover:validate`, `:generate`, `:status`, `:migrate:create`, `:migrate:dev` apontam para `prisma-postgres/schema.prisma`, mas a pasta não existe.
- **Impacto**: Scripts falham silenciosamente se executados. Podem confundir desenvolvedores ou IAs sobre o estado da migração.
- **Recomendação**: Remover scripts obsoletos ou criar documentação explicando que a pasta não existe e qual foi o destino do cutover.
- **Próximo passo**: BL-055.

**RISCO-004 — JWT_SECRET com fallback hardcoded em dois arquivos**
- **Evidência**: `auth.ts:10` e `auth/auth-claims.ts:15` — `process.env.JWT_SECRET || 's3cr3t-juridico'`.
- **Impacto**: Se `JWT_SECRET` não estiver configurada, o backend usa um segredo público e conhecido.
- **Recomendação**: Remover fallback, validar variável no startup (BL-039).
- **Próximo passo**: BL-039.

### Média Prioridade

**RISCO-005 — Dois arquivos auth com claims divergentes**
- **Evidência**: `auth.ts` (sub, role, email) vs `auth/auth-claims.ts` (sub, email, role, userType, companyId, membershipId).
- **Impacto**: Tokens gerados por `auth.ts` não carregam contexto multi-tenant — endpoints que dependem de `companyId` podem falhar silenciosamente ou usar valor `undefined`.
- **Recomendação**: Declarar `auth/auth-claims.ts` como canônico, deprecar `auth.ts`.
- **Próximo passo**: BL-048.

**RISCO-006 — Ausência de `companyId` direto em modelos operacionais**
- **Evidência**: `Client`, `Process`, `Task`, `Atendimento`, `CrmLead`, `CrmOpportunity`, `TriageItem` não têm `companyId`. Isolamento é feito por scope de middleware.
- **Impacto**: Qualquer endpoint sem aplicação correta de `companyScope` pode expor dados cross-tenant.
- **Recomendação**: Auditoria de cobertura de `companyScope` em todos os endpoints de domínio.
- **Próximo passo**: KB-003G.

**RISCO-007 — Roles divergentes entre seed e sistema**
- **Evidência**: `seed.sql` usa roles `admin`, `coordinator`, `assistant`. Roles identificados no sistema real são `ADM`, `ADV`, `FIN`, `ATD`.
- **Impacto**: Seed cria usuários com roles inválidas para o sistema. Validações de role falham ou não se aplicam aos usuários seeded.
- **Recomendação**: Atualizar `seed.sql` para usar roles reais do sistema.
- **Próximo passo**: Novo candidato a backlog.

**RISCO-008 — FinanceCharge com provider `"mock"` como default**
- **Evidência**: `FinanceCharge.provider` tem `@default("mock")` no schema.
- **Impacto**: Se integração de pagamento real não estiver configurada, cobranças são criadas com `provider: "mock"` — podem parecer reais sem sê-lo.
- **Recomendação**: Confirmar se há configuração de provider real em produção.
- **Próximo passo**: KB-003G.

### Baixa Prioridade

**RISCO-009 — `schema.postgres.prisma` paralelo sem uso claro**
- **Evidência**: Schema simples, 6 modelos, env diferente. Referenciado por scripts `prisma:postgres:*`.
- **Impacto**: Confusão sobre qual schema é o real. Risco de uso acidental.
- **Recomendação**: Arquivar ou remover após confirmação de que não é necessário.
- **Próximo passo**: BL-056.

**RISCO-010 — `prisma/schema.prisma` raiz quase vazio**
- **Evidência**: Sem modelos, sem URL. Generator aponta para `../generated/prisma`.
- **Impacto**: Pode gerar confusão. `prisma generate` executado na raiz sem CWD correto pode usar este arquivo.
- **Recomendação**: Remover ou arquivar após confirmação de BL-007.
- **Próximo passo**: BL-007.

---

## 21. Divergências e Incertezas

| Divergência/Incerteza | Evidência | Impacto | Recomendação | Prioridade |
|---|---|---|---|---|
| Schema ativo vs schema alternativo | `schema.prisma` (50+ modelos) vs `schema.postgres.prisma` (6 modelos) | Confusão sobre estado real | Arquivar schema.postgres.prisma após confirmação | P1 |
| Config Prisma backend vs raiz | Duas configs apontando para o mesmo destino por caminhos diferentes | Baixo — consistentes — mas potencial de divergência futura | Manter apenas uma ou documentar clareza | P3 |
| Auth.ts vs auth/auth-claims.ts | Claims divergentes, dois JWT_SECRET com fallback | Tokens sem companyId podem chegar a produção | Declarar arquivo canônico | P1 |
| Notificações: mock vs banco | devMockNotifications em uso; tabela Notification existe | Notificações não persistem em produção | Integrar endpoints com banco | P0 |
| Storage de documentos: disco vs cloud | storageAdapter indefinido nesta leitura | Risco de perda de uploads no Render | Identificar implementação | P1 |
| JSON contracts vs Backend contracts vs Markdown contracts | Três camadas de contratos com papéis não claramente definidos | Confusão sobre fonte de verdade para implementação | Definir papel de cada camada | P1 |
| Roles no seed vs roles do sistema | admin/coordinator/assistant vs ADM/ADV/FIN/ATD | Seed cria usuários com roles inválidas | Atualizar seed | P2 |
| prisma-postgres/ inexistente | Scripts apontam para pasta que não existe | Scripts quebrados silenciosamente | Remover scripts ou criar documentação | P2 |
| Scripts prisma:cutover vs scripts prisma:postgres | Dois conjuntos de scripts paralelos com alvos diferentes | Confusão sobre qual usar para o quê | Documentar ou remover | P3 |
| FinanceCharge provider: "mock" default | Schema | Cobranças com provider mock podem ser confundidas com reais | Confirmar provider real em produção | P2 |
| Ausência de validators globais | Todos os validators são customizados por domínio | Gaps de cobertura não detectáveis sem auditoria | Avaliar adoção de biblioteca | P2 |

---

## 22. Fonte Autoritativa Recomendada

| Área | Fonte autoritativa recomendada | Justificativa | Nível de confiança | Decisão necessária? |
|---|---|---|---|---|
| Modelo de dados | `backend/prisma/schema.prisma` | Schema ativo com 30 migrations aplicadas | **Alto** | Não — já claro |
| Migrations | `backend/prisma/migrations/` | Única pasta com histórico real | **Alto** | Não |
| Contratos de resposta da API | `backend/src/*.contract.ts` | Código que gera os payloads reais das respostas | **Alto** | Não — mas faltam domains |
| Tipos consumidos pelo frontend | `frontend/src/api.ts` | Arquivo de tipos e chamadas de API do frontend | **Alto** | Não — mas precisam de comparação com backend |
| Documentação funcional por epic/fase | `docs/*/contracts.md` + `contracts/*.json` | Documentação de design por epic — não é código | **Médio** — podem divergir da implementação | **Sim — definir papel de cada camada** |
| Contratos por epic/fase (design) | `contracts/*.json` e `docs/*/contracts.md` | Ambos parecem cumprir papel semelhante — escolher um ou definir papéis distintos | **Médio** | **Sim — BL-006** |
| Seeds | `backend/prisma/seed.sql` (geral) + `backend/prisma/seed-finance.ts` (finance) | Únicos seeds identificados | **Médio** — roles divergem do sistema | Não — mas roles precisam de correção |
| Configuração Prisma | `backend/prisma.config.ts` (backend) + `prisma.config.ts` raiz | Ambas consistentes, apontam para o mesmo schema | **Alto** | Não |
| Auth / JWT | `backend/src/auth/auth-claims.ts` | Versão mais rica, inclui multi-tenant context | **Alto** (inferência) | **Sim — BL-048** |

> [!warning] Decisão pendente sobre contratos por epic/fase
> Nesta etapa não há evidência suficiente para declarar se `contracts/*.json` ou `docs/*/contracts.md` tem precedência. Os dois parecem cobrir domínios similares (por epic/fase) mas em formatos diferentes. A decisão formal deve ser tomada pelo usuário antes de KB-003G.

---

## 23. Itens do Backlog Impactados

| Item backlog | Status após KB-003D | Evidência | Recomendação |
|---|---|---|---|
| BL-006 — Definir fonte autoritativa entre `contracts/*.json` e `docs/*/contracts.md` | **Parcialmente desbloqueado** | Ambos mapeados; papéis identificados como "design por epic" — mas sem precedência formal | Requer decisão do usuário antes de KB-003G |
| BL-007 — Validar se `prisma/schema.prisma` da raiz é legado | **Desbloqueado** | Arquivo quase vazio, sem modelos, generator apontando para `../generated/prisma` — claramente não é o schema ativo | Remover ou arquivar com autorização do usuário |
| BL-008 — Validar relação entre `prisma.config.ts` raiz e `backend/prisma.config.ts` | **Desbloqueado** | Ambas lidas e comparadas — consistentes, apontam para o mesmo schema/migrations por caminhos diferentes | Documentar clareza; manter ambas ou consolidar em uma |
| BL-045 — Confirmar storage de documentos uploadados | **Parcialmente desbloqueado** | `DocumentUploadService` usa storageAdapter — implementação concreta não identificada | Requer leitura adicional de main.ts ou src/documents/ |
| BL-046 — Confirmar notificações em produção: banco vs mock | **Desbloqueado** | Confirmado: endpoints usam `devMockNotifications` em memória; tabela `Notification` existe no banco mas não é usada | Risco de produção confirmado — corrigir antes do próximo deploy |
| BL-048 — Definir arquivo canônico de auth | **Parcialmente desbloqueado** | Confirmado: `auth/auth-claims.ts` tem claims mais ricos e é o arquivo correto para multi-tenancy | Requer decisão formal e refatoração para deprecar `auth.ts` |
| BL-053 — Avaliar biblioteca de validação ou padronização | **Parcialmente desbloqueado** | 20 validators encontrados, todos customizados por domínio, sem biblioteca externa | Padrão identificado — decisão sobre adoção de biblioteca é do usuário |
| BL-054 — Avaliar upgrade do Prisma 4.x | **Parcialmente desbloqueado** | Confirmado Prisma 4.16.2. Sem evidência de incompatibilidades identificadas nesta etapa | Avaliar changelog de Prisma 5 e 6 antes de decidir |
| BL-055 — Verificar scripts `prisma:cutover:*` e pasta `prisma-postgres/` | **Desbloqueado** | Pasta `prisma-postgres/` **não existe**. 5 scripts quebrados. Schema.postgres.prisma existe e é legado. | Documentar e remover scripts obsoletos com autorização |
| BL-056 — Validar papel de `backend/prisma/schema.postgres.prisma` | **Desbloqueado** | Schema muito simples (6 modelos), env `POSTGRES_DATABASE_URL` diferente do ativo. Evidência clara de legado de transição. | Arquivar com autorização do usuário |

---

## 24. Recomendações Iniciais

### Prisma

- Confirmar formalmente `backend/prisma/schema.prisma` como schema único e oficial.
- Arquivar `backend/prisma/schema.postgres.prisma` após confirmação de que não é mais necessário (BL-056).
- Remover ou arquivar `prisma/schema.prisma` da raiz (BL-007).
- Avaliar upgrade de Prisma 4.16.2 → 5.x ou 6.x (BL-054) — verificar breaking changes.

### Migrations

- Não executar migrations sem confirmar o estado do banco (produção vs staging).
- Documentar o histórico de migrations no KB-003D como referência para KB-003G.
- Considerar adicionar um snapshot do schema antes de grandes refatorações.

### Seeds

- Corrigir roles no `seed.sql` para refletir os roles reais do sistema (`ADM`, `ADV`, `FIN`, `ATD`, etc.).
- Adicionar guarda de ambiente no script `db:seed:finance` para evitar execução acidental em produção.
- Verificar conteúdo de `seed-finance.sql` e sua relação com `seed-finance.ts`.
- Remover ou proteger endpoint `/admin/seed-finance` com role check correto (BL-041).

### Contratos Backend

- Documentar formalmente que `backend/src/*.contract.ts` são transformadores de payload, não validadores nem DTOs.
- Criar contratos para domínios que não têm `contract.ts` (Auth, Users, Clients, Processes, Notifications, BI, Timesheet).
- Padronizar nomenclatura e estrutura dos contratos existentes.

### Frontend api.ts

- Comparar campo a campo os tipos `Api*` com os payloads reais dos endpoints (reservado para KB-003G ou etapa técnica).
- Confirmar que `ApiFinanceEntry.chargeStatus` e `.billingMethod` (campos derivados) estão sendo computados corretamente no backend.
- Integrar `getNotificationCount()` com o banco após correção do endpoint (BL-046 + BL-021).

### Contratos JSON/Markdown

- Definir formalmente o papel de `contracts/*.json` vs `docs/*/contracts.md` (BL-006).
  - Proposta: JSON como decisões de arquitetura por epic (máquina-legível); Markdown como documentação narrativa.
  - Alternativa: consolidar em um único formato.
- Não tratar contratos JSON ou Markdown como fonte de verdade para implementação — o código é a fonte.

### Storage

- Identificar implementação concreta do `storageAdapter` em `main.ts` ou `src/documents/`.
- Se for disco local: migrar para cloud storage antes de produção real (BL-045).
- Se `BiExportJob.artifactPath` também usa disco local, mesmo risco se aplica.

### Notificações

- Substituir `devMockNotifications` por queries Prisma no modelo `Notification` (BL-046).
- Criar endpoint para criar notificações ao invés de apenas lê-las.
- Após integração, conectar frontend via `getNotificationCount()` e remover valor hardcoded (BL-021).

### Auth Claims

- Declarar `auth/auth-claims.ts` como arquivo canônico de geração de tokens JWT.
- Deprecar `auth.ts` ou integrá-lo como thin wrapper sobre `auth/auth-claims.ts`.
- Remover fallback hardcoded de `JWT_SECRET` em ambos os arquivos (BL-039).
- Criar tipo enum de roles (ou validação explícita de roles) para evitar strings arbitrárias.

### Validators

- Avaliar adoção de Zod ou similar para padronização da camada de validação (BL-053).
- Se mantiver validators customizados: criar guia de padrões (`parseRequiredString`, `parseOptionalString`, etc.) para consistência entre domínios.
- Auditar cobertura de validators nos domínios sem arquivos `*validator*`.

### Backlog

**Candidatos a backlog identificados nesta etapa** (não adicionar ao backlog nesta etapa — listar aqui):

| Candidato a backlog | Prioridade sugerida | Tipo | Área | Dependência | Observação |
|---|---|---|---|---|---|
| Corrigir roles no `seed.sql` para usar roles reais do sistema | P2 | Correção técnica | Dados / Seeds | Confirmação de roles reais | Roles atuais: admin, coordinator, assistant — divergem de ADM, ADV, FIN, ATD |
| Confirmar e documentar provider de pagamento real em FinanceCharge | P2 | Validação | Finance / Infra | — | `provider: "mock"` é o default no schema |
| Identificar e documentar implementação concreta do storageAdapter | P1 | Validação | Documentos / Infra | BL-045 | Parte do desbloqueio do BL-045 |
| Auditar cobertura de companyScope em todos os endpoints de domínio | P1 | Validação | Multi-tenancy / Segurança | KB-003G | Risco cross-tenant |
| Criar contratos backend para domínios sem contract.ts | P2 | Documentação / Governança | Backend / Contratos | KB-003G | Auth, Users, Clients, Processes, Notifications, BI, Timesheet |
| Criar enum tipado de roles de usuário (User.role e CompanyMembership.role) | P2 | Correção técnica | Backend / Auth | BL-048 | Roles como String sem validação de valores permitidos |
| Avaliar e documentar necessidade de schema_init.sql | P3 | Validação | Dados / Prisma | BL-055 | Relação com migrations não está clara |

---

## 25. Relação com Próximas Fases

- **[[KB_003E_TESTES_QA_E_EVIDENCIAS]]**: Contextualizar testes da camada de dados — validar se há testes de integração para os repos Prisma, se seeds são usados em testes e se há cobertura de validação.
- **KB-003F — IA, Agentes e Automações**: Modelos `AiExecution`, `AiExecutionTarget`, `AiBudgetLedger` documentados aqui servem de base para mapear funcionalidades de IA implementadas.
- **KB-003G — Riscos Técnicos e Divergências**: Consolidar os 10 riscos identificados aqui com riscos do KB-003C, KB-003B e KB-003A. RISCO-001 (notificações) e RISCO-002 (storage) são candidatos a P0 neste consolidado.
- **KB-004 — Product Discovery**: Os 50+ modelos mapeados fornecem base para entender quais domínios funcionais estão implementados e em que estágio.
- **KB-005 — Inventário Funcional e UX/UI**: Comparar modelos Prisma e contratos com telas existentes para identificar features com backend mas sem UI e vice-versa.
- **KB-006 — Design System e Constituição Visual**: Sem relação direta com dados.
- **Próximos updates do backlog**: Candidatos a backlog listados na seção 24 devem ser adicionados após aprovação do usuário.
- **Possíveis ADRs**:
  - ADR sobre fonte autoritativa de contratos (BL-006).
  - ADR sobre arquivo canônico de auth (BL-048).
  - ADR sobre estratégia de storage de documentos.
  - ADR sobre padronização de validators.

---

## 26. Limitações desta Etapa

> [!warning] Limitações desta análise
>
> - **Não altera schema** — nenhuma modificação foi feita em arquivos Prisma.
> - **Não executa migrations** — estado do banco real não foi verificado.
> - **Não executa seeds** — dados de desenvolvimento não foram criados.
> - **Não acessa banco real** — validação de dados existentes não foi feita.
> - **Não leu todos os contratos na íntegra** — leitura parcial de JSON, Markdown e contract.ts.
> - **Storage adapter não identificado** — implementação concreta do `DocumentUploadStorageAdapter` não foi encontrada nesta etapa.
> - **frontend/src/api.ts não lida na íntegra** — apenas os primeiros 100 linhas foram lidos; muitos tipos e métodos permanecem não mapeados.
> - **Migrations não lidas individualmente** — apenas 2 de 30 migrations foram lidas.
> - **Não corrige contratos** — divergências identificadas foram registradas, não corrigidas.
> - **Não atualiza backlog** — candidatos a backlog foram listados mas não adicionados ao arquivo oficial.
> - **Não substitui testes** — análise estática não detecta bugs de runtime.
> - **Não substitui auditoria de segurança completa** — riscos identificados são baseados em leitura de código, não em pen test.
> - **Não decide sozinho fonte autoritativa final** — BL-006 requer decisão do usuário.

---

## 27. Validação Final

| Item validado | Resultado |
|---|---|
| Vault oficial existe | Sim |
| `00_START_HERE.md` encontrado | Sim |
| `KB_002` encontrado | Sim |
| `KB_003A` encontrado | Sim |
| `KB_003B` encontrado | Sim (referenciado via KB-003C) |
| `KB_003C` encontrado | Sim |
| `BACKLOG_GERAL_LEXORA_CURRENT.md` encontrado | Sim |
| KB-003D criado no caminho correto | Sim |
| Apenas o KB-003D foi criado | Sim |
| Algum arquivo existente foi sobrescrito | Não |
| Algum código foi alterado | Não |
| Algum schema Prisma foi alterado | Não |
| Alguma migration foi alterada | Não |
| Algum seed foi alterado | Não |
| Algum contrato foi alterado | Não |
| Algum package file foi alterado | Não |
| Alguma configuração foi alterada | Não |
| Algum script foi executado | Não |
| Algum Prisma command foi executado | Não |
| Algum pacote foi instalado | Não |
| Algum deploy foi executado | Não |
| Alguma pasta `.obsidian` foi alterada | Não |
| Backlog permaneceu inalterado | Sim |

---

### Arquivo criado

- `!_lexora-memory-docs/07 - Dados e Contratos/KB_003D_DADOS_PRISMA_E_CONTRATOS_CURRENT_2026-05-30.md`

### Arquivos consultados

- `!_lexora-memory-docs/00_START_HERE.md`
- `!_lexora-memory-docs/01 - Knowledge Base/KB_002_GOVERNANCA_DOCUMENTAL_OFICIAL_CURRENT_2026-05-29.md`
- `!_lexora-memory-docs/03 - Arquitetura/KB_003A_ESTRUTURA_GERAL_E_CONFIGURACOES_CURRENT_2026-05-29.md`
- `!_lexora-memory-docs/06 - Backend e APIs/KB_003C_BACKEND_E_APIS_ESTADO_ATUAL_CURRENT_2026-05-30.md`
- `!_lexora-memory-docs/13 - Backlog/BACKLOG_GERAL_LEXORA_CURRENT.md`
- `backend/prisma/schema.prisma` (completo)
- `backend/prisma/schema.postgres.prisma` (completo)
- `prisma/schema.prisma` (completo)
- `backend/prisma/migrations/migration_lock.toml`
- `backend/prisma/migrations/20260514224911_init_postgres/migration.sql`
- `backend/prisma/migrations/20260527103000_add_company_membership_domain/migration.sql`
- `backend/prisma/seed.sql` (completo)
- `backend/prisma/seed-finance.ts` (parcial)
- `backend/prisma/schema_init.sql` (parcial)
- `backend/prisma.config.ts` (completo)
- `prisma.config.ts` (completo)
- `backend/package.json` (grep de scripts Prisma)
- `backend/src/finance.contract.ts` (parcial)
- `backend/src/documents.contract.ts` (parcial)
- `backend/src/crm.contract.ts` (parcial)
- `backend/src/triage.contract.ts` (parcial)
- `backend/src/auth.ts` (completo)
- `backend/src/auth/auth-claims.ts` (parcial)
- `backend/src/documents/upload/document-upload.service.ts` (completo)
- `backend/src/documents/upload/document-upload.types.ts` (completo)
- `backend/src/documents/upload/document-upload.validators.ts` (completo)
- `contracts/foundation-multitenant.contract.json` (parcial)
- `frontend/src/api.ts` (parcial — primeiras 100 linhas)

### Pastas analisadas

- `backend/prisma/` (listagem completa)
- `contracts/` (listagem completa)
- `docs/` (glob de contracts.md)
- `prisma/` (listagem)
- `prisma-postgres/` (confirmação de inexistência)
- `backend/src/` (listagem de validators)
- `backend/src/documents/upload/` (listagem e leitura)
- `!_lexora-memory-docs/07 - Dados e Contratos/` (confirmação de pasta vazia antes da criação)

### Skills usadas e em qual fase

Esta etapa foi realizada diretamente com ferramentas de leitura (Read, Glob, Grep) sem acionamento de skills externas, conforme as regras da etapa que limitam as skills permitidas.

### Principais riscos identificados

1. **RISCO-001 (Alta)**: Endpoints de notificação usam mock em memória — tabela `Notification` existe mas não é consumida. Risco de produção confirmado.
2. **RISCO-002 (Alta)**: `DocumentUploadService` usa storageAdapter não identificado — pode ser disco local (efêmero no Render).
3. **RISCO-003 (Alta)**: `prisma-postgres/` inexistente — 5 scripts quebrados.
4. **RISCO-004 (Alta)**: JWT_SECRET com fallback hardcoded em dois arquivos.
5. **RISCO-005 (Média)**: Dois arquivos auth com claims divergentes.
6. **RISCO-006 (Média)**: Ausência de companyId direto em modelos operacionais — isolamento depende de middleware.
7. **RISCO-007 (Média)**: Roles divergentes entre seed e sistema.

### Itens do backlog possivelmente desbloqueados

- BL-006: Parcialmente desbloqueado — requer decisão do usuário.
- BL-007: Desbloqueado — `prisma/schema.prisma` raiz é claramente não ativo.
- BL-008: Desbloqueado — configs Prisma consistentes, papel clarificado.
- BL-045: Parcialmente desbloqueado — storageAdapter identificado como port; implementação concreta não encontrada.
- BL-046: Desbloqueado — confirmado uso de mock em produção.
- BL-048: Parcialmente desbloqueado — `auth/auth-claims.ts` identificado como canônico; requer decisão formal.
- BL-053: Parcialmente desbloqueado — validators customizados confirmados, sem biblioteca.
- BL-054: Parcialmente desbloqueado — Prisma 4.16.2 confirmado.
- BL-055: Desbloqueado — `prisma-postgres/` inexistente, scripts quebrados confirmados.
- BL-056: Desbloqueado — `schema.postgres.prisma` identificado como provável legado.

### Candidatos a backlog identificados

1. Corrigir roles no `seed.sql` — P2.
2. Confirmar provider de pagamento real em `FinanceCharge` — P2.
3. Identificar implementação concreta do `storageAdapter` — P1 (parte de BL-045).
4. Auditar cobertura de companyScope em endpoints de domínio — P1.
5. Criar contratos backend para domínios sem `contract.ts` — P2.
6. Criar enum tipado de roles para `User.role` e `CompanyMembership.role` — P2.
7. Avaliar necessidade de `schema_init.sql` — P3 (parte de BL-055).

### Pontos que precisam de validação do usuário

1. **BL-006**: Definir papel de `contracts/*.json` vs `docs/*/contracts.md` — quem tem precedência?
2. **BL-007**: Autorização para remover ou arquivar `prisma/schema.prisma` da raiz.
3. **BL-045**: Confirmar qual implementação do `storageAdapter` está em uso em produção.
4. **BL-046**: Priorizar integração de notificações com banco antes do próximo deploy?
5. **BL-048**: Declarar `auth/auth-claims.ts` como canônico e deprecar `auth.ts`?
6. **BL-055**: Autorização para remover scripts `prisma:cutover:*` quebrados.
7. **BL-056**: Autorização para arquivar `schema.postgres.prisma`.
8. Roles reais do sistema — confirmar lista oficial de roles para corrigir seed.

### Próxima etapa recomendada

**KB-003E — Testes, QA e Evidências**: Mapear cobertura de testes da camada de dados, validators, services e endpoints. Identificar quais domínios têm testes de integração e quais não têm.

---

*Criado em: 2026-05-30 | Status: current | Vault: !_lexora-memory-docs | Autor: claude-code*
*Baseado em: [[KB_003C_BACKEND_E_APIS_ESTADO_ATUAL_CURRENT_2026-05-30]] | Complementado por: leitura direta de arquivos*
