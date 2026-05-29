# Domain Model

Entidades:
- `Company` (status operacional)
- `Plan`
- `Subscription` (vínculo Company<->Plan)
- `SubscriptionTransition` (histórico + idempotência)
- `BillingInvoice`
- `PaymentAttempt`
- `BillingEvent`

Separação de domínio:
- Billing SaaS: `platform-*`, `plans`, `subscription`, `company-status`.
- Financeiro jurídico do tenant: `backend/src/finance/*` (inalterado como domínio).
