---
tipo: kb
status: current
projeto: lexora
fase: consolidacao-tecnica
area: riscos-tecnicos-e-divergencias
data: 2026-05-30
fonte: claude-code
baseado_em:
  - '[[00_START_HERE]]'
  - '[[KB_002_GOVERNANCA_DOCUMENTAL_OFICIAL_CURRENT_2026-05-29]]'
  - '[[KB_003A_ESTRUTURA_GERAL_E_CONFIGURACOES_CURRENT_2026-05-29]]'
  - '[[KB_003B_FRONTEND_ESTADO_ATUAL_CURRENT_2026-05-29]]'
  - '[[KB_003C_BACKEND_E_APIS_ESTADO_ATUAL_CURRENT_2026-05-30]]'
  - '[[KB_003D_DADOS_PRISMA_E_CONTRATOS_CURRENT_2026-05-30]]'
  - '[[KB_003E_TESTES_QA_E_EVIDENCIAS_CURRENT_2026-05-30]]'
  - '[[KB_003F_IA_AGENTES_E_AUTOMACOES_CURRENT_2026-05-30]]'
  - '[[BACKLOG_GERAL_LEXORA_CURRENT]]'
escopo: riscos-tecnicos-e-divergencias-consolidadas
vault_oficial: 'C:\Users\tomke\app Juridico\!_lexora-memory-docs'
autoridade: consolidacao-tecnica
---

# KB-003G — Riscos Técnicos e Divergências Consolidadas

> [!important] Documento de consolidação — somente leitura analítica
> Este documento consolida achados dos inventários KB-003A a KB-003F. Nenhum código foi alterado, nenhum backlog foi modificado, nenhum arquivo foi movido. O UPDATE-BACKLOG-005 já foi executado — os candidatos do KB-003E e KB-003F já constam no BACKLOG_GERAL_LEXORA_CURRENT.md.

---

## 1. Resumo Executivo

O Lexora é um SaaS jurídico com stack fullstack madura em termos de funcionalidades, mas com **35 riscos técnicos identificados** distribuídos entre deploy, segurança, dados, testes, IA e governança documental. O projeto operacionaliza produção sobre uma base técnica com múltiplas lacunas não corrigidas.

### Distribuição dos riscos

| Prioridade | Quantidade | Natureza principal |
|---|---|---|
| **P0** | 5 | Riscos ativos de produção e segurança crítica |
| **P1** | 15 | Segurança, isolamento de dados, CI/CD, IA e documentação |
| **P2** | 12 | Dívida técnica, validators, schema, testes, artefatos |
| **P3** | 3 | Limpeza, organização e refinamentos |

### Os 5 riscos P0 confirmados

1. **Production consumindo staging** — VITE_API_URL hardcoded no Build Command da Vercel aponta para `juridico-api-staging.onrender.com`.
2. **JWT_SECRET com fallback hardcoded** — dois arquivos de auth usam `'s3cr3t-juridico'` como padrão.
3. **Credenciais hardcoded no login frontend** — usuário/senha de teste em `App.tsx:631-636`.
4. **NODE_ENV=production não validado no Render** — comportamento de cookies, dev mock e segurança dependem dessa variável.
5. **Notificações em memória em produção** — `devMockNotifications` em `main.ts` em vez do modelo `Notification` no banco.

### Decisões urgentes do usuário

- URL oficial da API de produção (desbloqueia BL-004).
- Estratégia de LLM externo na IA do produto (BL-057).
- Auth canônico: `auth.ts` vs `auth/auth-claims.ts` (BL-048).
- Agentes Codex: atualizar para `!_lexora-memory-docs` ou arquivar (BL-009).

### Recomendação de ordem de atuação

```
1. Resolver P0 de produção (BL-001 → BL-004, BL-039, BL-040)
2. Resolver P0 de segurança (BL-020, BL-042)
3. Quick wins de P1 independentes (BL-067, BL-073, BL-065, BL-043, BL-044)
4. Decisões do usuário sobre auth, IA e contratos
5. Product Discovery (KB-004) — pode começar após P0 resolvidos
6. UX/UI e Design System (KB-005, KB-006) em paralelo com Product Discovery
```

---

## 2. Objetivo do Documento

Este documento serve como:

- **Consolidação técnica** dos inventários KB-003A a KB-003F, eliminando redundâncias e priorizando riscos por impacto real.
- **Base para UPDATE-BACKLOG posterior** — seção 18 lista ajustes candidatos que surgiram exclusivamente da consolidação.
- **Base para ADRs** — seção 10 lista 8 decisões estruturais que merecem formalização.
- **Base para decisões técnicas** — seção 9 lista 15 decisões pendentes do usuário.
- **Ponte para KB-004 Product Discovery** — seção 19 define o que deve estar resolvido antes da descoberta de produto.
- **Ponte para KB-005 Inventário Funcional e UX/UI** — evidências visuais, módulos e cobertura funcional.
- **Ponte para KB-006 Design System e Constituição Visual** — decisões de tokens, componentes e identidade.

---

## 3. Escopo e Fora do Escopo

### Consolidado nesta etapa

- Todos os riscos identificados em KB-003A a KB-003F
- Divergências técnicas documentadas e corrigidas ao longo dos KBs
- Decisões pendentes do usuário com impacto técnico
- ADRs recomendados com justificativa
- Dependências cruzadas entre itens do backlog (BL-001 a BL-081)
- Visão consolidada por área
- Ordem recomendada de atuação
- Relação com Product Discovery, UX/UI e Design System

### Fora do escopo desta etapa

- Execução de qualquer correção técnica
- Atualização do backlog (UPDATE-BACKLOG-005 já executado)
- Criação de ADRs
- Criação de Product Discovery
- Criação de UX/UI inventory
- Criação de Design System
- Alteração de qualquer arquivo (código, schema, config, teste, log, screenshot)
- Execução de testes, builds, migrações ou deploys

---

## 4. Mapa Executivo de Riscos

| ID | Prioridade | Área | Risco | Evidência principal | Impacto | Status | Backlog relacionado | Próximo passo |
|---|---|---|---|---|---|---|---|---|
| RISK-001 | **P0** | Deploy | Production consumindo staging backend | `vercel.json` Build Command com VITE_API_URL hardcoded | Dados de produção podem não chegar ao backend real | confirmado | BL-001, BL-003, BL-004 | Decidir URL de prod e remover hardcode |
| RISK-002 | **P0** | Segurança | JWT_SECRET com fallback hardcoded `'s3cr3t-juridico'` | `auth.ts:10`, `auth/auth-claims.ts:15` | Tokens forjáveis se env var ausente | confirmado | BL-039 | Remover fallback, validar no startup |
| RISK-003 | **P0** | Segurança | Credenciais hardcoded no login frontend | `App.tsx:631-636` | Exposição de credenciais se publicado | confirmado | BL-020 | Remover antes do próximo deploy público |
| RISK-004 | **P0** | Deploy | NODE_ENV=production não validado no Render | `.env.example` não define NODE_ENV | Cookies, dev mock e segurança afetados | parcialmente confirmado | BL-040 | Validar painel do Render |
| RISK-005 | **P0** | Dados | Notificações em memória em produção | `main.ts:3973` usa `devMockNotifications` | Dados perdidos a cada restart | confirmado | BL-046, BL-021 | Integrar com modelo Prisma Notification |
| RISK-006 | P1 | CI/Testes | ~94 de 96 testes backend fora do CI | `ci.yml` executa apenas 2 testes backend | Regressões passam sem detecção automática | confirmado | BL-065, BL-068 | Criar script test e step no CI |
| RISK-007 | P1 | CI/Testes | Smoke tests de interactions falhando (7 falhas) | `.last-run.json` + `error-context.md` | Pipeline e2e inoperante | confirmado | BL-066 | Investigar credenciais; corrigir seed ou mock |
| RISK-008 | P1 | Dados | storageAdapter de documentos sem implementação concreta identificada | `DocumentUploadStorageAdapter` é interface sem implementação encontrada | Uploads podem depender de disco local (efêmero no Render) | incerteza | BL-045, BL-058 | Localizar instanciação em main.ts |
| RISK-009 | P1 | IA | InMemoryAiAuditService perde audit no restart | `ai-audit.service.ts` — array em memória | Histórico de auditoria IA perdido a cada deploy | confirmado | BL-072 | Implementar PrismaAiAuditService |
| RISK-010 | P1 | IA | InMemoryAiIdempotencyAdapter perde estado no restart | `ai-idempotency.adapter.ts` — Map em memória | Execuções de IA podem ser duplicadas após restart | confirmado | BL-077 | Implementar idempotência com banco |
| RISK-011 | P1 | IA | Env vars de IA ausentes do `.env.example` | `AI_PROVIDER_URL`, `TRIAGE_AI_URL` não documentadas | Devs não sabem como ativar LLM externo | confirmado | BL-073 | Documentar env vars |
| RISK-012 | P1 | Segurança | Sem rate limiting em `/ai/*` | `register-ai-routes.ts` sem middleware de rate limit | Custo ilimitado se LLM externo ativado | confirmado | BL-074 | Adicionar rate limiting |
| RISK-013 | P1 | IA/Governança | Agentes Codex referenciam `docs-juridico` desatualizado | `principal-orchestrator.toml`, `backend-integration-agent.toml` | IA de desenvolvimento usa contexto obsoleto | confirmado | BL-009, BL-076 | Atualizar agentes ou arquivar |
| RISK-014 | P1 | Segurança | Isolamento cross-tenant depende de middleware sem garantia por FK | Modelos Client, Process, Task, CrmLead etc. sem `companyId` | Vazamento de dados entre empresas se endpoint sem scope | parcialmente confirmado | BL-059 | Auditar cobertura de companyScope |
| RISK-015 | P1 | Segurança | Dev mock com credenciais em plaintext no backend | `main.ts` com usuários e senhas hardcoded | Exposição de credenciais de dev em clones do repo | confirmado | BL-042 | Mover para env vars ou seed controlado |
| RISK-016 | P1 | Segurança | Sem rate limiting em `/auth/login` | Nenhum middleware identificado no KB-003C | Vulnerável a brute force | confirmado | BL-043 | Adicionar express-rate-limit |
| RISK-017 | P1 | Segurança | Sem headers de segurança HTTP (Helmet) | Nenhum middleware de headers identificado | HSTS, X-Content-Type e outros ausentes | confirmado | BL-044 | Adicionar Helmet |
| RISK-018 | P1 | IA/Multi-tenancy | AI routes sem companyId | `register-ai-routes.ts` usa UserToken simples | Chamadas IA sem contexto de empresa; budget impossível | confirmado | BL-079, BL-078 | Migrar para AuthTokenClaims |
| RISK-019 | P1 | IA/Privacidade | Dados sensíveis podem ir ao LLM sem mascaramento | Publicações contêm CPF, OAB, nomes; sourceText livre | Vazamento de dados pessoais ao provider externo | depende de decisão | BL-075 | Definir política de mascaramento antes de ativar LLM |
| RISK-020 | P1 | Segurança | Dois arquivos auth com claims divergentes | `auth.ts` (sub/role/email) vs `auth/auth-claims.ts` (multi-tenant rico) | Tokens sem companyId chegam a endpoints que dependem dele | confirmado | BL-048, BL-039 | Definir auth canônico; BL-048 |
| RISK-021 | P2 | Segurança | error.message exposto em respostas 500 | Handlers com `res.status(500).json({ message: error.message })` | Vazamento de detalhes internos ao cliente | confirmado | BL-051 | Adotar handler genérico para 500 |
| RISK-022 | P2 | Backend | Role check em `/admin/seed-finance` incorreto | `actor.role !== 'admin'` mas roles reais são `ADM`, `ADV` | Endpoint pode ser acessível indevidamente | confirmado | BL-041 | Corrigir comparação de role |
| RISK-023 | P2 | Dados | AiExecution, AiBudgetLedger no schema sem código que escreva neles | Schema tem modelos, código usa InMemory | Funcionalidades de audit e budget não funcionam | confirmado | BL-072, BL-078 | Implementar services que usem esses modelos |
| RISK-024 | P2 | CI/Testes | Sem playwright.config.ts | Glob não encontrou arquivo | Comportamento Playwright não padronizado | confirmado | BL-067 | Criar playwright.config.ts |
| RISK-025 | P2 | CI/Testes | 6 smoke specs fora do test:smoke principal | `package.json` lista apenas 4 dos 10 specs | Epics IJ, platform admin, foundation sem cobertura CI | confirmado | BL-069 | Atualizar test:smoke após BL-067 |
| RISK-026 | P2 | Testes | Zero testes unitários de componentes React | Nenhum `*.test.tsx` em `frontend/src/` | Regressões de UI detectáveis apenas por e2e | confirmado | BL-070 | Adotar Vitest + Testing Library |
| RISK-027 | P2 | Dados | 5 scripts `prisma:cutover:*` quebrados | Pasta `prisma-postgres/` não existe | Confusão e falha ao executar esses scripts | confirmado | BL-055 | Remover scripts ou documentar |
| RISK-028 | P2 | Dados | `schema.postgres.prisma` como legado sem papel claro | 6 modelos simples, env POSTGRES_DATABASE_URL diferente | Risco de uso acidental; confusão sobre schema ativo | parcialmente confirmado | BL-056 | Arquivar com autorização |
| RISK-029 | P2 | Finance | `FinanceCharge.provider` com default `"mock"` | Schema Prisma com `@default("mock")` | Cobranças fictícias em produção sem configuração real | parcialmente confirmado | BL-061 | Confirmar provider real em produção |
| RISK-030 | P2 | Dados | Roles no seed divergem do sistema real | `seed.sql` usa `admin`, `coordinator`, `assistant`; sistema usa `ADM`, `ADV`, `FIN`, `ATD` | Usuários seeded com roles inválidas | confirmado | BL-060 | Corrigir roles no seed |
| RISK-031 | P2 | Backend | @nestjs/cli em `dependencies` de produção | `backend/package.json` | Dependência de CLI em produção | confirmado | BL-012 | Mover para devDependencies |
| RISK-032 | P2 | Backend | main.ts com ~8.500 linhas — risco de manutenção | Confirmado por KB-003C | Alto custo de manutenção e risco de regressão | confirmado | BL-049 | Refatorar progressivamente |
| RISK-033 | P2 | Testes | Logs e artefatos dispersos sem política | `*.log`, `test-results/`, `.playwright-mcp/` | Poluição do repo; potencial de dados sensíveis | confirmado | BL-013, BL-018, BL-019, BL-071 | Definir política de artefatos |
| RISK-034 | P3 | Deploy | Production Branch em `codex/baseline-postgres-staging` | `vercel.json` confirmado por KB-003A | Branch de staging como branch de produção | confirmado | BL-002 | Decidir branch oficial |
| RISK-035 | P3 | Dados | `docs/skills/` não validado | 10 arquivos listados, conteúdo não lido | Skills podem ter regras antigas | incerteza | BL-010 | Ler e validar contra código atual |

---

## 5. Riscos P0 Consolidados

### RISK-001 — Production consumindo staging backend

- **Área:** Deploy / Vercel
- **Evidência:** `vercel.json` na raiz do projeto tem Build Command com `VITE_API_URL=https://juridico-api-staging.onrender.com`. Production Branch atual: `codex/baseline-postgres-staging`. Confirmado por validação manual no painel Vercel (KB-003A).
- **Origem:** KB-003A
- **Impacto:** Todo o tráfego de produção que depende de `VITE_API_URL` aponta para o backend de staging. Dados de usuários reais podem ser processados por um ambiente de desenvolvimento.
- **Backlog relacionado:** BL-001 (Decisão: URL de prod), BL-003 (Validação: env vars), BL-004 (Correção: remover hardcode)
- **Dependência:** BL-001 → BL-003 → BL-004
- **Recomendação:** Definir URL de produção imediatamente; remover hardcode; configurar por variável de ambiente no painel Vercel.
- **Próximo passo:** Tom define URL oficial. Claude Code executa BL-004 após BL-001 e BL-003.
- **Deve virar ADR?** Não — é uma correção operacional, não decisão estrutural.

---

### RISK-002 — JWT_SECRET com fallback hardcoded

- **Área:** Segurança / Auth
- **Evidência:** `auth.ts:10`: `const JWT_SECRET = process.env.JWT_SECRET || 's3cr3t-juridico'` e `auth/auth-claims.ts:15`: mesmo padrão. Ambos os arquivos com mesmo fallback.
- **Origem:** KB-003C, confirmado por KB-003D e KB-003F
- **Impacto:** Se `JWT_SECRET` não estiver configurada no Render, o backend usa um segredo público e conhecido (`'s3cr3t-juridico'`). Atacante pode forjar tokens JWT válidos.
- **Backlog relacionado:** BL-039
- **Dependência:** Nenhuma — correção independente
- **Recomendação:** Remover fallback; fazer startup falhar se `JWT_SECRET` ausente; verificar se a variável está configurada no Render.
- **Próximo passo:** Corrigir e verificar variável no Render.
- **Deve virar ADR?** Não — é uma correção de segurança.

---

### RISK-003 — Credenciais hardcoded no login frontend

- **Área:** Segurança / Frontend
- **Evidência:** `App.tsx:631-636` — credenciais de teste hardcoded na tela de login.
- **Origem:** KB-003B
- **Impacto:** Se o build de produção for publicado com essas credenciais, qualquer usuário pode ver credenciais de acesso ao sistema.
- **Backlog relacionado:** BL-020
- **Dependência:** Nenhuma
- **Recomendação:** Remover as credenciais hardcoded imediatamente. Se necessário para QA, mover para variável de ambiente ou exibir apenas em `dev` mode.
- **Próximo passo:** Claude Code remove `App.tsx:631-636`.
- **Deve virar ADR?** Não.

---

### RISK-004 — NODE_ENV=production não validado no Render

- **Área:** Deploy / Render
- **Evidência:** `.env.example` não define `NODE_ENV`. Backend usa `process.env.NODE_ENV === 'production'` para comportamento de cookies (`sameSite`, `secure`), dev mock e outros. Se não definida, comportamento padrão pode ser inseguro.
- **Origem:** KB-003C
- **Impacto:** Cookies sem `secure` em produção; dev mock ativo em produção; comportamento de auth diferente do esperado.
- **Backlog relacionado:** BL-040
- **Dependência:** Nenhuma — validação no painel do Render
- **Recomendação:** Verificar e confirmar `NODE_ENV=production` no painel do Render imediatamente.
- **Próximo passo:** Tom valida painel do Render.
- **Deve virar ADR?** Não.

---

### RISK-005 — Notificações em memória em produção

- **Área:** Dados / Produto
- **Evidência:** `main.ts:3973` — `GET /notifications` usa `devMockNotifications` (array em memória). Tabela `Notification` existe no schema Prisma (migration `20260529000000`), mas os endpoints não a consultam.
- **Origem:** KB-003C, confirmado por KB-003D
- **Impacto:** Notificações são perdidas a cada restart do servidor. Em produção, usuários nunca veem notificações reais. `App.tsx:309` tem `notificationCount={3}` hardcoded — valor nunca atualiza.
- **Backlog relacionado:** BL-046 (integrar com banco), BL-021 (conectar frontend)
- **Dependência:** BL-046 → BL-021
- **Recomendação:** Substituir `devMockNotifications` por queries Prisma no modelo `Notification` antes do próximo deploy em produção.
- **Próximo passo:** Implementar endpoint com Prisma; depois conectar frontend.
- **Deve virar ADR?** Não.

---

## 6. Riscos P1 Consolidados

### Deploy e Ambiente

**RISK-034 — Production Branch em `codex/baseline-postgres-staging`** (P1 na prática):
O deployment de produção está ligado a uma branch de staging. Qualquer push para `codex/baseline-postgres-staging` vai para produção. Isso é operacionalmente perigoso. BL-002.

---

### Segurança e Auth

**RISK-020 — Dois arquivos auth com claims divergentes:**
`auth.ts` gera `UserToken` simples (sub, role, email). `auth/auth-claims.ts` gera `AuthTokenClaims` rico (userType, companyId, membershipId). Se `main.ts` usa `auth.ts` para o login principal, os tokens não têm `companyId` — rotas que dependem de companyId podem falhar ou funcionar incorretamente. KB-003D/KB-003F confirmaram. BL-048 (decisão de auth canônico), BL-039 (JWT fallback).

**RISK-014 — Isolamento cross-tenant depende de middleware sem garantia por FK:**
Modelos `Client`, `Process`, `Task`, `Atendimento`, `CrmLead`, `CrmOpportunity`, `TriageItem` **não têm `companyId`** como coluna. O isolamento por empresa é feito via `company-scope-prisma.adapter.ts` e middleware de request context. Qualquer endpoint implementado sem aplicar esse scope expõe dados de todas as empresas. KB-003D. BL-059.

**RISK-015 — Dev mock com credenciais em plaintext no backend:**
`main.ts` contém usuários e senhas de desenvolvimento em texto literal. Qualquer clone do repositório expõe essas credenciais. KB-003C. BL-042.

**RISK-016 — Sem rate limiting em `/auth/login`:**
Nenhum middleware de rate limiting identificado. Endpoint vulnerável a brute force. KB-003C. BL-043.

**RISK-017 — Sem headers de segurança HTTP:**
Helmet ou equivalente não identificado. HSTS, X-Content-Type-Options, X-Frame-Options e outros headers ausentes. KB-003C. BL-044.

---

### Dados, Prisma e Contratos

**RISK-008 — storageAdapter de documentos sem implementação concreta:**
`DocumentUploadService` usa port/adapter — a implementação concreta de `storageAdapter` não foi identificada. Se for disco local, arquivos são perdidos a cada deploy no Render (disco efêmero). KB-003D. BL-045, BL-058.

**RISK-027 — 5 scripts `prisma:cutover:*` quebrados:**
`backend/package.json` lista 5 scripts apontando para `prisma-postgres/schema.prisma`, mas essa pasta não existe. Qualquer execução desses scripts falha silenciosamente ou com erro. KB-003D. BL-055.

---

### Testes, QA e CI

**RISK-006 — ~94 de 96 testes backend fora do CI:**
O workflow `ci.yml` executa apenas `epic-cde.docs.test.cjs` e `epic-cde.seed.test.cjs`. Os ~80 testes unitários e os 14 testes de integração/docs restantes nunca rodam automaticamente. Regressões em auth, finance, multi-tenancy, triage, BI e timesheet passam sem detecção. KB-003E. BL-065, BL-068.

**RISK-007 — Smoke tests de interactions falhando:**
`test-results/.last-run.json` confirma status `"failed"` com 7 falhas. Causa: login com `advogado@juridico.com` / `123456` retorna "Credenciais inválidas" — essas credenciais existem no dev mock de `main.ts` mas dependem de `NODE_ENV !== 'production'`. KB-003E. BL-066.

**RISK-024 — Sem playwright.config.ts:**
11 specs Playwright na raiz de `frontend/` sem configuração centralizada. Timeouts, retries, reporters e diretórios de output não padronizados. KB-003E. BL-067.

**RISK-025 — 6 smoke specs fora do test:smoke:**
`epic-ij.smoke.test.ts`, `platform-admin.smoke.test.ts`, `admin.company-foundation.smoke.test.ts`, `foundation.auth.company.smoke.test.ts` e `publication-origin-rework.smoke.test.ts` não estão no script `test:smoke` e não são executados no CI principal. KB-003E. BL-069.

---

### IA e Agentes

**RISK-009 — InMemoryAiAuditService perde audit no restart:**
`AiExecution`, `AiExecutionTarget` existem no schema Prisma, mas o código usa `InMemoryAiAuditService` (array em memória). A cada deploy/restart, todo histórico de execuções IA é perdido. KB-003F. BL-072.

**RISK-010 — InMemoryAiIdempotencyAdapter perde estado no restart:**
Idempotência de chamadas IA é mantida em `Map` em memória. Após restart, a mesma `correlationId` pode gerar execução duplicada. KB-003F. BL-077.

**RISK-011 — Env vars de IA ausentes do `.env.example`:**
`AI_PROVIDER_URL`, `TRIAGE_AI_URL`, `AI_PROVIDER_TOKEN`, `AI_PROVIDER_AUTH_HEADER`, `TRIAGE_AI_TOKEN` não estão documentadas no `.env.example`. Qualquer desenvolvedor ou IА que configurar o projeto não sabe como ativar o LLM externo. KB-003F. BL-073.

**RISK-012 — Sem rate limiting em `/ai/*`:**
Os três endpoints IA (`POST /ai/summary`, `POST /ai/recommendation`, `GET /ai/audit`) não têm rate limiting. Se `AI_PROVIDER_URL` for configurada, chamadas ilimitadas podem gerar custo excessivo. KB-003F. BL-074.

**RISK-013 — Agentes Codex com documentação desatualizada:**
`principal-orchestrator.toml` e `backend-integration-agent.toml` (e provavelmente os demais) referenciam `docs-juridico` como documentação canônica. O vault oficial passou a ser `!_lexora-memory-docs`. Agentes Codex trabalham com contexto obsoleto. KB-003F. BL-009, BL-076.

**RISK-018 — AI routes sem companyId:**
`register-ai-routes.ts` usa `UserToken` simples (sub, role, email), sem `companyId`. Chamadas de IA não têm contexto de empresa — impossível implementar `AiBudgetLedger` por tenant. KB-003F. BL-079, BL-078.

**RISK-019 — Dados sensíveis podem ir ao LLM sem mascaramento:**
`sourceText` aceito por `POST /ai/summary` pode conter CPF, OAB, nomes de partes, valores financeiros. Se `AI_PROVIDER_URL` for ativada sem política de mascaramento, dados pessoais vão para servidor externo. KB-003F. BL-075.

---

### Frontend e UX

**RISK-007 (frontend):** Veja seção CI/Testes acima — smoke tests falhando afeta a confiabilidade do frontend.

---

## 7. Riscos P2/P3 Consolidados

| Risco | Prioridade | Área | Impacto | Backlog relacionado | Recomendação |
|---|---|---|---|---|---|
| error.message exposto em respostas 500 | P2 | Segurança | Vazamento de detalhes internos | BL-051 | Handler genérico para 500 |
| Role check `/admin/seed-finance` incorreto (`!== 'admin'`) | P2 | Backend / Segurança | Endpoint com regra incorreta | BL-041 | Corrigir para role ADM |
| AiExecution/AiBudgetLedger no schema sem código | P2 | IA / Dados | Audit e budget IA não funcionam | BL-072, BL-078 | Implementar services |
| Zero testes unitários React | P2 | Testes | Regressões UI sem detecção unitária | BL-070 | Adotar Vitest + Testing Library |
| `schema.postgres.prisma` legado sem papel claro | P2 | Dados | Confusão sobre schema ativo | BL-056 | Arquivar com autorização |
| Roles no seed divergem do sistema (`admin` vs `ADM`) | P2 | Dados / Seeds | Seeds criam usuários com roles inválidas | BL-060 | Corrigir roles no seed |
| `FinanceCharge.provider` default `"mock"` | P2 | Finance | Cobranças fictícias em produção | BL-061 | Confirmar provider real |
| @nestjs/cli em `dependencies` de produção | P2 | Backend | Dependência de CLI em produção | BL-012 | Mover para devDependencies |
| main.ts com ~8.500 linhas | P2 | Backend | Alto risco de manutenção | BL-049 | Refatorar progressivamente |
| Logs e artefatos dispersos sem política | P2 | CI / Repo | Poluição do repo; dados sensíveis | BL-013, BL-018, BL-019, BL-071 | Definir política de artefatos |
| DocumentDraftingService ignora template real | P2 | IA / Documentos | Rascunhos genéricos; não usa template real | BL-080 | Integrar Template do banco |
| Sem tipos IA no `frontend/src/api.ts` | P2 | Frontend / IA | Frontend sem integração tipada com IA | BL-081 | Adicionar tipos após confirmar endpoints |
| Production Branch em staging | P3 | Deploy | Branch de dev como prod | BL-002 | Definir branch oficial |
| `docs/skills/` não validado | P3 | Governança | Skills podem ter regras antigas | BL-010 | Validar conteúdo |
| prisma/schema.prisma raiz quase vazio | P3 | Dados | Risco de uso acidental | BL-007 | Remover com autorização |

---

## 8. Divergências Técnicas Consolidadas

| Divergência | Estado correto atual | Evidência | Documento que surgiu | Documento que corrigiu/confirmou | Impacto | Próximo passo |
|---|---|---|---|---|---|---|
| Backend descrito como Express/NestJS híbrido | Express puro no servidor HTTP; NestJS instalado mas não usado no fluxo HTTP principal | `backend/src/main.ts` — servidor Express sem NestJS modules | KB-003A | KB-003C (confirmado por leitura de main.ts) | Baixo — documentação corrigida | Decidir papel do NestJS (BL-047) |
| React versão citada inicialmente como 18 | React 19.2.4 | `frontend/package.json` | KB-003A (inferência incorreta) | KB-003B (leitura direta) | Baixo — documentação corrigida | Verificar compatibilidade de Radix UI (BL-023) |
| `contracts/*.json` vs `docs/*/contracts.md` vs `backend/*.contract.ts` vs `frontend/src/api.ts` | Quatro fontes distintas com papéis diferentes; nenhuma declarada autoritativa formalmente | KB-003D mapeou todas as quatro | KB-003A (menção inicial) | KB-003D (mapeamento completo) | Médio — decisão de fonte autoritativa pendente | BL-006 — ADR recomendado |
| `prisma/schema.prisma` da raiz como possível schema ativo | Schema ativo é `backend/prisma/schema.prisma`; raiz é quase vazio e inativo | `prisma/schema.prisma` sem modelos; `backend/prisma/schema.prisma` com 50+ modelos | KB-003A | KB-003D (confirmado por leitura direta) | Médio — risco de uso acidental | BL-007 — remover com autorização |
| `schema.postgres.prisma` como schema alternativo ativo | Provável legado de migração SQLite→PostgreSQL; apenas 6 modelos; env var diferente | `backend/prisma/schema.postgres.prisma` com 6 modelos e `POSTGRES_DATABASE_URL` | KB-003C (menção) | KB-003D (confirmado) | Baixo-médio — scripts ainda apontam para ele | BL-056 — arquivar |
| `prisma-postgres/` como pasta de cutover | Pasta não existe físicamente | Glob retornou zero resultados | KB-003C (scripts identificados) | KB-003D (inexistência confirmada) | Médio — 5 scripts quebrados | BL-055 — remover scripts |
| Notificações servidas pelo banco | Notificações servidas por array em memória (`devMockNotifications`) | `main.ts:3973-4016` | KB-003C (identificou mock) | KB-003D (confirmou tabela Notification existindo mas não usada) | Alto — risco P0 de produção | BL-046 — integrar com banco |
| AiExecution e AiBudgetLedger como audit/budget IA persistente | Modelos existem no schema mas nenhum código escreve neles; audit é InMemory | `backend/src/ai/audit/ai-audit.service.ts` sem Prisma | KB-003F (identificou divergência) | — | Alto — audit perdido no restart | BL-072, BL-078 |
| Agentes Codex com `docs-juridico` como canon | Vault oficial é `!_lexora-memory-docs` desde KB-002 | `principal-orchestrator.toml:25` | KB-003F | — | Médio — IAs de desenvolvimento usam contexto desatualizado | BL-009, BL-076 |
| Testes backend existentes mas fora do CI | ~94 de 96 testes nunca executados automaticamente | `ci.yml` executa apenas 2 | KB-003E | — | Alto — regressões sem detecção | BL-065, BL-068 |
| Playwright specs existentes sem config centralizada | 11 specs na raiz de `frontend/` sem `playwright.config.ts` | Glob não encontrou config | KB-003E | — | Médio — comportamento não padronizado | BL-067 |
| InMemoryAiIdempotencyAdapter vs idempotência persistente | Idempotência em memória — perdida no restart | `ai-idempotency.adapter.ts` | KB-003F | — | Médio — execuções duplicadas possíveis | BL-077 |
| `prisma.config.ts` raiz e `backend/prisma.config.ts` consistentes | Ambas apontam para `backend/prisma/schema.prisma` — consistentes, redundantes | Leitura direta de ambos os arquivos | KB-003D | — | Baixo — redundância sem impacto crítico | BL-008 — documentar ou consolidar |

---

## 9. Decisões Pendentes do Usuário

| Decisão | Prioridade | Área | Opções | Impacto | Backlog relacionado | Recomenda ADR? |
|---|---|---|---|---|---|---|
| URL oficial da API de produção | **P0** | Deploy | URL real de produção vs staging atual | Desbloqueia BL-004 — corrigi o build de produção | BL-001, BL-004 | Não |
| Production Branch oficial | **P0** | Deploy | Manter `codex/baseline-postgres-staging` ou migrar para `main` | Define onde código de produção vive | BL-002 | Não |
| Destino de `frontend/vercel.json` | P1 | Deploy | Remover, arquivar ou manter como legado | Elimina ambiguidade de configuração Vercel | BL-005 | Não |
| Fonte autoritativa de contratos | P1 | Dados | `contracts/*.json` vs `docs/*/contracts.md` vs código como fonte | Define como contratos são geridos e evoluídos | BL-006 | **Sim** |
| Remover/arquivar `prisma/schema.prisma` da raiz | P1 | Dados | Remover ou arquivar | Elimina risco de uso acidental | BL-007 | Não |
| Remover scripts `prisma:cutover:*` | P1 | Dados | Remover scripts quebrados ou documentar ausência da pasta | Limpa scripts inoperantes | BL-055 | Não |
| Arquivar `schema.postgres.prisma` | P1 | Dados | Arquivar em 99 - Arquivo ou remover | Documenta legado | BL-056 | Não |
| Auth canônico | P1 | Segurança | `auth.ts` (simples) vs `auth/auth-claims.ts` (multi-tenant rico) | Define base de auth para toda a aplicação | BL-048, BL-039, BL-063 | **Sim** |
| Papel do NestJS no backend | P1 | Backend | Remover dependências / manter como preparação / confirmar uso | Clareza arquitetural | BL-047, BL-012 | Não |
| Ativar LLM externo ou manter determinístico | P1 | IA | Manter `DeterministicAiProvider` / configurar `AI_PROVIDER_URL` | Define funcionalidade real de IA do produto | BL-057, BL-072, BL-075 | **Sim** |
| Política de mascaramento de dados sensíveis para IA | P1 | IA / Privacidade | Definir quais campos mascarar antes de enviar ao LLM | Obrigatória antes de ativar LLM externo | BL-075 | **Sim** |
| Agentes Codex: atualizar ou arquivar | P1 | IA / Governança | Atualizar referência para `!_lexora-memory-docs` / arquivar agentes obsoletos | Define qualidade do contexto de IA de desenvolvimento | BL-009, BL-076 | Não |
| Política de artefatos técnicos | P2 | CI / Repo | Formalizar o que fica no Git, o que vai para CI artifacts, o que é limpo | Resolve BL-013, BL-018, BL-019, BL-071 | BL-013 | Não |
| Política de evidências visuais | P2 | UX / Documentação | Critérios de preservação, nomenclatura e descarte de screenshots | Resolve BL-014, BL-015 | BL-014 | Não |
| Fonte oficial de tokens CSS no Design System | P2 | Design System | `tokens.css` (hex) vs `index.css` HSL/shadcn | Define base do Design System | BL-028 | Não (aguarda KB-006) |

---

## 10. ADRs Recomendados

| ADR sugerido | Prioridade | Decisão a registrar | Motivo | Documentos relacionados | Backlog relacionado |
|---|---|---|---|---|---|
| ADR-001 — Vault oficial e legado documental | P1 | `!_lexora-memory-docs` como única fonte oficial; `docs-juridico` como legado histórico; `docs-juridico/*.md` nunca como verdade vigente | Fundação governamental já executada; formalizar para IAs e agentes | KB-002, KB-003F | BL-009, BL-010 |
| ADR-002 — Fonte autoritativa de contratos de API | P1 | Qual camada define contratos HTTP: código (`*.contract.ts`), JSON, Markdown ou frontend `api.ts` | Quatro fontes sem hierarquia declarada geram divergência | KB-003D, KB-003F | BL-006, BL-062, BL-081 |
| ADR-003 — Auth canônico: auth.ts vs auth/auth-claims.ts | P1 | Qual arquivo gera e valida tokens JWT; como migrar tokens antigos; deprecar o outro | Dois arquivos com claims divergentes — companyId ausente em auth.ts | KB-003C, KB-003D, KB-003F | BL-048, BL-039, BL-063, BL-079 |
| ADR-004 — Estratégia de IA: determinístico vs LLM externo | P1 | Se e quando ativar `AI_PROVIDER_URL`; qual provider; por domínio ou global | Produto decide o nível de inteligência real; custo e privacidade envolvidos | KB-003F | BL-057, BL-072, BL-077, BL-078 |
| ADR-005 — Política de dados sensíveis para IA | P1 | Quais campos mascarar antes de enviar ao LLM; onde e como mascarar; logs de IA | Obrigatório antes de ativar LLM externo; LGPD | KB-003F | BL-075 |
| ADR-006 — Estratégia de storage de documentos | P1 | Disco local vs cloud storage vs banco; impacto no Render (disco efêmero) | storageAdapter implementação desconhecida; risco de perda de uploads | KB-003D, KB-003F | BL-045, BL-058, BL-080 |
| ADR-007 — Estratégia de testes e CI | P2 | Quais testes rodam no CI; threshold de cobertura; categorias (unitário, integração, e2e) | ~94 de 96 testes backend fora do CI; sem unitários React | KB-003E | BL-065, BL-066, BL-067, BL-068, BL-069, BL-070 |
| ADR-008 — Design System: tokens e fonte CSS canônica | P3 | `tokens.css` (hex) vs `index.css` HSL/shadcn como fonte de tokens | Dois sistemas coexistentes; decisão necessária antes de novas telas | KB-003B | BL-028 (aguarda KB-006) |

---

## 11. Dependências Cruzadas do Backlog

| Item bloqueador | Itens desbloqueados | Tipo de dependência | Recomendação |
|---|---|---|---|
| BL-001 (URL de prod) | BL-004 (remover hardcode Vercel) | Decisão → Implementação | Tom decide primeiro |
| BL-003 (validar env vars) | BL-004 (remover hardcode) | Validação → Implementação | Verificar antes de editar vercel.json |
| BL-001 + BL-003 + BL-004 | BL-011 (documentar build/deploy) | Execução → Documentação | Só documentar após corrigir |
| BL-046 (notificações com banco) | BL-021 (notificationCount no frontend) | Backend → Frontend | Backend primeiro |
| BL-048 (auth canônico) | BL-063 (enum roles), BL-079 (AI routes com companyId) | Decisão → Implementação | ADR-003 primeiro |
| BL-067 (playwright.config.ts) | BL-066 (corrigir credentials), BL-069 (smoke scripts), BL-034 (mover specs) | Config → Execução | Criar config antes de reorganizar |
| BL-065 (testes no CI) | BL-068 (integração multi-tenancy no CI) | Script → Específico | BL-065 é o script geral; BL-068 adiciona casos específicos |
| BL-013 (política artefatos) | BL-018 (logs), BL-019 (playwright-mcp), BL-071 (.gitignore) | Política → Execução | Definir política antes de executar |
| BL-014 (política evidências) | BL-015 (organizar screenshots) | Política → Execução | Política antes de mover |
| BL-057 (decisão LLM) | BL-072 (PrismaAiAuditService), BL-075 (mascaramento), BL-077 (idempotência banco) | Decisão → Implementação | Decidir antes de implementar |
| BL-072 (PrismaAiAuditService) | BL-077 (idempotência banco), BL-078 (AiBudgetLedger) | Implementação → Implementação | Persistência de audit primeiro |
| BL-079 (AI routes com companyId) | BL-078 (AiBudgetLedger) | Implementação → Implementação | companyId necessário para budget por empresa |
| BL-009 (validar agentes Codex) | BL-076 (atualizar agentes) | Análise → Execução | Confirmar quais são obsoletos antes de atualizar |
| BL-002 (Production Branch) | BL-005 (destino vercel.json frontend) | Decisão → Decisão | Definir branch antes de decidir vercel.json |
| BL-055 (remover scripts cutover) | BL-064 (avaliar schema_init.sql) | Limpeza → Avaliação | Limpar scripts antes de avaliar SQL |

---

## 12. Itens que Devem ser Executados Antes de Product Discovery

| Item/Risco | Por que precisa antes do Product Discovery | Prioridade | Recomendação |
|---|---|---|---|
| RISK-001/BL-001/BL-004 (production consumindo staging) | Product Discovery sobre funcionalidades reais pressupõe que produção está funcionando | **P0** | Resolver URL de prod antes de qualquer descoberta |
| RISK-005/BL-046 (notificações em memória) | Qualquer análise de notificações como feature será baseada em comportamento falso | **P0** | Integrar com banco |
| RISK-002/BL-039 (JWT hardcoded) | Sessões podem ser forjadas — distorce qualquer análise de comportamento de usuário | **P0** | Corrigir antes de Discovery com dados reais |
| RISK-003/BL-020 (credenciais hardcoded no login) | Impede análise honesta de login e auth flow | **P0** | Remover antes de Discovery |
| RISK-004/BL-040 (NODE_ENV não validado) | Comportamento da aplicação pode ser diferente do que se descobre em análise | **P0** | Validar antes de Discovery |
| RISK-013/BL-009 (agentes Codex desatualizados) | IAs de desenvolvimento usadas durante Discovery podem basear recomendações em legado | P1 | Atualizar agentes antes de usar IA para Discovery |
| BL-057 (decisão sobre LLM) | Product Discovery deve saber se IA real é funcionalidade presente ou futura | P1 | Decidir antes de mapear funcionalidades de IA |
| RISK-007/BL-066 (smoke tests falhando) | Impossível confiar em testes de fumaça durante Discovery sem testes passando | P1 | Corrigir credenciais antes de Discovery |
| RISK-014/BL-059 (isolamento cross-tenant) | Product Discovery sobre multi-tenant pressupõe isolamento funcionando | P1 | Auditar companyScope antes de Discovery |

---

## 13. Itens que Podem Rodar em Paralelo com Product Discovery

| Item/Risco | Pode rodar em paralelo com | Observação |
|---|---|---|
| BL-065 (testes backend no CI) | Product Discovery | Melhoria de CI não afeta descoberta de produto |
| BL-067 (playwright.config.ts) | Product Discovery | Configuração técnica independente |
| BL-073 (documentar env vars IA) | Product Discovery | Documentação técnica independente |
| BL-071 (.gitignore para artefatos) | Product Discovery | Limpeza de repositório independente |
| BL-055 (remover scripts cutover) | Product Discovery | Limpeza de scripts independente |
| BL-056 (arquivar schema.postgres.prisma) | Product Discovery | Arquivamento com autorização independente |
| BL-007 (remover/arquivar prisma root) | Product Discovery | Arquivamento com autorização independente |
| BL-012 (@nestjs/cli para devDependencies) | Product Discovery | Correção de package.json sem impacto funcional |
| BL-050 (endpoint healthcheck) | Product Discovery | Melhoria de observabilidade independente |
| BL-052 (logging estruturado) | Product Discovery | Melhoria de observabilidade independente |
| BL-043 (rate limiting auth/login) | Product Discovery | Segurança sem impacto funcional direto |
| BL-044 (Helmet/headers) | Product Discovery | Segurança sem impacto funcional direto |
| BL-013/BL-014 (políticas de artefatos e evidências) | Product Discovery | Governança documental independente |
| BL-051 (error.message em 500) | Product Discovery | Tratamento de erro sem impacto funcional |
| BL-041 (role check seed-finance) | Product Discovery | Correção isolada de endpoint admin |
| ADR-001 a ADR-007 (preparação) | Product Discovery | ADRs são documentos de decisão, não bloqueadores |

---

## 14. Itens que Devem Esperar KB-005 ou KB-006

| Item/Risco | Esperar qual KB? | Motivo |
|---|---|---|
| BL-028 (tokens CSS: tokens.css vs index.css) | KB-006 (Design System) | Decisão de tokens é a base do Design System — não decidir antes de Constituição Visual |
| BL-025 (IBM Plex Sans carregada?) | KB-006 (Design System) | Validação de tipografia depende de inventário de Design System |
| BL-026 (Button/Badge variantes) | KB-006 (Design System) | CVA vs classes — decisão do Design System |
| BL-027/BL-031 (KpiCard/EmptyState/PageHeader duplicidades) | KB-005 (Inventário Funcional) | Mapear uso real antes de padronizar |
| BL-032 (EmptyState canônico) | KB-005 + KB-006 | Precisa do inventário funcional e da Constituição Visual |
| BL-033 (FilterBar no Design System) | KB-006 (Design System) | Promover ao DS apenas após Constituição Visual |
| BL-037 (StatusPill/PriorityBadge) | KB-006 (Design System) | Idem |
| BL-038 (etapa IMPLEMENT componentização) | KB-006 | Só após tokens e variações canônicas definidos |
| BL-029/BL-030 (extrair LoginPage/SessionProvider) | KB-005 (opcional) | Pode ser feito antes, mas melhor após inventário de telas |
| BL-070 (Vitest + Testing Library) | KB-005 (Inventário Funcional) | Saber quais componentes testar antes de adotar Vitest |
| BL-081 (tipos IA no api.ts) | KB-003G confirmação de endpoints | Confirmar endpoints de drafting/checklist antes de adicionar tipos |
| BL-022 (rotas platform-admin/admin) | KB-005 (Inventário Funcional) | Mapear rotas acessíveis vs código morto |
| BL-015 (organizar screenshots) | BL-014 (política de evidências) → KB-005 | Screenshots de telas alimentam KB-005 |
| BL-036 (dividir api.ts por domínio) | KB-005 (opcional) | Melhor após mapear todos os endpoints em uso |

---

## 15. Quick Wins Recomendados

| Quick win | Prioridade | Área | Valor | Dependência | Backlog relacionado |
|---|---|---|---|---|---|
| Documentar env vars de IA no `.env.example` | **P1** | IA / DevOps | Transparência sem risco | Nenhuma — só editar arquivo de docs | BL-073 |
| Criar `frontend/playwright.config.ts` | **P1** | Testes | Padroniza Playwright; desbloqueia BL-066, BL-069 | Nenhuma | BL-067 |
| Validar NODE_ENV=production no painel Render | **P0** | Deploy | Confirma/corrige comportamento crítico de cookies | Acesso ao painel Render | BL-040 |
| Corrigir role check em `/admin/seed-finance` | P1 | Backend | Remove bug de autorização confirmado | Nenhuma (1 linha) | BL-041 |
| Criar endpoint `/health` ou `/healthz` | P2 | Backend | Melhora monitoramento no Render | Nenhuma | BL-050 |
| Adicionar `*.log` ao `.gitignore` | P2 | CI / Repo | Evita logs commitados | Nenhuma | BL-071 |
| Mover `@nestjs/cli` para devDependencies | P2 | Backend | Remove CLI de produção | Nenhuma (1 linha em package.json) | BL-012 |
| Mapear `storageAdapter` em `main.ts` | P1 | Dados | Desbloqueia BL-045, BL-058 | Nenhuma (leitura de código) | BL-058 |
| Remover `prisma/schema.prisma` da raiz | P1 | Dados | Remove risco de uso acidental | Autorização do usuário | BL-007 |
| Remover scripts `prisma:cutover:*` quebrados | P2 | Dados | Remove 5 scripts inoperantes | Autorização do usuário | BL-055 |
| Adicionar `test-results/`, `playwright-report/`, `.playwright-mcp/` ao `.gitignore` | P2 | CI / Repo | Evita artefatos versionados | BL-013 aprovado pelo usuário | BL-071 |

---

## 16. Riscos que Exigem Investigação Adicional

| Incerteza | Área | Evidência atual | O que falta validar | Próximo passo |
|---|---|---|---|---|
| storageAdapter concreto do `DocumentUploadService` | Dados / Infra | Interface `DocumentUploadStorageAdapter` identificada; implementação concreta não encontrada | Localizar instanciação do storageAdapter em `main.ts` ou `src/documents/` | Ler main.ts na seção de documentos; BL-058 |
| Endpoints HTTP de drafting de documentos e checklist | IA / Backend | `DocumentDraftingService` e `ChecklistSuggestionService` existem; endpoint HTTP não confirmado em `api.ts` | Identificar se há endpoints para esses serviços em `main.ts` | Grep de `drafting` e `checklist` em main.ts |
| Roles reais do sistema (lista definitiva) | Dados / Auth | Roles identificadas: `ADM`, `ADV`, `FIN`, `ATD`; pode haver mais | Confirmar lista completa em `roles.ts` e `rbac/permissions.ts` | Ler `backend/src/roles/roles.ts` e `backend/src/permissions/matrix.ts` |
| Quais roles têm permissão `ai.*` | IA / Auth | `register-ai-routes.ts` usa `ensureAuthorized` para `ai.summary.generate` etc. | Ler `backend/src/permissions/matrix.ts` | Ler arquivo de matrix |
| Conteúdo completo dos `docs/skills/` | IA / Governança | 10 arquivos listados; nenhum lido na íntegra | Validar regras contra código atual | Ler cada arquivo; BL-010 |
| Conteúdo dos demais agentes `.toml` em `.codex/agents/` | IA / Governança | 2 de 10 agentes lidos; provavelmente todos referenciam `docs-juridico` | Ler todos os 10 arquivos `.toml` | Ler e mapear referências; BL-009 |
| DataJud em produção (limite de API, chave real) | Integração / Backend | Chave demo documentada no `.env.example`; sem confirmação de chave real em produção | Confirmar se chave própria está no Render | Validar no painel Render |
| Módulos `admin/` e `platform-admin/` acessíveis no frontend | Frontend / Rotas | Módulos existem em `src/` mas sem rota declarada no Router principal | Investigar como são acessados | KB-005 ou análise de rotas |
| Frontend integrado com endpoints de IA | Frontend / IA | Grep em `api.ts` não retornou tipos ou chamadas de IA | Confirmar se há integração ou se IA é só backend | Ler `api.ts` na íntegra; BL-081 |
| `FinanceCharge.provider` em produção | Finance | Default `"mock"` no schema; `.env.example` tem `FINANCE_PAYMENT_PROVIDER=mock` | Confirmar se provider real está configurado no Render | Validar variáveis no Render |

---

## 17. Consolidação por Área

| Área | Estado atual | Principais riscos | Próximo passo recomendado |
|---|---|---|---|
| **Deploy** | Production Branch em staging; URL hardcoded no Build Command; dois `vercel.json` | RISK-001 (P0), RISK-034 (P3) | Tom decide BL-001 (URL) e BL-002 (Branch); Claude Code executa BL-004 |
| **Frontend** | React 19.2.4 funcional; 11 specs Playwright sem config; zero testes unitários; credenciais hardcoded | RISK-003 (P0), RISK-024 (P2), RISK-026 (P2) | BL-020, BL-067; depois BL-070 |
| **Backend** | Express puro, ~8.500 linhas em main.ts; NestJS instalado mas sem uso aparente; múltiplos riscos de segurança | RISK-015, RISK-016, RISK-017, RISK-022 | BL-042, BL-043, BL-044, BL-041, BL-051 |
| **Dados/Prisma** | Schema ativo correto; 3 schemas paralelos/legados; notificações em memória; storageAdapter desconhecido | RISK-005 (P0), RISK-008 (P1), RISK-027, RISK-028 | BL-046, BL-058, BL-007, BL-055, BL-056 |
| **Segurança/Auth** | JWT hardcoded; dois arquivos auth divergentes; dev mock em produção; sem rate limiting; sem Helmet | RISK-002 (P0), RISK-020, RISK-014, RISK-016, RISK-017 | BL-039, BL-048, BL-042, BL-043, BL-044 |
| **Testes/QA** | ~94 testes fora do CI; smoke tests falhando; sem playwright.config.ts; sem testes unitários React | RISK-006 (P1), RISK-007 (P1), RISK-024 (P2) | BL-065, BL-066, BL-067, BL-068 |
| **IA/Agentes** | DeterministicAiProvider como default; InMemory para audit/idempotência; agentes Codex desatualizados | RISK-009, RISK-010, RISK-013, RISK-018, RISK-019 | BL-057 (decisão), BL-073, BL-074, BL-009 |
| **Documentação/Governança** | Vault oficial estabelecido; KBs 003A-003F completos; backlog com 81 itens; docs/skills não validados | RISK-035, RISK-013 | BL-010, BL-009, BL-076; preparar ADRs |
| **UX/UI** | Telas mapeadas; rotas admin/platform-admin não confirmadas; sem inventário funcional formal | RISK-022 (role check) | Aguardar KB-005; BL-022 |
| **Design System** | Dois sistemas de tokens coexistentes; componentes duplicados; IBM Plex Sans sem confirmação de carregamento | RISK (design) | Aguardar KB-006; BL-028 |

---

## 18. Recomendações para UPDATE-BACKLOG Posterior

> [!note] Consideração importante
> O UPDATE-BACKLOG-005 já foi executado. Os candidatos dos KB-003E e KB-003F já constam no backlog. Esta seção lista apenas ajustes que emergem **exclusivamente da consolidação KB-003G**, não recriando itens já existentes.

| Ação recomendada para backlog | Tipo | Prioridade sugerida | Criar novo ou atualizar existente? | Observação |
|---|---|---|---|---|
| Elevar BL-059 (companyScope audit) de P1 para P0/P1 explicitamente como risco de segurança crítico | Ajuste de prioridade | P0 | Atualizar BL-059 | KB-003G confirma que cross-tenant isolation é risco maior do que inicialmente documentado |
| Criar item para mapear endpoints de drafting/checklist em main.ts | Novo candidato | P2 | Criar novo BL-082 | Incerteza identificada no KB-003G que não está coberta por item existente |
| Criar item para ler roles reais em `backend/src/roles/roles.ts` e `permissions/matrix.ts` | Novo candidato | P2 | Criar novo BL-083 | Confirmar lista definitiva de roles para desbloquear BL-060, BL-063, BL-041 |
| Criar item para confirmar chave DataJud real no Render (vs chave demo do .env.example) | Novo candidato | P2 | Criar novo BL-084 | Integração externa em produção sem confirmação de chave própria |
| Atualizar BL-048 (auth canônico) para marcar dependência de ADR-003 | Ajuste de dependência | — | Atualizar BL-048 | KB-003G recomenda ADR antes de execução |
| Atualizar BL-057 (AI provider) para marcar dependência de ADR-004 | Ajuste de dependência | — | Atualizar BL-057 | KB-003G recomenda ADR antes de decisão |
| Atualizar BL-075 (mascaramento dados IA) para marcar dependência de ADR-005 | Ajuste de dependência | — | Atualizar BL-075 | KB-003G recomenda ADR antes de execução |
| Atualizar BL-006 (contratos) para marcar dependência de ADR-002 | Ajuste de dependência | — | Atualizar BL-006 | KB-003G recomenda ADR formal |

---

## 19. Relação com Product Discovery, UX/UI e Design System

### Como riscos técnicos influenciam o Product Discovery (KB-004)

O Product Discovery pressupõe que a aplicação está funcionando de forma previsível em produção. Com o RISK-001 ativo (production consumindo staging), qualquer descoberta sobre comportamento real do produto é comprometida. O RISK-005 (notificações em memória) significa que a funcionalidade de notificações não pode ser avaliada sem correção prévia.

O KB-004 deve focar em:
- Mapeamento de quais funcionalidades estão de fato ativas em produção vs em desenvolvimento
- Identificação de epics com cobertura funcional completa vs incompleta
- Descoberta de necessidades do usuário que as implementações atuais não cobrem
- Priorização de backlog produto com base no estado técnico atual

### Dúvidas funcionais para KB-004

- Quais funcionalidades dependem de notificações reais (não mock)?
- O módulo `platform-admin` está acessível? Para quem?
- A triagem automatizada está gerando ações reais ou apenas sugestões revisadas por humano?
- O DataJud está sendo usado em produção com chave real?
- As funcionalidades de IA (sumarização, recomendação) estão expostas ao usuário final?

### Evidências visuais para KB-005

- `frontend/test-screenshots/01-dashboard.png` a `08-mobile-640.png` — estado visual das telas
- `frontend/dashboard-screenshot-desktop.png` — dashboard em desktop
- `atendimentos-baseline.png`, `atendimentos-staging-after-refine.png` — comparativo visual de atendimentos
- `vercel-login-before-test.png` — tela de login real

Essas evidências devem alimentar o inventário de telas do KB-005 após curadoria conforme BL-014.

### Decisões de frontend/design que devem esperar KB-006

- Tokens CSS: `tokens.css` vs `index.css` (BL-028)
- IBM Plex Sans confirmação de carregamento (BL-025)
- Button/Badge variantes (BL-026)
- Padronização de FilterBar, EmptyState, StatusPill, PriorityBadge

### Riscos técnicos que não devem bloquear Product Discovery

- Correções de CI (BL-065, BL-067) — podem rodar em paralelo
- Políticas de artefatos (BL-013, BL-014) — documentação independente
- ADRs preparatórios (ADR-001 a ADR-007) — podem ser redigidos em paralelo
- Melhorias de observabilidade (BL-050, BL-052) — independentes
- Limpeza de legado Prisma (BL-055, BL-056) — independente

---

## 20. Ordem Recomendada das Próximas Fases

```
FASE ATUAL (interrompida pela consolidação KB-003G):
└── KB-003A a KB-003G concluídos ✓

FASE IMEDIATA — Resolver P0 (pode ser feito hoje):
├── Tom: Decidir URL de produção (BL-001)
├── Tom: Validar NODE_ENV no Render (BL-040)
├── Claude Code: Remover credenciais hardcoded do login (BL-020)
├── Claude Code: Remover fallback JWT_SECRET (BL-039)
└── Claude Code: Integrar notificações com banco (BL-046)

FASE QUICK WINS PARALELA (sem bloquear produto):
├── Claude Code: Criar playwright.config.ts (BL-067)
├── Claude Code: Documentar env vars IA no .env.example (BL-073)
├── Claude Code: Adicionar rate limiting /auth/login (BL-043)
├── Claude Code: Adicionar Helmet (BL-044)
├── Claude Code: Adicionar rate limiting /ai/* (BL-074)
├── Claude Code: Criar healthcheck /health (BL-050)
├── Claude Code: Adicionar testes backend ao CI (BL-065)
└── Tom: Arquivar schema.postgres.prisma (BL-056) + remover scripts cutover (BL-055)

FASE DE DECISÕES (requer Tom):
├── Tom: Definir auth canônico — ADR-003 (BL-048)
├── Tom: Decidir sobre LLM externo — ADR-004 (BL-057)
├── Tom: Decidir sobre agentes Codex (BL-009)
└── Tom: Definir fonte autoritativa de contratos — ADR-002 (BL-006)

UPDATE-BACKLOG-006 pós KB-003G:
└── Inserir BL-082, BL-083, BL-084; ajustar dependências de ADRs

FASE DE PRODUTO (após P0 resolvidos):
├── KB-004 — Product Discovery
├── KB-005 — Inventário Funcional e UX/UI  (paralelo com KB-004)
└── KB-006 — Design System e Constituição Visual (após KB-005)

FASE IMPLEMENT (após KB-005/KB-006):
├── Etapas IMPLEMENT priorizadas por domínio
├── Correções técnicas P2/P3 restantes
└── Design System formal
```

**Pode rodar em paralelo com Product Discovery:** KB-005, KB-006 (preparação), ADRs, quick wins técnicos.

**Não deve iniciar Product Discovery sem:** resolver RISK-001 a RISK-005 (P0).

---

## 21. Limitações desta Etapa

> [!warning] Limitações desta consolidação
>
> - **Não executa correções** — nenhum arquivo foi alterado.
> - **Não atualiza backlog** — UPDATE-BACKLOG-006 pós KB-003G deve ser executado separadamente.
> - **Não cria ADRs** — ADR-001 a ADR-008 são recomendados, não criados.
> - **Não valida runtime** — todos os riscos são baseados em leitura estática de código e documentos.
> - **Não executa testes** — cobertura real não foi medida.
> - **Não acessa banco** — estado real de dados não verificado.
> - **Não corrige deploy** — riscos de produção permanecem ativos.
> - **Não move artefatos** — logs, screenshots e test-results permanecem onde estão.
> - **Não substitui auditoria de segurança completa** — riscos identificados são baseados em análise de código, não em pen test.
> - **Não substitui Product Discovery** — este documento é insumo técnico, não discovery de produto.
> - **Não substitui UX/UI** — análise visual não foi feita.
> - **Não substitui Design System** — decisões de design aguardam KB-006.
> - **Incertezas permanecem** — storageAdapter concreto, roles reais completas, endpoints de drafting/checklist, conteúdo de docs/skills e agentes .toml restantes não foram verificados nesta etapa.

---

## 22. Validação Final

| Item validado | Resultado |
|---|---|
| Vault oficial existe | **Sim** |
| `00_START_HERE.md` encontrado | **Sim** |
| `KB_002` encontrado | **Sim** |
| `KB_003A` encontrado | **Sim** |
| `KB_003B` encontrado | **Sim** |
| `KB_003C` encontrado | **Sim** |
| `KB_003D` encontrado | **Sim** |
| `KB_003E` encontrado | **Sim** |
| `KB_003F` encontrado | **Sim** |
| `BACKLOG_GERAL_LEXORA_CURRENT.md` encontrado | **Sim** |
| Backlog atualizado após UPDATE-BACKLOG-005 lido | **Sim** (81 itens confirmados) |
| KB-003G criado no caminho correto | **Sim** (`14 - Riscos e Divergencias/`) |
| Apenas o KB-003G foi criado | **Sim** |
| Algum arquivo existente foi sobrescrito | **Não** |
| Algum código foi alterado | **Não** |
| Algum KB existente foi alterado | **Não** |
| Backlog foi alterado | **Não** |
| Algum teste foi alterado | **Não** |
| Algum log foi alterado | **Não** |
| Algum screenshot foi alterado | **Não** |
| Algum report foi alterado | **Não** |
| Algum package file foi alterado | **Não** |
| Alguma configuração foi alterada | **Não** |
| Algum script foi executado | **Não** |
| Algum teste foi executado | **Não** |
| Algum Playwright foi executado | **Não** |
| Algum Prisma command foi executado | **Não** |
| Algum pacote foi instalado | **Não** |
| Algum deploy foi executado | **Não** |
| Alguma pasta `.obsidian` foi alterada | **Não** |

---

**1. Arquivo criado:**
`!_lexora-memory-docs/14 - Riscos e Divergencias/KB_003G_RISCOS_TECNICOS_E_DIVERGENCIAS_CONSOLIDADAS_CURRENT_2026-05-30.md`

**2. Arquivos consultados:**
KB-003A, KB-003B, KB-003C, KB-003D, KB-003E, KB-003F, BACKLOG_GERAL_LEXORA_CURRENT.md (com 81 itens após UPDATE-BACKLOG-005), KB-002, 00_START_HERE.md

**3. Skills usadas:**
Nenhuma skill externa acionada — consolidação realizada diretamente a partir dos KBs lidos durante a conversa.

**4. Quantidade de riscos consolidados:** 35 riscos (RISK-001 a RISK-035)

**5. Riscos P0 identificados:** 5 (RISK-001 a RISK-005)

**6. Riscos P1 identificados:** 15 (RISK-006 a RISK-020)

**7. Decisões pendentes do usuário:** 15

**8. ADRs recomendados:** 8 (ADR-001 a ADR-008)

**9. Itens do backlog impactados:** Todos os 81 itens (BL-001 a BL-081) foram analisados para dependências e priorização.

**10. Recomendações para UPDATE-BACKLOG-006:**
- Criar BL-082 (mapear endpoints drafting/checklist em main.ts)
- Criar BL-083 (ler roles reais em roles.ts e permissions/matrix.ts)
- Criar BL-084 (confirmar chave DataJud real no Render)
- Atualizar dependências de BL-048, BL-057, BL-075, BL-006 para referenciar ADRs

**11. Próxima etapa recomendada:**
1. **Imediato:** Resolver os 5 riscos P0 (BL-001, BL-039, BL-040, BL-020, BL-046)
2. **Paralelo:** Quick wins técnicos (BL-067, BL-073, BL-043, BL-044, BL-065)
3. **Decisões do usuário:** BL-048, BL-057, BL-009
4. **UPDATE-BACKLOG-006** pós KB-003G
5. **KB-004 Product Discovery** — após P0 resolvidos

---

*Criado em: 2026-05-30 | Status: current | Vault: !_lexora-memory-docs | Autor: claude-code*
*Baseado em: [[KB_003A_ESTRUTURA_GERAL_E_CONFIGURACOES_CURRENT_2026-05-29]], [[KB_003B_FRONTEND_ESTADO_ATUAL_CURRENT_2026-05-29]], [[KB_003C_BACKEND_E_APIS_ESTADO_ATUAL_CURRENT_2026-05-30]], [[KB_003D_DADOS_PRISMA_E_CONTRATOS_CURRENT_2026-05-30]], [[KB_003E_TESTES_QA_E_EVIDENCIAS_CURRENT_2026-05-30]], [[KB_003F_IA_AGENTES_E_AUTOMACOES_CURRENT_2026-05-30]], [[BACKLOG_GERAL_LEXORA_CURRENT]]*
