# Contratos F/G/H

Fonte soberana: [contracts/epic-fgh.contract.json](/C:/Users/tomke/app%20Juridico/contracts/epic-fgh.contract.json)

## Comandos obrigatórios
- `triage.item.create`
- `triage.item.prioritize`
- `triage.item.decide`
- `triage.item.explain`
- `triage.item.triggerAutomation`
- `document.upload`
- `document.version.create`
- `document.checklist.bind`
- `document.approval.update`
- `document.link.bindEntities`
- `document.artifact.generate`
- `client.portal.fetch`
- `client.communication.send`
- `client.communication.history`
- `client.consent.update`
- `client.prospect.signal`
- `audit.event`

## Regras transversais
- Todos os comandos devem declarar payload de entrada, saída, erros esperados e chave de idempotência/deduplicação.
- Rotas atuais de triagem, documentos, clientes e CRM permanecem válidas; a expansão é aditiva.
- Envio de comunicação deve respeitar consentimento por canal antes do dispatch.
- Automação e geração de artefatos precisam emitir `audit.event` com `correlationId`.

## Exemplos JSON
Consultar o bloco `commands` em [contracts/epic-fgh.contract.json](/C:/Users/tomke/app%20Juridico/contracts/epic-fgh.contract.json).

## Rotas já integradas nesta rodada
- `GET /triage`
- `GET /triage/:id`
- `POST /triage/:id/decision`
- `GET /documents`
- `GET /documents/:id`
- `GET /documents/:id/audit`
- `GET /documents/:id/links`
- `POST /documents/:id/links`
- `POST /documents`
- `PUT /documents/:id`
- `POST /templates/:id/generate-document`
- `GET /clients/:id/portal`
- `GET /clients/:id/consent`
- `PUT /clients/:id/consent`
- `GET /clients/:id/communications`
- `POST /clients/:id/communications`
- `POST /crm/prospects/signal`

## Lacunas residuais
- Persistência documental complementar (`metadata`, `storage`, `approval`, `links`, `artifacts`) ainda usa sidecar derivado de auditoria, não tabela dedicada.
