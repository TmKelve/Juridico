# Epic CDE Overview

## Objetivo consolidado
- Epic C: CRM jurídico operacional com vínculo persistente entre oportunidade, processo, documento e trilha comercial.
- Epic D: automação e priorização de prazos com risco, auditoria e ações em massa.
- Epic E: previsibilidade de ambiente, smoke estável e gate mínimo de qualidade para merge e release.

## Arquitetura por frente
- CRM backend: módulos isolados em `backend/src/crm/conversion`, `backend/src/crm/process-link`, `backend/src/crm/documents`, `backend/src/crm/contact-history` e `backend/src/crm/audit`, integrados pelas rotas em `backend/src/main.ts`.
- Prazos backend: automação em `backend/src/publications/deadline-automation`, avaliação de risco em `backend/src/deadlines`, lote auditável em `backend/src/deadlines/batch-actions`.
- Frontend CRM: `frontend/src/CrmJuridico.tsx` e `frontend/src/api.ts` consomem os contratos de vínculo de processo, anexo de documento, conversão e auditoria sem reload completo.
- Frontend Prazos: `frontend/src/Deadlines.tsx` e `frontend/src/components/deadlines/*` priorizam por risco, exibem auditoria de conclusão e usam `deadlines.bulkAction` para conclusão em massa.
- Qualidade: seeds previsíveis em `scripts/test-seed`, testes mínimos em `backend/tests` e `frontend/epic-cde.smoke.test.ts`, além de gate em `.github/workflows/ci.yml`.

## Dependências críticas
- Prisma precisa materializar `CrmAuditEvent`, `CrmIdempotencyRequest`, `CrmOpportunityDocumentAttachment` e os novos campos de `Prazo`.
- O frontend depende dos contratos listados em [contracts.md](contracts.md), especialmente `crm.opportunity.linkProcess`, `crm.opportunity.attachDocument`, `crm.opportunity.convert`, `crm.opportunity.addContactEvent`, `deadlines.createFromPublication` e `deadlines.bulkAction`.
- O smoke depende de seed estável para usuários `ADM` e `ADV`, uma oportunidade CRM pronta para operação e uma publicação elegível para gerar prazo.

## Artefatos de operação
- [contracts.md](contracts.md)
- [qa.md](qa.md)
- [runbook.md](runbook.md)
- [changelog.md](changelog.md)
- [../../scripts/test-seed/epic-cde.seed.json](../../scripts/test-seed/epic-cde.seed.json)
