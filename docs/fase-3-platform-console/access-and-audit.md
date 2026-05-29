# Access and Audit
Autorização: rotas validam `userType=platform` e papel específico.
Ações sensíveis: exigem motivo (`block`, `cancel`, `reactivate`) e geram `audit.event`.
Auditoria permite reconstruir ator, empresa, ação, horário, motivo/contexto.
