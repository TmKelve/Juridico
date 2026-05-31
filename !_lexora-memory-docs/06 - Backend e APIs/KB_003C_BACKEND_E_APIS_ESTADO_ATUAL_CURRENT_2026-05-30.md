---
tipo: kb
status: current
projeto: lexora
fase: inventario-tecnico
area: backend-e-apis
data: 2026-05-30
fonte: claude-code
baseado_em:
  - '[[00_START_HERE]]'
  - '[[KB_002_GOVERNANCA_DOCUMENTAL_OFICIAL_CURRENT_2026-05-29]]'
  - '[[KB_003A_ESTRUTURA_GERAL_E_CONFIGURACOES_CURRENT_2026-05-29]]'
  - '[[KB_003B_FRONTEND_ESTADO_ATUAL_CURRENT_2026-05-29]]'
  - '[[BACKLOG_GERAL_LEXORA_CURRENT]]'
escopo: backend-e-apis-estado-atual
vault_oficial: 'C:\Users\tomke\app Juridico\!_lexora-memory-docs'
autoridade: inventario-tecnico
---

# KB-003C — Backend e APIs Estado Atual

> [!important] Fonte primária: leitura direta de arquivos
> Este documento foi produzido pela leitura direta dos arquivos reais do backend. Fatos confirmados e inferências são distinguidos ao longo de todo o documento. Nenhum código foi alterado, executado ou instalado.

---

## 1. Resumo Executivo

O backend do Lexora é um **servidor HTTP Express.js puro**, escrito em TypeScript, rodando em Node.js. Não utiliza o framework NestJS para seu servidor HTTP — embora as dependências NestJS estejam instaladas (`@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express`), elas não são usadas na arquitetura de rotas nem em controllers/módulos NestJS. Esta é uma **divergência factual importante** em relação ao que o KB-003A chamou de "Express/NestJS híbrido": a realidade é **Express puro como servidor**, com pacotes NestJS presentes mas sem uso aparente no fluxo HTTP principal.

### Stack real identificada

- **Runtime:** Node.js (versão local não verificada; CI usa Node 22)
- **Framework HTTP:** Express.js **5.2.1** (versão major recente)
- **Linguagem:** TypeScript **6.0.2** (versão muito recente, com `ignoreDeprecations: "6.0"`)
- **ORM:** Prisma **4.16.2** com PostgreSQL
- **Autenticação:** JWT em cookie HTTP (`httpOnly: true`, `secure` em produção)
- **NestJS:** Instalado (`^11.x`) mas **não usado no servidor HTTP principal**
- **Dev server:** `ts-node-dev@^2.0.0`

### Organização geral

- **Ponto de entrada:** `backend/src/main.ts` — arquivo único de ~8.500 linhas
- **Arquitetura:** Monólito Express com módulos de domínio separados em subpastas de `src/`
- **Padrão de rotas:** Todos os endpoints definidos diretamente em `main.ts` via `app.get/post/put/delete`; algumas áreas delegam para funções `register*Routes()`
- **Padrão de domínio:** Domain services + repositories em pastas separadas por área (ex: `src/clients/`, `src/finance/`, `src/triage/`)
- **Banco de dados:** PostgreSQL, acessado via Prisma ORM
- **Deploy:** Render (staging confirmado via URL hardcoded na Vercel)
- **Legado SQLite:** `backend/prisma/dev.db` ainda presente localmente

### Principais riscos

1. `main.ts` com ~8.500 linhas concentra todas as rotas — alto risco de manutenção
2. Dev mock com credenciais hardcoded em `main.ts` (plain text no código-fonte)
3. Dois arquivos de auth (`auth.ts` e `auth/auth-claims.ts`) com claims diferentes — risco de divergência
4. `JWT_SECRET` com valor default fallback em código — risco em dev/staging
5. `@nestjs/cli` em `dependencies` de produção (deve ser `devDependencies`)
6. Sem rate limiting identificado
7. Sem headers de segurança (Helmet ou similar) identificado
8. Exposição de `error.message` ao cliente em handlers genéricos
9. `/admin/seed-finance` — role check usa `actor.role !== 'admin'` (lowercase), mas roles reais são `ADM`, `ADV` etc. — **possível bug de autorização**
10. TypeScript 6.0.2 com `ignoreDeprecations: "6.0"` — versão muito recente com supressão de warnings

---

## 2. Objetivo do Documento

Este documento serve como base para:

- Documentação oficial do estado atual do backend Lexora
- **[[KB_003D_DADOS_PRISMA_E_CONTRATOS]]** — comparação profunda de schema Prisma, migrations e contratos
- **[[KB_003E_TESTES_QA_E_EVIDENCIAS]]** — contextualizar testes do backend (`.cjs` unitários e smoke tests)
- **KB-003F — IA, Agentes e Automações** — entender integrações de IA no backend
- **KB-003G — Riscos Técnicos e Divergências** — consolidar riscos identificados
- **KB-004 — Product Discovery** — entender módulos funcionais implementados
- **KB-005 — Inventário Funcional e UX/UI** — verificar cobertura de endpoints por tela
- Futuras correções técnicas de arquitetura, rotas, segurança e performance
- Alimentação futura do backlog com itens técnicos do backend

---

## 3. Escopo e Fora do Escopo

### Analisado nesta etapa

- Estrutura completa de `backend/src/` (todos os arquivos)
- `backend/package.json`, `tsconfig.json`, `.env.example`, `.env.staging.example`, `.gitignore`
- `backend/prisma.config.ts` e `backend/prisma/schema.prisma` (primeiro nível)
- `backend/prisma/migrations/` (listagem de arquivos)
- `backend/src/main.ts` (leitura em múltiplos trechos)
- `backend/src/auth.ts` e `backend/src/auth/auth-claims.ts`
- `backend/src/session/session-access.ts`
- `backend/src/authz/guards/authz.guard.ts` e `authz/policies/authz.types.ts`
- `backend/src/roles/roles.ts`
- `backend/src/shared/company-scope/company-scope-prisma.adapter.ts`
- `backend/src/finance/http/register-finance-routes.ts` (primeiro nível)
- `backend/src/platform/register-platform-console-routes.ts` (primeiro nível)
- `backend/src/ai/core/ai-provider.port.ts`
- `backend/src/triage-ai.provider.ts` (primeiro nível)
- `backend/src/datajud.provider.ts` (primeiro nível)
- Listagem de arquivos `backend/` excluindo `node_modules`
- `frontend/src/api.ts` (comparação inicial de endpoints)
- Documentos oficiais: KB-003A, KB-003B, BACKLOG_GERAL_LEXORA_CURRENT

### Fora do escopo desta etapa

- Leitura completa de todos os services e repositories de domínio
- Comparação campo a campo de schema Prisma com tipos do frontend (reservado para KB-003D)
- Auditoria de segurança completa
- Validação de dados reais no banco
- Execução de testes, builds ou scripts
- Refatoração ou correção de código
- Atualização do backlog

---

## 4. Estrutura Geral do Backend

| Caminho | Tipo | Papel provável | Fonte oficial? | Observações | Ponto a validar |
|---|---|---|---|---|---|
| `backend/src/` | Pasta | Código-fonte TypeScript do backend | Sim | Organizado por domínio; `main.ts` é o ponto de entrada | — |
| `backend/src/main.ts` | Arquivo | Ponto de entrada, servidor Express, todas as rotas | Sim | ~8.500 linhas; monolito de rotas | Ver seção 7 |
| `backend/src/auth.ts` | Arquivo | Auth legado — `signUserToken` + `verifyToken` (UserToken simples) | Sim (legado) | Usado em `main.ts`; tipo mais simples que `auth-claims.ts` | Ver seção 10 |
| `backend/src/auth/auth-claims.ts` | Arquivo | Auth novo — `signAuthToken` + `verifyAuthToken` (AuthTokenClaims rico) | Sim | Inclui `userType`, `companyId`, `membershipId` | Ver seção 10 |
| `backend/src/session/session-access.ts` | Arquivo | Lógica de sessão — `ResolvedSession`, `evaluateSessionAccess` | Sim | Avalia acesso por `CompanyStatus` e `platformPolicy` | — |
| `backend/src/roles/roles.ts` | Arquivo | Definição de roles — legado + tenant + platform | Sim | Mapeamento: ADM→company_admin, ADV→lawyer, etc. | Ver seção 11 |
| `backend/src/authz/` | Pasta | Sistema de autorização — guards, policies, RBAC | Sim | `guards/authz.guard.ts`, `policies/authz.check.ts`, `rbac/permissions.ts` | — |
| `backend/src/shared/` | Pasta | Utilitários compartilhados — company-scope, request-context, scheduler | Sim | `company-scope` é crítico para multi-tenant | — |
| `backend/src/ai/` | Pasta | Módulo de IA — audit, checklist, core, drafting, http, recommendation, summarization | Sim | Provider determinístico como fallback; sem LLM externo confirmado | Confirmar se há LLM externo configurável |
| `backend/src/attendances/` | Pasta | Atendimentos — conversion, core, sla | Sim | — | — |
| `backend/src/clients/` | Pasta | Clientes — consent, portal | Sim | — | — |
| `backend/src/communication/` | Pasta | Comunicação com clientes | Sim | HTTP dispatcher presente | Confirmar canal (email/SMS) |
| `backend/src/crm/` | Pasta | CRM Jurídico — leads, opportunities, audit, conversion, documents, process-link, prospecting | Sim | Domínio rico | — |
| `backend/src/deadlines/` | Pasta | Prazos — batch-actions, audit, risk, validators | Sim | — | — |
| `backend/src/documents/` | Pasta | Documentos — approval, artifacts, audit, checklist, links, upload, versioning | Sim | Upload presente | Confirmar storage (local vs cloud) |
| `backend/src/finance/` | Pasta | Financeiro — accounts, billing, categories, collections, delinquency, http, installments, ledger, payment-links, reconciliation, reports, shared, webhooks | Sim | Domínio mais rico do backend | — |
| `backend/src/platform/` | Pasta | Platform admin — company-actions, company-admin, company-management, invitations, memberships, support, user-lifecycle, audit | Sim | Multi-tenant platform console | — |
| `backend/src/publications/` | Pasta | Publicações/Intimações — capture, classification, correlation, deadline-automation, ingestion, matching, pipeline, reprocess, audit | Sim | Domínio complexo com pipeline de ingestão | — |
| `backend/src/triage/` | Pasta | Triagem — automation, core, decision, explainability, http, queue, sla | Sim | Triagem automatizada de publicações | — |
| `backend/src/tasks/` | Pasta | Tarefas — core, followup, integrations, workflow | Sim | — | — |
| `backend/src/bi/` | Pasta | Business Intelligence — access-control, api, exports, metrics, models, pipelines, snapshots | Sim | Executive metrics para dashboard | — |
| `backend/src/mobile/` | Pasta | Módulo mobile — adapters, http | Sim | Feed móvel | Confirmar uso atual |
| `backend/src/timesheet/` | Pasta | Controle de horas — approval, core, http, reports | Sim | Timesheet entries, aprovações | — |
| `backend/src/jobs/` | Pasta | Jobs/schedulers — finance collection, publications ingestion, tasks | Sim | Schedulers internos em memória | Ver seção 15 |
| `backend/src/permissions/` | Pasta | Permissões — enforcement, matrix | Sim | Matrix de permissões | — |
| `backend/src/ownership/` | Pasta | Portfolio reassignment | Sim | — | — |
| `backend/src/productivity/` | Pasta | Productivity snapshot | Sim | Para BI | — |
| `backend/src/logging/` | Pasta | Logging de publicações | Sim | — | — |
| `backend/src/notifications/` | Pasta | Dispatcher de notificações por tarefas | Sim | `task-followup-dispatcher.ts` | — |
| `backend/src/subscription/` | Pasta | Planos/assinaturas — service, transitions, types, validators | Sim | SaaS billing logic | — |
| `backend/src/plans/` | Pasta | Planos disponíveis | Sim | — | — |
| `backend/src/team/` | Pasta | Equipes e portfolio ownership | Sim | — | — |
| `backend/src/*.provider.ts` | Arquivos | Provedores externos — DataJud, CNJ, CPF, Diário, OAB, triage-ai, process-lookup | Sim | Integrações externas | Ver seção 15 |
| `backend/src/*.contract.ts` | Arquivos | Builders de payload por domínio | Sim | agenda, crm, deadlines, documents, finance, publications, tasks, templates, triage | Ver seção 13 |
| `backend/src/generated/prisma/` | Pasta | Prisma Client gerado | Técnico | No `.gitignore` do backend | Deve ser regenerado no deploy |
| `backend/prisma/schema.prisma` | Arquivo | Schema Prisma ativo (PostgreSQL) | Sim | Fonte de verdade do banco atual | — |
| `backend/prisma/schema.postgres.prisma` | Arquivo | Schema alternativo Postgres | Ponto a validar | Data 14/05/2026 — artefato de migração? | Confirmar no KB-003D |
| `backend/prisma/migrations/` | Pasta | Histórico de migrations | Sim | 25 migrations de 2026-05-14 a 2026-05-29 | Ver seção 12 |
| `backend/prisma/dev.db` | Arquivo | SQLite legado local | Não | No `.gitignore`; não deve ir para prod | Confirmar que não afeta CI |
| `backend/prisma/seed.sql`, `seed-finance.sql`, `seed-finance.ts` | Arquivos | Seeds | Técnico | Seed principal + seed de finanças | — |
| `backend/prisma/schema_init.sql` | Arquivo | SQL de inicialização | Técnico | Provavelmente artefato da migração SQLite→Postgres | Confirmar uso |
| `backend/prisma.config.ts` | Arquivo | Config Prisma do backend | Técnico | Data 02/04/2026 — aponta para `prisma/schema.prisma` | Ver seção 12 |
| `backend/dist/` | Pasta | Build compilado TypeScript | Técnico | No `.gitignore`; build local presente | Atualizado em 27/05/2026 |
| `backend/*.log` (múltiplos) | Arquivos | Logs de execução | Técnico | backend.log, backend-dev.out.log, etc. | Limpar quando conveniente |
| `backend/tmp_hash.js` | Arquivo | Script temporário | Não | Data 02/04/2026; provavelmente utilitário de hash para setup inicial | Confirmar que está no `.gitignore` |

---

## 5. Stack e Dependências do Backend

### `backend/package.json` — confirmado por leitura direta

| Item | Tipo | Papel | Evidência | Observações | Ponto a validar |
|---|---|---|---|---|---|
| `express@^5.2.1` | Prod | Framework HTTP principal | package.json | Express v5 — versão major recente (RC→GA) | Confirmar estabilidade com outros middlewares |
| `@nestjs/common@^11.1.17` | Prod | Pacote NestJS — decorators, DI | package.json | Instalado mas **não usado no servidor HTTP principal** | Confirmar se é usado em algum módulo interno |
| `@nestjs/core@^11.1.17` | Prod | Core NestJS | package.json | Idem acima | Idem |
| `@nestjs/platform-express@^11.1.17` | Prod | Bridge NestJS+Express | package.json | Idem acima | Idem |
| `@nestjs/cli@^11.0.17` | **Prod** | CLI NestJS | package.json | **Em `dependencies`, não `devDependencies` — risco BL-012** | Mover para devDependencies |
| `@prisma/client@^4.16.2` | Prod | Prisma ORM Client | package.json | Versão 4.x (atual é 5.x/6.x) | Avaliar upgrade |
| `prisma@^4.16.2` | Prod | Prisma CLI | package.json | Versão 4.x | Idem |
| `jsonwebtoken@^9.0.3` | Prod | JWT — sign + verify | package.json | — | — |
| `bcrypt@^6.0.0` | Prod | Hash de senhas | package.json | — | — |
| `cors@^2.8.6` | Prod | CORS middleware | package.json | Configurado em `main.ts` | Ver seção 16 |
| `reflect-metadata@^0.2.2` | Prod | Metadados TypeScript (NestJS dep) | package.json | Importado para NestJS/decorators | — |
| `rxjs@^7.8.2` | Prod | Programação reativa (NestJS dep) | package.json | — | — |
| `ts-node-dev@^2.0.0` | Prod | Dev server com hot reload | package.json | Usado no script `dev` | — |
| `typescript@^6.0.2` | Prod | TypeScript compiler | package.json | **Versão 6 — muito recente; `ignoreDeprecations: "6.0"` em tsconfig** | Monitorar estabilidade |
| `@types/cors@^2.8.19` | Prod | Tipos CORS | package.json | — | — |
| `@types/jsonwebtoken@^9.0.10` | Prod | Tipos JWT | package.json | — | — |
| `@types/bcrypt@^6.0.0` | Dev | Tipos bcrypt | package.json | — | — |
| `@types/express@^5.0.6` | Dev | Tipos Express v5 | package.json | — | — |
| `pg@^8.21.0` | Dev | Driver PostgreSQL (Node.js) | package.json | — | — |

> [!warning] `@nestjs/cli` em `dependencies` de produção
> Confirmado: `@nestjs/cli@^11.0.17` está em `dependencies`, não em `devDependencies`. Aumenta bundle de produção sem necessidade. Candidato ao backlog (ligado ao BL-012).

> [!warning] Express v5 em produção
> `express@^5.2.1` — Express v5 é versão major recente que saiu de RC para GA. Verificar compatibilidade de middlewares (`cors`, tipos TypeScript) e comportamento de error handling (mudanças na async error propagation no v5).

### Scripts disponíveis

| Script | Comando | Papel | Observações |
|---|---|---|---|
| `start` | `prisma migrate deploy --schema=... && node dist/main.js` | Produção — migrate + start | Usado no Render |
| `dev` | `ts-node-dev --respawn --transpile-only src/main.ts` | Dev com hot reload | — |
| `build` | `tsc` | Compila TypeScript para `dist/` | — |
| `db:seed:finance` | `ts-node --transpile-only prisma/seed-finance.ts` | Seed de finanças | — |
| `prisma:generate` | `prisma generate --schema=prisma/schema.prisma` | Gera Prisma Client | — |
| `prisma:migrate:dev` | `prisma migrate dev --schema=...` | Cria e aplica migration (dev) | — |
| `prisma:migrate:deploy` | `prisma migrate deploy --schema=...` | Aplica migrations (prod) | Usado no CI |
| `prisma:studio` | `prisma studio --schema=...` | GUI do banco | — |
| `prisma:postgres:*` | Vários | Comandos para `schema.postgres.prisma` alternativo | Schema secundário — ver seção 12 |
| `prisma:cutover:*` | Vários | Comandos para `prisma-postgres/schema.prisma` | Outro schema — confirmar existência da pasta |

> [!warning] Pasta `prisma-postgres/` nos scripts
> Os scripts `prisma:cutover:*` referenciam `prisma-postgres/schema.prisma`. Esta pasta não foi listada na análise da estrutura do backend. Confirmar se existe ou se os scripts são legado de migração.

---

## 6. Configurações do Backend

| Arquivo | Papel | Informação relevante | Risco | Ponto a validar |
|---|---|---|---|---|
| `backend/tsconfig.json` | TypeScript config | `module: commonjs`, `target: ES2017`, `outDir: dist`, `rootDir: src`, `emitDecoratorMetadata: true`, `experimentalDecorators: true`, `ignoreDeprecations: "6.0"` | Médio — `ignoreDeprecations` sugere TS6 tem breaking changes suprimidos | Verificar quais deprecações estão sendo suprimidas |
| `backend/.env.example` | Template de variáveis de ambiente | PORT, FRONTEND_URL, JWT_SECRET, DATABASE_URL, POSTGRES_DATABASE_URL (transição), DATAJUD_API_KEY, FINANCE_PAYMENT_PROVIDER, FINANCE_PROVIDER_BASE_URL/KEY/CHARGE_PATH/WEBHOOK_SECRET, FINANCE_SCHEDULER_ENABLED | Médio | Confirmar se todas as vars estão documentadas para produção |
| `backend/.env.staging.example` | Template staging | PORT=3000, FRONTEND_URL, JWT_SECRET, DATABASE_URL | Baixo | Template básico — confirmar se cobre todos os cenários |
| `backend/.env` | Env local | Existe (29/05/2026) — conteúdo não lido | Alto (segredo) | Não deve ser commitado; verificar `.gitignore` |
| `backend/prisma.config.ts` | Config Prisma backend | `schema: "prisma/schema.prisma"`, `migrations path: "prisma/migrations"`, usa `process.env.DATABASE_URL` | Médio | Data 02/04/2026 — confirmar se é o config ativo ou legado |
| `backend/.gitignore` | Exclusões git | `node_modules`, `.env`, `/src/generated/prisma` | Alto | Não exclui explicitamente `dev.db`, `*.log`, `tmp_hash.js`, `dist/` — verificar se estão no `.gitignore` raiz |
| `backend/prisma/schema.prisma` | Schema Prisma ativo | `provider: "postgresql"`, `url: env("DATABASE_URL")` | Alto | Fonte de verdade do banco — não alterar sem migration |
| `backend/prisma/schema.postgres.prisma` | Schema alternativo Postgres | Arquivo presente em 14/05/2026 | Médio | Artefato de migração? Ou schema paralelo? Confirmar no KB-003D |

> [!note] CORS configurado em código
> CORS não usa arquivo de config separado — configurado diretamente em `main.ts:283` via `app.use(cors({...}))`. A origem permitida vem de `FRONTEND_URL` (env var), com variantes de `localhost` em modo dev.

> [!success] Helmet e rate limiting adicionados (2026-05-30)
> `helmet()` aplicado globalmente em `main.ts` antes do CORS (commit `94a8c91`). CSP desabilitado (gerenciado pelo Vercel/frontend); COEP desabilitado para cookies cross-origin. `express-rate-limit` adicionado: `/auth/login` 20 req/15min; `/ai/*` 10 req/min. `trust proxy=1` configurado para IP real do cliente atrás do Render. `@types/express` e `@types/bcrypt` movidos de `devDependencies` para `dependencies` (commit `92b9ef1`). Senhas mock/seed movidas para `LEXORA_DEV_PASSWORD`/`LEXORA_SEED_PASSWORD` env vars (commit `94a8c91`).

---

## 7. Ponto de Entrada e Bootstrap do Backend

| Arquivo | Papel | Observações | Ponto a validar |
|---|---|---|---|
| `backend/src/main.ts` | Ponto de entrada único | ~8.500 linhas; define app Express, CORS, middlewares globais, todos os routes, e `app.listen()` | Monólito de rotas — ver riscos na seção 21 |
| `backend/prisma/schema.prisma` | Schema Prisma | Referenciado por `prisma:generate` e `prisma:migrate:*` scripts | — |
| `backend/src/generated/prisma/` | Prisma Client | Gerado; no `.gitignore` do backend | Deve existir após `prisma generate` no deploy |

### Sequência de bootstrap (confirmada por leitura direta de `main.ts`)

```
1. Importações:
   ├─ express, cors, bcrypt, crypto, fs, path
   ├─ Prisma PrismaClient (de @prisma/client)
   ├─ signUserToken/verifyToken de ./auth (legacy)
   ├─ Builders de contrato (agenda, crm, deadlines, documents, etc.)
   ├─ Todos os services e repositories de domínio
   └─ register*Routes() de subdomínios (finance, epic-ij, ai, bi, timesheet, mobile, platform-actions, platform-billing, platform-console)

2. Inicialização:
   ├─ const app = express()
   ├─ const port = process.env.PORT || 3000
   ├─ const prisma = new PrismaClient()  ← conexão lazy (não há await explícito no boot)
   ├─ const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
   ├─ const isProduction = process.env.NODE_ENV === 'production'
   ├─ const authCookieName = 'Authorization'
   └─ const devMockEnabled = !isProduction && LEXORA_DEV_MOCK !== '0'

3. Middlewares globais:
   ├─ app.use(cors({ origin: whitelist, credentials: true }))
   └─ app.use(express.json())
   [sem helmet, sem morgan/logger, sem rate limiting identificado]

4. Definição de rotas:
   ├─ Rotas principais inline em main.ts (~8.500 linhas)
   └─ Rotas delegadas via register*Routes():
       ├─ registerFinanceRoutes()
       ├─ registerEpicIjRoutes()
       ├─ registerAiRoutes()
       ├─ registerBiRoutes()
       ├─ registerTimesheetRoutes()
       ├─ registerMobileRoutes()
       ├─ registerPlatformActionsRoutes()
       ├─ registerPlatformBillingRoutes()
       └─ registerPlatformConsoleRoutes()

5. Startup:
   ├─ app.listen(port, () => console.log(...))
   └─ bootstrapFinanceSchedulers()  ← schedulers de cobrança (condicionado a FINANCE_SCHEDULER_ENABLED=1)
```

> [!warning] Sem healthcheck endpoint dedicado
> Não foi identificado endpoint `/health` ou `/healthz` em `main.ts`. O endpoint raiz `GET /` retorna `{ message: 'SaaS Jurídico API v1' }` e pode servir como healthcheck informal. O CI usa `curl` para aguardar o backend no startup.

---

## 8. Arquitetura de Módulos

> [!note] Sem módulos NestJS
> O backend **não usa o sistema de módulos do NestJS** (sem `@Module`, sem `@Controller`, sem `@Injectable` nas rotas HTTP). Os domínios são organizados em pastas com services, repositories e tipos TypeScript puro — não NestJS. A organização é por convenção, não por framework.

| Módulo/Domínio | Caminho em `src/` | Tipo | Papel | Observações | Ponto a validar |
|---|---|---|---|---|---|
| Auth (legado) | `auth.ts` | Módulo | JWT sign/verify básico (`UserToken`) | Usado em `main.ts` para login/me | Ver divergência com `auth/auth-claims.ts` |
| Auth (novo) | `auth/auth-claims.ts` | Módulo | JWT sign/verify rico (`AuthTokenClaims`) | Inclui `userType`, `companyId`, `membershipId` | Confirmar qual está em uso ativo no login |
| Session | `session/session-access.ts` | Módulo | Avaliação de acesso por sessão | `CompanyStatus`, `ResolvedSession`, `evaluateSessionAccess` | — |
| Roles | `roles/roles.ts` | Módulo | Definição e mapeamento de roles | Legacy roles + tenant roles + platform roles | Ver seção 11 |
| AuthZ (RBAC) | `authz/` | Módulo | Sistema de autorização por permissão/role | Guards, policies, RBAC, company-status enforcement | — |
| Company Scope | `shared/company-scope/` | Shared | Multi-tenancy — isola queries por companyId | `assertCompanyScopeAllowed`, `withCompanyScope` | Crítico para multi-tenant |
| Scheduler | `shared/scheduler/` | Shared | Schedulers internos — publications + finance | Timers em memória | Ver seção 15 |
| Attendances | `attendances/` | Domínio | Atendimentos — core, conversion, SLA | — | — |
| Audit (team) | `audit/team/` | Domínio | Audit de gestão de equipe | — | — |
| BI | `bi/` | Domínio | Business Intelligence executive metrics | Produtividade + financeiro | — |
| Clients | `clients/` | Domínio | Clientes — consent, portal | — | — |
| Communication | `communication/` | Domínio | Comunicação com clientes | HTTP dispatcher | Confirmar canal (email/SMS) |
| Company | `company/` | Domínio | Empresa — service, validators | — | — |
| Company Status | `company-status/` | Domínio | Status da empresa — sync, types | — | — |
| CRM | `crm/` | Domínio | Leads, oportunidades, auditoria, conversão | Domínio mais complexo do produto | — |
| DataJud | `datajud.provider.ts` | Provider | Integração DataJud CNJ (lookup de processos) | API pública CNJ | — |
| Deadlines | `deadlines/` | Domínio | Prazos — core, bulk, audit, risk | — | — |
| Documents | `documents/` | Domínio | Documentos — approval, artifacts, checklist, links, upload, versioning | Upload presente | Confirmar storage |
| Epic IJ | `epic-ij/` | Domínio | Epic IJ — registro de rotas | Delegado para `registerEpicIjRoutes()` | Confirmar escopo |
| Finance | `finance/` | Domínio | Financeiro — ledger, billing, cobrança, instalments, reconciliação, relatórios, webhooks | Domínio mais rico | — |
| AI | `ai/` | Domínio | IA — audit, checklist, drafting, recommendation, summarization | Provider determinístico por padrão | Confirmar se há LLM externo |
| Jobs | `jobs/` | Domínio | Finance collection dispatch, publications ingestion, task followup | — | — |
| Mobile | `mobile/` | Domínio | Feed móvel — adapters, http | `registerMobileRoutes()` | Confirmar uso atual |
| Notifications | `notifications/` | Domínio | Task followup dispatcher | Notificações em memória (mock) no estado atual | Confirmar integração com DB |
| Ownership | `ownership/` | Domínio | Portfolio reassignment | — | — |
| Permissions | `permissions/` | Domínio | Matrix de permissões | — | — |
| Platform | `platform/` | Domínio | Platform admin — memberships, invitations, company-management, support, user-lifecycle, audit | Multi-tenant console | — |
| Platform Billing | `platform-billing/` | Domínio | Billing da plataforma | `registerPlatformBillingRoutes()` | — |
| Platform Actions | `platform-actions/` | Domínio | Ações de plataforma admin | `registerPlatformActionsRoutes()` | — |
| Plans | `plans/` | Domínio | Planos disponíveis | — | — |
| Productivity | `productivity/` | Domínio | Productivity snapshot | Para BI | — |
| Publications | `publications/` | Domínio | Publicações/Intimações — ingestão, pipeline, correlação, classification | Domínio complexo | — |
| Subscription | `subscription/` | Domínio | Assinaturas — service, transitions | — | — |
| Tasks | `tasks/` | Domínio | Tarefas — workflow, followup | — | — |
| Team | `team/` | Domínio | Equipes — ownership | — | — |
| Timesheet | `timesheet/` | Domínio | Controle de horas — entries, approval, reports | `registerTimesheetRoutes()` | — |
| Triage | `triage/` | Domínio | Triagem — decision, queue, automation, explainability, SLA | Triagem automatizada de publicações | — |

---

## 9. Rotas e Endpoints

> [!note] Fonte
> Extraídas de `main.ts` por busca de `app.(get|post|put|patch|delete|use)`. Rotas de módulos delegados (finance, epic-ij, etc.) listadas como bloco sem detalhe — detalhe será no KB-003D.

### 9.1 Endpoints principais inline em `main.ts`

| Método | Endpoint | Handler/Controller | Domínio | Auth exigida? | Consumido pelo frontend? | Observações | Ponto a validar |
|---|---|---|---|---|---|---|---|
| POST | `/auth/login` | Inline `main.ts:3856` | Auth | Não | Sim (`api.login`) | bcrypt + JWT + cookie | — |
| POST | `/auth/logout` | Inline `main.ts:3888` | Auth | Não | Sim (`api.logout`) | Limpa cookie | — |
| GET | `/me` | Inline `main.ts:3893` | Auth | Sim | Sim (`api.getMe`) | Retorna user do token | — |
| PUT | `/me/avatar` | Inline `main.ts:3901` | Profile | Sim | Sim (`api.updateAvatar`) | — | — |
| PUT | `/me/profile` | Inline `main.ts:3922` | Profile | Sim | Sim (`api.updateProfile`) | — | — |
| POST | `/me/change-password` | Inline `main.ts:3942` | Profile | Sim | Sim (`api.changePassword`) | — | — |
| GET | `/notifications` | Inline `main.ts:3973` | Notificações | Sim | Sim (`api.getNotifications`) | Mock em dev — lê de `devMockNotifications` | Confirmar integração com tabela `Notification` |
| POST | `/notifications/:id/read` | Inline `main.ts:3988` | Notificações | Sim | Sim (`api.markNotificationRead`) | — | — |
| POST | `/notifications/read-all` | Inline `main.ts:3998` | Notificações | Sim | Sim (`api.markAllNotificationsRead`) | — | — |
| GET | `/notifications/count` | Inline `main.ts:4008` | Notificações | Sim | Sim (`api.getNotificationCount`) | — | — |
| GET | `/users` | Inline `main.ts:4018` | Usuários | Sim | Sim (`api.getUsers`) | — | — |
| GET | `/home` | Inline `main.ts:7217` | Session | Sim | Sim (boot em `App.tsx`) | Retorna menu/cards por role (ADM/ADV/FIN/ATD) | — |
| GET | `/permissions` | Inline `main.ts:7177` | Authz | Sim | Sim (`api.getPermissions`) | — | — |
| POST | `/authz/check` | Inline `main.ts:7191` | Authz | Sim | Sim (`api.checkAuthorization`) | — | — |
| GET | `/clients` | Inline `main.ts:4035` | Clientes | Sim | Sim | — | — |
| GET | `/clients/:id` | Inline `main.ts:4056` | Clientes | Sim | Sim | — | — |
| POST | `/clients` | Inline `main.ts:4156` | Clientes | Sim | Sim | — | — |
| PUT | `/clients/:id` | Inline `main.ts:4196` | Clientes | Sim | Sim | — | — |
| DELETE | `/clients/:id` | Inline `main.ts:4249` | Clientes | Sim | Sim | — | — |
| GET | `/clients/:id/portal` | Inline `main.ts:4078` | Clientes | Sim | Sim | — | — |
| GET | `/clients/:id/consent` | Inline `main.ts:4105` | Clientes | Sim | Sim | — | — |
| PUT | `/clients/:id/consent` | Inline `main.ts:4127` | Clientes | Sim | Sim | — | — |
| GET | `/clients/:id/communications` | Inline `main.ts:4268` | Comunicação | Sim | Sim | — | — |
| POST | `/clients/:id/communications` | Inline `main.ts:4295` | Comunicação | Sim | Sim | — | — |
| POST | `/clients/:id/communications/:id/retry` | Inline `main.ts:4329` | Comunicação | Sim | — | — | Confirmar no frontend |
| GET | `/attendances` | Inline `main.ts:4358` | Atendimentos | Sim | Sim | — | — |
| GET | `/attendances/:id` | Inline `main.ts:4387` | Atendimentos | Sim | Sim | — | — |
| POST | `/attendances` | Inline `main.ts:4412` | Atendimentos | Sim | Sim | — | — |
| PUT | `/attendances/:id` | Inline `main.ts:4500` | Atendimentos | Sim | Sim | — | — |
| GET | `/deadlines` | Inline `main.ts:4567` | Prazos | Sim | Sim | — | — |
| GET | `/deadlines/:id` | Inline `main.ts:4610` | Prazos | Sim | Sim | — | — |
| POST | `/deadlines` | Inline `main.ts:4635` | Prazos | Sim | Sim | — | — |
| PUT | `/deadlines/:id` | Inline `main.ts:4687` | Prazos | Sim | Sim | — | — |
| POST | `/deadlines/bulk-action` | Inline `main.ts:4754` | Prazos | Sim | Sim | — | — |
| GET | `/documents` | Inline `main.ts:4880` | Documentos | Sim | Sim | — | — |
| GET | `/documents/:id` | Inline `main.ts:4912` | Documentos | Sim | Sim | — | — |
| GET | `/documents/:id/audit` | Inline `main.ts:4934` | Documentos | Sim | Sim | — | — |
| GET | `/documents/:id/links` | Inline `main.ts:4956` | Documentos | Sim | Sim | — | — |
| POST | `/documents/:id/links` | Inline `main.ts:4979` | Documentos | Sim | Sim | — | — |
| POST | `/documents` | Inline `main.ts:5031` | Documentos | Sim | Sim | — | — |
| PUT | `/documents/:id` | Inline `main.ts:5139` | Documentos | Sim | Sim | — | — |
| GET | `/crm/leads` | Inline `main.ts:5280` | CRM | Sim | Sim | — | — |
| GET | `/crm/opportunities` | Inline `main.ts:5303` | CRM | Sim | Sim | — | — |
| POST | `/crm/opportunities` | Inline `main.ts:5326` | CRM | Sim | Sim | — | — |
| PUT | `/crm/leads/:id` | Inline `main.ts:5405` | CRM | Sim | Sim | — | — |
| PUT | `/crm/opportunities/:id` | Inline `main.ts:5437` | CRM | Sim | Sim | — | — |
| POST | `/crm/leads/:id/contact-events` | Inline `main.ts:5487` | CRM | Sim | Sim | — | — |
| POST | `/crm/opportunities/:id/contact-events` | Inline `main.ts:5525` | CRM | Sim | Sim | — | — |
| GET | `/crm/opportunities/:id/documents` | Inline `main.ts:5571` | CRM | Sim | Sim | — | — |
| POST | `/crm/opportunities/:id/documents` | Inline `main.ts:5602` | CRM | Sim | Sim | — | — |
| GET | `/crm/opportunities/:id/audit` | Inline `main.ts:5649` | CRM | Sim | Sim | — | — |
| POST | `/crm/leads/:id/convert` | Inline `main.ts:5666` | CRM | Sim | Sim | — | — |
| POST | `/crm/opportunities/:id/convert` | Inline `main.ts:5715` | CRM | Sim | Sim | — | — |
| POST | `/crm/opportunities/:id/link-process` | Inline `main.ts:5771` | CRM | Sim | Sim | — | — |
| POST | `/crm/prospects/signal` | Inline `main.ts:5815` | CRM | Sim | — | Prospecção | Confirmar no frontend |
| GET | `/publication-captures` | Inline `main.ts:5847` | Publicações | Sim | Sim | — | — |
| GET | `/publication-captures/:id` | Inline `main.ts:5899` | Publicações | Sim | Sim | — | — |
| GET | `/publication-captures/:id/evidence` | Inline `main.ts:5926` | Publicações | Sim | — | — | Confirmar |
| GET | `/publication-pipeline/:correlationId` | Inline `main.ts:5940` | Publicações | Sim | Sim | — | — |
| GET | `/publication-pipeline/:correlationId/actions` | Inline `main.ts:5952` | Publicações | Sim | — | — | Confirmar |
| POST | `/publication-origin/backfill` | Inline `main.ts:5964` | Publicações | Sim | — | Backfill admin | Confirmar uso |
| GET | `/publications` | Inline `main.ts:5978` | Publicações | Sim | Sim | — | — |
| GET | `/publications/:id` | Inline `main.ts:6009` | Publicações | Sim | Sim | — | — |
| GET | `/publications/:id/audit` | Inline `main.ts:6036` | Publicações | Sim | Sim | — | — |
| POST | `/publications` | Inline `main.ts:6107` | Publicações | Sim | Sim | — | — |
| PUT | `/publications/:id` | Inline `main.ts:6181` | Publicações | Sim | Sim | — | — |
| POST | `/publications/:id/create-deadline` | Inline `main.ts:6226` | Publicações | Sim | Sim | — | — |
| GET | `/templates` | Inline `main.ts:6486` | Templates | Sim | Sim | — | — |
| GET | `/templates/:id` | Inline `main.ts:6508` | Templates | Sim | Sim | — | — |
| POST | `/templates` | Inline `main.ts:6522` | Templates | Sim | Sim | — | — |
| PUT | `/templates/:id` | Inline `main.ts:6575` | Templates | Sim | Sim | — | — |
| POST | `/templates/:id/generate-document` | Inline `main.ts:6613` | Templates | Sim | Sim | — | — |
| GET | `/tasks` | Inline `main.ts:6713` | Tarefas | Sim | Sim | — | — |
| GET | `/tasks/:id` | Inline `main.ts:6746` | Tarefas | Sim | Sim | — | — |
| POST | `/tasks` | Inline `main.ts:6769` | Tarefas | Sim | Sim | — | — |
| PUT | `/tasks/:id` | Inline `main.ts:6855` | Tarefas | Sim | Sim | — | — |
| GET | `/agenda` | Inline `main.ts:6912` | Agenda | Sim | Sim | — | — |
| GET | `/agenda/:id` | Inline `main.ts:6965` | Agenda | Sim | Sim | — | — |
| POST | `/agenda` | Inline `main.ts:6998` | Agenda | Sim | Sim | — | — |
| PUT | `/agenda/:id` | Inline `main.ts:7119` | Agenda | Sim | Sim | — | — |
| GET | `/processes` | Inline `main.ts:7232` | Processos | Sim | Sim | — | — |
| GET | `/processes/lookup` | Inline `main.ts:7253` | Processos | Sim | Sim | — | — |
| GET | `/processes/:id` | Inline `main.ts:7326` | Processos | Sim | Sim | — | — |
| POST | `/processes` | Inline `main.ts:7349` | Processos | Sim | Sim | — | — |
| PUT | `/processes/:id` | Inline `main.ts:7395` | Processos | Sim | Sim | — | — |
| DELETE | `/processes/:id` | Inline `main.ts:7456` | Processos | Sim | Sim | — | — |
| GET | `/processes/:id/andamentos` | Inline `main.ts:7470` | Processos | Sim | Sim | — | — |
| POST | `/processes/:id/andamentos` | Inline `main.ts:7480` | Processos | Sim | Sim | — | — |
| GET | `/processes/:id/prazos` | Inline `main.ts:7492` | Processos | Sim | Sim | — | — |
| POST | `/processes/:id/prazos` | Inline `main.ts:7513` | Processos | Sim | Sim | — | — |
| GET | `/processes/:id/documentos` | Inline `main.ts:7546` | Processos | Sim | Sim | — | — |
| POST | `/processes/:id/documentos` | Inline `main.ts:7570` | Processos | Sim | Sim | — | — |
| GET | `/processes/:id/atendimentos` | Inline `main.ts:7605` | Processos | Sim | Sim | — | — |
| POST | `/processes/:id/atendimentos` | Inline `main.ts:7626` | Processos | Sim | Sim | — | — |
| GET | `/triage` | Inline `main.ts:7665` | Triagem | Sim | Sim | — | — |
| GET | `/triage/:id` | Inline `main.ts:7740` | Triagem | Sim | Sim | — | — |
| GET | `/triage/:id/explain` | Inline `main.ts:7792` | Triagem | Sim | Sim | — | — |
| PUT | `/triage/:id` | Inline `main.ts:7816` | Triagem | Sim | Sim | — | — |
| POST | `/triage/:id/decision` | Inline `main.ts:7857` | Triagem | Sim | Sim | — | — |
| POST | `/triage/:id/prioritize` | Inline `main.ts:7718` | Triagem | Sim | — | — | Confirmar |
| POST | `/triage/:id/trigger-automation` | Inline `main.ts:8170` | Triagem | Sim | Sim | — | — |
| GET | `/triage/jobs` | Inline `main.ts:8200` | Triagem | Sim | Sim | — | — |
| POST | `/triage/jobs/run-cnj` | Inline `main.ts:8226` | Triagem | Sim | Sim | — | — |
| POST | `/triage/jobs/run-cpf` | Inline `main.ts:8239` | Triagem | Sim | — | — | Confirmar |
| POST | `/triage/jobs/run-diario` | Inline `main.ts:8252` | Triagem | Sim | — | — | Confirmar |
| POST | `/triage/jobs/run-oab` | Inline `main.ts:8265` | Triagem | Sim | — | — | Confirmar |
| POST | `/triage/jobs/:id/reprocess` | Inline `main.ts:8278` | Triagem | Sim | Sim | — | — |
| GET | `/` | Inline `main.ts:8384` | Health | Não | Não | `{ message: 'SaaS Jurídico API v1' }` — healthcheck informal | — |
| POST | `/admin/seed-finance` | Inline `main.ts:8390` | Admin | Sim | Não | **Role check usa `actor.role !== 'admin'` (lowercase) — possível bug** | Confirmar se autoriza corretamente |

### 9.2 Endpoints de módulos delegados (rotas registradas via register*Routes)

| Módulo | Função registradora | Prefixo provável | Fonte |
|---|---|---|---|
| Finance | `registerFinanceRoutes()` | `/finance/*` | `src/finance/http/register-finance-routes.ts` |
| Epic IJ | `registerEpicIjRoutes()` | `/epic-ij/*` ou misto | `src/epic-ij/register-epic-ij-routes.ts` |
| AI | `registerAiRoutes()` | `/ai/*` | `src/ai/http/register-ai-routes.ts` |
| BI | `registerBiRoutes()` | `/bi/*` | `src/bi/api/register-bi-routes.ts` |
| Timesheet | `registerTimesheetRoutes()` | `/timesheet/*` | `src/timesheet/http/register-timesheet-routes.ts` |
| Mobile | `registerMobileRoutes()` | `/mobile/*` | `src/mobile/http/register-mobile-routes.ts` |
| Platform Actions | `registerPlatformActionsRoutes()` | `/platform/*` | `src/platform-actions/register-platform-actions-routes.ts` |
| Platform Billing | `registerPlatformBillingRoutes()` | `/platform-billing/*` | `src/platform-billing/register-platform-billing-routes.ts` |
| Platform Console | `registerPlatformConsoleRoutes()` | `/platform/*` | `src/platform/register-platform-console-routes.ts` |

> [!note] Rotas de finance consumidas pelo frontend
> O frontend (`api.ts`) consome `/finance/reconciliation/run` e `/finance/collections/schedule` — confirmando que há endpoints de finance além dos listados acima. A lista completa dos endpoints de finance está em `register-finance-routes.ts` e será detalhada no KB-003D.

---

## 10. Autenticação e Sessão

| Item | Evidência | Como funciona | Risco | Ponto a validar |
|---|---|---|---|---|
| **Mecanismo de auth** | `main.ts:314-333` | JWT armazenado em cookie HTTP (`name: "Authorization"`) | — | — |
| **httpOnly** | `main.ts:327` | `httpOnly: true` — inacessível via JS do browser | Baixo | — |
| **Secure** | `main.ts:328` | `secure: isProduction` — apenas HTTPS em produção | Médio — em dev/staging sem HTTPS, cookie vai por HTTP | Confirmar que staging usa HTTPS |
| **SameSite** | `main.ts:329` | `sameSite: isProduction ? 'none' : 'strict'` | Médio — `none` em prod requer `secure: true` | Confirmar que `isProduction` está correto no Render |
| **Expiração do token** | `auth.ts:13` e `auth/auth-claims.ts:15` | 8 horas | — | — |
| **Expiração do cookie** | `main.ts:332` | `maxAge: 8 * 60 * 60 * 1000` (8h) | — | — |
| **Login** | `main.ts:3856` | POST `/auth/login` → bcrypt.compare → signUserToken → setAuthCookie | — | — |
| **Logout** | `main.ts:3888` | POST `/auth/logout` → clearAuthCookie | — | — |
| **GET /me** | `main.ts:3893` | Lê cookie → verifyToken → retorna `{ user: { id, email, role } }` | — | — |
| **GET /home** | `main.ts:7217` | Lê cookie → verifyToken → retorna menu/cards por role | — | — |
| **JWT Secret** | `auth.ts:10`, `auth/auth-claims.ts:15` | `process.env.JWT_SECRET || 's3cr3t-juridico'` | **Alto** — valor fallback hardcoded no código; qualquer deploy sem env var usa este segredo | Confirmar que `JWT_SECRET` está sempre configurado no Render |
| **Sem refresh token** | Análise de código | Não há endpoint de refresh; sessão expira em 8h sem renovação | Médio | Confirmar comportamento esperado (relogin ou sessão longa) |
| **Dev mock** | `main.ts:116-122`, `354-362` | Quando DB indisponível e `devMockEnabled=true`, autentica com usuários mock em memória | ✅ **Mitigado** (2026-05-30) — senhas movidas para `LEXORA_DEV_PASSWORD` env var (commit `94a8c91`). `devMockEnabled = !isProduction` garante que não ativa em produção. | — |
| **Dois auth files** | `src/auth.ts` e `src/auth/auth-claims.ts` | `auth.ts` tem claims simples (`sub, role, email`); `auth/auth-claims.ts` tem claims ricos (`userType, companyId, membershipId`) | **Médio** — login usa `auth.ts` legado; `auth-claims.ts` é mais novo mas pode não ser o path do login principal | Confirmar qual é usado no fluxo de login e qual pode ser descontinuado |
| **Bearer token via header** | `main.ts:313-323` | Aceita token via cookie OU via `Authorization: Bearer ...` header | Baixo | Dual auth path pode ser útil para testes/BI |

> [!success] Dev mock — senhas movidas para env vars (2026-05-30)
> `main.ts:117-122` agora usa `process.env.LEXORA_DEV_PASSWORD ?? '123456'` e `process.env.LEXORA_SEED_PASSWORD ?? '123456'`. O fallback `'123456'` permanece como default de desenvolvimento — risco aceito e documentado em `.env.example`. Em produção, `devMockEnabled = !isProduction` garante que o mock nunca é ativado (commit `94a8c91`).

---

## 11. Autorização e Permissões

| Regra/Permissão | Onde está | Como funciona | Risco | Ponto a validar |
|---|---|---|---|---|
| **Roles legados** | `src/roles/roles.ts:7` | ADM→company_admin, ADV→lawyer, FIN→company_finance, ATD→assistant | Médio — coexistência de roles legados e novos | Confirmar que login e `main.ts` usam roles coerentes |
| **Tenant roles** | `src/roles/roles.ts:1` | company_admin, manager, lawyer, assistant, company_finance | — | — |
| **Platform roles** | `src/roles/roles.ts:4` | platform_admin, platform_billing, platform_support | — | — |
| **Check de role inline** | `main.ts:7237` (processes) | `if (decoded.role === 'ADM' || decoded.role === 'FIN')` — acesso total; outros veem apenas os próprios | Médio — role check hardcoded inline em múltiplos handlers | Verificar consistência nos outros handlers |
| **AuthZ guard** | `src/authz/guards/authz.guard.ts` | `ensureAuthorized()` + `enforceCompanyStatusForAuthorization()` — verifica permissão + status da empresa | — | — |
| **AuthZ policies** | `src/authz/policies/authz.check.ts`, `authz.types.ts` | `AuthzCheckInput` → `AuthzDecision` com `allowed, reason, scope` | — | — |
| **RBAC permissions** | `src/authz/rbac/permissions.ts` | Permissões definidas por tipo de recurso | — | Verificar no KB-003D |
| **Finance permissions** | `src/authz/finance/permissions.ts` | Permissões específicas para módulo financeiro | — | — |
| **Company Status** | `src/authz/company-status/company-status-authz-enforcer.ts` | Bloqueia operações quando empresa está suspensa/read_only/cancelada | — | — |
| **Multi-tenant** | `src/shared/company-scope/company-scope-prisma.adapter.ts` | `assertCompanyScopeAllowed` — garante que operações ficam dentro da empresa autenticada | Alto — falha aqui vaza dados entre tenants | Garantir uso consistente em todos os repositories |
| **Platform admin** | `src/platform-auth/platform-user-policy.ts` | Avalia policy para usuários de plataforma | — | — |
| **CompanyMutationGuard** | `src/platform-access/company-status-access-policy.ts` | Política de acesso baseada em status da empresa | — | — |
| **Admin seed** | `main.ts:8392` | ✅ `if (actor.role !== 'ADM')` — **corrigido em 2026-05-30** (commit `fae145a`) | — | — |

> [!success] Bug `/admin/seed-finance` corrigido (2026-05-30)
> O check `actor.role !== 'admin'` foi corrigido para `actor.role !== 'ADM'`. Endpoint agora acessível exclusivamente por usuários com role `ADM`. Commit `fae145a`.

---

## 12. Prisma e Banco de Dados

| Item | Caminho | Papel | Status aparente | Risco | Ponto a validar |
|---|---|---|---|---|---|
| **Schema ativo** | `backend/prisma/schema.prisma` | Schema PostgreSQL vigente | Ativo | Fonte de verdade do banco | — |
| **Provider** | `schema.prisma:5` | `provider = "postgresql"` | Confirmado | — | — |
| **DATABASE_URL** | `schema.prisma:6`, `.env.example` | `env("DATABASE_URL")` | — | JWT_SECRET fallback hardcoded, idem DATABASE_URL sem fallback (mais seguro) | — |
| **Prisma Client** | `backend/src/generated/prisma/` | Gerado pelo `prisma generate` | No `.gitignore` | Deve ser gerado no deploy | — |
| **Schema alternativo** | `backend/prisma/schema.postgres.prisma` | Schema Postgres alternativo (14/05/2026) | Ponto a validar | Pode ser artefato de migração SQLite→Postgres | Confirmar no KB-003D |
| **SQLite legado** | `backend/prisma/dev.db` | Banco SQLite local | Legado — não deve ir para prod | No `.gitignore` raiz | Confirmar que não afeta CI |
| **Migrations** | `backend/prisma/migrations/` | 25 migrations (2026-05-14 a 2026-05-29) | Ativas | — | Listar modelos no KB-003D |
| **Seed SQL** | `backend/prisma/seed.sql`, `seed-finance.sql` | Seeds diretos SQL | Técnico | — | — |
| **Seed TS** | `backend/prisma/seed-finance.ts` | Seed de finanças via TypeScript/Prisma | Técnico | — | — |
| **Schema init SQL** | `backend/prisma/schema_init.sql` | SQL de inicialização | Técnico | Artefato da migração SQLite→Postgres? | Confirmar uso |
| **prisma.config.ts (backend)** | `backend/prisma.config.ts` | Config Prisma do backend | Data 02/04/2026 — possível legado | Aponta para `prisma/schema.prisma` relative | Confirmar qual config é usada em deploy |
| **prisma.config.ts (raiz)** | `prisma.config.ts` (raiz do projeto) | Config Prisma da raiz — delega para backend | Data mais recente | Aponta para `backend/prisma/schema.prisma` | Confirmar qual config é ativa no CI |
| **Prisma version** | `package.json` | `prisma@^4.16.2` e `@prisma/client@^4.16.2` | 4.x | Versão desatualizada (atual: 5.x/6.x) | Avaliar upgrade no futuro |
| **Modelos no schema** | `backend/prisma/schema.prisma` | User, Company, Plan, Subscription, SubscriptionTransition, e mais | Parcialmente lido | Análise completa no KB-003D | KB-003D |

### Migrations identificadas

| Migration | Data | Conteúdo provável |
|---|---|---|
| `20260514224911_init_postgres` | 2026-05-14 | Criação inicial do schema PostgreSQL |
| `20260515042000_add_clients` | 2026-05-15 | Clientes |
| `20260515053000_expand_attendances` | 2026-05-15 | Atendimentos expandidos |
| `20260515064500_add_tasks` | 2026-05-15 | Tarefas |
| `20260515080000_add_agenda_events` | 2026-05-15 | Eventos de agenda |
| `20260515102000_expand_deadlines` | 2026-05-15 | Prazos expandidos |
| `20260515104500_expand_documents` | 2026-05-15 | Documentos expandidos |
| `20260515113000_add_process_number_lookup` | 2026-05-15 | Lookup de número de processo |
| `20260515120500_add_publications` | 2026-05-15 | Publicações |
| `20260516001000_add_templates` | 2026-05-16 | Templates |
| `20260516103000_publication_deadline_link` | 2026-05-16 | Link publicação-prazo |
| `20260516120000_add_triage_domain` | 2026-05-16 | Domínio de triagem |
| `20260516133000_add_crm_contact_history` | 2026-05-16 | Histórico de contato CRM |
| `20260517003000_add_crm_converted_process_id` | 2026-05-17 | ID do processo convertido no CRM |
| `20260521103000_add_crm_audit_and_opportunity_attachments` | 2026-05-21 | Auditoria CRM + anexos de oportunidade |
| `20260521120000_add_finance_epic_b` | 2026-05-21 | Finance Epic B |
| `20260521170000_add_finance_installment_plans` | 2026-05-21 | Planos de parcelamento |
| `20260525070000_epic_ij_foundations` | 2026-05-25 | Fundações do Epic IJ |
| `20260526123000_epic_klm_foundations` | 2026-05-26 | Fundações dos Epics K, L, M |
| `20260526140000_publication_origin_rework` | 2026-05-26 | Rework de origem de publicações |
| `20260527103000_add_company_membership_domain` | 2026-05-27 | Domínio de membros de empresa |
| `20260527121500_add_platform_billing_saas` | 2026-05-27 | Billing SaaS da plataforma |
| `20260527183000_add_plan_subscription_domain` | 2026-05-27 | Domínio de planos e assinaturas |
| `20260529000000_add_user_avatar_phone_notification` | 2026-05-29 | Avatar, telefone e notificações do usuário |
| `20260529100000_add_process_area` | 2026-05-29 | Área do processo |

> [!note] Comparação profunda de schema e contratos
> A análise detalhada dos modelos Prisma, campos, relações e comparação com contratos do frontend será feita no **KB-003D — Dados, Prisma e Contratos**.

---

## 13. DTOs, Validação e Contratos de API

| Item | Caminho | Papel | Relação com frontend | Risco | Ponto a validar |
|---|---|---|---|---|---|
| `agenda.contract.ts` | `src/agenda.contract.ts` | Builder de payload de agenda | `ApiAgendaEvent` em `frontend/src/api.ts` | — | Comparar campos no KB-003D |
| `crm.contract.ts` | `src/crm.contract.ts` | Builders de payload CRM (lead, opportunity) | `ApiCrmLead`, `ApiCrmOpportunity` em `api.ts` | — | KB-003D |
| `deadlines.contract.ts` | `src/deadlines.contract.ts` | Builder de payload de prazos | `ApiDeadline` em `api.ts` | — | KB-003D |
| `documents.contract.ts` | `src/documents.contract.ts` | Builder de payload de documentos | `ApiDocument` em `api.ts` | — | KB-003D |
| `finance.contract.ts` | `src/finance.contract.ts` | Builder de payload financeiro | `ApiFinanceEntry` e ~10 tipos finance em `api.ts` | — | KB-003D |
| `publications.contract.ts` | `src/publications.contract.ts` | Builder de payload de publicações | `ApiPublication` e tipos em `api.ts` | — | KB-003D |
| `tasks.contract.ts` | `src/tasks.contract.ts` | Builder de payload de tarefas | `ApiTask` em `api.ts` | — | KB-003D |
| `templates.contract.ts` | `src/templates.contract.ts` | Builder de payload de templates | `ApiTemplate` em `api.ts` | — | KB-003D |
| `triage.contract.ts` | `src/triage.contract.ts` | Builders de payload de triagem | `ApiTriageItem`, `ApiTriageDecision` em `api.ts` | — | KB-003D |
| Validators por domínio | `src/*/validators.ts`, `src/*/validators/*.ts` | Validação de input por domínio | — | Validadores TypeScript puro — sem Zod/Joi/class-validator identificado | Confirmar abordagem de validação |
| `contracts/*.json` (raiz) | Raiz do projeto | Contratos JSON por epic/fase | Relação com `*.contract.ts` não validada | Qual é fonte autoritativa? | KB-003D prioritário |

> [!note] Sem library de validação de input global identificada
> Não foi identificado uso de Zod, Joi, class-validator ou similares nos arquivos de validação analisados. A validação parece ser feita via TypeScript puro e funções de validação customizadas. Confirmar no KB-003D.

> [!note] Fonte autoritativa de contratos ainda indefinida
> Coexistem: arquivos `*.contract.ts` no backend, tipos `Api*` no `frontend/src/api.ts`, e contratos JSON em `contracts/` na raiz do projeto. A fonte autoritativa será definida no KB-003D.

---

## 14. Serviços e Regras de Negócio

| Service/Arquivo | Domínio | Responsabilidade | Dependências | Risco | Ponto a validar |
|---|---|---|---|---|---|
| `ClientConsentService` | Clientes | LGPD / consentimento do cliente | Prisma repository | — | — |
| `ClientPortalService` | Clientes | Portal do cliente | Prisma repository | — | — |
| `ClientCommunicationService` | Comunicação | Comunicação com clientes | HTTP dispatcher + Prisma | Confirmar canal ativo (email/SMS) | — |
| `CrmProspectingService` | CRM | Prospecção de leads | Prisma | — | — |
| `CrmOpportunityConversionService` | CRM | Conversão de oportunidade em processo | Prisma | — | — |
| `DeadlineRiskService` | Prazos | Cálculo de risco de prazo | Prisma | — | — |
| `DeadlineBulkActionService` | Prazos | Ações em lote de prazos | Prisma | — | — |
| `DocumentApprovalService` | Documentos | Aprovação de documentos | Prisma | — | — |
| `DocumentVersioningService` | Documentos | Versionamento de documentos | Prisma | — | — |
| `DocumentUploadService` | Documentos | Upload de documentos | Prisma | Confirmar storage (local fs vs cloud) | — |
| `FinanceEntryService` | Finance | Lançamentos financeiros | Repository + audit | — | — |
| `FinanceBillingService` | Finance | Cobrança / boletos | Repository + payment provider | — | — |
| `FinanceInstallmentPlanService` | Finance | Parcelamento | Repository | — | — |
| `FinanceReconciliationService` | Finance | Reconciliação financeira | Repository | — | — |
| `FinanceCollectionsService` | Finance | Cobranças automáticas | Repository + scheduler | — | — |
| `FinanceWebhookService` | Finance | Webhooks de pagamento | Repository + payment provider | — | — |
| `CreateDeadlineFromPublicationService` | Publicações | Criação automática de prazo a partir de publicação | Prisma | — | — |
| `PublicationIngestion` | Publicações | Ingestão de publicações | Providers externos | — | — |
| `TriageDecisionEngine` | Triagem | Motor de decisão de triagem | AI provider + Prisma | — | — |
| `PostTriageAutomationRunner` | Triagem | Automação pós-triagem | Prisma | — | — |
| `ProductivitySnapshotService` | Produtividade | Snapshot de produtividade para BI | Prisma | — | — |
| `BiSnapshotService` | BI | Snapshots de BI | Prisma | — | — |
| `SubscriptionService` | Assinaturas | Gestão de assinaturas SaaS | Prisma | — | — |
| `PlatformCompanyManagementService` | Platform | Gestão de empresas na plataforma | Prisma | — | — |

---

## 15. Integrações Externas

| Integração | Arquivo | Finalidade | Configuração | Risco | Ponto a validar |
|---|---|---|---|---|---|
| **DataJud CNJ** | `src/datajud.provider.ts` | Lookup de processos por número CNJ | `DATAJUD_API_KEY` env var; API pública CNJ | Baixo — API pública; chave demo no `.env.example` | Confirmar que chave de produção está configurada no Render |
| **CNJ Publications** | `src/cnj-publications.provider.ts` | Coleta de publicações CNJ | Configuração a verificar | — | — |
| **CPF Publications** | `src/cpf-publications.provider.ts` | Coleta de publicações por CPF | Configuração a verificar | — | — |
| **Diário Publications** | `src/diario-publications.provider.ts` | Coleta de publicações de diários oficiais | Configuração a verificar | — | — |
| **OAB Publications** | `src/oab-publications.provider.ts` | Coleta de publicações OAB | Configuração a verificar | — | — |
| **Finance Payment Provider** | `src/finance/payment-links/http-payment-provider.ts` | Integração com gateway de pagamento | `FINANCE_PAYMENT_PROVIDER`, `FINANCE_PROVIDER_BASE_URL`, `FINANCE_PROVIDER_API_KEY` | Mock ativo por padrão (`FINANCE_PAYMENT_PROVIDER=mock`) | Confirmar se há gateway real configurado em produção |
| **Finance Webhooks** | `src/finance/webhooks/finance-webhook.service.ts` | Recebimento de webhooks de pagamento | `FINANCE_PROVIDER_WEBHOOK_SECRET` | Webhook secret deve estar configurado | — |
| **Finance Scheduler** | `src/shared/scheduler/finance-scheduler-registry.ts` | Scheduler de cobranças automáticas | `FINANCE_SCHEDULER_ENABLED=1` para ativar | Desabilitado por padrão | Confirmar se está ativado em produção |
| **AI Provider** | `src/ai/core/ai-provider.port.ts`, `DeterministicAiProvider` | Provider de IA para sumarização e recomendação | Nenhuma env var externa identificada | Fallback determinístico — sem LLM externo configurado atualmente | Confirmar se há integração com LLM externo (OpenAI, Claude, etc.) planejada |
| **Communication Dispatcher** | `src/communication/http-communication-dispatcher.ts` | Envio de comunicações (email/SMS) para clientes | Configuração a verificar | Canal de comunicação real a confirmar | — |
| **Process Lookup** | `src/process-lookup.provider.ts` | Lookup externo de processos | A verificar (pode usar DataJud internamente) | — | Confirmar relação com datajud.provider.ts |

---

## 16. Segurança Preliminar da API

| Risco | Evidência | Impacto | Recomendação | Prioridade | Deve virar backlog? |
|---|---|---|---|---|---|
| **JWT_SECRET fallback hardcoded** | `src/auth.ts:10`, `src/auth/auth-claims.ts:15` — `|| 's3cr3t-juridico'` | **Alto** — tokens forjáveis se env var não estiver configurada | Remover fallback; garantir que `JWT_SECRET` seja obrigatória no startup | P0 | Sim |
| **Sem rate limiting** | Análise de `main.ts` — sem `express-rate-limit` ou similar | **Alto** — endpoints de login, APIs de dados e admin sem proteção contra brute force | Adicionar `express-rate-limit` especialmente em `/auth/login` | P1 | Sim |
| **Sem headers de segurança (Helmet)** | Análise de `main.ts` — sem `helmet` | **Médio** — sem CSP, HSTS, X-Frame-Options no backend | Adicionar `helmet` como middleware global | P1 | Sim |
| **Dev mock users com senhas em plain text** | `main.ts:117-122` — `password: '123456'` em código-fonte | **Médio** — credenciais expostas em qualquer clone do repo | Mover para variáveis de ambiente ou remover do código-fonte | P1 | Sim |
| **Exposição de stack trace** | Handlers genéricos: `res.status(500).json({ message: error.message })` | **Médio** — `error.message` pode vazar detalhes internos | Usar mensagens genéricas em prod; logar o stack trace internamente | P2 | Sim |
| **Admin seed endpoint exposto** | `main.ts:8390-8392` — POST `/admin/seed-finance`; role check provável bug | **Alto** — qualquer usuário autenticado pode acionar seed | Corrigir role check; proteger com role ADM; considerar remover em prod | P1 | Sim |
| **sameSite: 'none' em produção** | `main.ts:329` | **Médio** — requer `secure: true` para funcionar; correto com HTTPS mas frágil | Confirmar que Render serve HTTPS e que `isProduction` está configurado corretamente | P1 | Sim (validação) |
| **CORS credentials: true** | `main.ts:292` | **Médio** — combinado com whitelist, é seguro; mas requer atenção ao expandir origens | Monitorar adição de novas origens | P2 | Não (monitoramento) |
| **Sem validação global de input** | Ausência de Zod/Joi/class-validator identificada | **Médio** — validações customizadas podem ter gaps | Avaliar adoção de biblioteca de validação no KB-003D | P2 | Sim |
| **Sem logging estruturado de requests** | Ausência de morgan/pino identificada | **Médio** — sem audit trail de requests em produção | Adicionar middleware de logging estruturado | P2 | Sim |
| **Prisma 4.x desatualizado** | `package.json` — `@prisma/client@^4.16.2` | **Baixo** — sem correções de segurança mais recentes | Avaliar upgrade para Prisma 5.x ou 6.x | P3 | Sim |
| **NestJS em dependencies de produção** | `package.json` — `@nestjs/cli` em `dependencies` | **Baixo** — aumenta bundle de produção | Mover `@nestjs/cli` para `devDependencies` | P3 | Sim (BL-012) |
| **tmp_hash.js solto no backend** | `backend/tmp_hash.js` (02/04/2026) | **Baixo** — artefato de setup sem valor | Confirmar que está no `.gitignore` e não é referenciado | P3 | Sim |

---

## 17. Logs, Observabilidade e Erros

| Item | Caminho | Papel | Risco | Ponto a validar |
|---|---|---|---|---|
| **Console.log** | `main.ts:8526` — `console.log(\`Backend rodando em...\`)` | Log de startup | Baixo | — |
| **Console.error** | `main.ts:8520` — `console.error('[seed-finance]', err)` | Log de erro do seed | Baixo | — |
| **Logger de publicações** | `src/logging/publication-logger.ts` | Logger específico de publicações | — | Confirmar destino (console vs arquivo vs serviço externo) |
| **FinanceAuditService** | `src/finance/shared/audit.ts` | Audit log de ações financeiras | — | Auditoria salva no banco? |
| **PlatformAuditService** | `src/platform/audit/platform-audit.service.ts` | Audit de ações na plataforma | Usa `billingEvent` como backend de storage (verificado em `register-platform-console-routes.ts`) | — |
| **Sem middleware global de logging** | Análise de `main.ts` | Sem morgan/pino/winston global | **Médio** — sem request logging automático em produção | Adicionar logging estruturado |
| **Logs de execução** | `backend/*.log` (múltiplos) | Logs gerados em dev/staging | Técnico — no `.gitignore` | — |
| **Sentry** | Ausência verificada | Sem Sentry no backend | **Médio** — sem rastreamento de erros em produção | Confirmar se é intencional; frontend tem stub de Sentry |
| **Error handling** | Handlers: `catch (error) { res.status(500).json({ message: error.message }) }` | Tratamento básico inline | **Médio** — expõe `error.message` ao cliente | — |

---

## 18. Testes do Backend

| Item | Tipo | Papel | Status aparente | Observações | Ponto a validar |
|---|---|---|---|---|---|
| `src/**/*.test.cjs` | Testes unitários | Testes de services e utilities por domínio | Presente — ~40+ arquivos identificados | Formato `.cjs` sugere uso de framework de teste nativo do Node.js (`node:test`) | Confirmar runner e executor |
| `src/ai/audit/ai-audit.service.test.cjs` | Unitário | Teste do service de audit de IA | — | — | — |
| `src/auth/auth-claims.test.cjs` | Unitário | Teste de auth-claims | — | — | — |
| `src/authz/company-status/company-status-authz-enforcer.test.cjs` | Unitário | Teste do enforcer de company-status | — | — | — |
| `src/authz/policies/authz.check.test.cjs` | Unitário | Teste de políticas de authz | — | — | — |
| `src/session/session-access.test.cjs` | Unitário | Teste de session access | — | — | — |
| `src/finance/billing/billing.service.test.cjs` | Unitário | Testes do billing service | — | — | — |
| `src/triage/decision-engine.test.cjs` | Unitário | Testes do decision engine | — | — | — |
| `src/shared/company-scope/cross-tenant.guard.test.cjs` | Unitário | Testes do guard multi-tenant | — | Crítico para segurança | Confirmar cobertura |
| Scripts de teste na raiz | CI | `test` script em `package.json` — **"Error: no test specified"** na raiz | **Ausente** | O script `test` raiz retorna erro — sem execução centralizada | Confirmar como testes do backend são executados na CI |
| Smoke tests frontend | E2E | Cobrem fluxos que tocam o backend | Presentes | Ver KB-003B | — |
| Epic CDE seed test | CI | `ci.yml` — `node --test` no step de seed | Técnico | Valida o seed, não as rotas | — |

> [!warning] Sem integration tests para rotas HTTP identificados
> Os testes unitários `.test.cjs` cobrem services e utilities, mas não foram identificados testes de integração que testem os handlers HTTP de `main.ts` diretamente. A cobertura dos ~100+ endpoints depende dos smoke tests Playwright do frontend.

---

## 19. Deploy e Ambiente do Backend

| Item | Evidência | Papel | Risco | Ponto a validar |
|---|---|---|---|---|
| **Render (staging)** | URL hardcoded no `vercel.json` raiz — `juridico-api-staging.onrender.com` | Hosting do backend de staging | — | Confirmar se há instância de produção separada no Render |
| **Script de start** | `package.json:6` — `prisma migrate deploy ... && node dist/main.js` | Startup de produção: migra + inicia | — | Confirmar que funciona no Render |
| **Build** | `package.json:8` — `tsc` | Compila TypeScript para `dist/` | — | — |
| **PORT** | `.env.example:1` — `PORT=3000`; `main.ts:97` — `process.env.PORT || 3000` | Porta configurável | Baixo | Render injeta `PORT` automaticamente |
| **DATABASE_URL** | `.env.example:6-7` — PostgreSQL URL | Conexão com banco | Alto (segredo) | Confirmar que está configurado no Render |
| **FRONTEND_URL** | `.env.example:2` | CORS — origem permitida | Médio | Deve ser a URL do frontend Vercel em prod |
| **NODE_ENV** | `main.ts:113` — `process.env.NODE_ENV === 'production'` | Controla `isProduction` | **Alto** | Confirmar que `NODE_ENV=production` está configurado no Render staging e production |
| **LEXORA_DEV_MOCK** | `main.ts:115` | Controla o mock dev | Médio | Confirmar que `LEXORA_DEV_MOCK=0` ou `NODE_ENV=production` em staging/prod |
| **Sem Dockerfile** | Análise do projeto | Sem containerização | Baixo | Render pode usar Docker ou Node.js direto | Confirmar tipo de deployment no Render |
| **Sem render.yaml** | Análise do projeto | Sem config declarativa do Render | Baixo | Config pode estar no painel do Render | Confirmar |
| **CI/CD** | `.github/workflows/ci.yml` | GitHub Actions — build, migrate, smoke tests | Ativo | Inicia backend com `nohup` no CI | — |
| **Finance Scheduler** | `FINANCE_SCHEDULER_ENABLED=0` default | Scheduler de cobranças | Baixo | Confirmar se deve estar ativado em produção | — |
| **Backend dist** | `backend/dist/` | Build local presente (27/05/2026) | Técnico | No `.gitignore` — deve ser gerado no Render | — |

> [!warning] NODE_ENV não verificado no Render
> O comportamento de produção do backend (cookie `secure`, `sameSite`, desativação do dev mock) depende de `NODE_ENV === 'production'`. Se `NODE_ENV` não estiver configurado no Render, o backend pode rodar em modo dev em produção, com dev mock ativo e cookies sem `secure`.

---

## 20. Comparação Inicial com `frontend/src/api.ts`

> [!note] Comparação superficial
> Esta seção compara domínios e endpoints em alto nível. Comparação campo a campo de contratos será feita no KB-003D.

| Endpoint ou domínio | Existe no frontend api.ts? | Encontrado no backend? | Status | Observação | Próximo passo |
|---|---|---|---|---|---|
| `POST /auth/login` | Sim | Sim (`main.ts:3856`) | Alinhado | — | — |
| `POST /auth/logout` | Sim | Sim (`main.ts:3888`) | Alinhado | — | — |
| `GET /me` | Sim | Sim (`main.ts:3893`) | Alinhado | — | — |
| `GET /home` | Sim (boot em App.tsx) | Sim (`main.ts:7217`) | Alinhado | — | — |
| `PUT /me/avatar` | Sim | Sim (`main.ts:3901`) | Alinhado | — | — |
| `PUT /me/profile` | Sim | Sim (`main.ts:3922`) | Alinhado | — | — |
| `POST /me/change-password` | Sim | Sim (`main.ts:3942`) | Alinhado | — | — |
| `GET /notifications` | Sim | Sim (`main.ts:3973`) | Alinhado | Mock em dev | — |
| `GET /notifications/count` | Sim | Sim (`main.ts:4008`) | Alinhado | `notificationCount={3}` hardcoded no frontend — RF-004 do KB-003B | Integrar no KB-003D |
| `GET /permissions` | Sim | Sim (`main.ts:7177`) | Alinhado | — | — |
| `POST /authz/check` | Sim | Sim (`main.ts:7191`) | Alinhado | — | — |
| `GET /users` | Sim | Sim (`main.ts:4018`) | Alinhado | — | — |
| `GET /clients` | Sim | Sim (`main.ts:4035`) | Alinhado | — | — |
| `GET /attendances` | Sim | Sim (`main.ts:4358`) | Alinhado | — | — |
| `GET /deadlines` | Sim | Sim (`main.ts:4567`) | Alinhado | — | — |
| `GET /documents` | Sim | Sim (`main.ts:4880`) | Alinhado | — | — |
| `GET /crm/leads` | Sim | Sim (`main.ts:5280`) | Alinhado | — | — |
| `GET /publications` | Sim | Sim (`main.ts:5978`) | Alinhado | — | — |
| `GET /templates` | Sim | Sim (`main.ts:6486`) | Alinhado | — | — |
| `GET /tasks` | Sim | Sim (`main.ts:6713`) | Alinhado | — | — |
| `GET /agenda` | Sim | Sim (`main.ts:6912`) | Alinhado | — | — |
| `GET /processes` | Sim | Sim (`main.ts:7232`) | Alinhado | — | — |
| `GET /triage` | Sim | Sim (`main.ts:7665`) | Alinhado | — | — |
| `POST /finance/reconciliation/run` | Sim (`api.ts:1220`) | Via `registerFinanceRoutes()` | Pendente de validação | Endpoint existe mas rota exata a confirmar | KB-003D |
| `POST /finance/collections/schedule` | Sim (`api.ts:1233`) | Via `registerFinanceRoutes()` | Pendente de validação | Idem | KB-003D |
| AI routes (`/ai/*`) | A confirmar | Via `registerAiRoutes()` | Pendente de validação | Verificar se frontend consome AI diretamente | KB-003D |
| BI routes (`/bi/*`) | A confirmar | Via `registerBiRoutes()` | Pendente de validação | Dashboard pode consumir | KB-003D |
| Timesheet routes | A confirmar | Via `registerTimesheetRoutes()` | Pendente de validação | — | KB-003D |
| Mobile routes | A confirmar | Via `registerMobileRoutes()` | Pendente de validação | Confirmar se há app mobile | KB-003D |
| Platform console routes | A confirmar | Via `registerPlatformConsoleRoutes()` | Pendente de validação | platform-admin no frontend sem rota — ver RF-002 KB-003B | KB-003D |
| `/admin/seed-finance` | Não (sem método no api.ts) | Sim (`main.ts:8390`) | Existente no backend e não no frontend | Endpoint admin não exposto via api.ts do frontend | — |
| `GET /` | Não | Sim (`main.ts:8384`) | Existente no backend e não no frontend | Healthcheck informal | — |

---

## 21. Riscos Técnicos do Backend

### Alta Prioridade

**RB-001 — JWT_SECRET com fallback hardcoded em código-fonte**
- Evidência: `src/auth.ts:10` — `const JWT_SECRET = process.env.JWT_SECRET || 's3cr3t-juridico'`; `src/auth/auth-claims.ts:15` — idem.
- Impacto: Se `JWT_SECRET` não estiver configurada no ambiente, qualquer deploy usa `'s3cr3t-juridico'` como chave, tornando tokens forjáveis por qualquer pessoa que tenha acesso ao código.
- Recomendação: Remover o fallback; adicionar validação no startup que lança exceção se `JWT_SECRET` não estiver configurada.
- Próximo passo: Candidato ao backlog como correção de segurança P0.

**RB-002 — `main.ts` monolito de ~8.500 linhas com todas as rotas**
- Evidência: Arquivo único `backend/src/main.ts` com ~8.500 linhas contendo bootstrap, dados mock, helpers, e todos os handlers HTTP.
- Impacto: Manutenção difícil; sem separação de responsabilidades; testes de integração por rota ausentes; conflitos de merge frequentes.
- Recomendação: Extrair handlers para controllers/routers por domínio (padrão `registerFinanceRoutes` já presente — estender para todos os domínios).
- Próximo passo: Candidato ao backlog como refatoração arquitetural P2.

**RB-003 — Bug provável em `/admin/seed-finance` — role check incorrect**
- Evidência: `main.ts:8392` — `if (actor.role !== 'admin')` — todos os roles reais são `ADM`, `ADV`, etc. Check sempre retorna 403.
- Impacto: O endpoint seed está inacessível para qualquer usuário (retorna 403 para todos), ou o check está invertido e deveria bloquear não-admins.
- Recomendação: Corrigir para `actor.role !== 'ADM'` ou investigar se há role `'admin'` separado; considerar remover endpoint de produção.
- Próximo passo: Validar com o usuário; candidato ao backlog P1.

**RB-004 — Dev mock com credenciais hardcoded em código-fonte**
- Evidência: `main.ts:117-122` — `{ email: 'admin@juridico.com', password: '123456', role: 'ADM' }` e similares.
- Impacto: Credenciais expostas em qualquer clone do repositório; risco se repositório for público.
- Recomendação: Mover para variáveis de ambiente ou seed de banco; condicionar ao build `dev` apenas.
- Próximo passo: Candidato ao backlog P1.

**RB-005 — NODE_ENV não verificado no Render**
- Evidência: Comportamento crítico depende de `NODE_ENV === 'production'` (`isProduction`): cookies `secure`, `sameSite: 'none'`, desativação do dev mock.
- Impacto: Se `NODE_ENV` não estiver configurado no Render, backend roda em modo dev com mock potencialmente ativo.
- Recomendação: Confirmar e documentar que `NODE_ENV=production` está configurado no Render para staging e produção.
- Próximo passo: Validação imediata; candidato ao backlog P0.

### Média Prioridade

**RB-006 — Sem rate limiting em endpoints críticos**
- Evidência: Ausência de `express-rate-limit` ou similar no `main.ts`.
- Impacto: Endpoints `/auth/login`, `/me`, e todos os endpoints de dados sem proteção contra brute force ou scraping.
- Recomendação: Adicionar rate limiting especialmente em `/auth/login`.
- Próximo passo: Candidato ao backlog P1.

**RB-007 — Sem headers de segurança (Helmet)**
- Evidência: Ausência de `helmet` no `main.ts`.
- Impacto: Sem CSP, HSTS, X-Frame-Options, X-Content-Type-Options no backend.
- Recomendação: Adicionar `helmet()` como middleware global antes das rotas.
- Próximo passo: Candidato ao backlog P1.

**RB-008 — Dois arquivos de autenticação com claims diferentes**
- Evidência: `src/auth.ts` (`UserToken`: `sub, role, email`) e `src/auth/auth-claims.ts` (`AuthTokenClaims`: adiciona `userType, companyId, membershipId`).
- Impacto: O login principal (`main.ts:3868`) usa `signUserToken` de `auth.ts` (claims simples). O `auth/auth-claims.ts` tem claims mais ricos mas pode não ser usado no fluxo principal.
- Recomendação: Definir um único sistema de claims; migrar login para `signAuthToken` de `auth-claims.ts` se for o padrão desejado.
- Próximo passo: Validar com o usuário; candidato ao backlog P2.

**RB-009 — Express v5 em produção**
- Evidência: `express@^5.2.1` — versão major recente (Express v5 mudou o comportamento de async errors e alguns middlewares).
- Impacto: Comportamento de error handling em async handlers mudou no v5; alguns middlewares podem não ser compatíveis.
- Recomendação: Testar smoke tests completos; verificar comportamento de error handling com Express v5.
- Próximo passo: Monitorar nos testes de CI.

**RB-010 — TypeScript 6.0.2 com `ignoreDeprecations: "6.0"`**
- Evidência: `package.json` — `typescript@^6.0.2`; `tsconfig.json` — `ignoreDeprecations: "6.0"`.
- Impacto: Versão muito recente de TypeScript com deprecations suprimidas; pode introduzir instabilidades.
- Recomendação: Monitorar changelog do TypeScript 6; considerar pinnar versão específica.
- Próximo passo: Monitorar.

### Baixa Prioridade

**RB-011 — `@nestjs/cli` em `dependencies` de produção**
- Evidência: `package.json:30` — `@nestjs/cli: ^11.0.17` em `dependencies`.
- Impacto: CLI de desenvolvimento incluída no bundle de produção.
- Recomendação: Mover para `devDependencies`.
- Próximo passo: Candidato ao backlog P3 (BL-012 no backlog atual).

**RB-012 — Prisma 4.x desatualizado**
- Evidência: `@prisma/client@^4.16.2`.
- Impacto: Versão desatualizada (atual: 5.x/6.x); pode ter gaps de performance e funcionalidade.
- Recomendação: Avaliar upgrade para Prisma 5 ou 6 em momento oportuno.
- Próximo passo: Candidato ao backlog P3.

**RB-013 — Pasta `prisma-postgres/` referenciada em scripts mas não verificada**
- Evidência: Scripts `prisma:cutover:*` referenciam `prisma-postgres/schema.prisma`.
- Impacto: Scripts podem falhar se pasta não existe; pode ser legado de migração.
- Recomendação: Confirmar existência da pasta ou remover scripts.
- Próximo passo: Verificar e documentar no KB-003D.

---

## 22. Divergências e Incertezas

| Divergência/Incerteza | Evidência | Impacto | Recomendação | Prioridade |
|---|---|---|---|---|
| **KB-003A descreveu "Express/NestJS híbrido" — código mostra Express puro** | `main.ts` usa Express diretamente sem módulos NestJS no servidor HTTP | Médio — documentação imprecisa pode confundir IAs e devs | Atualizar KB-003A para registrar que o servidor é Express puro com pacotes NestJS presentes mas sem uso no servidor HTTP principal | P1 |
| **Dois auth files com claims diferentes (`auth.ts` vs `auth/auth-claims.ts`)** | Login usa `auth.ts`; `auth-claims.ts` tem claims mais ricos | Médio — inconsistência de claims nos tokens | Definir arquivo canônico; migrar se necessário | P1 |
| **`backend/prisma/schema.postgres.prisma` — papel não claro** | Arquivo presente em 14/05/2026 | Médio — pode ser schema paralelo ou artefato de migração | Verificar no KB-003D | P1 |
| **Pasta `prisma-postgres/` referenciada em scripts mas não confirmada** | Scripts `prisma:cutover:*` em `package.json` | Baixo | Verificar existência da pasta | P2 |
| **Notificações: mock vs banco** | `GET /notifications` usa `devMockNotifications` mas schema tem tabela `Notification` | Médio — em produção, as notificações são servidas do banco ou do mock? | Verificar lógica completa do endpoint de notificações em produção | P1 |
| **AI provider: determinístico vs LLM externo** | `DeterministicAiProvider` como fallback — sem LLM externo visível | Médio — IA do produto pode ser puramente determinística | Confirmar se há integração com LLM (OpenAI, Claude, etc.) planejada ou ativa | P1 |
| **Document upload storage: local vs cloud** | `DocumentUploadService` presente, mas storage não confirmado | Alto em produção | Confirmar se uploads são salvos em disco local (não persistente no Render) ou em storage externo | P1 |
| **`prisma.config.ts` do backend vs da raiz** | Ambos existem; backend em 02/04/2026, raiz mais recente | Médio | Confirmar qual é o ativo em produção e no CI | P2 |
| **NestJS instalado mas não usado** | Packages NestJS em `dependencies` sem uso visível em `main.ts` | Médio | Confirmar se NestJS é usado em algum módulo interno ou se é legado de plano anterior | P2 |
| **Role check em `/admin/seed-finance`** | `actor.role !== 'admin'` vs roles reais `ADM`/`ADV`/etc. | Alto | Investigar e corrigir | P1 |

---

## 23. Recomendações Iniciais

### Arquitetura Backend

- Extrair handlers HTTP de `main.ts` para controllers/routers por domínio (já existe precedente com `registerFinanceRoutes`)
- Definir um único arquivo de autenticação (`auth-claims.ts` como canônico)
- Avaliar se pacotes NestJS são necessários ou podem ser removidos

### APIs e Rotas

- Confirmar prefixos e lista completa de rotas dos módulos delegados (`registerFinanceRoutes`, etc.)
- Remover ou proteger adequadamente `/admin/seed-finance`
- Adicionar endpoint `/health` dedicado para healthcheck no Render

### Autenticação e Autorização

- Remover fallback `|| 's3cr3t-juridico'` do `JWT_SECRET`
- Corrigir role check em `/admin/seed-finance`
- Confirmar e documentar que `NODE_ENV=production` e `LEXORA_DEV_MOCK=0` estão configurados no Render
- Mover credenciais mock para variáveis de ambiente ou seed de banco

### Prisma e Dados

- Confirmar qual `prisma.config.ts` é ativo (raiz vs backend)
- Verificar e documentar papel de `schema.postgres.prisma` e `prisma-postgres/`
- Avaliar upgrade de Prisma 4.x para versão mais recente

### Segurança

- Adicionar `express-rate-limit` em `/auth/login` e endpoints sensíveis
- Adicionar `helmet()` como middleware global
- Confirmar storage de documentos uploadados (disco local não é persistente no Render)

### Deploy e Ambiente

- Confirmar `NODE_ENV=production` no Render
- Confirmar se há instância de produção separada de staging no Render
- Documentar todas as variáveis de ambiente necessárias para produção
- Confirmar se `FINANCE_SCHEDULER_ENABLED=1` deve estar ativo em produção

### Testes

- Adicionar testes de integração para handlers HTTP críticos (login, me, processos)
- Confirmar runner e comando de execução dos testes `.test.cjs`

### Documentação

- Atualizar KB-003A para registrar Express puro como framework do servidor (não NestJS híbrido)
- Documentar lista completa de env vars necessárias para produção

### Candidatos a Backlog

| Candidato a backlog | Prioridade sugerida | Tipo | Área | Dependência | Observação |
|---|---|---|---|---|---|
| Remover fallback de `JWT_SECRET` no código + validação no startup | P0 | Correção de segurança | Backend / Auth | Nenhuma | RB-001 |
| Confirmar e documentar `NODE_ENV=production` no Render | P0 | Validação | Deploy / Backend | Nenhuma | RB-005 |
| Corrigir role check em `/admin/seed-finance` | P1 | Correção técnica | Backend / Auth | Nenhuma | RB-003 |
| Mover credenciais mock para env vars | P1 | Segurança | Backend | Nenhuma | RB-004 |
| Adicionar rate limiting em `/auth/login` | P1 | Segurança | Backend | Nenhuma | RB-006 |
| Adicionar Helmet (headers de segurança) | P1 | Segurança | Backend | Nenhuma | RB-007 |
| Confirmar storage de documentos uploadados (disco vs cloud) | P1 | Validação | Backend / Infra | Nenhuma | — |
| Confirmar notificações: mock vs banco em produção | P1 | Validação | Backend | Nenhuma | — |
| Confirmar uso/papel de NestJS no projeto | P2 | Decisão | Backend / Arquitetura | Nenhuma | — |
| Definir arquivo canônico de auth (`auth.ts` vs `auth/auth-claims.ts`) | P2 | Decisão | Backend / Auth | Nenhuma | RB-008 |
| Extrair handlers HTTP de `main.ts` para routers por domínio | P2 | Refatoração | Backend | Outros itens P0/P1 | RB-002 |
| Mover `@nestjs/cli` para `devDependencies` | P3 | Correção técnica | Backend | Nenhuma | BL-012 existente |
| Avaliar upgrade de Prisma 4.x | P3 | Melhoria técnica | Backend / Dados | KB-003D | RB-012 |

---

## 24. Relação com Próximas Fases

| Próxima fase | Como este documento alimenta |
|---|---|
| **KB-003D — Dados, Prisma e Contratos** | Schema Prisma `schema.prisma` identificado como fonte; 25 migrations mapeadas; arquivos `*.contract.ts` identificados; `contracts/*.json` pendente de comparação; `schema.postgres.prisma` a confirmar |
| **KB-003E — Testes, QA e Evidências** | ~40+ arquivos `.test.cjs` identificados; ausência de integration tests para rotas HTTP; smoke tests do frontend dependem do backend |
| **KB-003F — IA, Agentes e Automações** | Módulo `src/ai/` documentado; `DeterministicAiProvider` como fallback confirmado; providers de publicações mapeados |
| **KB-003G — Riscos Técnicos e Divergências** | RB-001 a RB-013 documentados; divergências na seção 22 para consolidação |
| **KB-004 — Product Discovery** | Domínios implementados mapeados: processos, prazos, clientes, atendimentos, CRM, financeiro, publicações, triagem, documentos, templates, tarefas, agenda, usuários, plataforma |
| **KB-005 — Inventário Funcional e UX/UI** | Endpoints do backend confirmam funcionalidades implementadas; comparação com telas do frontend via KB-003B |
| **KB-006 — Design System e Constituição Visual** | Não há relação direta — backend não tem responsabilidade visual |
| **Próximos updates do backlog** | Candidatos listados na seção 23; itens RB-001 e RB-005 como P0 prioritários |

---

## 25. Limitações desta Etapa

> [!note] O que o KB-003C NÃO faz

- **Não altera código** — nenhum arquivo foi modificado
- **Não executa testes** — testes `.test.cjs` não foram executados
- **Não executa migrations** — nenhum comando Prisma foi executado
- **Não valida dados reais** — sem acesso ao banco de dados real
- **Não valida todos os contratos campo a campo** — comparação de tipos e contratos é reservada para o KB-003D
- **Não resolve divergências** — divergências são registradas, não resolvidas
- **Não atualiza o backlog** — candidatos a backlog estão listados mas não foram inseridos no `BACKLOG_GERAL_LEXORA_CURRENT.md`
- **Não substitui o KB-003D** — análise de schema Prisma, relações, migrations e contratos JSON será feita nele
- **Não substitui auditoria de segurança completa** — os riscos identificados são preliminares
- **Não leu completamente todos os handlers** — `main.ts` tem ~8.500 linhas; foram lidos trechos representativos
- **Não inspecionou `register*Routes` em profundidade** — prefixos e endpoints de finance, epic-ij, ai, bi, timesheet, mobile e platform precisam de leitura dedicada

---

## 26. Validação Final

| Item validado | Resultado |
|---|---|
| Vault oficial existe | Sim |
| `00_START_HERE.md` encontrado | Sim |
| `KB_002` encontrado | Sim |
| `KB_003A` encontrado | Sim |
| `KB_003B` encontrado | Sim |
| `BACKLOG_GERAL_LEXORA_CURRENT.md` encontrado | Sim |
| KB-003C criado no caminho correto | Sim |
| Apenas o KB-003C foi criado | Sim |
| Algum arquivo existente foi sobrescrito | Não |
| Algum código foi alterado | Não |
| Algum package file foi alterado | Não |
| Algum Prisma schema foi alterado | Não |
| Alguma migration foi executada | Não |
| Algum seed foi executado | Não |
| Alguma configuração foi alterada | Não |
| Algum script foi executado | Não |
| Algum pacote foi instalado | Não |
| Algum deploy foi executado | Não |
| Alguma pasta `.obsidian` foi alterada | Não |

### Arquivo criado

- `!_lexora-memory-docs/06 - Backend e APIs/KB_003C_BACKEND_E_APIS_ESTADO_ATUAL_CURRENT_2026-05-30.md`

### Arquivos consultados (lidos diretamente)

- `!_lexora-memory-docs/00_START_HERE.md`
- `!_lexora-memory-docs/01 - Knowledge Base/KB_002_GOVERNANCA_DOCUMENTAL_OFICIAL_CURRENT_2026-05-29.md`
- `!_lexora-memory-docs/03 - Arquitetura/KB_003A_ESTRUTURA_GERAL_E_CONFIGURACOES_CURRENT_2026-05-29.md`
- `!_lexora-memory-docs/05 - Frontend/KB_003B_FRONTEND_ESTADO_ATUAL_CURRENT_2026-05-29.md`
- `!_lexora-memory-docs/13 - Backlog/BACKLOG_GERAL_LEXORA_CURRENT.md`
- `backend/package.json`
- `backend/tsconfig.json`
- `backend/.env.example`
- `backend/.env.staging.example`
- `backend/.gitignore`
- `backend/prisma.config.ts`
- `backend/prisma/schema.prisma` (primeiras 100 linhas)
- `backend/src/main.ts` (múltiplos trechos: linhas 1-200, 200-300, 300-400, 3840-3900, 7217-7260, 8380-8550)
- `backend/src/auth.ts`
- `backend/src/auth/auth-claims.ts`
- `backend/src/session/session-access.ts`
- `backend/src/authz/guards/authz.guard.ts`
- `backend/src/authz/policies/authz.types.ts`
- `backend/src/roles/roles.ts`
- `backend/src/shared/company-scope/company-scope-prisma.adapter.ts`
- `backend/src/finance/http/register-finance-routes.ts` (primeiras 50 linhas)
- `backend/src/platform/register-platform-console-routes.ts` (primeiras 50 linhas)
- `backend/src/ai/core/ai-provider.port.ts`
- `backend/src/triage-ai.provider.ts` (primeiras 30 linhas)
- `backend/src/datajud.provider.ts` (primeiras 30 linhas)
- `frontend/src/api.ts` (trecho 850-1100 para comparação inicial)

### Pastas analisadas

- `backend/src/` (listagem completa de arquivos)
- `backend/prisma/` (listagem completa de arquivos)
- `backend/` (arquivos na raiz)

### Skills usadas e em qual fase

- **Fase 1:** Leitura direta dos documentos oficiais obrigatórios (sem skill específica — ferramentas Read/Glob/PowerShell)
- **Fase 2:** Leitura direta do backend (ferramentas Read/PowerShell/Grep)
- **Fase 3:** Criação do documento via Write

### Principais riscos identificados

1. **RB-001 (P0):** `JWT_SECRET` com fallback hardcoded `'s3cr3t-juridico'`
2. **RB-003 (P1):** Bug provável em `/admin/seed-finance` — role check incorrecto
3. **RB-004 (P1):** Credenciais mock hardcoded em `main.ts`
4. **RB-005 (P0):** `NODE_ENV` não verificado no Render
5. **RB-002 (P2):** `main.ts` monolito de ~8.500 linhas
6. **RB-006 (P1):** Sem rate limiting
7. **RB-007 (P1):** Sem headers de segurança (Helmet)
8. **RB-008 (P2):** Dois arquivos de auth com claims diferentes

### Candidatos a backlog identificados

Ver seção 23 — tabela de candidatos com IDs, prioridades e dependências.

### Pontos que precisam de validação do usuário

1. **Confirmar `NODE_ENV=production` no Render** — crítico para comportamento de segurança dos cookies
2. **Confirmar storage de documentos** — disco local não persiste no Render
3. **Confirmar notificações em produção** — mock vs banco de dados
4. **Confirmar papel de NestJS** — por que está instalado se não usado no servidor HTTP?
5. **Confirmar `prisma:cutover:*` scripts** — pasta `prisma-postgres/` existe?
6. **Confirmar qual `prisma.config.ts` é ativo em prod** — raiz vs backend
7. **Confirmar papel de `schema.postgres.prisma`** — artefato ou schema paralelo?
8. **Confirmar AI provider** — há integração com LLM externo planejada ou é determinístico por design?
9. **Confirmar role check de `/admin/seed-finance`** — bug ou comportamento intencional?
10. **Confirmar se `FINANCE_SCHEDULER_ENABLED=1` deve estar ativo em produção/staging**

---

*Criado em: 2026-05-30 | Status: current | Vault: !_lexora-memory-docs*
*Fonte: Claude Code — leitura direta de arquivos do projeto*
*Baseado em: [[00_START_HERE]], [[KB_002_GOVERNANCA_DOCUMENTAL_OFICIAL_CURRENT_2026-05-29]], [[KB_003A_ESTRUTURA_GERAL_E_CONFIGURACOES_CURRENT_2026-05-29]], [[KB_003B_FRONTEND_ESTADO_ATUAL_CURRENT_2026-05-29]], [[BACKLOG_GERAL_LEXORA_CURRENT]]*
