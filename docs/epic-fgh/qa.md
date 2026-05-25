# QA F/G/H

## Cenários críticos
- Triagem -> decisão -> ação automática -> auditoria.
- Documento -> upload/versionamento -> aprovação/rejeição -> vínculo -> auditoria.
- Cliente -> consentimento -> comunicação -> histórico -> retry quando falho, com rastreio de tentativas e falhas.
- Prospecção por CPF/CNPJ sem processo ativo -> lead/oportunidade -> timeline.

## Evidências esperadas
- Endpoints exercitados com payloads reais.
- Testes mínimos por módulo novo.
- Build backend e frontend sem quebrar rotas existentes.
- Smoke dos fluxos críticos F/G/H.

## Evidências desta rodada
- `backend`: `npm run build` passou em `C:\Users\tomke\app Juridico\backend`.
- `backend`: `node --test .\src\clients\consent\client-consent.service.test.cjs .\src\clients\portal\client-portal.service.test.cjs .\src\communication\communication.service.test.cjs .\src\communication\prisma-communication.repository.test.cjs .\src\crm\prospecting\crm-prospecting.service.test.cjs .\test\epic-fgh.contract.test.cjs .\test\epic-fgh.smoke.test.cjs` passou com `20/20` testes.
- `backend`: `node --test .\src\documents\upload\document-upload.service.test.cjs .\src\documents\versioning\document-versioning.service.test.cjs .\src\documents\approval\document-approval.service.test.cjs .\src\documents\checklist\procedural-document-checklist.service.test.cjs .\test\epic-fgh.contract.test.cjs .\test\epic-fgh.smoke.test.cjs` passou com `11/11` testes.
- `frontend`: `npm run build` passou em `C:\Users\tomke\app Juridico\frontend`.
- Smoke HTTP real validado em `2026-05-24`:
  - `triagem -> decisão -> ação automática`: item `#1`, `updatedStatus=confirmado`, `automationPlanned=true`
  - `documento -> aprovação -> vínculo`: processo `#1`, documento `#7`, `approvalStatus=validado`, `linkCount=1`
  - `cliente -> comunicação -> histórico`: cliente `#1`, `consentVersion=1`, `deliveryStatus=queued`, `historyItems=1`, com tentativas send/retry registradas quando aplicável
- Endpoint adicional validado por HTTP real:
  - `GET /clients/1/consent`: `consentVersion=2`, `capturedBy=admin@juridico.com`
- Evidência adicional de artefato:
  - `POST /templates/1/generate-document` gerou documento `#8` com `artifactId=artifact_ea221a8873a74c72b6764b79e89000fd`
- Módulos novos entregues:
  - Epic F: `backend/src/triage/core/*`, `queue/*`, `sla/*`, `decision/*`, `automation/*`, `explainability/*`
  - Epic G: `backend/src/documents/upload/*`, `versioning/*`, `checklist/*`, `approval/*`, `links/*`, `artifacts/*`, `audit/*`
  - Epic H: `backend/src/clients/portal/*`, `consent/*`, `backend/src/communication/*`, `backend/src/crm/prospecting/*`
  - Epic H incremental: provider configurável por ambiente, retry de comunicação e auditoria da falha antes do erro contratual

## Gaps conhecidos
- Não rodei smoke navegador com Playwright nesta rodada; a evidência E2E ficou no nível HTTP + testes de serviço.
- Persistência complementar de Epic G continua híbrida: `Documento` + filesystem local + audit sidecar, sem tabela dedicada para `metadata`, `storage`, `approval`, `links` e `artifacts`.
