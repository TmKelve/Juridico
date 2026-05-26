# Runbook K/L/M

## Ordem de rollout
1. Aplicar migrations Prisma da rodada.
2. Gerar client Prisma.
3. Subir backend.
4. Validar rotas K/L/M em smoke HTTP.
5. Subir frontend.
6. Validar smoke Playwright das superficies IA, BI e Timesheet.

## Endpoints previstos
### K
- `POST /ai/summary`
- `POST /ai/recommendation`
- `POST /ai/draft`
- `POST /ai/checklist`
- `GET /ai/audit`

### L
- `GET /bi/dashboard/:dashboardKey`
- `POST /bi/snapshots/generate`
- `POST /bi/metrics/query`
- `POST /bi/exports`

### M
- `GET /mobile/feed`
- `POST /timesheet/entries`
- `PUT /timesheet/entries/:id`
- `POST /timesheet/entries/approve`
- `GET /timesheet/reports`

## Troubleshooting inicial
- IA com `AI_BUDGET_EXCEEDED`: reduzir escopo, revisar limite por equipe e confirmar budget ledger.
- IA com `AI_GUARDRAIL_BLOCKED`: revisar contexto, facts e politica de prompt.
- BI inconsistente entre tela e export: comparar `snapshotId`, `definitionsVersion` e `asOf`.
- Timesheet com `TIMESHEET_CONFLICT`: checar overlap, periodo fechado e entidades vinculadas encerradas.
- Mobile feed incompleto: revisar filtros de ownership e timezone.

## Rollback
- Backend: retirar registradores modulares de K/L/M em `main.ts`.
- Frontend: retirar rotas/atalhos das superficies novas.
- Dados: reverter migrations da rodada conforme politica do ambiente.
- Operacao: desativar jobs/schedulers novos por flag antes de rollback de codigo.
