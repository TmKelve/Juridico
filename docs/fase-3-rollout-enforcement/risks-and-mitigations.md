# Riscos e Mitigações

## Risco 1 - Lock/latência em migração de índice
- Mitigação: índices concorrentes, janela controlada, rollback por etapa.

## Risco 2 - Backfill com vínculo ambíguo de company
- Mitigação: fila de conflitos + regra explícita por domínio + aprovação manual.

## Risco 3 - Regressão em rotas legadas
- Mitigação: camada adapter temporária + smoke de regressão por módulo.

## Risco 4 - Falsa sensação de isolamento
- Mitigação: prova obrigatória E2E cross-tenant com auditoria correlacionada.
