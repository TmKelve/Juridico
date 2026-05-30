---
tipo: kb
status: current
projeto: lexora
fase: inventario-tecnico
area: ia-agentes-automacoes
data: 2026-05-30
fonte: claude-code
baseado_em:
  - '[[00_START_HERE]]'
  - '[[KB_002_GOVERNANCA_DOCUMENTAL_OFICIAL_CURRENT_2026-05-29]]'
  - '[[KB_003A_ESTRUTURA_GERAL_E_CONFIGURACOES_CURRENT_2026-05-29]]'
  - '[[KB_003B_FRONTEND_ESTADO_ATUAL_CURRENT_2026-05-29]]'
  - '[[KB_003C_BACKEND_E_APIS_ESTADO_ATUAL_CURRENT_2026-05-30]]'
  - '[[KB_003D_DADOS_PRISMA_E_CONTRATOS_CURRENT_2026-05-30]]'
  - '[[KB_003E_TESTES_QA_E_EVIDENCIAS_CURRENT_2026-05-30]]'
  - '[[BACKLOG_GERAL_LEXORA_CURRENT]]'
escopo: ia-agentes-automacoes
vault_oficial: 'C:\Users\tomke\app Juridico\!_lexora-memory-docs'
autoridade: inventario-tecnico
---

# KB-003F — IA, Agentes e Automações

> [!important] Fonte primária: leitura direta de arquivos
> Este documento foi produzido pela leitura direta dos arquivos reais do backend, frontend, `.codex/` e `docs/skills/`. Fatos confirmados e inferências são distinguidos ao longo de todo o texto. Nenhum código foi alterado, nenhum teste foi executado e nenhum arquivo foi modificado.

---

## 1. Resumo Executivo

O projeto Lexora possui **duas camadas distintas de "inteligência"**:

**Camada 1 — IA do produto (runtime)**: Módulo `backend/src/ai/` com serviços de sumarização, recomendação, drafting de documentos, sugestão de checklist e triagem inteligente. A arquitetura usa um padrão port/adapter com fallback determinístico: por padrão, **nenhum LLM externo está ativo** — tudo roda via `DeterministicAiProvider`. Um provider remoto (`RemoteAiProvider`) pode ser ativado via variável de ambiente `AI_PROVIDER_URL`, mas essa variável **não está documentada no `.env.example`**. O mesmo padrão se aplica à triagem via `TRIAGE_AI_URL`.

**Camada 2 — Agentes de desenvolvimento (Codex)**: Pasta `.codex/` com 10+ agentes OpenAI (GPT-5.4), skills e automações de workflow. Esses agentes são usados durante o desenvolvimento pelo Codex CLI. Seus arquivos `.toml` referenciam `docs-juridico` como documentação canônica — **fonte desatualizada** desde a migração para o vault `!_lexora-memory-docs`.

### Estado atual confirmado

| Componente | Status | LLM externo? | Persiste em banco? |
|---|---|---|---|
| `DeterministicAiProvider` | **Ativo em produção** (fallback) | Não | Não (in-memory) |
| `RemoteAiProvider` | Inativo sem `AI_PROVIDER_URL` | Sim (qualquer HTTP) | Não |
| `PublicationSummarizerService` | Ativo — chama provider | Depende do provider | Não (in-memory) |
| `TriageRecommendationService` | Ativo — chama provider | Depende do provider | Não (in-memory) |
| `DocumentDraftingService` | Ativo — determinístico puro | Não | Não |
| `ChecklistSuggestionService` | Ativo — regras determinísticas | Não | Não |
| `InMemoryAiAuditService` | Ativo — audit em memória | Não | **Não** (perde no restart) |
| `AiExecution` (Prisma) | Existe no schema | — | Sim (mas não usado) |
| `AiBudgetLedger` (Prisma) | Existe no schema | — | Sim (mas não usado) |
| Triagem AI (`triage-ai.provider.ts`) | Ativo — determinístico por padrão | Depende de `TRIAGE_AI_URL` | Não |
| DataJud CNJ (`datajud.provider.ts`) | Ativo — integração externa real | Não (lookup) | Não (resposta em memória) |
| Agentes Codex (`.codex/`) | Inativos em runtime — só dev | GPT-5.4 (OpenAI) | Não |

### Principais riscos

1. **Audit IA em memória** — `InMemoryAiAuditService` perde todos os registros a cada restart. `AiExecution` no Prisma existe mas não é usado.
2. **Idempotência em memória** — `InMemoryAiIdempotencyAdapter` perde estado no restart — risco de duplicação de execuções.
3. **Sem LLM configurado por padrão** — toda IA do produto é determinística até `AI_PROVIDER_URL` ser configurada; isso pode não ser evidente para o usuário da aplicação.
4. **Env vars de IA não documentadas** — `AI_PROVIDER_URL`, `TRIAGE_AI_URL` e relacionadas estão ausentes do `.env.example`.
5. **Agentes Codex com documentação desatualizada** — referenciam `docs-juridico` como canon em vez de `!_lexora-memory-docs`.
6. **AI routes sem contexto multi-tenant** — `register-ai-routes.ts` usa `UserToken` simples (sub, role, email) sem `companyId` — chamadas de IA não têm contexto de empresa.
7. **DATAJUD_API_KEY hardcoded** — chave demo do CNJ documentada no `.env.example`; em produção deve ser substituída.

---

## 2. Escopo e Fora do Escopo

### Analisado nesta etapa

- `backend/src/ai/` — todos os arquivos: core, summarization, recommendation, drafting, checklist, audit, http
- `backend/src/triage-ai.provider.ts`
- `backend/src/triage/` — decision-engine, automation, explainability, queue, sla, core, http, decision
- `backend/src/datajud.provider.ts` (parcial)
- `backend/.env.example` — variáveis de ambiente
- `backend/src/ai/http/register-ai-routes.ts` (completo)
- `backend/src/main.ts` — grep para `registerAiRoutes`
- `.codex/config.toml`
- `.codex/agents/*.toml` — listagem + leitura de `principal-orchestrator.toml`, `backend-integration-agent.toml`
- `.codex/skills/` — listagem completa
- `.codex/skill-automations/` — listagem completa
- `docs/skills/` — listagem completa
- `frontend/src/api.ts` — grep por tipos/chamadas de IA
- Testes em `backend/src/ai/**/*.test.cjs` (listagem; arquivos lidos via KB-003E)
- Documentos obrigatórios: KB-003A, KB-003B, KB-003C, KB-003D, KB-003E, BACKLOG_GERAL_LEXORA_CURRENT

### Fora do escopo desta etapa

- Leitura completa dos agentes `.toml` restantes
- Leitura completa do `docs/skills/` (apenas listagem)
- Validação de endpoint em runtime
- Execução de testes
- Análise da API DataJud além do primeiro nível
- Análise completa de `backend/src/publications/` (pipeline de ingestão)
- Atualização do backlog

---

## 3. Escopo Geral

Esta etapa cobre:
- IA funcional do produto (runtime no backend)
- Agentes e skills de desenvolvimento (Codex)
- Automações de triagem e publicações
- Integrações externas automatizadas (DataJud)
- Auditoria e budget de IA
- Riscos de segurança, privacidade e custo
- Testes relacionados a IA

---

## 4. Inventário de Módulos e Arquivos de IA

### 4.1 Backend — Módulo `backend/src/ai/`

| Arquivo | Tipo | Papel | Implementação | Risco |
|---|---|---|---|---|
| `core/ai-provider.port.ts` | Port + Implementação | Define interface `AiProvider` e implementa `DeterministicAiProvider` | Real — determinístico | Fallback sempre ativo; pode confundir com LLM real |
| `core/ai-provider.router.ts` | Factory | `createAiProviderFromEnv()` — escolhe entre Remote e Deterministic por env var | Real | `AI_PROVIDER_URL` ausente do `.env.example` |
| `core/ai-request.types.ts` | Tipos | Contratos de request/result para summary e recommendation | Contrato | — |
| `core/ai-idempotency.adapter.ts` | Adapter | Deduplicação in-memory por correlation ID | **In-memory** | Perde estado no restart |
| `summarization/publication-summarizer.service.ts` | Service | Wraps `AiProvider.summarize()` com idempotência | Real | Depende do provider configurado |
| `recommendation/triage-recommendation.service.ts` | Service | Wraps `AiProvider.recommend()` com idempotência | Real | Depende do provider configurado |
| `recommendation/triage-recommendation.adapter.ts` | Adapter | Bridge entre triagem legacy e `TriageRecommendationService` | Real | Extrai riskLevel por regex no texto |
| `drafting/document-drafting.service.ts` | Service | Gera rascunho Markdown a partir de template + payload | **Determinístico** — sem LLM | Rascunho é template genérico; não usa conteúdo real do template |
| `drafting/template-document-generator.adapter.ts` | Adapter | Conecta `DocumentArtifactGenerator` ao `DocumentDraftingService` | Real | — |
| `checklist/checklist-suggestion.service.ts` | Service | Avalia checklist de documentos procedimentais | **Determinístico** — baseado em regras | Sem LLM |
| `checklist/document-checklist-suggestion.adapter.ts` | Adapter | Adapter de sugestão de checklist para documentos | Real | — |
| `audit/ai-audit.service.ts` | Service | Registra eventos de auditoria **in-memory** | **In-memory** | **Não persiste no banco** |
| `audit/ai-audit.types.ts` | Tipos | Contratos de auditoria IA | Contrato | — |
| `http/register-ai-routes.ts` | HTTP router | Registra `POST /ai/summary`, `POST /ai/recommendation`, `GET /ai/audit` | Real | Usa `UserToken` simples (sem companyId) |

### 4.2 Triagem Inteligente

| Arquivo | Tipo | Papel | Implementação | Risco |
|---|---|---|---|---|
| `triage-ai.provider.ts` | Provider | `classifyTriageItem()` — classifica itens de triagem | Real + fallback determinístico | `TRIAGE_AI_URL` ausente do `.env.example` |
| `triage/decision-engine.ts` | Engine | Planeja decisões de triagem + automações | Determinístico | — |
| `triage/decision/decision-engine-adapter.ts` | Adapter | Adapta o engine para uso em HTTP/serviços | Real | — |
| `triage/decision/assisted-triage-decision.ts` | Service | Triagem assistida com decisão humana | Real | — |
| `triage/automation/triage-automation-planner.ts` | Planner | Planeja comandos de automação pós-triagem | Determinístico | — |
| `triage/automation/post-triage-automation-runner.ts` | Runner | Executa comandos de automação planejados | Real | Falhas são logadas mas não persistidas |
| `triage/explainability/triage-explanation-builder.ts` | Builder | Gera explicações legíveis de decisões de triagem | Determinístico | — |
| `triage/queue/triage-item-prioritize.ts` | Queue | Prioriza itens na fila de triagem | Determinístico | — |
| `triage/queue/triage-prioritization.ts` | Queue | Algoritmo de priorização da fila | Determinístico | — |
| `triage/queue/triage-unified-queue.ts` | Queue | Fila unificada de triagem | Real | — |
| `triage/sla/triage-sla.ts` | SLA | Calcula SLA de triagem | Determinístico | — |
| `triage/core/triage-operational-state.ts` | Core | Estado operacional do item de triagem | Real | — |
| `triage/core/triage-operational-model.ts` | Model | Modelo de dados operacional de triagem | Tipos | — |
| `triage/http/triage-command-helpers.ts` | HTTP | Helpers de comandos HTTP de triagem | Real | — |

### 4.3 Integração External Automatizada

| Arquivo | Tipo | Papel | Implementação | Risco |
|---|---|---|---|---|
| `datajud.provider.ts` | Provider | Lookup de processo no CNJ via DataJud API | **Real — HTTP externo** | Chave demo hardcoded; limites de API |
| `process-lookup.provider.ts` | Provider | Interface de lookup de processo | Tipo/interface | — |

---

## 5. Serviços, Providers e Adapters

### 5.1 Arquitetura do AI Provider

```
createAiProviderFromEnv()
  ├── AI_PROVIDER_URL não definida → DeterministicAiProvider  [PADRÃO ATIVO]
  └── AI_PROVIDER_URL definida    → RemoteAiProvider
        └── fallback interno: DeterministicAiProvider
```

**`DeterministicAiProvider`** (sempre ativo como default):
- `summarize()`: extrai até 3 frases do texto, monta título padrão ("Resumo de publicacao"), retorna `requiresReview: true`
- `recommend()`: aplica regras simples baseadas em `riskLevel`, `requiresAction`, `hasExistingClient`, `processId`
- Simula custo com cálculo `(tokens * 0.000002)` — puramente estético, não acessa LLM real
- Nome do provider: `"deterministic-fallback"` — identificável nos logs de auditoria

**`RemoteAiProvider`** (inativo por padrão):
- Faz HTTP POST para `AI_PROVIDER_URL/summary` e `AI_PROVIDER_URL/recommendation`
- Suporta `Authorization: Bearer` ou header customizado via `AI_PROVIDER_AUTH_HEADER`
- Fallback automático para `DeterministicAiProvider` em caso de falha HTTP

### 5.2 Triage AI Provider

```
classifyTriageItem(input)
  ├── TRIAGE_AI_URL definida → HTTP POST para TRIAGE_AI_URL
  │     └── falha → adaptTriageRecommendation(input)
  │           └── TriageRecommendationService(createAiProviderFromEnv())
  │                 └── DeterministicAiProvider.recommend()  [se AI_PROVIDER_URL não definida]
  └── TRIAGE_AI_URL não definida → adaptTriageRecommendation(input)
        └── buildFallbackClassification(input)
              └── matchPublicationDeterministically() + toLegacyTriageClassification()
```

**Ponto importante**: A triagem tem **dois níveis de fallback** independentes — TRIAGE_AI_URL para a triagem especializda e AI_PROVIDER_URL para o provedor geral. Em produção sem variáveis configuradas, toda classificação é determinística.

### 5.3 Idempotência e Deduplicação

- `InMemoryAiIdempotencyAdapter<T>`: deduplicação por `correlationId`
  - Se `correlationId` for `null`, executa sem deduplicação
  - Se `correlationId` repetido com mesmo payload: retorna `mode: 'replayed'`
  - Se `correlationId` repetido com payload diferente: lança `IDEMPOTENCY_CONFLICT`
  - **Perda no restart**: todo histórico de deduplicação é perdido quando o processo reinicia

### 5.4 Document Drafting (sem LLM)

- `DocumentDraftingService.generate()`:
  - Entrada: `templateId`, `processId`, `documentTitle`, `payload` (Record<string, unknown>)
  - Saída: Markdown codificado em base64 + `mimeType: 'text/markdown'`
  - Gera estrutura fixa: título, processo, template, contexto (até 8 campos do payload), estrutura sugerida (lista estática), aviso de revisão humana
  - **Sem acesso a conteúdo real do template** — `templateId` é apenas referenciado como string, não carregado do banco

### 5.5 Checklist Suggestion (sem LLM)

- `ChecklistSuggestionService.suggest()`:
  - Usa `ProceduralDocumentChecklistService` (regras por tipo processual)
  - Adiciona sugestões baseadas em `documentCategory` e `facts` via keywords simples (regex/includes)
  - Exemplo: categoria "audiência" → sugere roteiro de audiência; texto com "testemunha" → sugere rol de testemunhas
  - Puramente determinístico — sem aprendizado ou LLM

---

## 6. Prompts, Agentes e Automações

### 6.1 Prompts no Produto (Backend)

Não há arquivos de prompt armazenados em disco para o produto. Os "prompts" são implícitos:

| Campo | Valor atual (padrão) | Papel |
|---|---|---|
| `promptVersion` em summary | `'k-summary-v1'` | Versionamento de prompt para auditoria |
| `modelVersion` em summary | `'k-summary-model-v1'` | Versionamento de modelo para auditoria |
| `promptVersion` em recommendation | `'k-recommendation-v1'` | Idem |
| `modelVersion` em recommendation | `'k-recommendation-model-v1'` | Idem |
| `promptVersion` em triage | `'k-triage-v1'` | Idem |

Os valores de `promptVersion` e `modelVersion` são strings de controle para auditoria — não apontam para arquivos reais de prompt. Com `DeterministicAiProvider`, esses campos são registrados na auditoria mas não afetam o comportamento.

### 6.2 Agentes de Desenvolvimento (Codex)

**Pasta `.codex/agents/` — 10 agentes ativos + 3 legados:**

| Agente | Arquivo | Modelo | Papel |
|---|---|---|---|
| Principal Orchestrator | `principal-orchestrator.toml` | GPT-5.4 | Orquestrador principal — decompõe tarefas e despacha especialistas |
| Backend Integration Agent | `backend-integration-agent.toml` | GPT-5.4 | Serviços, APIs, autenticação, contratos técnicos |
| Frontend Agent | `frontend-agent.toml` | GPT-5.4 | Implementação de UI e componentes |
| Brand System Agent | `brand-system-agent.toml` | GPT-5.4 | Identidade visual, marca |
| UX Structural Agent | `ux-structural-agent.toml` | GPT-5.4 | Navegação, filtros, UX estrutural |
| Executive Visualization Agent | `executive-visualization-agent.toml` | GPT-5.4 | Dashboards, KPIs, charts |
| Data Architect | `data-architect.toml` | GPT-5.4 | Arquitetura de dados |
| Test & QA Agent | `test-qa-agent.toml` | GPT-5.4 | Testes, validação |
| Review & Governance Agent | `review-governance-agent.toml` | GPT-5.4 | Revisão, governança documental |
| Docs Reconciler | `docs-reconciler.toml` | GPT-5.4 | Reconciliação documental |
| Juridico Screen Design Agent | `juridico-screen-design-experience-agent.toml` | GPT-5.4 | Design de telas jurídicas |
| Legado Analista Lote | `legacy/legado-analista-lote.toml` | — | **Legado** |
| Legado Explorador Mapa | `legacy/legado-explorador-mapa.toml` | — | **Legado** |
| Legado Normalizador UX | `legacy/legado-normalizador-ux.toml` | — | **Legado** |

> [!warning] Documentação desatualizada nos agentes Codex
> O `principal-orchestrator.toml` (e provavelmente os demais) referencia `docs-juridico` como documentação canônica. Desde a migração para `!_lexora-memory-docs`, essa referência está **desatualizada**. Este é o item BL-009 no backlog.

**Configuração global** (`.codex/config.toml`):
- `max_threads = 4`
- `max_depth = 2`
- `job_max_runtime_seconds = 2400` (40 min)

### 6.3 Skills Codex (`.codex/skills/`)

| Skill | Papel provável |
|---|---|
| `ui-ux-pro-max` | Design e UX premium |
| `frontend-skill` | Implementação frontend |
| `frontend-design` | Design de frontend |
| `interface-design-system` | Design system |
| `subagent-driven-development` | Desenvolvimento com subagentes |
| `dispatching-parallel-agents` | Despacho paralelo de agentes |
| `verification-before-completion` | Verificação antes de finalizar |
| `playwright-interactive` | Playwright interativo |
| `juridico-brand-system-revalidation` | Revalidação de marca Lexora |
| `juridico-data-contract-decision` | Decisão de contratos de dados |
| `juridico-doc-reconciliation` | Reconciliação documental |
| `juridico-screen-design-experience-review` | Revisão de design de telas |
| `juridico-screen-final-validation` | Validação final de telas |
| `juridico-screen-structural-reorganization` | Reorganização estrutural de telas |

### 6.4 Skill Automations (`.codex/skill-automations/`)

| Automação | Papel provável |
|---|---|
| `_index.md` | Índice de automações |
| `auto-juridico-screen-gap-analysis-lifecycle.md` | Análise de gaps de telas |
| `auto-juridico-data-contract-decision.md` | Decisão de contratos de dados |
| `auto-juridico-screen-design-experience-review.md` | Review de design de telas |
| `auto-juridico-screen-final-validation.md` | Validação final de telas |
| `auto-juridico-doc-reconciliation.md` | Reconciliação documental |
| `auto-juridico-brand-system-revalidation.md` | Revalidação de marca |
| `auto-juridico-screen-structural-reorganization.md` | Reorganização estrutural |

### 6.5 docs/skills (Referências de Arquitetura para Codex)

| Arquivo | Tema provável |
|---|---|
| `lexora-api-contract.md` | Contratos de API |
| `lexora-architecture.md` | Arquitetura geral |
| `lexora-deploy.md` | Deploy |
| `lexora-design-system.md` | Design system |
| `lexora-feature-workflow.md` | Fluxo de features |
| `lexora-orchestrator.md` | Orquestração |
| `lexora-testing.md` | Testes |
| `lexora-ux-audit.md` | Auditoria de UX |
| `lexora-ux-journey.md` | Jornada UX |
| `lexora-ux-premium.md` | UX premium |

> [!warning] Estado dos docs/skills não verificado
> Esses arquivos podem referenciar decisões antigas do projeto. Não foram lidos na íntegra nesta etapa. BL-010 do backlog cobre a validação desses arquivos.

---

## 7. Fluxos Funcionais que Usam IA

### 7.1 Fluxo de Sumarização de Publicação

```
Frontend (tela de publicação/triagem)
  → POST /ai/summary
      → requireAi() → verificar token + permissão 'ai.summary.generate'
      → PublicationSummarizerService.summarize()
          → InMemoryAiIdempotencyAdapter.run() [por correlationId]
              → AiProvider.summarize() [Deterministic ou Remote]
      → InMemoryAiAuditService.record() [in-memory]
      → res.status(201).json(result)
```

**Input esperado**: `{ targetType, targetId, sourceText, processLabel?, clientLabel?, correlationId?, promptVersion?, modelVersion? }`
**Output**: `{ mode: 'created'|'replayed', data: { title, summary, highlights, requiresReview: true, meta } }`

### 7.2 Fluxo de Recomendação de Triagem (via HTTP)

```
Frontend (tela de triagem)
  → POST /ai/recommendation
      → requireAi() → verificar token + permissão 'ai.recommendation.generate'
      → TriageRecommendationService.recommend()
          → InMemoryAiIdempotencyAdapter.run()
              → AiProvider.recommend() [Deterministic ou Remote]
      → InMemoryAiAuditService.record() [in-memory]
      → res.status(201).json(result)
```

**Input esperado**: `{ targetType, targetId, policyProfile, facts, correlationId?, promptVersion?, modelVersion? }`
**Output**: `{ mode: 'created'|'replayed', data: { action, rationale, confidenceBand, confidenceScore, requiresHumanApproval: true, meta } }`

### 7.3 Fluxo de Classificação Automática de Triagem (pipeline interno)

```
PublicationIngestion / Pipeline
  → classifyTriageItem(input) [triage-ai.provider.ts]
      ├── TRIAGE_AI_URL? → HTTP externo
      ├── fallback → adaptTriageRecommendation(input)
      │                 → TriageRecommendationService → DeterministicAiProvider
      └── fallback final → buildFallbackClassification()
                            → matchPublicationDeterministically()
                            → toLegacyTriageClassification()
```

Este fluxo é **interno ao backend** — acionado durante o pipeline de ingestão de publicações, não via HTTP direto do frontend.

**Output**: `{ queueType: 'critica'|'normal', suggestedAction, aiConfidenceBand, aiScoreRaw, suggestedReason }`

### 7.4 Fluxo de Drafting de Documento

```
Frontend (tela de templates/documentos)
  → [endpoint não confirmado via grep em api.ts]
  → DocumentDraftingService.generate(input) [chamado via AiTemplateDocumentGeneratorAdapter]
  → gera Markdown base64 com estrutura fixa
```

**Observação**: O endpoint HTTP para drafting não foi encontrado com certeza via grep. `register-ai-routes.ts` não inclui drafting. O `AiTemplateDocumentGeneratorAdapter` é usado via `DocumentArtifactGenerator` — provavelmente chamado dentro de outro endpoint de documentos.

### 7.5 Fluxo de Checklist Suggestion

```
Frontend (tela de documentos/upload)
  → [endpoint não confirmado via grep em api.ts]
  → ChecklistSuggestionService.suggest(input) [via document-checklist-suggestion.adapter.ts]
  → retorna listas: requiredItems, missingItems, suggestedItems, complete
```

**Observação**: Similar ao drafting — endpoint HTTP não identificado diretamente. Provavelmente integrado aos endpoints de documentos.

### 7.6 Fluxo de Automação Pós-Triagem

```
Decisão de triagem (operador)
  → planPostTriageAutomation() → cria lista de TriggerAutomationCommand
  → executePostTriageAutomation() → executa comandos via PostTriageAutomationExecutor
  → gera: criar_prazo | criar_tarefa | criar_oportunidade | criar_lead
```

Esse fluxo é **assistido** (iniciado por operador humano), não totalmente automatizado.

### 7.7 Fluxo de Lookup DataJud

```
Frontend / Backend (tela de processos)
  → endpoint de lookup de processo por número CNJ
  → datajud.provider.ts → HTTP GET para api-publica.datajud.cnj.jus.br
  → retorna dados do processo do CNJ
```

**Observação**: DataJud é integração real com API externa gratuita do CNJ. Tem chave demo documentada no `.env.example`.

---

## 8. Endpoints e APIs Relacionados a IA

| Método | Endpoint | Permissão exigida | Serviço | Resposta | Observações |
|---|---|---|---|---|---|
| POST | `/ai/summary` | `ai.summary.generate` | `PublicationSummarizerService` | `{ mode, data: AiSummaryResult }` | Usa `UserToken` (sem companyId) |
| POST | `/ai/recommendation` | `ai.recommendation.generate` | `TriageRecommendationService` | `{ mode, data: AiRecommendationResult }` | Usa `UserToken` (sem companyId) |
| GET | `/ai/audit` | `ai.audit.view` | `InMemoryAiAuditService` | `AiAuditEventRecord[]` | Filtros por commandKey, targetType, targetId, limit |
| — | Drafting de documento | — | `DocumentDraftingService` (via adapter) | `DraftOutput` (base64 Markdown) | Endpoint HTTP não confirmado nesta etapa |
| — | Checklist suggestion | — | `ChecklistSuggestionService` (via adapter) | `ChecklistSuggestionResult` | Endpoint HTTP não confirmado nesta etapa |
| — | Triagem interna | — | `classifyTriageItem()` | `TriageAiResult` | Pipeline interno, não endpoint direto |
| GET | `/processes/lookup?number=...` | — | DataJud | Dados do processo CNJ | Integração externa real |

---

## 9. Dados, Permissões e Auditoria

### 9.1 Modelos Prisma Existentes para IA (não utilizados pelo código atual)

| Modelo | Campos principais | Papel esperado | Status |
|---|---|---|---|
| `AiExecution` | id, commandKey, targetType, targetId, promptVersion, modelVersion, provider, status, inputHash, outputHash, maskedInput, outputPayload, fallbackUsed, guardrailStatus, tokenUsageInput, tokenUsageOutput, estimatedCostUsd, latencyMs, actor, correlationId, idempotencyKey | Registro persistente de execuções IA | **Schema existe, código não usa** |
| `AiExecutionTarget` | executionId, targetType, targetId, processId, clientId, portfolioId, teamId, metadata | Alvos múltiplos por execução | **Schema existe, código não usa** |
| `AiBudgetLedger` | scopeType, scopeId, commandKey, periodStart, periodEnd, requestCount, tokenUsageInput, tokenUsageOutput, estimatedCostUsd, hardLimitUsd, softLimitUsd | Controle de orçamento por escopo/período | **Schema existe, código não usa** |

> [!warning] Divergência crítica: Audit in-memory vs Prisma
> O `InMemoryAiAuditService` registra eventos apenas em memória — se o servidor reiniciar, **todos os logs de auditoria IA são perdidos**. Os modelos `AiExecution` e `AiExecutionTarget` no Prisma foram projetados para persistir esses dados, mas o código atual não os usa. O `AiBudgetLedger` existe para controle de custo, mas também não tem código que escreva nele. Esta é uma divergência significativa entre schema e implementação.

### 9.2 Sistema de Permissões para IA

As permissões são verificadas via `ensureAuthorized()` em `register-ai-routes.ts`:

| Permissão | Quem pode usar | Endpoint |
|---|---|---|
| `ai.summary.generate` | Verificado via `authz.guard.ts` / `rbac/permissions.ts` | `POST /ai/summary` |
| `ai.recommendation.generate` | Verificado via `authz.guard.ts` / `rbac/permissions.ts` | `POST /ai/recommendation` |
| `ai.audit.view` | Verificado via `authz.guard.ts` / `rbac/permissions.ts` | `GET /ai/audit` |

**Ponto a validar**: Quais roles têm acesso a `ai.summary.generate` e `ai.recommendation.generate`? Os arquivos de permissions/matrix não foram lidos na íntegra nesta etapa.

### 9.3 Ausência de Contexto Multi-tenant nas Rotas IA

As rotas de IA em `register-ai-routes.ts` usam `UserToken` (tipo simples: `{ sub, role, email }`), não `AuthTokenClaims` (rico: com `companyId`, `membershipId`, `userType`). Isso significa que:

- Chamadas de IA **não carregam companyId**
- Não há isolamento por empresa nas chamadas de IA via HTTP
- Logs de auditoria registram apenas `user:${decoded.sub}`, sem empresa
- O `AiBudgetLedger` por `scopeId` (empresa) não pode ser populado sem companyId

---

## 10. Testes Existentes Relacionados a IA

| Arquivo de Teste | Tipo | O que valida | Status no CI |
|---|---|---|---|
| `ai/core/ai-provider.router.test.cjs` | Unitário | Criação do provider com/sem `AI_PROVIDER_URL`; fallback para Deterministic | Fora do CI |
| `ai/summarization/publication-summarizer.service.test.cjs` | Unitário | Summarizer com provider mock; idempotência | Fora do CI |
| `ai/recommendation/triage-recommendation.service.test.cjs` | Unitário | Recommendation service com provider mock; idempotência | Fora do CI |
| `ai/audit/ai-audit.service.test.cjs` | Unitário | Registro, listagem e filtros do InMemoryAiAuditService | Fora do CI |
| `ai/drafting/document-drafting.service.test.cjs` | Unitário | Geração de draft Markdown; normalização de payload | Fora do CI |
| `ai/drafting/template-document-generator.adapter.test.cjs` | Unitário | Adapter de geração de template | Fora do CI |
| `ai/checklist/checklist-suggestion.service.test.cjs` | Unitário | Sugestão de checklist por tipo processual; keywords | Fora do CI |
| `ai/http/register-ai-routes.test.cjs` | Unitário/Integração leve | Rotas HTTP de IA; autenticação; permissões | Fora do CI |
| `triage/decision-engine.test.cjs` | Unitário | Engine de decisão de triagem | Fora do CI |
| `triage/explainability/triage-explanation-builder.test.cjs` | Unitário | Builder de explicações | Fora do CI |
| `triage/queue/triage-prioritization.test.cjs` | Unitário | Priorização de fila | Fora do CI |
| `ai/summarization/publication-summarizer.service.test.cjs` | Unitário | Sumário de publicação | Fora do CI |
| `ai/recommendation/triage-recommendation.service.test.cjs` | Unitário | Recomendação de triagem | Fora do CI |

> [!warning] Todos os testes de IA estão fora do CI
> Conforme identificado no [[KB_003E_TESTES_QA_E_EVIDENCIAS_CURRENT_2026-05-30]], nenhum teste do módulo `backend/src/ai/` ou `backend/src/triage/` está no pipeline CI. Regressões no módulo de IA passam despercebidas automaticamente.

---

## 11. Mocks, Stubs e Implementações Incompletas

| Componente | Tipo | O que está incompleto/mockado | Impacto |
|---|---|---|---|
| `DeterministicAiProvider` | Implementação real (determinística) | Não é mock — é a implementação padrão; simula custo com cálculo fictício | Usuário pode não perceber que não há LLM |
| `InMemoryAiAuditService` | **In-memory** | Não persiste — perde dados no restart | Perda de histórico de auditoria |
| `InMemoryAiIdempotencyAdapter` | **In-memory** | Não persiste — risco de duplicação após restart | Execuções duplicadas possíveis |
| `DocumentDraftingService` | Implementação parcial | Ignora conteúdo real do template (só usa templateId como string) | Rascunhos genéricos, não baseados no template real |
| `AiExecution` (Prisma) | Schema sem código | Modelo existe mas nenhum service escreve nele | Auditoria persistente não implementada |
| `AiBudgetLedger` (Prisma) | Schema sem código | Modelo existe mas nenhum service escreve nele | Controle de orçamento não implementado |
| `RemoteAiProvider` | Implementação real | Requer `AI_PROVIDER_URL` — ausente do `.env.example` | Funcionalidade desconhecida para novos devs |
| Audit de IA em banco | **Não implementado** | `AiExecution` no schema, sem escrita no código | Sem histórico persistente de IA em produção |

---

## 12. Riscos Técnicos

| Risco | Evidência | Impacto | Recomendação | Prioridade |
|---|---|---|---|---|
| Audit IA em memória — perde no restart | `InMemoryAiAuditService` sem Prisma | Perda total de histórico de auditoria IA | Implementar `PrismaAiAuditService` usando `AiExecution` | **Alta** |
| Idempotência em memória — perde no restart | `InMemoryAiIdempotencyAdapter` sem Prisma | Execuções duplicadas após restart do servidor | Implementar idempotência com `AiIdempotencyRequest` no banco | **Alta** |
| LLM não configurado silenciosamente | `DeterministicAiProvider` como default; env vars ausentes do `.env.example` | Usuário acha que IA está ativa mas usa fallback determinístico | Documentar env vars; exibir provider ativo nos logs de startup | **Alta** |
| AI routes sem companyId | `register-ai-routes.ts` usa `UserToken` simples | Chamadas IA sem contexto de empresa; budget por empresa impossível | Migrar para `AuthTokenClaims` com companyId | **Média** |
| `AiBudgetLedger` no schema, sem código | Schema criado, sem escrita | Controle de custo IA por empresa não funciona | Implementar budget service com `AiBudgetLedger` | **Média** |
| Agentes Codex com docs desatualizados | `principal-orchestrator.toml` referencia `docs-juridico` | Codex usa documentação obsoleta como canon | Atualizar agentes para referenciar `!_lexora-memory-docs` (BL-009) | **Média** |
| `docs/skills/` não validados | Listagem apenas | Skills podem conter regras conflitantes com estado atual | Validar no KB-003G ou etapa dedicada (BL-010) | **Média** |
| Testes de IA fora do CI | Todos os test.cjs de IA fora do pipeline | Regressões no módulo IA não detectadas automaticamente | Adicionar ao CI (parte do GAP-001 do KB-003E) | **Alta** |
| `DocumentDraftingService` ignora template real | Código lê apenas `templateId` como string | Rascunho gerado não reflete conteúdo do template | Integrar carregamento do template do banco | **Média** |
| Endpoints de drafting/checklist não confirmados | Grep em `api.ts` não retornou chamadas IA | Frontend pode não estar integrado aos serviços IA | Confirmar endpoints HTTP no KB-003G | **Média** |

---

## 13. Riscos de Segurança, Privacidade e Custo

### 13.1 Segurança

| Risco | Evidência | Recomendação |
|---|---|---|
| `DATAJUD_API_KEY` demo hardcoded no `.env.example` | `.env.example` linha 14 | Substituir por chave própria em produção; documentar onde obter |
| `AI_PROVIDER_TOKEN` sem validação de formato | Env var opcional; qualquer string aceita | Validar no startup se `AI_PROVIDER_URL` estiver definida |
| Sem rate limiting nos endpoints `/ai/*` | Nenhum middleware de rate limit identificado nos endpoints IA | Adicionar rate limiting — chamadas de IA podem ser caras |
| AI routes com `UserToken` simples (sem companyId) | `register-ai-routes.ts` | Usuários de diferentes empresas podem chamar IA sem isolamento |
| Prompts recebem `sourceText` livre do usuário | `POST /ai/summary` aceita texto arbitrário | Com LLM externo real, risco de prompt injection |

### 13.2 Privacidade

| Risco | Evidência | Recomendação |
|---|---|---|
| Dados de processos enviados ao LLM externo | `sourceText` pode conter CPF, nome de partes, valores | Definir política de mascaramento de dados antes de ativar `AI_PROVIDER_URL` |
| `maskedInput` no `AiExecution` (Prisma) | Campo `maskedInput` existe no schema | Schema prevê mascaramento — implementar antes de usar LLM externo |
| Audit in-memory sem proteção | `InMemoryAiAuditService` em memória | Se houvesse dados sensíveis no audit, seria mais seguro em memória; porém sem persistência |
| Textos de publicações com CPF/OAB | `PublicationCapture` tem `cpf`, `oabNumber`, `personName` | Garantir mascaramento antes de enviar ao LLM |

### 13.3 Custo

| Risco | Evidência | Recomendação |
|---|---|---|
| `AiBudgetLedger` no schema sem implementação | Schema existe, sem código de escrita | Implementar budget service antes de ativar LLM externo |
| Sem rate limiting nos endpoints IA | Nenhum middleware identificado | Risco de custo ilimitado com LLM externo |
| Custo simulado em `DeterministicAiProvider` | `estimatedCostUsd` calculado mas é fictício | Não usar o valor para controle real de orçamento |
| Dois providers independentes (AI_PROVIDER e TRIAGE_AI) | Dois LLMs possíveis simultaneamente | Dobra o custo potencial se ambos estiverem configurados |

---

## 14. Gaps Funcionais

| Gap | Descrição | Impacto | Recomendação |
|---|---|---|---|
| **Sem LLM ativo em produção** | `DeterministicAiProvider` sempre ativo por padrão | IA do produto é determinística — resumos e recomendações são regras fixas | Decidir se LLM externo será ativado; documentar `AI_PROVIDER_URL` |
| **Audit não persiste** | `InMemoryAiAuditService` sem Prisma | Impossível auditar uso de IA historicamente | Implementar `PrismaAiAuditService` |
| **Budget não implementado** | `AiBudgetLedger` sem código | Sem controle de custo por empresa ou período | Implementar budget service |
| **Drafting ignora template real** | `DocumentDraftingService` usa `templateId` como string | Rascunho não reflete modelo real do template | Integrar `Template` do banco ao drafting |
| **Frontend sem tipos IA** | Grep em `api.ts` não retornou tipos de IA | Frontend não tem tipos para `AiSummaryResult`, `AiRecommendationResult` | Adicionar tipos ao `frontend/src/api.ts` |
| **Endpoints de drafting/checklist não mapeados** | Não confirmados via grep | Funcionalidades podem não estar expostas ao frontend | Confirmar no KB-003G |
| **Codex com docs desatualizados** | Agentes referenciam `docs-juridico` | IA de desenvolvimento trabalha com contexto desatualizado | BL-009, BL-010 |
| **Sem guardrails implementados** | `guardrailStatus: 'passed'` hardcoded no schema sem validação | Sem proteção contra outputs IA inválidos ou perigosos | Implementar guardrails antes de LLM externo |

---

## 15. Itens do Backlog Impactados

| Item backlog | Status após KB-003F | Evidência | Recomendação |
|---|---|---|---|
| BL-009 — Validar `.codex/agents` como legado ou ativo | **Parcialmente desbloqueado** | 10 agentes ativos identificados; referências a `docs-juridico` confirmadas como desatualizadas | Atualizar agentes para `!_lexora-memory-docs`; requer aprovação do usuário |
| BL-010 — Validar `docs/skills` | **Parcialmente desbloqueado** | 10 arquivos identificados; conteúdo não verificado | Ler e comparar com estado atual do código; BL-010 pendente |
| BL-057 — Confirmar AI provider: determinístico ou LLM externo | **Desbloqueado** | Confirmado: `DeterministicAiProvider` é o padrão; `RemoteAiProvider` existe mas inativo sem `AI_PROVIDER_URL` | Decisão do usuário: ativar LLM externo ou manter determinístico |

---

## 16. Novos Candidatos a Backlog

| Candidato a backlog | Prioridade sugerida | Tipo | Área | Dependência | Observação |
|---|---|---|---|---|---|
| Implementar `PrismaAiAuditService` para persistir audit de IA no banco | P1 | Implementação | Backend / IA | Decisão de ativar LLM externo | `AiExecution` no schema; `InMemoryAiAuditService` perde no restart |
| Implementar idempotência IA com banco (substituir `InMemoryAiIdempotencyAdapter`) | P2 | Implementação | Backend / IA | Prisma Audit | Risco de execuções duplicadas após restart |
| Documentar variáveis de ambiente de IA no `.env.example` | P1 | Documentação | Backend / IA / DevOps | Nenhuma | `AI_PROVIDER_URL`, `TRIAGE_AI_URL`, `AI_PROVIDER_TOKEN` etc. ausentes |
| Implementar `AiBudgetLedger` service para controle de custo IA por empresa | P2 | Implementação | Backend / IA / Finance | Prisma Audit + companyId em AI routes | Sem controle de custo até LLM externo ser ativado |
| Migrar AI routes para usar `AuthTokenClaims` com companyId | P2 | Correção técnica | Backend / IA / Multi-tenancy | BL-048 (auth canônico) | AI calls sem contexto de empresa |
| Adicionar rate limiting nos endpoints `/ai/*` | P1 | Segurança | Backend / IA | Nenhuma | Risco de custo ilimitado quando LLM externo for ativado |
| Definir política de mascaramento de dados sensíveis antes de ativar LLM externo | P1 | Decisão / Segurança | Backend / IA / Privacidade | Decisão do usuário | CPF, OAB, nomes de partes em publicações |
| Integrar `Template` do banco ao `DocumentDraftingService` | P2 | Implementação | Backend / IA / Documentos | — | Rascunho atual não usa conteúdo real do template |
| Adicionar tipos de IA ao `frontend/src/api.ts` | P2 | Implementação | Frontend / IA | Confirmar endpoints via KB-003G | `AiSummaryResult`, `AiRecommendationResult` ausentes |
| Atualizar agentes Codex para referenciar `!_lexora-memory-docs` | P1 | Governança | IA / Codex | BL-009 | `docs-juridico` como canon é obsoleto |
| Validar e atualizar `docs/skills/` contra estado atual do projeto | P1 | Documentação | IA / Codex | BL-010 | Skills podem ter regras conflitantes |

---

## 17. Relação com KB-003G — Riscos Técnicos e Divergências

Este documento alimenta o KB-003G com:

- **Divergência crítica**: `AiExecution`, `AiExecutionTarget`, `AiBudgetLedger` no schema Prisma sem nenhuma escrita em código — modelo de dados preparado para IA persistente mas implementação é in-memory.
- **Divergência de implementação**: `DeterministicAiProvider` (default, não-LLM) vs expectativa possível de IA real.
- **Risco de privacidade**: Textos de publicações com dados pessoais podem ser enviados a LLM externo sem mascaramento se `AI_PROVIDER_URL` for ativada sem política de privacidade.
- **Agentes Codex**: 10+ agentes com documentação canônica desatualizada — risco de decisões de desenvolvimento baseadas em contexto antigo.
- **Endpoints de IA sem multi-tenancy**: AI routes usam `UserToken` simples — gap de isolamento de dados por empresa.
- **Testes de IA fora do CI**: Regressões passam despercebidas.

---

## 18. Limitações desta Análise

> [!warning] Limitações desta análise
>
> - **Não leu todos os arquivos .toml** dos agentes Codex — apenas 2 de 10 foram lidos.
> - **Não leu `docs/skills/`** na íntegra — apenas listagem.
> - **Não confirmou endpoints de drafting e checklist** no `main.ts` — grep por esses endpoints não foi feito.
> - **Não leu a matrix de permissões** (`rbac/permissions.ts`) — quais roles têm `ai.*` não confirmado.
> - **Não leu o pipeline de ingestão de publicações** completo — a integração com triagem AI pode ter mais profundidade.
> - **Não executou testes** — comportamento real dos providers não validado em runtime.
> - **Não acessou banco** — `AiExecution`, `AiBudgetLedger` têm 0 registros ou N registros não verificado.
> - **Frontend**: grep em `api.ts` não retornou chamadas de IA — pode ser que chamadas existam mas com nomes diferentes, ou que o frontend ainda não tenha essa integração.
> - **Não altera código, testes, configs, backlog ou arquivos existentes**.

---

## 19. Validação Final

| Item validado | Resultado |
|---|---|
| Vault oficial existe | **Sim** |
| `00_START_HERE.md` encontrado | **Sim** |
| `KB_002` encontrado | **Sim** |
| `KB_003A` encontrado | **Sim** |
| `KB_003B` encontrado | **Sim** |
| `KB_003C` encontrado | **Sim** |
| `KB_003D` encontrado | **Sim** |
| `KB_003E` encontrado | **Sim** |
| `BACKLOG_GERAL_LEXORA_CURRENT.md` encontrado | **Sim** |
| KB-003F criado no caminho correto (`12 - IA - Prompts e Sessoes`) | **Sim** |
| Apenas o KB-003F foi criado | **Sim** |
| Algum arquivo existente foi sobrescrito | **Não** |
| Algum código foi alterado | **Não** |
| Algum teste foi alterado | **Não** |
| Algum package file foi alterado | **Não** |
| Alguma configuração foi alterada | **Não** |
| Algum script foi executado | **Não** |
| Algum pacote foi instalado | **Não** |
| Algum deploy foi executado | **Não** |
| Alguma pasta `.obsidian` foi alterada | **Não** |
| Backlog permaneceu inalterado | **Sim** |

---

**Arquivo criado:**
`!_lexora-memory-docs/12 - IA - Prompts e Sessoes/KB_003F_IA_AGENTES_E_AUTOMACOES_CURRENT_2026-05-30.md`

**Arquivos consultados:**
`backend/src/ai/core/ai-provider.port.ts`, `ai-provider.router.ts`, `ai-request.types.ts`, `ai-idempotency.adapter.ts`,
`backend/src/ai/summarization/publication-summarizer.service.ts`,
`backend/src/ai/recommendation/triage-recommendation.service.ts`, `triage-recommendation.adapter.ts`,
`backend/src/ai/drafting/document-drafting.service.ts`, `template-document-generator.adapter.ts`,
`backend/src/ai/checklist/checklist-suggestion.service.ts`,
`backend/src/ai/audit/ai-audit.service.ts`, `ai-audit.types.ts`,
`backend/src/ai/http/register-ai-routes.ts`,
`backend/src/triage-ai.provider.ts`,
`backend/src/triage/decision-engine.ts`, `triage-automation-planner.ts`, `post-triage-automation-runner.ts`, `triage-recommendation.adapter.ts`,
`backend/src/datajud.provider.ts`,
`backend/.env.example`,
`.codex/config.toml`, `.codex/agents/principal-orchestrator.toml`, `.codex/agents/backend-integration-agent.toml`
+ todos os KBs obrigatórios

**Pastas analisadas:**
`backend/src/ai/`, `backend/src/triage/`, `.codex/agents/`, `.codex/skills/`, `.codex/skill-automations/`, `docs/skills/`

**Principais riscos identificados:**
1. `InMemoryAiAuditService` perde todos os eventos no restart — `AiExecution` no Prisma não usado.
2. `InMemoryAiIdempotencyAdapter` perde idempotência no restart.
3. LLM externo inativo por padrão sem documentação das env vars.
4. AI routes sem companyId — sem isolamento multi-tenant.
5. Dados sensíveis (CPF, OAB, nomes) podem ir ao LLM externo sem mascaramento.
6. Agentes Codex com `docs-juridico` como canon — desatualizado.
7. Testes de IA fora do CI.

**Itens do backlog possivelmente desbloqueados:**
- BL-009: Parcialmente desbloqueado — agentes mapeados, referência desatualizada confirmada.
- BL-057: Desbloqueado — provider determinístico confirmado como padrão ativo.
- BL-010: Parcialmente desbloqueado — `docs/skills/` identificados, conteúdo não validado.

**Novos candidatos a backlog identificados:** 11 itens (ver seção 16).

**Pontos que precisam de validação do usuário:**
1. Decisão de ativar ou não LLM externo (`AI_PROVIDER_URL`) — e qual provider usar.
2. Política de mascaramento de dados sensíveis antes de ativar LLM.
3. Prioridade de implementar `PrismaAiAuditService` vs manter in-memory.
4. Status dos agentes Codex: atualizar para `!_lexora-memory-docs` ou desativar? (BL-009).
5. Decisão sobre `AiBudgetLedger`: implementar controle de custo agora ou aguardar ativação do LLM.

**Próxima etapa recomendada:** KB-003G — Riscos Técnicos e Divergências.

---

*Criado em: 2026-05-30 | Status: current | Vault: !_lexora-memory-docs | Autor: claude-code*
*Baseado em: [[KB_003E_TESTES_QA_E_EVIDENCIAS_CURRENT_2026-05-30]] | Complementado por: leitura direta de arquivos de IA e agentes*
