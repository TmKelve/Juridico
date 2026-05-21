# Runbook do Epic A

## Operação diária
- Jobs automáticos: `06:00`, `12:00`, `18:00`.
- Fontes mínimas: `cnj`, `cpf`, `diario`, `oab`.
- Cada job deve registrar início, fim, volumes, falhas e itens reprocessáveis.

## Como identificar falhas
- Verificar status dos jobs em `/triage/jobs` e trilha de auditoria.
- Procurar eventos `pipeline_failed`, `PUB_MATCH_AMBIGUOUS`, `PUB_AUTOMATION_DUPLICATE`.
- Conferir fila de reprocessamento/dead-letter antes de repetir ingestão manual.

## Como reprocessar com segurança
- Reprocessar apenas itens com chave de idempotência preservada.
- Reexecutar a partir do estágio falho, não do pipeline inteiro, quando possível.
- Confirmar que prazo/tarefa existentes foram verificados por `dedupeKey`.
- Para jobs já marcados como `failed` ou `partial_failure`, usar `POST /triage/jobs/:id/reprocess`.

## Checklist de incidente
- Confirmar fonte impactada.
- Confirmar janela horária e job afetado.
- Validar se houve falha de coleta, normalização, match, classificação ou automação.
- Auditar se houve efeito parcial em prazo/tarefa/timeline.
- Executar reprocessamento seguro.
- Registrar decisão e impacto em `docs/epic-a/changelog.md`.
