# QA

Cobertura mínima executada nesta fase:
- Unit: transições de assinatura e mapeamento assinatura->company.
- Unit: policy de acesso por status (`read_only`, `suspended`, `cancelled`).
- Integration leve: guard com enforcer e bypass de plataforma.
- Frontend: banner e superfície de read-only/suspensão.

Riscos residuais:
- E2E cross-tenant expandido ainda depende dos remanescentes estruturais da Fase 1.
