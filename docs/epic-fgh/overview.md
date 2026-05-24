# Epic F/G/H — Visão Integrada

## Objetivo
Entregar triagem operacional assistida, gestão documental ponta a ponta e relacionamento cliente-comunicação com trilha auditável, sem regressão das rotas atuais.

## Escopo ponta a ponta
- F: fila unificada, priorização dinâmica, decisão assistida, explicabilidade, SLA/aging, automação pós-triagem e painel de produtividade.
- G: upload real com versionamento, checklist por tipo processual, solicitação externa ao cliente, vínculo multi-entidade, aprovação/rejeição com motivo e geração persistida de peça.
- H: portal do cliente, comunicação ativa com histórico, consentimento/preferências e prospecção por CPF/CNPJ sem processo ativo.

## Arquitetura de integração
- Contrato soberano: [contracts/epic-fgh.contract.json](/C:/Users/tomke/app%20Juridico/contracts/epic-fgh.contract.json)
- Seams existentes preservados:
  - `backend/src/main.ts` continua como fachada HTTP durante a extração incremental.
  - `backend/src/triage.contract.ts`, `backend/src/documents.contract.ts` e `backend/src/crm.contract.ts` seguem compatíveis.
  - `frontend/src/Triagem.tsx`, `frontend/src/Documents.tsx` e `frontend/src/Clients.tsx` continuam sendo as superfícies roteadas.

## Módulos alvo
- `backend/src/triage/core/*`, `queue/*`, `sla/*`
- `backend/src/triage/decision/*`, `automation/*`, `explainability/*`
- `backend/src/documents/upload/*`, `versioning/*`, `checklist/*`, `approval/*`
- `backend/src/documents/links/*`, `artifacts/*`, `audit/*`
- `backend/src/clients/portal/*`, `consent/*`
- `backend/src/communication/*`
- `backend/src/crm/prospecting/*`
- `frontend/src/components/triage/*`, `components/documents/*`, `components/clients/*`, `components/communication/*`

## Fluxo textual
`source/capture -> triage queue -> decision/explanation -> automation -> documents/versioning/checklist/links -> client portal/communication/history -> audit`

## Ordem de integração
1. contratos F/G/H
2. backend F
3. backend G
4. backend H
5. frontend F/G
6. frontend H
7. testes, hardening e observabilidade
8. documentação com evidências

## Estado desta rodada
- Contrato soberano integrado publicado em `contracts/epic-fgh.contract.json`.
- Epic F backend integrado parcialmente na fachada atual:
  - ranking unificado de triagem
  - score/prioridade/SLA/aging no payload
  - explicabilidade anexada ao detalhe da triagem
  - projeção de decisão assistida/automação anexada ao `POST /triage/:id/decision`
- Epic G backend integrado na fachada atual:
  - `GET /documents`
  - `GET /documents/:id`
  - `GET /documents/:id/audit`
  - `GET /documents/:id/links`
  - `POST /documents/:id/links`
  - `POST /documents`
  - `PUT /documents/:id`
  - `POST /templates/:id/generate-document`
  - persistência híbrida: registro principal em `Documento`, arquivo real em `backend/storage/documents` e trilha complementar em `crmAuditEvent`
- Epic H backend integrado na fachada atual:
  - `GET /clients/:id/portal`
  - `PUT /clients/:id/consent`
  - `GET /clients/:id/communications`
  - `POST /clients/:id/communications`
  - `POST /crm/prospects/signal`
- Frontend F/G/H consumindo os campos e rotas novas em `Triagem`, `Documents` e `Clients`.

## Restrições remanescentes
- `Documento` ainda não possui colunas nativas para `metadata`, `storage`, `approval`, `links` e `artifacts`; esses dados são reidratados hoje a partir de sidecar/auditoria.
- A persistência de consentimento continua baseada em auditoria materializada, não em uma tabela dedicada de snapshots.
