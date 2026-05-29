# Checklist incremental

## Sprint 1 - Backfill
- [ ] Inventário por entidade crítica com volume e risco.
- [ ] Execução dry-run por lote.
- [ ] Execução real com checkpoint e relatório de conflito.
- [ ] Verificação: `nullCompanyIdCount = 0` nas entidades alvo.

## Sprint 2 - Constraints e índices
- [ ] Índices por `companyId` em tabelas críticas.
- [ ] Constraints FK e unicidade por escopo de empresa.
- [ ] `NOT NULL` aplicado progressivamente sem downtime global.

## Sprint 3 - E2E e auditoria
- [ ] Tentativa cross-tenant bloqueada em leitura e escrita.
- [ ] Evento de auditoria completo por tentativa bloqueada.
- [ ] Cenários `read_only`, `suspended`, `cancelled` em runtime completo.

## Sprint 4 - Console plataforma
- [ ] Fluxo de ação sensível com motivo obrigatório.
- [ ] Trilhas de auditoria visíveis por trace/correlation id.
- [ ] Guardas explícitos tenant vs platform sem mistura de contexto.
