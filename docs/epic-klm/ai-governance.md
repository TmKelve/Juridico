# Governanca de IA

## Politicas obrigatorias
- Toda chamada registra `promptVersion`, `modelVersion`, `latencyMs`, `estimatedCostUsd`, `inputHash`, `outputHash` e `correlationId`.
- Toda acao sensivel permanece `human-in-the-loop`.
- Inputs com dados sensiveis devem aceitar mascaramento ou minimizacao por escopo.
- Budget e rate-limit devem ser configuraveis por papel, equipe e carteira.

## Guardrails minimos
- Bloquear resposta sem contexto suficiente.
- Bloquear recomendacao assertiva sem justificativa estruturada.
- Bloquear rascunho com ausencia de fatos minimos ou conflito evidente com o processo.
- Emitir fallback deterministico quando provider/modelo falhar.

## Auditoria obrigatoria
- `executionId`
- alvo (`publication|triage_item|document|template|process|client`)
- `promptVersion`
- `modelVersion`
- `actorDecision`
- `startedAt`, `completedAt`, `latencyMs`
- `tokenUsage`, `estimatedCostUsd`
- `status: success|fallback|blocked|error`

## Operacao e custo
- Limites diarios por papel e por equipe.
- Observabilidade de latencia, erro, replay e custo medio por comando.
- Reprocessamento permitido apenas com novo `correlationId` e justificativa auditavel.

## Fallback
1. Detectar indisponibilidade, timeout, budget excedido ou bloqueio de guardrail.
2. Registrar `ai.audit.event` com `actionTaken=fallback`.
3. Retornar payload seguro:
   - resumo: extracao deterministica curta
   - recomendacao: `requiresHumanApproval=true`
   - rascunho: esqueleto/base template
   - checklist: lista padrao por categoria
