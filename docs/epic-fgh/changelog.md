# Changelog F/G/H

## 2026-05-25
- Consolidada a nova fatia de Epic H com provider de comunicação configurável por ambiente via `CLIENT_COMMUNICATION_PROVIDER`, `CLIENT_COMMUNICATION_BASE_URL`, `CLIENT_COMMUNICATION_API_KEY`, `CLIENT_COMMUNICATION_DISPATCH_PATH` e `CLIENT_COMMUNICATION_TIMEOUT_MS`.
- Mantido fallback seguro para `memory/mock` quando o provider externo não estiver disponível.
- Adicionada a rota `POST /clients/:id/communications/:communicationId/retry` para reprocessar tentativas falhas com rastreio preservado.
- Histórico de comunicação passou a registrar tentativas de `send` e `retry`, incluindo falhas.
- Falhas de comunicação passaram a emitir `audit/event` antes do retorno de erro contratual.
- Validação da fatia H concluída com `npm run build` e `node --test` cobrindo `communication.service`, `prisma-communication.repository`, `consent`, `portal`, `prospecting`, `epic-fgh.contract` e `epic-fgh.smoke` em `20/20`.

## 2026-05-22
- Formalizado contrato soberano integrado para F/G/H.
- Definida estratégia de integração incremental preservando `backend/src/main.ts` como fachada atual.
- Registrada regra de bloqueio: sem teste mínimo e documentação atualizada, o epic não fecha.
- Integrados na fachada atual os campos operacionais de triagem (prioridade/SLA/aging/ranking/explicabilidade).
- Expostas rotas de portal do cliente, consentimento, comunicação e prospecção.
- Integradas rotas HTTP de documentos para upload, versionamento, aprovação, vínculo, auditoria e geração de artefato.
- Adotada persistência híbrida de Epic G: `Documento` no banco atual, arquivo real em `backend/storage/documents` e sidecar/auditoria em `crmAuditEvent`.
- Frontend de documentos passou a consumir upload real e frontend de clientes passou a operar portal/comunicação/consentimento com os contratos atuais.
- Smoke HTTP de F/G/H executado com sucesso em `2026-05-24`.
- Exposta rota `GET /clients/:id/consent` e painel de comunicação passou a hidratar snapshot inicial de consentimento.
- Gap residual explicitado: dados complementares de documentos ainda fora de colunas nativas do schema.
