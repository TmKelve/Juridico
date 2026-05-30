---
name: KB_001_DOCUMENTACAO_MAPEAMENTO_INICIAL
description: Mapeamento inicial e controlado de toda documentação existente no projeto Lexora/Jurídico — diagnóstico de vaults, duplicidades, conflitos e obsolescência
metadata:
  type: project
  date: 2026-05-29
  status: rascunho
  phase: mapeamento-documental
  author: Claude Code (assistido)
tags:
  - mapeamento
  - documentação
  - diagnóstico
  - obsidian
  - legado
---

# KB-001 — Mapeamento Documental Inicial
**Data:** 2026-05-29
**Projeto:** Lexora / SaaS Jurídico
**Fase:** Diagnóstico — etapa 1 de reorganização documental
**Escopo:** Apenas leitura e mapeamento — nenhum arquivo foi criado, movido ou alterado além deste relatório.

---

## 1. Resumo Executivo do Mapeamento

A documentação do projeto está **espalhada por múltiplas pastas e dois vaults Obsidian distintos**, sem uma fonte única de verdade. Foram identificadas:

- **Duas pastas de documentação ativa** com finalidades parcialmente sobrepostas: `docs/` (baseada em epics/fases, atualizada até 29/05/2026) e `docs-juridico/` (baseada em numeração sequencial, majoritariamente criada em 02/04/2026, com atualizações pontuais até 17/05/2026).
- **Dois vaults Obsidian** com configurações independentes: um na raiz do projeto (`.obsidian/`), outro dentro da pasta `docs-juridico/` (`docs-juridico/.obsidian/`).
- **Conflito de numeração** em `docs-juridico/`: dois arquivos com prefixo `36-`, tratando assuntos distintos.
- **Artefatos técnicos soltos na raiz do projeto** (screenshots `.png`, logs `.log`, um snapshot `.md`) sem pasta dedicada.
- **Documentação de skills** (`docs/skills/`) potencialmente mais atualizada que o restante, mas sem data explícita de última revisão.
- **Contratos de API** (`contracts/*.contract.json`) separados da documentação textual, sem integração com o vault Obsidian.
- **Agentes e automações Codex** (`.codex/`) com documentação própria em TOML/YAML — não indexados no vault Obsidian.

**Veredicto geral:** a documentação não pode ser usada como fonte oficial sem validação. O estado real do código e das pastas é mais confiável.

---

## 2. Vaults Obsidian Encontrados

### 2.1 Vault Raiz (Principal — Definido pelo Usuário)

| Campo | Valor |
|---|---|
| Caminho | `C:\Users\tomke\app Juridico\.obsidian` |
| Última modificação | 21/05/2026 (pasta) — arquivos de config: 29/05/2026 |
| app.json | `{}` (vazio — sem customizações) |
| Últimos arquivos abertos | Arquivos de `docs/epic-b/`, `frontend/src/`, `frontend/test-results/` |
| Status | **Vault oficial ativo** |

O `workspace.json` deste vault indica que foram abertas recentemente notas de `docs/`, arquivos TypeScript de `frontend/src/` e resultados de erro de testes. Isso confirma que **a raiz do projeto (`C:\Users\tomke\app Juridico`) é o vault Obsidian em uso ativo**.

### 2.2 Vault Docs-Juridico (Paralelo — Legado Suspeito)

| Campo | Valor |
|---|---|
| Caminho | `C:\Users\tomke\app Juridico\docs-juridico\.obsidian` |
| Última modificação | 02/04/2026 (pasta criada) — arquivos de config: 29/05/2026 |
| Últimos arquivos abertos | Documentos `27-Proximas-Acoes-V1.2.md` até `08-Agentes-e-Skills.md` (todos internos à pasta docs-juridico) |
| Status | **Vault paralelo — possivelmente legado ou duplicata ativa** |

> **Risco:** A existência de dois vaults significa que links internos do Obsidian (`[[nome]]`) criados em um vault não serão resolvidos no outro. Notas criadas no vault de `docs-juridico/` não aparecem no grafo do vault raiz, e vice-versa. Qualquer IA ou desenvolvedor que abrir o vault errado trabalhará com uma visão incompleta do projeto.

> **Ponto a validar:** O vault `docs-juridico/.obsidian` teve seus arquivos de configuração modificados em 29/05/2026 (hoje), mas a pasta foi criada em 02/04/2026. Isso pode indicar que o Obsidian reescreveu a configuração ao abrir o vault hoje — o que significa que **este vault pode ainda estar ativo e sendo acessado**.

---

## 3. Pastas Documentais Encontradas

| Pasta | Tipo de Conteúdo | Última Atividade |
|---|---|---|
| `docs/` | Documentação técnica por epic/fase + skills | 29/05/2026 |
| `docs-juridico/` | Documentação de produto sequencial (numerada) | 17/05/2026 |
| `docs-juridico/.obsidian` | Configuração de vault paralelo | 29/05/2026 (auto) |
| `contracts/` | Contratos de API em JSON por epic/fase | 29/05/2026 |
| `lexora_brand_package/` | Assets de identidade visual (SVG, PNG, favicon) | 02/04/2026 |
| `media/` | Assets de mídia (vídeo de background do login) | 14/05/2026 |
| `.codex/` | Configuração de agentes e skills (TOML/YAML) | 02/04/2026 |
| `scripts/` | Scripts de teste e seed de dados | 21/05/2026 |
| `frontend/test-results/` | Resultados de testes Playwright (artefatos) | 29/05/2026 |
| `frontend/test-screenshots/` | Screenshots gerados por testes (9 imagens) | 29/05/2026 |
| `test-results/` (raiz) | Apenas `.last-run.json` — sem conteúdo relevante | 27/05/2026 |
| Raiz do projeto (arquivos soltos) | Screenshots, logs, snapshots md — sem pasta dedicada | 15/05/2026 |

---

## 4. Inventário de Documentos

### 4.1 Pasta `docs/` — 80 arquivos

#### `docs/epic-a/` (5 arquivos — último: 21/05/2026)
- `overview.md` — visão geral do epic A (publicações)
- `contracts.md` — contratos de API do epic A
- `changelog.md` — histórico de mudanças
- `qa.md` — critérios e resultados de QA
- `runbook.md` — operação e runbook

#### `docs/epic-b/` (5 arquivos — último: 22/05/2026)
- `overview.md` — visão geral do epic B (financeiro)
- `contracts.md` — contratos de API
- `changelog.md` — histórico
- `qa.md` — QA
- `runbook.md` — runbook

#### `docs/epic-cde/` (6 arquivos — último: 21/05/2026)
- `overview.md` — visão geral dos epics C, D, E
- `README.md` — introdução ao conjunto
- `contracts.md` / `changelog.md` / `qa.md` / `runbook.md`

#### `docs/epic-fgh/` (5 arquivos — último: 25/05/2026)
- `overview.md` / `contracts.md` / `changelog.md` / `qa.md` / `runbook.md`

#### `docs/epic-ij/` (6 arquivos — último: 25/05/2026)
- `overview.md` / `contracts.md` / `changelog.md` / `qa.md` / `runbook.md`
- `security-model.md` — modelo de segurança específico dos epics I/J

#### `docs/epic-klm/` (7 arquivos — último: 26/05/2026)
- `overview.md` / `contracts.md` / `changelog.md` / `qa.md` / `runbook.md`
- `ai-governance.md` — governança de IA
- `bi-metrics-catalog.md` — catálogo de métricas de BI

#### `docs/fase-1-foundation/` (7 arquivos — último: 29/05/2026)
- `overview.md` / `contracts.md` / `qa.md`
- `auth-and-session.md` — documentação de autenticação e sessão
- `domain-model.md` — modelo de domínio
- `migration-strategy.md` — estratégia de migração
- `permissions-matrix.md` — matriz de permissões

#### `docs/fase-2-commercial-governance/` (8 arquivos — último: 29/05/2026)
- `overview.md` / `contracts.md` / `changelog.md` / `qa.md`
- `access-enforcement.md` — enforcement de acesso
- `domain-model.md` / `status-policy.md` / `phase-closure.md`

#### `docs/fase-3-platform-console/` (8 arquivos — último: 29/05/2026)
- `overview.md` / `contracts.md` / `changelog.md` / `qa.md`
- `access-and-audit.md` / `domain-model.md` / `roles-and-permissions.md` / `phase-closure.md`

#### `docs/fase-3-rollout-enforcement/` (5 arquivos — último: 29/05/2026)
- `acceptance-and-evidence.md` — evidências de aceitação
- `agent-plan.md` — plano de execução por agente
- `checklist.md` / `execution-plan.md` / `risks-and-mitigations.md`

#### `docs/publication-origin-rework/` (7 arquivos — último: 26/05/2026)
- `overview.md` / `contracts.md` / `changelog.md` / `qa.md` / `runbook.md`
- `domain-model.md` / `README.md`

#### `docs/skills/` (10 arquivos — último: 29/05/2026)
- `lexora-architecture.md` — arquitetura do monolito e convenções
- `lexora-api-contract.md` — contratos de API
- `lexora-deploy.md` — guia de deploy
- `lexora-design-system.md` — design system
- `lexora-feature-workflow.md` — fluxo de desenvolvimento de features
- `lexora-orchestrator.md` — orquestração de agentes
- `lexora-testing.md` — estratégia de testes
- `lexora-ux-audit.md` — auditoria de UX
- `lexora-ux-journey.md` — jornada de UX
- `lexora-ux-premium.md` — UX premium

#### `docs/superpowers/plans/` (1 arquivo — 16/05/2026)
- `2026-05-16-triagem-publicacoes-automaticas.md` — plano de triagem de publicações automáticas

---

### 4.2 Pasta `docs-juridico/` — 49 arquivos

#### Documentos sequenciais numerados (00 a 37):

| Arquivo | Data | Assunto Inferido |
|---|---|---|
| `00-README.md` | 14/05/2026 | Índice e status atual do vault docs-juridico |
| `01-Visao-Geral.md` | 02/04/2026 | Visão geral do produto |
| `02-Perfis.md` | 02/04/2026 | Definição de perfis de usuário |
| `03-Dashboards.md` | 02/04/2026 | Dashboards por perfil |
| `04-Permissoes.md` | 02/04/2026 | Matriz de permissões |
| `05-Navegacao.md` | 02/04/2026 | Arquitetura de navegação |
| `06-Wireframes.md` | 02/04/2026 | Wireframes textuais |
| `07-Modelagem-Dados.md` | 02/04/2026 | Modelo de dados |
| `08-Agentes-e-Skills.md` | 02/04/2026 | Agentes e skills de IA |
| `09-Casos-de-Uso.md` | 02/04/2026 | Casos de uso |
| `10-Roadmap.md` | 02/04/2026 | Roadmap inicial |
| `11-Sprint.md` | 02/04/2026 | Sprint planning |
| `12-Identidade-Visual.md` | 02/04/2026 | Paleta, tipografia, marca |
| `13-Analise-Contraste-Login.md` | 02/04/2026 | Análise WCAG da tela de login |
| `14-Revisao-Design-Login-Fechamento.md` | 02/04/2026 | Implementação de melhorias P1-P7 no login |
| `15-Teste-Acessibilidade-Manual.md` | 02/04/2026 | Guia de testes de acessibilidade |
| `16-Relatorio-Validacao-Testes.md` | 02/04/2026 | Relatório de validação com evidências |
| `17-Deploy-Checklist.md` | 02/04/2026 | Checklist pré-produção |
| `18-Setup-Staging-Producao.md` | 14/05/2026 | Deploy em staging/produção |
| `19-Roadmap-Q1-Q2.md` | 12/05/2026 | Roadmap atualizado Q1-Q2 2026 |
| `20-Guia-Desenvolvimento.md` | 14/05/2026 | Guia para novos devs |
| `21-Dashboard-Tecnico.md` | 02/04/2026 | Dashboard técnico |
| `22-Revisao-Login-v2.0.md` | 02/04/2026 | Revisão do login v2.0 |
| `22-Revisao-Login-Completa-v1.1.md` | 02/04/2026 | **DUPLICATA de número 22** — revisão v1.1 |
| `22-Setup-Sentry-GA.md` | 02/04/2026 | **TERCEIRO arquivo com número 22** — setup Sentry |
| `23-Guia-Implementacao-O1-O3.md` | 02/04/2026 | Guia de implementação O1-O3 |
| `23-Implementacao-O1-O2-O3-Completa.md` | 02/04/2026 | **DUPLICATA de número 23** — implementação completa |
| `23-Sessao-Completa-v1.1.md` | 02/04/2026 | **TERCEIRO arquivo com número 23** |
| `24-Revisao-Dashboard-Completa.md` | 02/04/2026 | Revisão do dashboard |
| `25-Plano-Implementacao-D1-D4.md` | 02/04/2026 | Plano de implementação D1-D4 |
| `26-Seguranca-HttpOnly-Cookie.md` | 12/05/2026 | Segurança com cookies HttpOnly |
| `27-Proximas-Acoes-V1.2.md` | 02/04/2026 | Próximas ações v1.2 |
| `28-Validacao-Telas-ADV-Full-Lifecycle.md` | 04/04/2026 | Validação das telas ADV |
| `29-Plano-Producao-Full-Lifecycle.md` | 14/05/2026 | Plano para produção |
| `30-Mapeamento-Tela-API-P0.md` | 17/05/2026 | Contrato telas P0 x endpoints |
| `31-Plano-Migracao-SQLite-Postgres-Grupo-A.md` | 14/05/2026 | Migração SQLite → Postgres |
| `32-Baseline-Staging-CI.md` | 14/05/2026 | Baseline staging e CI |
| `33-Runbook-Staging-Deploy.md` | 14/05/2026 | Runbook de deploy staging |
| `34-Handoff-Git-Baseline.md` | 14/05/2026 | Handoff git baseline |
| `35-Decisao-Stack-Staging-MVP.md` | 14/05/2026 | Decisão de stack para staging |
| `36-Migracao-UI-Stack-Alvo.md` | 17/05/2026 | Migração da stack de UI |
| `36-Validacao-Epic-9-10-Regressao.md` | 17/05/2026 | **DUPLICATA de número 36** — validação de regressão |
| `37-Governanca-UI-PR-Checklist.md` | 17/05/2026 | Governança de UI e PR checklist |
| `test-acessibilidade-login.js` | 02/04/2026 | Script de teste WCAG (não é documentação — é código) |

---

### 4.3 Pasta `contracts/` — 12 arquivos JSON

| Arquivo | Data |
|---|---|
| `epic-a-publications.contract.json` | 20/05/2026 |
| `epic-b-finance.contract.json` | 22/05/2026 |
| `epic-fgh.contract.json` | 22/05/2026 |
| `epic-ij.contract.json` | 25/05/2026 |
| `epic-k.contract.json` | 26/05/2026 |
| `epic-l-bi.contract.json` | 26/05/2026 |
| `epic-m.contract.json` | 26/05/2026 |
| `fase-2-commercial-governance.contract.json` | 29/05/2026 |
| `fase-3-platform-console.contract.json` | 29/05/2026 |
| `fase-3-rollout-enforcement.contract.json` | 29/05/2026 |
| `foundation-multitenant.contract.json` | 29/05/2026 |
| `publication-origin-rework.contract.json` | 26/05/2026 |

> **Observação:** Estes contratos são artefatos técnicos em JSON, não documentação legível pelo Obsidian. Há sobreposição temática com os `docs/*/contracts.md`. Ponto a validar: se são sincronizados ou independentes.

---

### 4.4 Pasta `lexora_brand_package/` — Assets de Marca

Contém identidade visual completa: SVGs do logo e ícone, PNGs em alta resolução (1024px, 512px, 256px), favicons em múltiplos tamanhos, previews dark/light e um `README.txt`. Criado em 02/04/2026 — sem atualizações posteriores.

---

### 4.5 Pasta `.codex/` — Agentes e Skills (Legado ou Ativo?)

Contém configurações de agentes em TOML e skills em YAML/Markdown, todos criados em 02/04/2026. Inclui:
- **Agentes:** `backend-integration-agent`, `brand-system-agent`, `data-architect`, `docs-reconciler`, `executive-visualization-agent`, `frontend-agent`, `juridico-screen-design-experience-agent`, `principal-orchestrator`, `review-governance-agent`, `test-qa-agent`, `ux-structural-agent`
- **Subpasta `legacy/`:** 3 agentes marcados explicitamente como legado: `legado-analista-lote`, `legado-explorador-mapa`, `legado-normalizador-ux`
- **Skills:** `dispatching-parallel-agents`, `frontend-design`, `frontend-skill`, `interface-design-system`, `juridico-brand-system-revalidation`, `juridico-data-contract-decision`, `juridico-doc-reconciliation`, `juridico-screen-design-experience-review`, `juridico-screen-final-validation`, `juridico-screen-structural-reorganization`, `playwright-interactive`, `subagent-driven-development`, `ui-ux-pro-max`, `verification-before-completion`

> **Ponto a validar:** Se estas skills Codex ainda são usadas ou se foram substituídas pelas skills do Claude Code (`.claude/`).

---

### 4.6 Artefatos Soltos na Raiz do Projeto

| Arquivo | Data | Tipo |
|---|---|---|
| `atendimentos-baseline.png` | 15/05/2026 | Screenshot — evidência de staging |
| `atendimentos-list-focus.png` | 15/05/2026 | Screenshot — evidência de staging |
| `atendimentos-staging-after-refine.png` | 15/05/2026 | Screenshot — evidência de staging |
| `atendimentos-snapshot.md` | 15/05/2026 | Snapshot textual de tela |
| `github-actions-page.png` | 14/05/2026 | Screenshot da CI GitHub Actions |
| `vercel-login-before-test.png` | 15/05/2026 | Screenshot Vercel pré-teste |
| `backend.log` | 26/05/2026 | Log de execução |
| `frontend-dev.log / .err.log` | 15/05/2026 | Logs de dev server |
| `frontend-dev-localhost.log / .err.log` | 15/05/2026 | Logs de dev server |
| `package.json` / `package-lock.json` | 14/05/2026 | Configuração do workspace raiz |
| `prisma.config.ts` | 14/05/2026 | Configuração Prisma raiz |
| `vercel.json` | 14/05/2026 | Configuração Vercel raiz |

---

### 4.7 Frontend — Arquivos Documentais Fora das Pastas de Docs

| Arquivo | Data | Tipo |
|---|---|---|
| `frontend/README.md` | 24/03/2026 | README do frontend (muito antigo) |
| `frontend/PLAYWRIGHT_INTERACTIVE_RESULTS.md` | 02/04/2026 | Resultados de testes Playwright interativos |
| `frontend/dashboard-screenshot-desktop.png` | 03/04/2026 | Screenshot de evidência |

---

## 5. Classificação Inicial dos Documentos

### Documentação Técnica
- `docs/fase-1-foundation/` (auth, domínio, migração, permissões)
- `docs/fase-2-commercial-governance/` (access enforcement, status policy)
- `docs/fase-3-platform-console/` (roles, audit)
- `docs/fase-3-rollout-enforcement/` (checklist, riscos, evidências)
- `docs/*/contracts.md` (contratos de API)
- `contracts/*.contract.json` (contratos JSON)
- `docs-juridico/26-Seguranca-HttpOnly-Cookie.md`
- `docs-juridico/30-Mapeamento-Tela-API-P0.md`
- `docs-juridico/31-Plano-Migracao-SQLite-Postgres-Grupo-A.md`

### Arquitetura
- `docs/skills/lexora-architecture.md`
- `docs/skills/lexora-api-contract.md`
- `docs-juridico/07-Modelagem-Dados.md`
- `docs/fase-1-foundation/domain-model.md`
- `docs/*/domain-model.md`

### UX / UI
- `docs/skills/lexora-ux-audit.md`
- `docs/skills/lexora-ux-journey.md`
- `docs/skills/lexora-ux-premium.md`
- `docs-juridico/01-Visao-Geral.md`
- `docs-juridico/02-Perfis.md`
- `docs-juridico/03-Dashboards.md`
- `docs-juridico/05-Navegacao.md`
- `docs-juridico/06-Wireframes.md`
- `docs-juridico/13-Analise-Contraste-Login.md`
- `docs-juridico/14-Revisao-Design-Login-Fechamento.md`
- `docs-juridico/15-Teste-Acessibilidade-Manual.md`
- `docs-juridico/21-Dashboard-Tecnico.md`
- `docs-juridico/22-Revisao-Login-v2.0.md`
- `docs-juridico/22-Revisao-Login-Completa-v1.1.md`
- `docs-juridico/24-Revisao-Dashboard-Completa.md`

### Design System
- `docs/skills/lexora-design-system.md`
- `docs-juridico/12-Identidade-Visual.md`
- `lexora_brand_package/` (assets visuais — fonte primária)

### Prompts / Skills / Agentes de IA
- `docs/skills/lexora-orchestrator.md`
- `docs/skills/lexora-feature-workflow.md`
- `.codex/agents/*.toml`
- `.codex/skills/*/SKILL.md`
- `.codex/skill-automations/*.md`

### Decisões Técnicas
- `docs-juridico/35-Decisao-Stack-Staging-MVP.md`
- `docs-juridico/36-Migracao-UI-Stack-Alvo.md`
- `docs-juridico/37-Governanca-UI-PR-Checklist.md`
- `docs/superpowers/plans/2026-05-16-triagem-publicacoes-automaticas.md`

### Evidências Visuais / Screenshots
- `frontend/test-screenshots/*.png` (9 imagens numeradas — geradas por testes)
- `atendimentos-baseline.png` / `atendimentos-list-focus.png` / `atendimentos-staging-after-refine.png` (na raiz)
- `github-actions-page.png` / `vercel-login-before-test.png` (na raiz)
- `frontend/dashboard-screenshot-desktop.png`
- `atendimentos-snapshot.md`

### Testes / QA
- `docs/*/qa.md`
- `docs-juridico/16-Relatorio-Validacao-Testes.md`
- `docs-juridico/28-Validacao-Telas-ADV-Full-Lifecycle.md`
- `docs-juridico/36-Validacao-Epic-9-10-Regressao.md`
- `frontend/PLAYWRIGHT_INTERACTIVE_RESULTS.md`
- `docs/skills/lexora-testing.md`
- `scripts/test-seed/README.md`

### Possível Legado (documentos com alta probabilidade de obsolescência)
- `docs-juridico/01` a `11` (criados em 02/04/2026 — 8 semanas antes do estado atual)
- `docs-juridico/17-Deploy-Checklist.md` (02/04/2026 — probavel superado pelo 33)
- `docs-juridico/21-Dashboard-Tecnico.md`
- `frontend/README.md` (24/03/2026 — mais antigo arquivo encontrado)
- `frontend/PLAYWRIGHT_INTERACTIVE_RESULTS.md` (02/04/2026)
- `.codex/agents/` (todos criados em 02/04/2026 — estrutura antiga de agentes)

### Possíveis Obsoletos (provável substituição identificada)
- `docs-juridico/19-Roadmap-Q1-Q2.md` → possivelmente superado pelos docs de fases
- `docs-juridico/10-Roadmap.md` → versão mais antiga que o 19
- `docs-juridico/11-Sprint.md` → sem equivalente claro nos docs novos, mas provavelmente não reflete o estado atual
- `docs-juridico/27-Proximas-Acoes-V1.2.md` → "próximas ações" de 02/04/2026 certamente obsoleto

### Ponto a Validar
- `docs/skills/*.md` — criados por agentes? manutenidos por humanos? sincronizados com o código real?
- `contracts/*.contract.json` vs `docs/*/contracts.md` — são fontes diferentes? qual é autoritativa?
- `docs-juridico/00-README.md` menciona que "documentos anteriores a 28 devem ser tratados como histórico quando conflitarem com o estado real do código" — o próprio README já declara obsolescência parcial interna.

---

## 6. Possíveis Conflitos e Duplicidades

### 6.1 Conflitos de Numeração em `docs-juridico/`

| Número | Arquivos Conflitantes |
|---|---|
| `22` | `22-Revisao-Login-v2.0.md`, `22-Revisao-Login-Completa-v1.1.md`, `22-Setup-Sentry-GA.md` (3 arquivos com mesmo número) |
| `23` | `23-Guia-Implementacao-O1-O3.md`, `23-Implementacao-O1-O2-O3-Completa.md`, `23-Sessao-Completa-v1.1.md` (3 arquivos com mesmo número) |
| `36` | `36-Migracao-UI-Stack-Alvo.md`, `36-Validacao-Epic-9-10-Regressao.md` (2 arquivos com mesmo número) |

> **Inferência:** O esquema de numeração foi expandido de forma descontrolada durante sessões de trabalho. Dois documentos de `22` e `23` parecem ser versões intermediárias/rascunhos, enquanto o terceiro seria o "completo". No caso do `36`, os temas são completamente diferentes — provável erro de numeração.

### 6.2 Possíveis Sobreposições Temáticas entre `docs/` e `docs-juridico/`

| Tema | Em `docs/` | Em `docs-juridico/` |
|---|---|---|
| Contratos de API | `docs/*/contracts.md` | `docs-juridico/30-Mapeamento-Tela-API-P0.md` |
| Modelo de domínio | `docs/*/domain-model.md` | `docs-juridico/07-Modelagem-Dados.md` |
| Permissões | `docs/fase-1-foundation/permissions-matrix.md` | `docs-juridico/04-Permissoes.md` |
| Deploy | `docs/skills/lexora-deploy.md` | `docs-juridico/17-Deploy-Checklist.md`, `18-Setup-Staging-Producao.md`, `33-Runbook-Staging-Deploy.md` |
| Design System | `docs/skills/lexora-design-system.md` | `docs-juridico/12-Identidade-Visual.md` |
| Arquitetura | `docs/skills/lexora-architecture.md` | `docs-juridico/07-Modelagem-Dados.md`, `20-Guia-Desenvolvimento.md` |
| Testes | `docs/skills/lexora-testing.md` | `docs-juridico/15-Teste-Acessibilidade-Manual.md`, `16-Relatorio-Validacao-Testes.md` |

### 6.3 Duplicidade de Contratos

Os contratos de API existem em dois formatos:
- `contracts/*.contract.json` — arquivos JSON estruturados (mais recentes: até 29/05/2026)
- `docs/*/contracts.md` — documentação textual (mais recente: até 29/05/2026)

> **Ponto a validar:** se um é gerado a partir do outro ou se são mantidos manualmente de forma independente.

---

## 7. Documentos que Não Devem Ser Considerados Fonte Oficial Ainda

Os documentos listados abaixo **não devem ser usados como fonte oficial** até validação explícita, pois há evidências de que podem não refletir o estado atual do código:

1. `docs-juridico/01` a `11` — criados em 02/04/2026, antes de múltiplas fases de desenvolvimento.
2. `docs-juridico/10-Roadmap.md` e `19-Roadmap-Q1-Q2.md` — roadmaps históricos, substituídos pela estrutura de epics/fases.
3. `docs-juridico/11-Sprint.md` — sprint de 02/04/2026.
4. `docs-juridico/17-Deploy-Checklist.md` — possivelmente superado pelo `33-Runbook-Staging-Deploy.md`.
5. `docs-juridico/21-Dashboard-Tecnico.md` — status técnico de 02/04/2026.
6. `docs-juridico/22-*` e `23-*` (versões parciais) — parecem ser rascunhos ou versões intermediárias.
7. `docs-juridico/27-Proximas-Acoes-V1.2.md` — "próximas ações" de 02/04/2026 — certamente desatualizadas.
8. `frontend/README.md` — o README mais antigo encontrado (24/03/2026).
9. `frontend/PLAYWRIGHT_INTERACTIVE_RESULTS.md` — resultados de 02/04/2026.
10. `.codex/agents/*.toml` — agentes criados em 02/04/2026 (exceto os em `legacy/` que já são marcados).
11. `docs-juridico/00-README.md` declara explicitamente: *"Documentos anteriores a 28 devem ser tratados como histórico quando conflitarem com o estado real do código"* — a própria documentação reconhece a obsolescência dos documentos 01 a 27.

---

## 8. Documentos com Possível Valor Histórico

Mesmo sendo obsoletos como fonte oficial, estes documentos **podem ser consultados para contexto histórico, decisões tomadas ou evolução do produto**:

| Documento | Valor Histórico |
|---|---|
| `docs-juridico/01-Visao-Geral.md` | Filosofia original do produto e intenções de design |
| `docs-juridico/02-Perfis.md` | Definição original dos perfis — comparar com estado atual |
| `docs-juridico/04-Permissoes.md` | Matriz de permissões original — comparar evolução |
| `docs-juridico/06-Wireframes.md` | Wireframes iniciais — arqueologia de UX |
| `docs-juridico/07-Modelagem-Dados.md` | Modelo de dados inicial — entender decisões de esquema |
| `docs-juridico/08-Agentes-e-Skills.md` | Visão inicial dos agentes — comparar com `.codex/agents/` atual |
| `docs-juridico/12-Identidade-Visual.md` | Primeira documentação da identidade visual do Lexora |
| `docs-juridico/13-Analise-Contraste-Login.md` | Decisões de acessibilidade da tela de login |
| `docs-juridico/28-Validacao-Telas-ADV-Full-Lifecycle.md` | Última validação completa antes dos epics — ponto de referência |
| `docs-juridico/35-Decisao-Stack-Staging-MVP.md` | Registro da decisão de stack de staging — valor de ADR |
| `.codex/skill-automations/*.md` | Automações configuradas — entender intenções originais |
| `lexora_brand_package/README.txt` | Documentação do pacote de marca |

---

## 9. Análise das Pastas de Teste e Screenshots

### 9.1 `frontend/test-results/`

- **Conteúdo encontrado:** 8 pastas geradas automaticamente pelo Playwright, cada uma com nome derivado do teste que falhou. Cada pasta contém um `error-context.md` (diagnóstico automático de falha).
- **Natureza:** Artefatos técnicos temporários, **gerados automaticamente** a cada execução de testes. Não são documentação intencional.
- **Recomendação conceitual:** Esta pasta **deve permanecer como artefato técnico**. Apenas eventuais falhas críticas ou evidências de regressão específicas poderiam ser documentadas no Obsidian como incidentes, nunca o conteúdo bruto.
- **Risco atual:** Esta pasta normalmente deveria estar no `.gitignore`. Verificar se está sendo comitada acidentalmente.

### 9.2 `test-results/` (raiz do projeto)

- **Conteúdo encontrado:** Apenas 1 arquivo: `.last-run.json` (metadado de última execução).
- **Natureza:** Artefato técnico mínimo de estado de execução de testes.
- **Recomendação conceitual:** Sem valor documental. Permanece como artefato técnico.

### 9.3 `frontend/test-screenshots/`

- **Conteúdo encontrado:** 9 screenshots sequencialmente numerados: `01-dashboard.png` até `08-mobile-640.png` (com `02b-notif-all-read.png`).
- **Nomenclatura:** Os nomes sugerem cobertura de telas específicas: dashboard, notificações, atalhos, menu do usuário, painel de perfil, configurações de WhatsApp, tablet (768px), mobile (640px).
- **Natureza:** Aparentam ser screenshots **gerados por testes de regressão visual** (Playwright) de forma programática, não capturas manuais.
- **Recomendação conceitual:** Estes screenshots têm **valor duplo**: como artefatos de regressão visual (técnico) e como evidência visual de telas para documentação UX. Futuramente, os mais representativos poderiam ser referenciados na documentação Obsidian como evidência do estado atual de telas específicas — mas não devem ser movidos da pasta técnica. Uma referência com link seria suficiente.

### 9.4 Arquivos Soltos na Raiz (Screenshots e Snapshots)

- `atendimentos-baseline.png`, `atendimentos-list-focus.png`, `atendimentos-staging-after-refine.png` — screenshots de sessão de refinamento de UX da tela de atendimentos, provavelmente capturados durante uma sessão de trabalho em 15/05/2026.
- `atendimentos-snapshot.md` — snapshot textual da mesma sessão.
- `github-actions-page.png` e `vercel-login-before-test.png` — evidências de CI e deploy.
- **Recomendação conceitual:** Estes arquivos têm **valor como evidência histórica de UX** e deveriam ser organizados em uma pasta dedicada no vault Obsidian (ex: `docs/evidencias/`) em uma etapa futura, não na raiz do projeto.

---

## 10. Riscos Atuais da Organização Documental

### Risco 1 — Dois Vaults Ativos

A existência de `.obsidian/` na raiz e `docs-juridico/.obsidian/` cria ambiguidade. Qualquer IA ou desenvolvedor pode estar trabalhando com um vault incompleto sem perceber. Links `[[internos]]` não se resolvem entre vaults.

### Risco 2 — Ausência de Fonte Única de Verdade

Não existe um documento oficial de "estado atual do projeto" que sintetize o que foi implementado, o que está em andamento e o que está planejado. Os dados estão distribuídos em `docs/fase-*/`, `docs-juridico/`, `contracts/` e o próprio código.

### Risco 3 — Documentação Legada Pode Ser Usada Como Fonte por IAs

IAs que receberem como contexto os arquivos de `docs-juridico/01` a `27` sem o aviso do `00-README.md` podem tomar decisões baseadas em dados de 02/04/2026, ignorando 8 semanas de desenvolvimento. O risco é especialmente alto para **permissões, modelo de dados e roadmap**.

### Risco 4 — Numeração Conflitante no docs-juridico

Três arquivos com número `22`, três com número `23` e dois com número `36` tornam qualquer referência por número ambígua. Um agente que receba a instrução "consulte o documento 22" não pode saber qual versão usar.

### Risco 5 — Contratos JSON vs Contratos Markdown

Os `contracts/*.contract.json` e `docs/*/contracts.md` provavelmente representam a mesma informação em formatos diferentes. Se não houver processo de sincronização, podem divergir — e um agente de backend pode usar um contrato diferente do que um agente de frontend está consultando.

### Risco 6 — Artefatos Técnicos na Raiz do Projeto

Screenshots, logs e snapshots soltos na raiz poluem o vault Obsidian (aparecem no grafo e na busca) e podem confundir agentes que buscam documentação.

### Risco 7 — Skills Codex vs Skills Claude Code

Existem skills em `.codex/skills/` (formato YAML/TOML para Codex/OpenAI) e presumivelmente skills em `.claude/` (formato para Claude Code). Se ambas existirem e conflitarem, agentes diferentes podem seguir instruções diferentes para o mesmo cenário.

---

## 11. Recomendação Inicial de Estratégia

> Esta seção é **conceitual** — nenhuma ação deve ser executada sem aprovação explícita do usuário.

### 11.1 Centralizar o Vault Oficial na Raiz do Projeto

O vault raiz (`C:\Users\tomke\app Juridico\.obsidian`) já é o vault ativo e correto. **Não é necessário mover nada.** A ação necessária é garantir que o vault `docs-juridico/.obsidian` seja tratado como inativo — isso pode ser feito simplesmente **não abrindo** aquela pasta como vault separado no Obsidian.

### 11.2 Arquivar Documentos Antigos como Legado

Criar uma pasta `docs-juridico/_legado/` (ou equivalente) e mover os documentos `01` a `27` para ela. O `00-README.md` já documenta que esses documentos devem ser tratados como histórico — formalizar isso na estrutura de pastas evita erros.

### 11.3 Criar Documentação Nova Baseada no Estado Real

Para cada módulo/feature atual, criar documentação nova em `docs/` consultando o código-fonte como fonte de verdade, não os documentos antigos de `docs-juridico/`. A estrutura de `docs/fase-*/` e `docs/epic-*/` já estabelece um padrão bom a seguir.

### 11.4 Evitar que Documentos Legados Sejam Usados Como Fonte Oficial

Adicionar um frontmatter explícito de `status: legado` e um aviso no início de cada arquivo legado. Considerar também um aviso no `00-README.md` mais visível.

### 11.5 Separar Artefatos Técnicos de Evidências Documentais

- `frontend/test-results/` → manter como artefato técnico, adicionar ao `.gitignore` se necessário.
- `frontend/test-screenshots/` → manter como artefato técnico; referenciar imagens relevantes por link em documentação UX.
- Screenshots soltos na raiz → organizar em `docs/evidencias/` em momento futuro, sem apagar os originais.

---

## 12. Próxima Etapa Sugerida

Após validação deste mapeamento pelo usuário, a próxima etapa recomendada é:

**KB-002 — Validação e Classificação Manual dos Documentos**

O usuário deve revisar este relatório e confirmar ou corrigir as classificações propostas, especialmente:
1. Confirmar quais documentos de `docs-juridico/` ainda têm valor e quais podem ser arquivados.
2. Confirmar se o vault `docs-juridico/.obsidian` deve ser desativado ou mantido.
3. Confirmar se os `contracts/*.contract.json` são autoritativos ou derivados dos `docs/*/contracts.md`.
4. Confirmar quais skills do `.codex/` ainda são usadas.

Somente após essa validação uma reorganização física (mover arquivos, criar pastas de legado) deve ser executada.

---

## 13. Validação Final da Entrega

| Critério | Status |
|---|---|
| Arquivo KB criado no caminho correto (`KB_001_DOCUMENTACAO_MAPEAMENTO_INICIAL_CURRENT_2026-05-29.md`) | ✅ Sim |
| Apenas este arquivo novo foi criado | ✅ Sim — apenas o arquivo KB_001 foi criado |
| Nenhum arquivo foi movido | ✅ Confirmado — apenas leitura |
| Nenhum arquivo foi apagado | ✅ Confirmado — apenas leitura |
| Nenhum arquivo foi renomeado | ✅ Confirmado — apenas leitura |
| Nenhum documento existente foi alterado | ✅ Confirmado — apenas leitura |
| Nenhum código foi alterado | ✅ Confirmado — apenas leitura |
| Nenhuma configuração do Obsidian foi alterada | ✅ Confirmado — apenas leitura |
| Nenhuma skill foi instalada | ✅ Confirmado |
| Nenhuma reorganização foi executada | ✅ Confirmado |

---

*Relatório gerado em 2026-05-29. Baseado exclusivamente na leitura da estrutura de pastas e arquivos do projeto — nenhuma alteração foi realizada.*
