# Modelo de Seguranca do Epic IJ

## Principios
- Deny-by-default para toda acao sensivel de tarefa, atendimento, equipe e permissao.
- Escopo explicito por decisao: `own`, `team`, `portfolio`, `global` ou `denied`.
- Auditoria obrigatoria para mutacoes operacionais, redistribuicoes e conversoes.
- Compatibilidade aditiva: o frontend atual pode receber chaves simples de permissao, mas o backend deve evoluir para uma decisao mais rica sem quebrar o cliente.

## Decisoes minimas esperadas
- `task:create`
- `task:update`
- `task:reassign`
- `task:complete`
- `attendance:create`
- `attendance:update`
- `attendance:convert`
- `users:view`
- `users:manage`
- `permissions:view`
- `permissions:manage`

## Mapeamento operacional esperado
- `ADV`: cria e conclui tarefa no proprio escopo; pode operar atendimentos da propria carteira; nao administra usuarios.
- `ATD`: registra e atualiza atendimento; pode acionar conversao operacional conforme policy; nao administra permissoes.
- `ADM`: visualiza e administra usuarios, equipe e matriz de permissao; pode atuar com escopo global.
- `FIN`: fora do foco do epic IJ; qualquer permissao herdada deve continuar isolada do modulo administrativo.

## Contrato visual atual de bloqueio
- A rota `/usuarios` so deve abrir para `ADM`.
- Para perfis nao autorizados, a aplicacao redireciona para `/` e nao expoe a tela administrativa.
- O smoke `frontend/epic-ij.smoke.test.ts` valida esse bloqueio como contrato minimo ate a chegada de uma resposta granular de authz.

## Gaps de endurecimento ainda abertos
- O frontend ainda nao recebe `authzDecision` estruturado por acao.
- Nao ha tela ativa consumindo matriz detalhada de equipe/permissoes porque a costura da rota compartilhada continua no orquestrador.
- A conversao `attendance -> task` ainda carece de mutacao dedicada com resposta auditavel.

## Evidencias que o backend deve expor quando a costura terminar
- decisao com `allowed`, `permissionKey`, `scope`, `reason`, `sensitive`, `requiresAudit`
- evento de auditoria para conversao de atendimento
- evento de auditoria para reatribuicao de tarefa
- negacao coerente em 403 para acoes sensiveis fora de escopo
