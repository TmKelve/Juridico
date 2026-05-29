# Fase 1 - Fundacao SaaS Multiempresa

## Objetivo
Estabelecer a fronteira estrutural de empresa (`Company`) como tenant real do Lexora, com isolamento de dados por `companyId`, sessao multiempresa e separacao entre usuarios de tenant e de plataforma.

## Escopo
- Epic 1: dominio `Company` e `CompanyMembership`.
- Epic 2: isolamento de dados por `companyId` em entidades operacionais prioritarias.
- Epic 3: login/sessao com contexto da empresa e status.
- Epic 4: RBAC separado entre tenant e plataforma.

## Arquitetura geral
- Tenant estrutural: `Company`.
- Organizacao interna: `Team` e `Portfolio` (nunca tenant).
- Fluxo de autorizacao: identidade -> membership -> status da company -> permissao -> escopo do recurso.
- Enforcement de isolamento: contexto de request + helpers de escopo em camada de servico/repositorio.
