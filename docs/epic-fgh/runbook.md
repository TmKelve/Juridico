# Runbook F/G/H

## Operação diária
- Monitorar fila de triagem por prioridade, aging e SLA.
- Validar uploads/documentos pendentes de aprovação e solicitações externas em aberto.
- Acompanhar histórico de comunicação por cliente e falhas de envio/retry.

## Troubleshooting
- Triagem sem automação: verificar decisão registrada, explicação materializada e dedupe/audit da automação.
- Documento sem vínculo: verificar bindings de processo/prazo/atendimento em `GET /documents/:id/links` e a trilha em `GET /documents/:id/audit`.
- Comunicação sem entrega: verificar consentimento do cliente, status do dispatch e retries registrados.
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
  - `POST /crm/prospects/signal`

## Evidência operacional desta rodada
- Smoke HTTP validado com `admin@juridico.com` / `123456`.
- Fluxo F: decisão confirmada em triagem com `automationPlanned=true`.
- Fluxo G: upload real, aprovação e vínculo concluídos por HTTP; artefato documental gerado a partir de template.
- Fluxo H: portal consultado, consentimento atualizado, comunicação enviada e histórico retornado.
- Leitura inicial de consentimento validada por HTTP real com `GET /clients/1/consent` retornando `consentVersion=2` em `2026-05-24`.
