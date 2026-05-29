# Access Enforcement

Backend enforcement:
- `backend/src/platform-access/company-status-access-policy.ts`
- `backend/src/authz/company-status/company-status-authz-enforcer.ts`
- `backend/src/authz/guards/authz.guard.ts`

Regra de contexto:
- `accessContext=platform` bypassa bloqueios comerciais do tenant.
- `accessContext=tenant` sofre enforcement por status da empresa.

Importante: UI apenas comunica estado; bloqueio real está no backend.
