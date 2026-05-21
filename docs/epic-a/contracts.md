# Contratos do Epic A

Fonte soberana: [contracts/epic-a-publications.contract.json](/C:/Users/tomke/app%20Juridico/contracts/epic-a-publications.contract.json)

## Entidades obrigatórias
- `normalizedPublication`
- `matchingResult`
- `classificationResult`
- `automationCommand`
- `auditEvent`

## Comportamentos esperados
- Toda publicação normalizada gera `idempotencyKey`.
- `matchingResult.matchStatus=ambiguous` bloqueia automação e envia para revisão manual.
- `classificationResult.requiresDeadline=true` não autoriza criação direta sem dedupe.
- `automationCommand.dedupeKey` é obrigatório para evitar duplicidade de prazo/tarefa.
- `auditEvent` deve ser emitido em sucesso, warning e erro.

## Códigos de erro
- `PUB_DUPLICATE`: repetição detectada por fingerprint/idempotência.
- `PUB_MATCH_AMBIGUOUS`: múltiplos alvos elegíveis.
- `PUB_MATCH_NOT_FOUND`: nenhum alvo elegível.
- `PUB_AUTOMATION_DUPLICATE`: prazo/tarefa já existentes.
- `PUB_REPROCESS_NOT_ALLOWED`: reprocessamento inseguro.
- `PUB_PIPELINE_FAILURE`: falha inesperada do pipeline.

## Expectativa de compatibilidade
- Não remover campos existentes dos payloads atuais de `publications`, `triage`, `deadlines` e `tasks`.
- Acrescentar novos campos de forma compatível e opcional quando necessário.
- Preservar rotas já consumidas pelo frontend atual.

## Endpoints operacionais já expostos
- `GET /triage`
- `GET /triage/:id`
- `PUT /triage/:id`
- `POST /triage/:id/decision`
- `GET /triage/jobs`
- `POST /triage/jobs/run-cnj`
- `POST /triage/jobs/run-cpf`
- `POST /triage/jobs/run-diario`
- `POST /triage/jobs/run-oab`
- `POST /triage/jobs/:id/reprocess`
- `GET /publications/:id/audit`
