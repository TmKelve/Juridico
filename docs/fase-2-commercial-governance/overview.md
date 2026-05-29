# Fase 2 - Modelo Comercial e Governança

Objetivo: separar billing SaaS da operação jurídica do tenant e transformar status comercial em enforcement técnico de acesso.

Escopo entregue:
- Domínio `Plan`, `Subscription`, `SubscriptionTransition`.
- Cobrança SaaS `BillingInvoice`, `PaymentAttempt`, `BillingEvent`.
- Enforcement backend por `Company.status` com bypass de contexto plataforma.
- Ações administrativas com auditoria e motivo obrigatório.

Fora de escopo da fase:
- Console operacional completo de plataforma (permanece Fase 3).
