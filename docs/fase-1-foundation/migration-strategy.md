# Migration Strategy - Fase 1

## Objetivo
Migrar base legada para escopo por `companyId` sem quebrar rotas existentes.

## Estrategia
1. Criar `Company` e `CompanyMembership`.
2. Introduzir `companyId` nas entidades prioritarias como aditivo.
3. Backfill por lotes:
- criar `default company` controlada para dados legados
- associar usuarios por regra documentada
- popular `companyId` em agregados operacionais
4. Ativar enforcement progressivo:
- fase compatibilidade: logs/warnings
- fase bloqueio: negar cross-tenant
5. Tornar `companyId` obrigatorio nas operacoes criticas apos backfill.

## Dados legados
- Nenhuma inferencia por nome de empresa ou frontend.
- Backfill com trilha auditavel por lote.

## Rollout gradual
- Deploy 1: schema + modelos + contrato.
- Deploy 2: request context + guards.
- Deploy 3: bloqueio estrito cross-tenant.
