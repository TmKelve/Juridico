# QA do Epic B

## Cenários cobertos
- Criação de lançamento com auditoria e replay por idempotência.
- Baixa manual com transição válida e rejeição de transição inconsistente.
- Geração de cobrança Pix mock com status rastreável.
- Webhook financeiro com baixa automática.
- Conciliação com `matched`, `partial` e `unmatched`.
- Rejeição de linhas duplicadas na conciliação.
- Aging `0-30`, `31-60`, `61-90`, `90+`.
- Indicadores de inadimplência.
- Fila operacional de inadimplência por cliente/processo/contato.
- Criação de plano de parcelamento com geração automática das parcelas.
- Criação de parcelamento pela UI com detalhe `1/N ... N/N` no navegador.
- Relatório de fluxo de caixa.
- Régua de cobrança idempotente.
- Job financeiro com retry e sem duplicar tentativa.
- Scheduler financeiro isolado.
- Provider HTTP real configurável com normalização de webhook.

## Evidências executadas
### Backend build
```powershell
npm run build
```

### Testes financeiros backend
```powershell
@(
  'src/finance/ledger/finance-entry.service.test.cjs',
  'src/finance/billing/billing.service.test.cjs',
  'src/finance/webhooks/finance-webhook.service.test.cjs',
  'src/finance/reconciliation/reconciliation.service.test.cjs',
  'src/finance/delinquency/aging.service.test.cjs',
  'src/finance/delinquency/delinquency-contacts.service.test.cjs',
  'src/finance/installments/finance-installment-plan.service.test.cjs',
  'src/finance/payment-links/http-payment-provider.test.cjs',
  'src/finance/reports/finance-report.service.test.cjs',
  'src/finance/collections/finance-collections.service.test.cjs',
  'src/jobs/finance/finance-collection-dispatch.job.test.cjs',
  'src/shared/scheduler/finance-collections-schedule.test.cjs'
) | ForEach-Object { node --test $_ }
```

### Frontend build
```powershell
npm run build
```

### Smoke configurado
```powershell
npm run test:smoke
```

### Runtime financeiro validado
```powershell
npm run prisma:generate
npm run prisma:migrate:deploy
```

Validações executadas com login `FIN`:
- `POST /finance/installment-plans`
- `GET /finance/installment-plans`
- `GET /finance/delinquency/contacts`
- `GET /finance/delinquency/contacts` com `lastCollectionChannel=email`, `lastCollectionOutcome=no_response`
- `npx playwright test financeiro.smoke.test.ts --reporter=list`

## Gaps atuais
- O provider real já está integrado por adapter HTTP configurável, mas não foi validado contra um gateway externo com credenciais reais nesta rodada.
- A fila de inadimplência runtime pode retornar `0` itens quando o banco validado não possui títulos vencidos reais.
