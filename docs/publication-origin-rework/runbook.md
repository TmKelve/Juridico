# Runbook do Publication Origin Rework

## Operação esperada após integração
- Captura é registrada com `correlationId`, `sourceType`, `sourceReference` e evidência bruta.
- Normalização vincula captura a evento/publicação sem perder a referência de origem.
- Triagem e CRM recebem `originReference` compatível.
- Timeline e ações derivadas ficam consultáveis por `correlationId`.

## Como validar o ambiente
1. Conferir se o backend expõe `GET /publication-captures`, `GET /publication-captures/:id/evidence`, `GET /publication-pipeline/:correlationId` e `GET /publication-pipeline/:correlationId/actions`.
2. Se houver histórico anterior ao rework ainda sem persistência explícita, executar `POST /publication-origin/backfill` com perfil `ADM`.
3. Conferir se `GET /publications`, `GET /triage`, `GET /crm/leads` e `GET /crm/opportunities` continuam respondendo sem quebra de payload legado.
4. Rodar `node --test backend/test/publication-origin-rework.contract.test.cjs backend/tests/publication-origin-rework.docs.test.cjs`.
5. Subir frontend e backend.
6. Rodar `npm --prefix frontend exec playwright test frontend/publication-origin-rework.smoke.test.ts`.

## Como reconhecer falha
- `correlationId` ausente entre captura, publicação, triagem ou CRM.
- `GET /publication-captures/:id/evidence` sem vínculo com timeline ou ações derivadas.
- Lista legada quebra ao receber campos aditivos de origem.
- UI navega, mas não há qualquer indício de timeline/origem nas superfícies previstas.

## Como responder
- Se a lista legada quebrar, tratar como regressão de compatibilidade antes de expandir UI.
- Se os endpoints novos não responderem, classificar como dependência do orquestrador/backend principal.
- Se o histórico existir mas os campos persistidos vierem nulos, rodar o backfill antes de concluir que a correlação está quebrada.
- Se `originReference` existir só parcialmente, registrar exatamente em qual frente a correlação se perde.
- Se o smoke falhar apenas por indisponibilidade do app local, não confundir com falha contratual do pacote.

## Checklist de incidente
- Registrar a rota afetada.
- Registrar o `correlationId` envolvido, se existir.
- Indicar se a falha ocorre em captura, consolidação, triagem, CRM ou ação derivada.
- Dizer se houve quebra de compatibilidade no payload legado.
- Atualizar `changelog.md` com decisão e impacto.
