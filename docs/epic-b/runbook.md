# Runbook do Epic B

## Operação diária
1. Abrir `/financeiro`.
2. Revisar KPIs: recebíveis, inadimplência, fluxo líquido e maior atraso.
3. Validar lançamentos em aberto.
4. Gerar cobrança Pix/boleto/link quando necessário.
5. Acompanhar parcelamentos ativos e o detalhamento de parcelas na aba `Parcelamentos`.
6. Priorizar a fila de inadimplência por contato/processo e usar a régua conforme `nextActionAt`.
7. Executar baixa manual para títulos pagos fora do webhook.
8. Rodar conciliação quando houver lote bancário.
9. Acompanhar auditoria do módulo em `/finance/audit`.

## Endpoints operacionais
- `GET /finance/categories`
- `GET /finance/entries`
- `POST /finance/entries`
- `PUT /finance/entries/:id/status`
- `POST /finance/entries/:id/settle`
- `POST /finance/billing/generate`
- `POST /finance/webhooks/mock`
- `POST /finance/webhooks/payment`
- `POST /finance/reconciliation/run`
- `POST /finance/collections/schedule`
- `GET /finance/delinquency/contacts`
- `POST /finance/installment-plans`
- `GET /finance/installment-plans`
- `GET /finance/reports/cashflow`
- `GET /finance/reports/aging`
- `GET /finance/audit`

## Jobs e scheduler
- Job: `backend/src/jobs/finance/finance-collection-dispatch.job.ts`
- Scheduler: `backend/src/shared/scheduler/finance-collections-schedule.ts`
- Registry: `backend/src/shared/scheduler/finance-scheduler-registry.ts`

Observação:
- O scheduler financeiro já está bootstrapado no startup, mas fica desligado por padrão.
- Para ativar, definir `FINANCE_SCHEDULER_ENABLED=1`.

## Troubleshooting
- Erro `FIN_CATEGORY_NOT_FOUND`: verificar se a categoria foi seedada em `FinanceCategory`.
- Erro `FIN_ENTRY_NOT_CHARGEABLE`: o lançamento não é `receivable` ou já está liquidado/cancelado.
- Erro `IDEMPOTENCY_CONFLICT`: a mesma chave foi reutilizada com payload diferente.
- Webhook sem baixa: conferir `chargeExternalId`, `providerEventId` e status `paid`.
- Webhook rejeitado com `401` ou `FIN_WEBHOOK_INVALID`: conferir segredo do provider em `FINANCE_PROVIDER_WEBHOOK_SECRET` e o header esperado.
- Provider externo falhando: conferir `FINANCE_PAYMENT_PROVIDER`, `FINANCE_PROVIDER_BASE_URL`, `FINANCE_PROVIDER_API_KEY` e `FINANCE_PROVIDER_CHARGE_PATH`.
- Conciliação parcial alta: revisar qualidade das referências (`referenceNumber`, tokens de descrição).

## Variáveis operacionais
- `FINANCE_SCHEDULER_ENABLED=1`: ativa dispatch automático da régua financeira.
- `FINANCE_PAYMENT_PROVIDER=mock|asaas|<provider-name>`: seleciona o provider de cobrança.
- `FINANCE_PROVIDER_BASE_URL`: URL base do gateway de cobrança.
- `FINANCE_PROVIDER_API_KEY`: token de autenticação do gateway.
- `FINANCE_PROVIDER_CHARGE_PATH`: path HTTP para criação da cobrança real. Padrão: `/payments`.
- `FINANCE_PROVIDER_WEBHOOK_SECRET`: segredo de validação do webhook. Para `asaas`, o backend espera o header `asaas-access-token`. Para provider genérico, usa `x-webhook-secret`.

## Rollback
- Código: remover o registrador `registerFinanceRoutes(...)` do `main.ts`.
- Scheduler: voltar `FINANCE_SCHEDULER_ENABLED=0` ou remover `bootstrapFinanceSchedulers()`.
- Dados: reverter migration `20260521120000_add_finance_epic_b` conforme política de banco do ambiente.
- Frontend: remover rota `/financeiro` e o link no sidebar se o backend for desativado.
