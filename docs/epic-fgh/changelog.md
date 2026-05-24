# Changelog F/G/H

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
