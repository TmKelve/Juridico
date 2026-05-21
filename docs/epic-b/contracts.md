# Contratos do Epic B

Fonte soberana: `contracts/epic-b-finance.contract.json`

## Contratos mínimos
- `finance.entry.create`
- `finance.entry.updateStatus`
- `finance.billing.generate`
- `finance.billing.webhookUpdate`
- `finance.reconciliation.run`
- `finance.collections.schedule`
- `finance.report.cashflow`
- `finance.report.aging`
- `finance.audit.event`

## Exemplo - `finance.entry.create`
```json
{
  "type": "receivable",
  "description": "Parcela de honorarios",
  "amountCents": 125000,
  "currency": "BRL",
  "dueDate": "2026-06-10",
  "clientId": 7,
  "processId": 14,
  "categoryCode": "honorarios",
  "responsibleUserId": 3,
  "notes": "Entrada inicial",
  "idempotencyKey": "entry-001"
}
```

## Exemplo - `finance.billing.generate`
```json
{
  "entryId": 41,
  "method": "pix",
  "expiresAt": "2026-06-10T23:59:59.000Z",
  "recipientEmail": "financeiro@cliente.com",
  "recipientPhone": "5511999999999",
  "idempotencyKey": "charge:41:pix:2026-06"
}
```

## Exemplo - `finance.billing.webhookUpdate`
```json
{
  "provider": "mock",
  "providerEventId": "evt_mock_paid_88",
  "chargeExternalId": "mock_charge_88_payment_link_123",
  "status": "paid",
  "paidAt": "2026-05-22T14:15:00.000Z",
  "amountPaidCents": 99000,
  "idempotencyKey": "evt_mock_paid_88"
}
```

## Exemplo - `finance.reconciliation.run`
```json
{
  "referenceDate": "2026-05-21",
  "lines": [
    {
      "externalId": "line-1",
      "occurredAt": "2026-05-21T09:00:00.000Z",
      "amountCents": 15000,
      "description": "Credito INV-001 ACME"
    }
  ],
  "idempotencyKey": "recon-run-001"
}
```

## Erros relevantes
- `FIN_ENTRY_INVALID`
- `FIN_ENTRY_NOT_FOUND`
- `FIN_ENTRY_NOT_CHARGEABLE`
- `FIN_STATUS_TRANSITION_INVALID`
- `FIN_CATEGORY_NOT_FOUND`
- `FIN_CLIENT_NOT_FOUND`
- `FIN_PROCESS_NOT_FOUND`
- `FIN_CHARGE_NOT_FOUND`
- `FIN_RECONCILIATION_INVALID`
- `FIN_COLLECTION_INVALID`
- `IDEMPOTENCY_CONFLICT`

## Regras de compatibilidade
- Rotas e contratos existentes não foram removidos.
- O Epic B adiciona superfície nova sob `/finance/*`.
- Idempotência usa `FinanceIdempotencyRequest` por `scope + key`.
