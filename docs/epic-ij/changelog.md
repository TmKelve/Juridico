# Changelog do Epic IJ

## 2026-05-25
- adicionada documentacao `docs/epic-ij/{overview,contracts,security-model,runbook,qa,changelog}.md`
- adicionados testes documentais minimos em `backend/tests/epic-ij.tasks.docs.test.cjs`, `backend/tests/epic-ij.attendances.docs.test.cjs` e `backend/tests/epic-ij.authz.docs.test.cjs`
- adicionado smoke focado em tarefa, atendimento e bloqueio de permissao em `frontend/epic-ij.smoke.test.ts`
- preparada base reutilizavel de UI em `frontend/src/UsersWorkspace.tsx`, `frontend/src/UsersWorkspace.css`, `frontend/src/components/team/TeamAssignmentsPanel.tsx` e `frontend/src/components/permissions/PermissionsMatrix.tsx`
- documentado o gap de costura entre `frontend/src/App.tsx`, `frontend/src/api.ts` e as novas rotas compartilhadas do epic IJ
