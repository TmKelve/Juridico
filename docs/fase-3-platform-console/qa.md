# QA
Executado:
- backend: `platform-company-admin.*`, `platform-membership.*`, `platform-invitations.*`, `platform-audit.*`
- frontend smoke: `frontend/platform-admin.smoke.test.ts`
Riscos residuais:
- persistência dedicada de convite ainda usando trilha em `billingEvent`.
- integração de navegação global do App pode exigir ajustes UX adicionais.
