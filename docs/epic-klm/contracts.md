# Contratos K/L/M

## Fontes soberanas
- [../../contracts/epic-k.contract.json](../../contracts/epic-k.contract.json)
- [../../contracts/epic-l-bi.contract.json](../../contracts/epic-l-bi.contract.json)
- [../../contracts/epic-m.contract.json](../../contracts/epic-m.contract.json)

## Regras transversais
- Todos os contratos devem declarar entrada, saida, erros esperados e idempotencia.
- Nenhum contrato novo substitui rotas existentes; toda expansao e aditiva.
- Toda mutacao relevante deve gerar evento de auditoria consultavel.
- Toda leitura executiva relevante deve aceitar consistencia temporal explicita quando aplicavel.

## Epic K - IA
### Comandos obrigatorios
- `ai.summary.generate`
- `ai.recommendation.generate`
- `ai.draft.generate`
- `ai.checklist.suggest`
- `ai.audit.event`

### Compatibilidade
- Recomendacoes e rascunhos nao executam automacao sensivel sem aprovacao humana.
- Guardrails devem bloquear saida fora de escopo, falta de contexto ou custo acima do limite.

## Epic L - BI
### Comandos obrigatorios
- `bi.metric.query`
- `bi.snapshot.generate`
- `bi.dashboard.fetch`
- `bi.export.generate`

### Compatibilidade
- UI, export e snapshot devem refletir a mesma definicao de metrica.
- Consultas devem ser timezone-aware e suportar janelas de corte.

## Epic M - Mobile + Timesheet
### Comandos obrigatorios
- `timesheet.entry.create`
- `timesheet.entry.update`
- `timesheet.entry.approve`
- `timesheet.report.query`
- `mobile.feed.fetch`

### Compatibilidade
- Fechamento de periodo bloqueia edicao segundo politica.
- Integracao financeira ocorre por vinculacao explicita, sem acoplamento direto no core financeiro.

## Lacunas planejadas para a proxima onda
- Modelos Prisma de IA: `AiExecution`, `AiExecutionTarget`, `AiBudgetLedger` ou equivalente.
- Modelos Prisma de BI: snapshots executivos append-only e catalogo de definicoes.
- Modelos Prisma de timesheet: `TimeEntry`, `TimeEntryApproval`, `TimesheetClosure`, `TimeEntryConflict`, `TimeEntryFinanceLink`.
