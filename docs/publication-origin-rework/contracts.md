# Contratos do Publication Origin Rework

## Fonte de verdade atual
- `contracts/publication-origin-rework.contract.json`
- `docs-juridico/30-Mapeamento-Tela-API-P0.md`
- `frontend/publication-origin-rework.smoke.test.ts`

## Entidades obrigatórias
- `captureRecord`
- `captureEvidenceFetch`
- `publicationNormalizedRecord`
- `publicationConsolidationStatus`
- `publicationPipelineTimeline`
- `crmOriginReference`
- `triageOriginReference`
- `derivedActionRecord`

## Estados de pipeline
- `capturado`
- `normalizado`
- `consolidado`
- `triado`
- `gerou_crm`
- `gerou_prazo`
- `gerou_tarefa`
- `descartado`
- `falhou`
- `reprocessado`

## Endpoints novos obrigatórios
- `GET /publication-captures`
- `GET /publication-captures/:id`
- `GET /publication-captures/:id/evidence`
- `GET /publication-pipeline/:correlationId`
- `GET /publication-pipeline/:correlationId/actions`

## Compatibilidade obrigatória
- `GET /publications` permanece ativo e recebe expansão aditiva de origem/pipeline.
- `GET /triage` permanece ativo e recebe expansão aditiva de `originReference` e `timeline`.
- `GET /crm/leads` permanece ativo e recebe expansão aditiva de `originReference`.
- `GET /crm/opportunities` permanece ativo e recebe expansão aditiva de `originReference`.

## Referências mínimas expostas ao frontend

### `crmOriginReference`
- `correlationId`
- `sourceType`
- `sourceReference`
- `originKind`
- `originLabel`
- `originStage`
- `consolidationStatus`
- `captureId`
- `eventId`
- `publicationId`
- `evidenceUrl`
- `publicationUrl`
- `timelineUrl`

### `triageOriginReference`
- `correlationId`
- `sourceType`
- `sourceReference`
- `originKind`
- `originStage`
- `pipelineStatus`
- `captureId`
- `eventId`
- `publicationId`

## Erros contratuais mínimos
- `CAPTURE_NOT_FOUND`
- `CAPTURE_ACCESS_DENIED`

## Expectativa para testes aditivos
- `backend/test/publication-origin-rework.contract.test.cjs` valida o shape soberano do contrato e o vínculo com esta documentação.
- `backend/tests/publication-origin-rework.docs.test.cjs` garante a presença dos artefatos obrigatórios e das seções mínimas de QA.
- `frontend/publication-origin-rework.smoke.test.ts` cobre a navegação mínima de `Publicações`, `Triagem`, `Clientes` e `CRM Jurídico` com mocks de origem/timeline.

## Gaps deliberadamente documentados
- O smoke cobre o contrato de navegação e os pontos de encaixe do frontend, não a persistência real dos novos endpoints.
- URLs como `timelineUrl`, `evidenceUrl` e `publicationUrl` ainda dependem do orquestrador publicar os links finais.
- O rework não substitui a timeline operacional legada; ele a especializa com contexto de origem quando a integração estiver ativa.
