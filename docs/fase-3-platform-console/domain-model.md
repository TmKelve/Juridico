# Domain Model
- Company Admin: listagem, detalhe, activate/block/cancel/reactivate, summary.
- Membership Lifecycle: assignRole, deactivate, remove, resetAccess.
- Invitation Lifecycle: invite, accept, history (expiração/reenvio/invalidação documentados como evolução).
- Audit Model: `audit.event` com `companyId`, ator, ação, status, contexto e metadata.
