# Domain Model

## Problema corrigido

Antes do rework, o produto tratava `captura`, `evento interpretado`, `publicação consolidada` e `ação derivada` como se fossem a mesma coisa. Isso gerava ambiguidade operacional:

- o CRM mostrava uma ação recomendada como se sua origem estivesse sempre em `Publicações`;
- a tela de Publicações não deixava claro quando o usuário estava olhando uma evidência bruta versus uma publicação consolidada;
- a Triagem não expunha de forma consistente se a recomendação veio de um sinal ainda não consolidado;
- a auditoria não conectava ponta a ponta a cadeia `captura -> evento -> triagem -> CRM/prazo/tarefa`.

## Entidades

### 1. Captura

Representa o sinal bruto coletado da fonte.

Exemplos:

- CPF encontrado no diário
- OAB encontrada
- número de processo encontrado
- nome encontrado

Campos semânticos centrais:

- `correlationId`
- `sourceType`
- `sourceReference`
- `capturedAt`
- `occurredAt`
- `evidenceText`
- `normalizedText`
- `pipelineStatus`
- `consolidationStatus`

### 2. Evento consolidado

Representa a interpretação/normalização da captura. Ainda não é, por definição, uma publicação operacional disponível na lista principal.

Campos centrais:

- `captureId`
- `publicationId` opcional
- `correlationId`
- `originStage = normalizado|consolidado`
- `title`
- `summary`
- `fullText`
- `riskLevel`
- `requiresAction`

### 3. Publicação consolidada

Representa a publicação operacional pronta para a área principal de Publicações.

Campos centrais:

- `publicationId`
- `correlationId`
- `sourceType`
- `sourceReference`
- `originStage = consolidado`
- `consolidationStatus = consolidado`
- `summary`
- `publishedAt`

### 4. Ação derivada

Representa a saída operacional gerada a partir da origem rastreada.

Tipos suportados:

- `triage`
- `crm_lead`
- `crm_opportunity`
- `deadline`
- `task`

Campos centrais:

- `entityType`
- `entityId`
- `correlationId`
- `sourceType`
- `sourceReference`
- `originStage`
- `status`

## Pipeline

Estados obrigatórios do pipeline expostos na modelagem:

- `capturado`
- `normalizado`
- `consolidado`
- `triado`
- `gerou_crm`
- `gerou_prazo`
- `gerou_tarefa`
- `descartado`
- `falhou`
- `reprocessado`

Regras práticas:

- `capturado`: existe apenas sinal bruto.
- `normalizado`: já existe evento interpretado.
- `consolidado`: já existe publicação operacional.
- `triado`: já existe item de triagem vinculado.
- `gerou_crm`: já gerou lead/oportunidade.
- `gerou_prazo`: já gerou prazo.
- `gerou_tarefa`: já gerou tarefa.
- `descartado`: encerrado sem continuidade operacional.
- `falhou`: houve erro de pipeline.
- `reprocessado`: houve replay seguro.

## Chaves de rastreabilidade

Toda a cadeia deve carregar:

- `correlationId`
- `sourceType`
- `sourceReference`
- `originStage`
- timestamps relevantes por etapa

O `correlationId` é a chave transversal da jornada. Ele liga:

- captura
- evento normalizado
- publicação consolidada
- item de triagem
- CRM
- prazo
- tarefa
- timeline/auditoria

## Consolidação

Estados de consolidação expostos:

- `nao_consolidado`
- `aguardando_consolidacao`
- `consolidado`
- `descartado`
- `falhou`

Leitura operacional:

- CRM pode nascer com `originKind = capture` e `consolidationStatus = aguardando_consolidacao`.
- A área de Publicações mostra a publicação principal apenas quando o estado é `consolidado`.
- A aba `Capturas/Sinais` existe justamente para os casos ainda não consolidados.

## UX resultante

### CRM

- não presume mais que toda origem é uma publicação;
- diferencia `captura` de `publicação consolidada`;
- expõe CTA para evidência e timeline;
- mostra `pipelineStatus` e `consolidationStatus`.

### Publicações

- separa `Publicações` de `Capturas/Sinais`;
- permite localizar CPF/nome/processo nas capturas;
- mostra ações derivadas e correlação.

### Triagem

- deixa claro se o item veio de captura ou publicação;
- exibe motivo, estágio e desdobramentos;
- conecta com timeline transversal.
