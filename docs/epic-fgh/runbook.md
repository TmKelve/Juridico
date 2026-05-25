# Runbook F/G/H

## Operação diária
- Monitorar fila de triagem por prioridade, aging e SLA.
- Validar uploads/documentos pendentes de aprovação e solicitações externas em aberto.
- Acompanhar histórico de comunicação por cliente e falhas de envio/retry.
- Conferir a configuração do provider de comunicação por ambiente antes de validar envio:
  - `CLIENT_COMMUNICATION_PROVIDER`
  - `CLIENT_COMMUNICATION_BASE_URL`
  - `CLIENT_COMMUNICATION_API_KEY`
  - `CLIENT_COMMUNICATION_DISPATCH_PATH`
  - `CLIENT_COMMUNICATION_TIMEOUT_MS`
- Quando o provider externo não estiver configurado, o fallback seguro deve permanecer em `memory/mock` para manter smoke e desenvolvimento.

## Troubleshooting
- Triagem sem automação: verificar decisão registrada, explicação materializada e dedupe/audit da automação.
- Documento sem vínculo: verificar bindings de processo/prazo/atendimento em `GET /documents/:id/links` e a trilha em `GET /documents/:id/audit`.
- Comunicação sem entrega: verificar consentimento do cliente, provider ativo, payload de dispatch, timeouts e retries registrados.
- Falha de comunicação com erro contratual: verificar se o audit/evento foi emitido antes do retorno de erro e se a tentativa ficou registrada no histórico.
- Reenvio necessário: usar `POST /clients/:id/communications/:communicationId/retry` para reprocessar a tentativa falha sem perder rastreio.
- Upload persistido sem preview: verificar arquivo em `backend/storage/documents` e o bloco `storage` retornado pelo documento.
- Artefato gerado sem rastreio: verificar `POST /templates/:id/generate-document` e o evento `document.artifact.generate` no audit sidecar.

## Reprocessamento
- Reexecutar apenas comandos/eventos marcados como falhos ou parcialmente aplicados.
- Reprocessamento deve reutilizar `idempotencyKey`/`dedupeKey` original e gerar novo `audit.event`.

## Observabilidade mínima
- Logs estruturados por `scope=triage|documents|clients|communication`.
- Correlação por `correlationId`.
- Métricas mínimas: backlog de triagem, SLA breach, documentos pendentes, envios falhos, retries.

## Endpoints operacionais desta rodada
- Triagem:
  - `GET /triage`
  - `GET /triage/:id`
  - `POST /triage/:id/decision`
- Documentos:
  - `GET /documents`
  - `GET /documents/:id`
  - `GET /documents/:id/audit`
  - `GET /documents/:id/links`
  - `POST /documents/:id/links`
  - `POST /documents`
  - `PUT /documents/:id`
  - `POST /templates/:id/generate-document`
- Cliente/comunicação:
  - `GET /clients/:id/portal`
  - `GET /clients/:id/consent`
  - `PUT /clients/:id/consent`
  - `GET /clients/:id/communications`
  - `POST /clients/:id/communications`
  - `POST /clients/:id/communications/:communicationId/retry`
  - `POST /crm/prospects/signal`

## Evidência operacional desta rodada
- Smoke HTTP validado com `admin@juridico.com` / `123456`.
- Fluxo F: decisão confirmada em triagem com `automationPlanned=true`.
- Fluxo G: upload real, aprovação e vínculo concluídos por HTTP; artefato documental gerado a partir de template.
- Fluxo H: portal consultado, consentimento atualizado, comunicação enviada e histórico retornado.
- Leitura inicial de consentimento validada por HTTP real com `GET /clients/1/consent` retornando `consentVersion=2` em `2026-05-24`.
