# Auth and Session - Fase 1

## Login
No login, o backend resolve:
- identidade do usuario
- membership da company
- role efetiva
- status da company
- coerencia entre company do claim e memberships ativos (anti cross-tenant)

## Claims obrigatorias
- `companyId`
- `userType` (`tenant` ou `platform`)
- `role`
- `membershipId` (quando houver)

## Regras por status da company
- `active`: acesso normal.
- `grace_period`: acesso normal com marcacao para billing.
- `read_only`: leitura permitida; mutacoes operacionais negadas para tenant.
- `suspended`: login tenant bloqueado e operacoes negadas.
- `cancelled`: login e operacoes negados; apenas superficies de retencao/auditoria.

## Usuario de plataforma
- Nao recebe contexto operacional automaticamente.
- Precisa de regra explicita para atuar em contexto tenant.

## Resultado esperado de sessao
- Sem company valida: sessao operacional negada.
- Company `ACTIVE`: sessao operacional permitida.
- Company com status diferente de `ACTIVE`: sessao operacional negada.
