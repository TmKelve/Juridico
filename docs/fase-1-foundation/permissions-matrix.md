# Permissions Matrix - Fase 1

## Perfis tenant
- `company_admin`
- `manager`
- `lawyer`
- `assistant`
- `company_finance`

## Perfis plataforma
- `platform_admin`
- `platform_billing`
- `platform_support`

## Regras de separacao
- Permissoes tenant exigem `companyId` resolvido.
- Permissoes de plataforma nao herdam escopo tenant automaticamente.
- Troca tenant<->platform exige regra explicita de contexto.

## Matriz inicial (resumo)
- `company_admin`: admin total no proprio tenant.
- `manager`: gestao operacional sem funcoes de billing da plataforma.
- `lawyer`: operacao juridica e leitura financeira restrita.
- `assistant`: operacao assistida sem administracao global.
- `company_finance`: operacao financeira do tenant.
- `platform_admin`: governanca global da plataforma.
- `platform_billing`: billing/cobranca cross-tenant sem operacao juridica.
- `platform_support`: suporte com escopo restrito e auditavel.
