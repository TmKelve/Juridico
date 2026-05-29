# Fase 3 - Plano Executável

## Objetivo
Fechar os remanescentes estruturais das Fases 1/2: `companyId` global, constraints finais, E2E cross-tenant e console de plataforma.

## Ordem obrigatória
1. Backfill assistido por domínio.
2. Verificação de consistência por lote.
3. Índices/constraints por `companyId` com rollout zero-downtime.
4. E2E cross-tenant + auditoria ponta-a-ponta.
5. Evolução do console administrativo de plataforma.

## Regra de bloqueio
- Não avançar para constraint `NOT NULL` sem `nullCompanyIdCount = 0`.
- Não avançar para conclusão da fase sem E2E cross-tenant com evidência de bloqueio + trilha auditável.
