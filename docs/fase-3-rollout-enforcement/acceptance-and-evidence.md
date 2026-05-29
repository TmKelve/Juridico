# Critérios de aceite e evidências

## Critérios de aceite
1. Nenhum agregado crítico com `companyId` nulo.
2. Bloqueio cross-tenant efetivo em leitura e escrita.
3. Toda negação cross-tenant com auditoria correlacionada.
4. Constraints finais aplicadas sem indisponibilidade global.
5. Console de plataforma operando com motivo obrigatório em ações sensíveis.

## Evidências mínimas
- Relatório de backfill por lote (`processedRows`, `failedRows`, `conflicts`).
- Snapshot pré/pós de contagem `nullCompanyIdCount`.
- Resultados de testes integração + E2E cross-tenant.
- Logs/auditoria com `traceId` por ação sensível.
- Changelog técnico da fase com estratégia de rollback.
