# Contratos - Fase 1

Contrato soberano:
- `contracts/foundation-multitenant.contract.json`

Comandos definidos:
- `company.create`
- `company.updateStatus`
- `company.membership.create`
- `company.membership.updateRole`
- `session.resolveCompanyContext`
- `auth.login`
- `auth.access.evaluate`
- `resource.companyScope.validate`
- `audit.event`

Observacoes:
- Regras de idempotencia estao declaradas nos comandos mutaveis.
- Contexto de company exigido esta explicitado por comando.
- Erros esperados definidos por fluxo para suportar enforcement e observabilidade.

Rastreabilidade minima de validacao:
- `auth.login` + `session.resolveCompanyContext`: garantem claims de sessao e contexto tenant valido.
- `resource.companyScope.validate`: valida isolamento entre empresas no filtro de recursos.
- `auth.access.evaluate`: preserva deny-by-default para permissoes sensiveis sem grant explicito.
