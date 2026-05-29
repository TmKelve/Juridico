# Phase Closure

## Itens fechados
- Modelo de `Plan`/`Subscription` e estados de assinatura.
- Billing SaaS separado do financeiro jurídico.
- Enforcement backend de `read_only` e bloqueio por `suspended/cancelled`.
- Ações administrativas de status com auditoria e motivo obrigatório.

## Itens parciais
- Política comercial fina de `past_due/grace_period` por módulo ainda pode ser refinada.

## Remanescentes críticos da Fase 1
1. Costura runtime completa `main.ts` com todos módulos de fundação: **parcial**.
2. Backfill real de `companyId` em agregados operacionais: **aberto (bloqueio técnico)**.
3. Índices/constraints finais por `companyId`: **aberto (bloqueio técnico)**.
4. E2E expandido de troca de tenant + trilha cross-tenant: **parcial**.

## Justificativas objetivas
- Sem backfill e constraints completos por `companyId`, enforcement comercial fica correto no nível de sessão/guard, mas ainda não está garantido em todos agregados legados.

## Pendências legítimas para Fase 3
- Console operacional de plataforma completo.
- Rollout zero-downtime final dos índices/constraints por `companyId` em todo domínio legado.
