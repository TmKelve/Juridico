# QA K/L/M

## Cobertura planejada
### Unit
- Guardrails de IA, fallback, budget e normalizacao de provider.
- Calculo e agregacao de metricas BI.
- Regras de conflito, fechamento e aprovacao de timesheet.

### Integration
- IA com auditoria persistida e replay por idempotencia.
- BI com snapshot consistente e consulta `asOf`.
- Timesheet ponta a ponta: lancar -> aprovar -> reportar.

### Smoke/E2E
- Fluxo IA em publicacao.
- Dashboard executivo com filtros e export.
- Fluxo mobile critico com apontamento e aprovacao de horas.

## Evidencias desta rodada
- Contratos soberanos criados para K, L e M.
- Pacote documental base `docs/epic-klm/*` criado.
- `backend/prisma/schema.prisma` expandido com fundacoes de IA, BI e Timesheet.
- Catalogo de permissoes expandido em `backend/src/authz/rbac/permissions.ts`.
- Modulo inicial do Epic K criado em:
  - `backend/src/ai/core/*`
  - `backend/src/ai/summarization/*`
  - `backend/src/ai/recommendation/*`
- Modulo complementar do Epic K criado em:
  - `backend/src/ai/drafting/*`
  - `backend/src/ai/checklist/*`
  - `backend/src/ai/audit/*`
- Adapter inicial de triagem integrado em `backend/src/triage-ai.provider.ts`.
- Primeira fatia do Epic L criada em:
  - `backend/src/bi/models/*`
  - `backend/src/bi/metrics/*`
  - `backend/src/bi/snapshots/*`
- Segunda fatia do Epic L criada em:
  - `backend/src/bi/access-control/*`
  - `backend/src/bi/exports/*`
  - `backend/src/bi/api/*`
- Primeira fatia do Epic M criada em:
  - `backend/src/timesheet/core/*`
  - `backend/src/timesheet/approval/*`
  - `backend/src/timesheet/reports/*`
  - `backend/src/mobile/adapters/*`
- Costura serial do backend concluida em:
  - `backend/src/ai/http/register-ai-routes.ts`
  - `backend/src/bi/api/register-bi-routes.ts`
  - `backend/src/timesheet/http/register-timesheet-routes.ts`
  - `backend/src/mobile/http/register-mobile-routes.ts`
  - `backend/src/main.ts`
- Validacoes executadas:
  - `npx prisma validate --schema=prisma/schema.prisma`
  - `npm run build`
  - `node --test src/authz/policies/authz.check.test.cjs`
  - `node --test src/ai/core/ai-provider.router.test.cjs src/ai/summarization/publication-summarizer.service.test.cjs src/ai/recommendation/triage-recommendation.service.test.cjs`
  - `node --test test/triage-ai.provider.test.cjs`
  - `node --test src/ai/audit/ai-audit.service.test.cjs src/ai/drafting/document-drafting.service.test.cjs src/ai/drafting/template-document-generator.adapter.test.cjs src/ai/checklist/checklist-suggestion.service.test.cjs`
  - `node --test src/bi/metrics/finance-executive-metrics.service.test.cjs src/bi/metrics/productivity-executive-metrics.service.test.cjs src/bi/snapshots/bi-snapshot.service.test.cjs`
  - `node --test src/bi/access-control/bi-authorizer.test.cjs src/bi/exports/bi-export.service.test.cjs src/bi/api/register-bi-routes.test.cjs`
  - `node --test src/timesheet/core/time-entry.service.test.cjs src/timesheet/approval/time-entry-approval.service.test.cjs src/timesheet/reports/timesheet-report.service.test.cjs src/mobile/adapters/mobile-feed.adapter.test.cjs`
  - `node --test src/ai/http/register-ai-routes.test.cjs src/timesheet/http/register-timesheet-routes.test.cjs src/mobile/http/register-mobile-routes.test.cjs`

## Pendencias de validacao
- Nenhuma rota K/L/M foi implementada ainda.
- Nenhuma migration nova foi aplicada ainda.
- Ainda nao existem testes de dominio para `backend/src/bi/*` ou `backend/src/timesheet/*`, porque esses modulos ainda nao foram criados.
- As superficies backend de IA, BI, Timesheet e Mobile ja estao registradas, mas ainda faltam consumo frontend, smoke HTTP real e persistencia Timesheet fora do runtime em memoria.
- Ainda nao existem rotas novas de IA em `main.ts`; por enquanto existe apenas o nucleo e o adapter de triagem.

## Critero de fechamento
- Sem documentacao + sem teste minimo = reprovado.
- Cada submodulo fecha apenas com evidencia de build, testes focados e smoke correspondente.
