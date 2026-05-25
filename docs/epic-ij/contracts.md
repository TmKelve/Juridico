# Contratos do Epic IJ

## Fonte de verdade atual
- `contracts/epic-ij.contract.json`
- `frontend/src/api.ts`
- `frontend/src/Tasks.tsx`
- `frontend/src/Atendimentos.tsx`
- `frontend/src/App.tsx`
- `frontend/src/UsersWorkspace.tsx`
- `frontend/epic-ij.smoke.test.ts`
- `frontend/admin.users.smoke.test.ts`

## Superficie cliente atualmente consumivel

### `GET /users`
- Consumo atual: `api.getUsers()` em `frontend/src/api.ts`.
- Payload esperado hoje:
```json
[
  { "id": 1, "email": "admin@juridico.com", "role": "ADM" }
]
```
- Uso no epic IJ: lista base de usuarios para a superficie administrativa.
- Gap atual: ainda nao ha enriquecimento nativo com equipe, portfolio, backup owner ou permissoes por usuario.

### `GET /permissions`
- Consumo atual: `api.getPermissions()` em `frontend/src/api.ts`.
- Payload esperado hoje:
```json
[
  "task:update",
  "attendance:convert",
  "users:manage"
]
```
- Uso no epic IJ: matriz de permissao simplificada e verificacao de bloqueio.
- Gap atual: o frontend ainda nao recebe `scope`, `reason`, `sensitive` e `requiresAudit` no shape de decisao descrito no contrato soberano.

### `GET /tasks`, `POST /tasks`, `PUT /tasks/:id`
- Consumo atual: `api.getTasks()`, `api.createTask()`, `api.updateTask()`.
- Campos consumidos hoje pelo frontend:
  - `id`, `title`, `description`, `processId`, `processLabel`, `processTitle`
  - `client`, `origin`, `dueDate`, `status`, `priority`, `owner`, `createdBy`
  - `notes`, `linkedToDeadline`, `linkedToPublication`, `linkedToDocument`, `immediateAction`
- Compatibilidade obrigatoria:
  - manter payload atual enquanto coexistirem os novos campos de `taskAggregate`
  - tratar os campos novos do contrato soberano como aditivos e opcionais

### `GET /attendances`, `POST /attendances`, `PUT /attendances/:id`
- Consumo atual: `api.getAttendances()`, `api.createAttendance()`, `api.updateAttendance()`.
- Campos consumidos hoje pelo frontend:
  - `id`, `processId`, `processLabel`, `processTitle`, `client`
  - `canal`, `tipo`, `assunto`, `resumo`, `observacoes`, `status`
  - `priority`, `responsavel`, `area`, `dataHora`, `proximoPasso`, `retornoAgendado`, `critico`
- Compatibilidade obrigatoria:
  - manter payload atual enquanto coexistirem `conversionState`, `derivedTaskId`, `slaTargetAt` e `teamId`
  - nao quebrar o fluxo atual de registro e resolucao de atendimento durante a costura do schema novo

## Contrato soberano ainda pendente de costura completa
- `task.create`
- `task.updateStatus`
- `task.linkEntities`
- `task.followup.schedule`
- `attendance.create`
- `attendance.convertToTask`
- `attendance.convertToDeadline`
- `authzDecision`
- `portfolioOwnership`

## Regras que nao podem regredir
- Acoes sensiveis permanecem deny-by-default.
- Novos campos do epic IJ entram como extensoes aditivas.
- Toda conversao ou redistribuicao em lote precisa carregar `idempotencyKey` ou `dedupeKey` auditavel.
- `frontend/epic-ij.smoke.test.ts` e `frontend/admin.users.smoke.test.ts` permanecem como contrato visual minimo.

## Gaps explicitamente aceitos neste pacote
- Enquanto a mutacao dedicada `attendance.convertToTask` nao estiver roteada, o cliente preserva feedback operacional local para "Criar tarefa" a partir de atendimento.
- Enquanto a rota compartilhada `/usuarios` continuar apontando para `UsersList` inline em `frontend/src/App.tsx`, a base `UsersWorkspace` fica pronta para extracao sem ser a tela ativa.
