# Epic B - Financeiro Real

## Objetivo
Entregar um módulo financeiro operacional para Lexora com contas a receber/pagar, cobrança rastreável, baixa manual/automática, conciliação, aging, régua de cobrança, relatórios e auditoria.

## Arquitetura
- `backend/src/finance/ledger/*`: core de lançamentos financeiros.
- `backend/src/finance/accounts/*`: repositório de entradas financeiras.
- `backend/src/finance/categories/*`: categorias financeiras.
- `backend/src/finance/billing/*`: geração de cobrança.
- `backend/src/finance/payment-links/*`: provider mock operacional para Pix/boleto/link.
- `backend/src/finance/webhooks/*`: confirmação de pagamento e baixa automática.
- `backend/src/finance/reconciliation/*`: conciliação bancária.
- `backend/src/finance/delinquency/*`: aging e inadimplência.
- `backend/src/finance/installments/*`: planos de parcelamento e geração automática de parcelas.
- `backend/src/finance/reports/*`: fluxo de caixa e relatório de aging.
- `backend/src/finance/collections/*`: régua de cobrança.
- `backend/src/jobs/finance/*`: dispatch operacional da régua.
- `backend/src/shared/scheduler/finance-*`: scheduler financeiro isolado.
- `backend/src/finance/http/register-finance-routes.ts`: adapter HTTP do Epic B.
- `frontend/src/Financeiro.tsx`: tela operacional do financeiro.

## Fluxo ponta a ponta
1. Usuário cria um lançamento em `/finance/entries` ou um plano parcelado em `/finance/installment-plans`.
2. O core financeiro valida categoria, consistência e idempotência.
3. Quando o fluxo é parcelado, o backend gera parcelas-filhas em `FinanceEntry`, todas vinculadas ao cliente e ao processo quando informados.
4. O financeiro gera cobrança em `/finance/billing/generate`.
5. O provider mock emite `externalId`, `paymentUrl`, `pixCode` ou `boletoBarcode`.
6. O webhook `/finance/webhooks/mock` atualiza a cobrança e baixa automaticamente o lançamento quando o status vira `paid`.
7. A régua `/finance/collections/schedule` agenda cadência de cobrança e o job `FinanceCollectionDispatchJob` dispara lembretes.
8. A conciliação `/finance/reconciliation/run` classifica linhas bancárias em `matched`, `partial` e `unmatched`.
9. A visão `/finance/delinquency/contacts` agrupa contatos inadimplentes por cliente/processo para acompanhamento operacional.
10. Os relatórios `/finance/reports/cashflow` e `/finance/reports/aging` consolidam fluxo e inadimplência.
11. Toda ação relevante grava auditoria em `FinanceAuditEvent`.

## Persistência
- `FinanceCategory`
- `FinanceEntry`
- `FinanceCharge`
- `FinanceChargeEvent`
- `FinanceInstallmentPlan`
- `FinanceReconciliationRun`
- `FinanceReconciliationMatch`
- `FinanceCollectionSchedule`
- `FinanceCollectionAttempt`
- `FinanceAuditEvent`
- `FinanceIdempotencyRequest`

## Permissões
- `finance:view`
- `finance:entry`
- `finance:billing`
- `finance:settlement`
- `finance:reconciliation`
- `finance:export`

## Estado atual
- Provider de cobrança: `mock`.
- Webhook operacional: `POST /finance/webhooks/mock`.
- Scheduler financeiro: isolado do scheduler de publicações e bootstrapado por flag `FINANCE_SCHEDULER_ENABLED=1`.
