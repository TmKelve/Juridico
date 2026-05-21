# Changelog do Epic A

## 2026-05-20
- Criado contrato soberano único em `contracts/epic-a-publications.contract.json`.
- Definido merge order obrigatório: contratos, ingestão, matching/classificação, automação, auditoria/reprocessamento, frontend, testes/docs.
- Formalizado requirement de documentação obrigatória para aceite.

## 2026-05-21
- Scheduler de publicações extraído para `backend/src/shared/scheduler/publication-schedule.ts` e integrado ao bootstrap atual.
- Núcleo de ingestão normalizada criado em `backend/src/publications/ingestion/publication-ingestion.ts`.
- Matching determinístico por `CPF/CNPJ/OAB/processo/cliente` incorporado aos adaptadores de triagem.
- Planner de decisão/automação com `dedupeKey` incorporado ao endpoint `POST /triage/:id/decision`.
- Expostos `GET /publications/:id/audit` e `POST /triage/jobs/:id/reprocess`.
- UI de `Triagem`, `Publications`, `Deadlines` e `Tasks` atualizada com fluxo em lote e links operacionais.
