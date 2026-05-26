# Epic K/L/M - Overview

## Objetivo consolidado
- Epic K: adicionar IA juridica operacional com resumo, recomendacao, rascunho, checklist, auditoria e controle de custo.
- Epic L: consolidar BI executivo com metricas unicas, snapshots, filtros consistentes e exportacoes gerenciais.
- Epic M: habilitar fluxos mobile criticos e timesheet operacional com aprovacao, fechamento e integracao com produtividade/financeiro.

## Arquitetura integrada
- `contracts/epic-k.contract.json`: contratos soberanos de IA.
- `contracts/epic-l-bi.contract.json`: contratos soberanos de BI executivo.
- `contracts/epic-m.contract.json`: contratos soberanos de mobile e timesheet.
- `backend/src/ai/*`: modulo novo para provider, resumo, recomendacao, drafting, checklist, auditoria e budget.
- `backend/src/bi/*`: modulo novo para metricas, snapshots, APIs, exports e access-control.
- `backend/src/mobile/*` e `backend/src/timesheet/*`: modulos novos para feed mobile, apontamento, aprovacao e relatorios.
- `frontend/src/pages/ai/*`, `frontend/src/dashboard/bi/*`, `frontend/src/timesheet/*`, `frontend/src/mobile/*`: superficies novas de UX, preservando o shell atual.

## Regra de integracao
- Trabalho paralelo apenas em arvores novas por ownership.
- Edicoes serializadas obrigatorias:
  - `backend/prisma/schema.prisma`
  - `backend/src/main.ts`
  - `backend/src/authz/rbac/permissions.ts`
  - `frontend/src/api.ts`
  - `frontend/src/App.tsx`

## Sequencia segura
1. Contratos + docs base.
2. Prisma + authz + seeds/registries compartilhados.
3. Backend K.
4. Backend L.
5. Backend M.
6. Front IA.
7. Front BI.
8. Front Mobile/Timesheet.
9. Smoke, hardening, docs finais e evidencias.

## Ownership por faixa
- K backend core: `backend/src/ai/core/*`, `backend/src/ai/summarization/*`, `backend/src/ai/recommendation/*`
- K backend assistentes/auditoria: `backend/src/ai/drafting/*`, `backend/src/ai/checklist/*`, `backend/src/ai/audit/*`, `backend/src/ai/cost-control/*`
- L backend data: `backend/src/bi/models/*`, `backend/src/bi/pipelines/*`, `backend/src/bi/snapshots/*`, `backend/src/bi/metrics/*`
- L backend APIs/exports: `backend/src/bi/api/*`, `backend/src/bi/exports/*`, `backend/src/bi/access-control/*`
- M backend: `backend/src/mobile/*`, `backend/src/timesheet/core/*`, `backend/src/timesheet/approval/*`, `backend/src/timesheet/reports/*`
- Front IA + BI: `frontend/src/components/ai/*`, `frontend/src/pages/ai/*`, `frontend/src/dashboard/bi/*`, `frontend/src/components/bi/*`
- Front Mobile/Timesheet + QA/Docs: `frontend/src/mobile/*`, `frontend/src/timesheet/*`, `frontend/src/components/timesheet/*`, testes `*ai*|*bi*|*timesheet*`, `docs/epic-klm/*`

## Dependencias estruturais
- K depende de integracao com publicacoes, triagem, templates e documentos.
- L depende de snapshots temporais e definicao unica de metricas.
- M depende de models novos de tempo e adapters para tasks, attendances, agenda, produtividade e financeiro.
