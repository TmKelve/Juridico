# Epic IJ Overview

## Objetivo consolidado
- Epic I: dar previsibilidade operacional para tarefas e atendimentos com ownership, conversao e rastreabilidade de follow-up.
- Epic J: expor a superficie administrativa de usuarios, equipe e permissoes sem relaxar o modelo deny-by-default.
- Este pacote fecha documentacao, QA minimo e a base de UI sob ownership local enquanto o orquestrador finaliza a costura de rotas e schema.

## Escopo entregue neste ownership
- Base de tela em `frontend/src/UsersWorkspace.tsx` e componentes de apoio em `frontend/src/components/team/*` e `frontend/src/components/permissions/*`.
- Smoke focado em fluxo operacional de tarefa, conversao de atendimento no estado atual do cliente e bloqueio de acesso sem permissao em `frontend/epic-ij.smoke.test.ts`.
- Testes documentais minimos em `backend/tests/epic-ij.*.test.cjs`.
- Pacote documental em `docs/epic-ij/{overview,contracts,security-model,runbook,qa,changelog}.md`.

## Dependencias criticas de orquestracao
- `frontend/src/api.ts` ainda e a fronteira de consumo. Este ownership parte apenas dos contratos hoje expostos em `getUsers`, `getPermissions`, `getTasks`, `createTask`, `updateTask`, `getAttendances`, `createAttendance` e `updateAttendance`.
- `frontend/src/App.tsx` ainda renderiza `UsersList` inline na rota `/usuarios`; a extracao para `UsersWorkspace` depende de costura futura do orquestrador nas rotas compartilhadas.
- O backend novo em disco ainda precisa consolidar rotas finais para equipe/permissoes e, se aplicavel, uma mutacao real de conversao `attendance -> task` antes de remover o fallback visual atual.

## Gaps conhecidos
- Nao existe ainda rota dedicada para carregar portfolios, equipes e matriz de autorizacao enriquecida no frontend.
- O fluxo atual "Criar tarefa" a partir de atendimento confirma feedback visual no cliente, mas nao consome uma mutacao dedicada de conversao auditavel.
- O gate atual de permissao na tela de usuarios continua client-side por perfil (`ADM`) ate que o backend exponha decisao granular reutilizavel.

## Artefatos relacionados
- [contracts.md](contracts.md)
- [security-model.md](security-model.md)
- [runbook.md](runbook.md)
- [qa.md](qa.md)
- [changelog.md](changelog.md)
- [../../contracts/epic-ij.contract.json](../../contracts/epic-ij.contract.json)
