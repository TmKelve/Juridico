# Catalogo de Metricas BI

## Regras de catalogo
- Cada metrica tem chave unica, definicao unica, formula auditavel, fonte e granularidade temporal.
- Nao usar a mesma chave para formulas diferentes entre dashboard e export.
- Toda metrica deve declarar timezone e janela de corte.

## Dashboards previstos
### Conversao comercial
- `crm.leads.created`
- `crm.opportunities.created`
- `crm.opportunities.converted`
- `crm.conversion.rate`
- `crm.avg.days_to_convert`

### Risco de prazos
- `deadlines.open.count`
- `deadlines.critical.count`
- `deadlines.overdue.count`
- `deadlines.risk.rate`
- `deadlines.avg.hours_to_due`

### Financeiro consolidado
- `finance.receivables.open_cents`
- `finance.receivables.overdue_cents`
- `finance.payables.open_cents`
- `finance.cashflow.net_cents`
- `finance.collections.recovery_rate`

### Produtividade por equipe/responsavel
- `productivity.tasks.completed`
- `productivity.tasks.overdue`
- `productivity.attendances.handled`
- `productivity.timesheet.billable_minutes`
- `productivity.avg.resolution_hours`

## Fontes candidatas
- CRM: `CrmLead`, `CrmOpportunity`, `CrmContactEvent`, `CrmAuditEvent`
- Prazos/Publicacoes: `Prazo`, `Publication`, `PublicationEvent`, `TriageItem`, `TriageDecision`
- Financeiro: `FinanceEntry`, `FinanceInstallmentPlan`, `FinanceCharge`, `FinanceCollectionAttempt`
- Producao operacional: `Task`, `TaskHistory`, `Atendimento`, `AttendanceHistory`, `ProductivitySnapshot`
- Timesheet futuro: `TimeEntry*`

## Gaps assumidos nesta fase
- Metricas de horas faturaveis dependem da introducao de `TimeEntry`.
- Algumas metricas historicas exigem snapshot append-only em vez de leitura de estado atual.
