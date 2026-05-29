# Plano por Agente (Ownership sem sobreposição)

## Agente 1 - Backfill engine
- Ownership:
- `backend/src/migrations/company-scope/*`
- `backend/src/shared/company-scope/backfill-*`
- Responsável:
- planejamento de lotes, execução chunked, checkpoint/retry.

## Agente 2 - Enforcement de schema
- Ownership:
- `backend/prisma/migrations/*company_scope*`
- `backend/prisma/schema.prisma` (apenas campos/constraints de companyId)
- Responsável:
- índices compostos, `NOT NULL` progressivo, constraints FK.

## Agente 3 - Verificação e auditoria
- Ownership:
- `backend/tests/*company-scope*`
- `backend/tests/*cross-tenant*`
- `backend/src/platform-audit/*`
- Responsável:
- validação pós-backfill, provas de bloqueio cross-tenant e trilha auditável.

## Agente 4 - Auth/runtime E2E
- Ownership:
- `backend/src/auth/*`
- `backend/src/session/*`
- `frontend/*.smoke.test.ts`
- Responsável:
- cenários de troca de tenant, status da empresa, regressão de sessão.

## Agente 5 - Console plataforma
- Ownership:
- `frontend/src/platform/*`
- `frontend/src/components/platform/*`
- `frontend/src/admin/platform-console/*`
- Responsável:
- UI operacional de governança com motivo obrigatório em ações sensíveis.

## Agente 6 - QA/Docs/Contracts
- Ownership:
- `contracts/fase-3-rollout-enforcement.contract.json`
- `docs/fase-3-rollout-enforcement/*`
- `backend/tests/*fase3*`
- `frontend/tests/*fase3*`
- Responsável:
- contrato final, DoD, evidências de teste e riscos residuais.
