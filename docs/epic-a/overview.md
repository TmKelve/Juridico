# Epic A — Publicações/Intimações Automáticas

## Objetivo
Entregar ingestão automática de publicações com matching operacional, classificação de impacto, triagem em lote, automação de prazo/tarefa, timeline por processo, reprocessamento seguro e trilha completa de auditoria.

## Escopo fim a fim
- Coleta automática agendada às 06:00, 12:00 e 18:00.
- Trigger manual para execução controlada do pipeline.
- Normalização para um payload canônico único.
- Matching por CPF/CNPJ/OAB/processo/cliente com fallback seguro para revisão manual.
- Classificação operacional em `critico|alto|medio|baixo`.
- Triagem com decisão unitária e em lote.
- Geração idempotente de prazo e tarefa.
- Timeline por processo com eventos do dia.
- Auditoria consultável e reprocessamento de falhas.

## Arquitetura
- `backend/src/jobs/*`: orquestração de job agendado e disparo manual.
- `backend/src/publications/ingestion/*`: coleta, normalização e persistência da captura.
- `backend/src/publications/matching/*`: resolução determinística de vínculo com processo/cliente.
- `backend/src/publications/classification/*`: regras de impacto e decisão de fila.
- `backend/src/triage/*`: filas, decisão em lote e estado operacional.
- `backend/src/publications/automation/*`: criação idempotente de prazo/tarefa.
- `backend/src/publications/audit/*` e `backend/src/publications/reprocess/*`: observabilidade, dead-letter e reprocessamento.
- `frontend/src/Publications*`, `frontend/src/Triagem*`, `frontend/src/Deadlines*`, `frontend/src/Tasks*`, `frontend/src/components/publications/*`, `frontend/src/components/automation/*`: experiência operacional.
- `contracts/epic-a-publications.contract.json`: contrato soberano de integração.

## Diagrama textual
`ingestao -> normalizacao -> matching -> classificacao -> triagem -> automacao -> timeline/auditoria -> reprocessamento`

## Ordem de integração
1. contratos + tipos
2. ingestão
3. matching + classificação
4. automação de prazo/tarefa
5. auditoria + reprocessamento
6. frontend
7. testes + documentação + hardening

## Estado atual
- Scheduler modular em `backend/src/shared/scheduler/publication-schedule.ts`, ligado no bootstrap atual.
- Planner de automação com dedupe em `backend/src/publications/automation/automation-planner.ts`, ligado ao endpoint `POST /triage/:id/decision`.
- Matching/classificação determinísticos disponíveis e acoplados via `backend/src/triage.matcher.ts` e `backend/src/triage-ai.provider.ts`.
- Auditoria consultável por publicação em `GET /publications/:id/audit`.
- Reprocessamento seguro de job falho em `POST /triage/jobs/:id/reprocess`.
