# Runbook do Epic IJ

## Preparacao
- Garantir backend e frontend no ar com os contratos legados de `/users`, `/permissions`, `/tasks` e `/attendances`.
- Confirmar seed minima com `admin@juridico.com` e `advogado@juridico.com`.
- Confirmar que a rota `/usuarios` ainda esta protegida por perfil no shell atual.

## Validacao operacional recomendada
1. Login como `ADV`.
2. Abrir `/tarefas`, criar uma tarefa e concluir a tarefa criada.
3. Abrir `/atendimentos`, registrar um novo atendimento e acionar "Criar tarefa" no detalhe.
4. Ainda como `ADV`, tentar abrir `/usuarios` e confirmar redirecionamento para `/`.
5. Login como `ADM` e confirmar abertura da tela `/usuarios`.

## Comandos de validacao
- `npm --prefix frontend run build`
- `node --test backend/tests/epic-ij.tasks.docs.test.cjs backend/tests/epic-ij.attendances.docs.test.cjs backend/tests/epic-ij.authz.docs.test.cjs`
- `npx --prefix frontend playwright test epic-ij.smoke.test.ts admin.users.smoke.test.ts`

## Interpretacao de gaps
- Se o passo 3 passar apenas com feedback visual e sem mutacao dedicada no backend, isso ainda esta alinhado com o estado atual documentado.
- Se o passo 4 falhar e `ADV` entrar em `/usuarios`, tratar como regressao de seguranca do shell.
- Se a tela administrativa continuar simples, isso nao bloqueia o pacote; a extracao para `UsersWorkspace` depende da costura do orquestrador.

## Dependencias externas ao ownership
- Extracao da rota `/usuarios` de `frontend/src/App.tsx`.
- Eventual enriquecimento de `frontend/src/api.ts` com contratos de equipe/permissao.
- Rotas novas do backend para ownership/portfolio/authz granular.
