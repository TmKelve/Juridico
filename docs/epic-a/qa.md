# QA do Epic A

## Cenários mínimos
- Matching por `CPF/CNPJ/OAB/processo/cliente`.
- Classificação `critico/alto/medio/baixo`.
- Decisão de triagem em lote.
- Geração automática de prazo/tarefa.
- Idempotência sem duplicar prazo/tarefa.
- Reprocessamento de falhas.
- Timeline por processo refletindo eventos automáticos.

## Evidências esperadas
- `backend`: unit e integration.
- `frontend`: smoke do fluxo principal.
- build backend/frontend sem regressão de rotas atuais.

## Evidências executadas em 2026-05-21
- `backend`: `npm run build` passando.
- `backend`: `node --test test/triage.matcher.test.cjs test/triage-ai.provider.test.cjs src/triage/decision-engine.test.cjs src/publications/ingestion/publication-ingestion.test.cjs src/shared/scheduler/publication-schedule.test.cjs src/publications/audit/publication-audit.service.test.cjs src/publications/reprocess/publication-reprocess.service.test.cjs` passando com `12/12` testes.
- `backend`: `node --test test/triage.contract.test.cjs test/publications.contract.test.cjs test/deadlines.contract.test.cjs test/tasks.contract.test.cjs` passando.
- `frontend`: `npm run build` passando.

## Limitações conhecidas
- O smoke E2E do fluxo principal não foi executado nesta rodada porque o app não foi levantado para navegação Playwright no mesmo ciclo de integração.
- A trilha de auditoria estruturada e o reprocessamento possuem serviços dedicados, mas parte do uso ainda depende do estado persistido atual em `main.ts`, não de uma tabela append-only nova.
- O reprocessamento seguro já cobre reexecução de `sourceJob` falho; replay fino por item/capture ainda depende de wiring adicional.
