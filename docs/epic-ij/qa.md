# QA do Epic IJ

## Escopo validado
- Fluxo operacional minimo de tarefa com criacao e conclusao.
- Fluxo operacional minimo de atendimento com registro e conversao visual para tarefa no estado atual do cliente.
- Bloqueio de acao sem permissao ao tentar acessar `/usuarios` com perfil nao administrativo.
- Base documental do epic IJ com contratos, modelo de seguranca, runbook e changelog.

## Riscos principais
- Drift entre os status novos do contrato soberano e os status ainda consumidos por `Tasks.tsx` e `Atendimentos.tsx`.
- Conversao de atendimento pode parecer completa no cliente antes da existencia de uma mutacao auditavel no backend.
- A rota `/usuarios` continua acoplada ao `UsersList` inline em `App.tsx`, fora deste ownership.
- O endpoint `/permissions` ainda retorna lista simples, sem escopo detalhado.

## Testes recomendados ou executados
- `npm --prefix frontend run build`
- `node --test backend/tests/epic-ij.tasks.docs.test.cjs backend/tests/epic-ij.attendances.docs.test.cjs backend/tests/epic-ij.authz.docs.test.cjs`
- `npx --prefix frontend playwright test epic-ij.smoke.test.ts admin.users.smoke.test.ts`

## Lacunas de cobertura
- Nao ha ainda integracao real de equipe/portfolio/permissao granular na tela ativa.
- Nao ha teste de integracao HTTP dedicado para `attendance.convertToTask`.
- O smoke valida o bloqueio client-side atual, nao um 403 backend dedicado.

## Evidencias minimas para sign-off
- Build do frontend verde.
- Testes documentais do backend verdes.
- Smoke `epic-ij` verde.
- Confirmacao explicita dos gaps de orquestracao em `frontend/src/App.tsx` e `frontend/src/api.ts`.

## Parecer de QA
- O pacote e apto para integracao incremental se os testes acima passarem e os gaps continuarem explicitamente documentados.
- Nao considerar o epic totalmente fechado do ponto de vista funcional ate a costura de rotas compartilhadas e authz granular no backend.
