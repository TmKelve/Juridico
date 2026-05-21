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
- Relatório de fluxo de caixa.
- Régua de cobrança idempotente.
- Job financeiro com retry e sem duplicar tentativa.
- Scheduler financeiro isolado.

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

## Gaps atuais
- Não foi executado smoke E2E no navegador para `/financeiro` nesta rodada.
- Não foi executado fluxo real com banco conectado e migration aplicada.
- Provider de cobrança permanece mock, sem gateway externo.
