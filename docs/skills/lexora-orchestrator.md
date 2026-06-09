# Lexora — Orquestração de Agentes IA

> Skill: define como agentes IA devem coordenar trabalho, seguir pipelines e interagir com o workspace do projeto Lexora.

---

## 1. Propósito

Este documento é a referência para:
- Agentes IA que trabalham no Lexora (Gemini, Claude, Codex, etc.)
- Definição de papéis e responsabilidades de cada agente
- Pipeline correto para implementação de features e correções
- Regras de workspace, branching e coordenação multi-agente

---

## 2. Mapa do Workspace

```
c:\Users\tomke\app Juridico\
├── backend/                          # Express + Prisma (Node 22)
│   ├── src/main.ts                   # 8218 linhas — monolito principal
│   ├── src/<modulo>/                 # Módulos extraídos (finance, ai, bi, etc.)
│   ├── prisma/schema.prisma          # Schema Prisma (PostgreSQL)
│   ├── tests/                        # Testes CJS (Node --test)
│   └── package.json                  # Scripts: build, dev, prisma:*
├── frontend/                         # React 19 + Vite + Tailwind
│   ├── src/api.ts                    # 2020 linhas — API client monolítico
│   ├── src/App.tsx                   # 681 linhas — Router + Shell
│   ├── src/tokens.css                # 625 linhas — Design tokens
│   ├── src/components/               # Componentes por feature
│   ├── *.smoke.test.ts               # Playwright smoke tests (raiz de frontend/)
│   └── package.json                  # Scripts: build, dev, test:smoke
├── contracts/                        # 12 JSONs de contrato API
├── docs/                             # Documentação por epic
│   ├── epic-a/ ... epic-klm/         # Docs de cada epic
│   ├── fase-1/ ... fase-3/           # Docs de fases de plataforma
│   ├── skills/                       # Skill files para agentes
│   └── superpowers/                  # Guias avançados
├── prisma.config.ts                  # Proxy de workspace → delega para backend/prisma/
├── scripts/                          # Scripts utilitários
├── .github/workflows/ci.yml          # CI: build + Playwright smoke
├── vercel.json                       # Deploy frontend (Vercel)
└── package.json                      # Workspace orchestrator
```

### 2.1 Arquivos Críticos (Alto Impacto)

| Arquivo | Impacto | Risco |
|---------|---------|-------|
| [main.ts](file:///c:/Users/tomke/app%20Juridico/backend/src/main.ts) | 🔴 Altíssimo | 8218 linhas — qualquer mudança pode afetar tudo |
| [api.ts](file:///c:/Users/tomke/app%20Juridico/frontend/src/api.ts) | 🔴 Alto | Todas as interfaces + chamadas API |
| [schema.prisma](file:///c:/Users/tomke/app%20Juridico/backend/prisma/schema.prisma) | 🔴 Alto | Migrações destrutivas podem perder dados |
| [App.tsx](file:///c:/Users/tomke/app%20Juridico/frontend/src/App.tsx) | 🟡 Médio | Router + auth — mudanças afetam navegação |
| [tokens.css](file:///c:/Users/tomke/app%20Juridico/frontend/src/tokens.css) | 🟡 Médio | Design tokens — mudanças afetam todo visual |
| [ci.yml](file:///c:/Users/tomke/app%20Juridico/.github/workflows/ci.yml) | 🟡 Médio | Pipeline de CI — falha bloqueia deploys |

---

## 3. Papéis de Agentes

### 3.1 Agent: Architect (Planejamento)

**Responsabilidade:** Planejamento de alto nível, decisões de design e contratos.

**Pode fazer:**
- Editar arquivos em `contracts/` e `docs/`
- Criar/editar skill files em `docs/skills/`
- Propor mudanças no schema Prisma
- Definir contratos de API (input/output/errors)
- Criar planos de implementação

**Não pode fazer:**
- Editar código de produção diretamente
- Fazer commits em main/develop

### 3.2 Agent: Backend (Implementação)

**Responsabilidade:** Implementação de rotas, serviços e repositórios.

**Pode fazer:**
- Criar módulos em `backend/src/<modulo>/`
- Implementar `register*Routes()`, services, repositories
- Criar migrations Prisma
- Editar `main.ts` APENAS para adicionar `register*Routes()`

**Não pode fazer:**
- Adicionar rotas inline no main.ts
- Modificar interfaces do `api.ts`
- Alterar components do frontend

### 3.3 Agent: Frontend (UI/UX)

**Responsabilidade:** Componentes React, páginas e integração com API.

**Pode fazer:**
- Criar/editar components em `frontend/src/`
- Adicionar interfaces e métodos ao `api.ts`
- Criar/editar estilos CSS
- Implementar lazy routes no App.tsx

**Não pode fazer:**
- Alterar backend code
- Modificar schema Prisma
- Alterar contratos JSON

### 3.4 Agent: QA (Validação)

**Responsabilidade:** Testes e validação de smoke.

**Pode fazer:**
- Criar/editar testes em `frontend/ (*.smoke.test.ts na raiz de frontend/)`
- Rodar `npm run test:smoke`
- Verificar CI pipeline
- Validar contratos (JSON vs implementação)

### 3.5 Agent: Full-Stack (quando necessário)

Em tarefas pequenas, um único agente pode assumir todos os papéis, seguindo a pipeline da seção 4.

---

## 4. Pipeline de Implementação

### 4.1 Pipeline Padrão

```mermaid
graph LR
  A["1. Pesquisa<br/>Codebase"] --> B["2. Contrato<br/>JSON"]
  B --> C["3. Backend<br/>Routes + Service"]
  C --> D["4. Frontend<br/>Interface + UI"]
  D --> E["5. Smoke Test<br/>Playwright"]
  E --> F["6. CI/CD<br/>Push + Deploy"]
```

### 4.2 Detalhamento de Cada Etapa

#### Etapa 1 — Pesquisa (OBRIGATÓRIA)

Antes de qualquer mudança, pesquise:
1. **Contrato existente**: Verifique `contracts/*.contract.json` relevante
2. **Rotas existentes**: Busque no `main.ts` se a rota já existe
3. **Interfaces existentes**: Busque no `api.ts` se o tipo já existe
4. **Módulo existente**: Verifique se há módulo extraído em `backend/src/<modulo>/`
5. **Docs do epic**: Leia `docs/epic-<letra>/` para contexto
6. **Skills**: Leia skills relevantes em `docs/skills/`

```powershell
# Comandos úteis para pesquisa
Select-String -Path "backend\src\main.ts" -Pattern "/minha-rota" -SimpleMatch
Select-String -Path "frontend\src\api.ts" -Pattern "ApiMinhaEntidade"
Get-ChildItem "backend\src" -Directory | Select-Object Name
```

#### Etapa 2 — Contrato

1. Atualize o JSON do contrato com input/output/errors
2. Defina `idempotencyKey` se for mutação
3. Documente códigos de erro novos

#### Etapa 3 — Backend

1. Crie/atualize DomainError com `code`, `statusCode`
2. Crie interface de Repository + PrismaImpl + InMemoryImpl
3. Crie Service com injeção de dependências
4. Crie `register*Routes()` com autenticação e try/catch
5. Registre no `main.ts` (final do arquivo)

#### Etapa 4 — Frontend

1. Adicione interface TypeScript no `api.ts`
2. Adicione método no objeto `api`
3. Crie/atualize componentes React com lazy loading
4. Use design tokens e componentes UI existentes

#### Etapa 5 — Smoke Test

1. Crie teste Playwright em `frontend/ (*.smoke.test.ts na raiz de frontend/)`
2. Verifique que as rotas existentes não quebraram
3. Rode localmente antes de push

#### Etapa 6 — CI/CD

O CI roda automaticamente em push para `main`, `develop`, `codex/**`:
- Build backend (TypeScript → dist/)
- Build frontend (Vite → dist/)
- Prisma migrations
- Playwright smoke tests

---

## 5. CI/CD — Detalhes

### 5.1 Pipeline CI ([ci.yml](file:///c:/Users/tomke/app%20Juridico/.github/workflows/ci.yml))

```yaml
# Triggers
on:
  push:
    branches: [main, develop, "codex/**"]
  pull_request:

# Ambiente
services:
  postgres: postgres:16
env:
  DATABASE_URL: postgresql://postgres:postgres@localhost:5432/juridico_ci
  NODE_VERSION: 22

# Steps
1. npm ci (backend + frontend)
2. npm run build (backend + frontend)
3. Validate Epic CDE docs
4. npx prisma migrate deploy
5. npx playwright install chromium
6. Start backend + frontend
7. Run smoke tests
8. Run Epic CDE smoke tests
9. Upload artifacts (on failure)
```

### 5.2 Deploy

| Componente | Plataforma | Config |
|------------|-----------|--------|
| Frontend | Vercel | [vercel.json](file:///c:/Users/tomke/app%20Juridico/vercel.json) — SPA rewrite, security headers |
| Backend | Render | `VITE_API_URL=https://juridico-api-staging.onrender.com` |
| Database | PostgreSQL 16 | Managed (Render/Supabase) |

### 5.3 Variáveis de Ambiente

```
DATABASE_URL          # PostgreSQL connection string
JWT_SECRET            # Segredo para assinar JWTs
VITE_API_URL          # URL do backend (frontend build-time)
FRONTEND_URL          # URL do frontend (CORS no backend)
FINANCE_SCHEDULER_ENABLED  # Liga scheduler de cobrança
AI_PROVIDER           # Provider de IA (openai/mock)
```

---

## 6. Documentação por Epic

A documentação está organizada em [docs/](file:///c:/Users/tomke/app%20Juridico/docs):

| Diretório | Escopo | Contratos |
|-----------|--------|-----------|
| [epic-a/](file:///c:/Users/tomke/app%20Juridico/docs/epic-a) | Publicações Automáticas | `epic-a-publications.contract.json` |
| [epic-b/](file:///c:/Users/tomke/app%20Juridico/docs/epic-b) | Financeiro Real | `epic-b-finance.contract.json` |
| [epic-cde/](file:///c:/Users/tomke/app%20Juridico/docs/epic-cde) | Triagem + Documentos + Comunicação | `epic-fgh.contract.json` |
| [epic-fgh/](file:///c:/Users/tomke/app%20Juridico/docs/epic-fgh) | Triagem + Documentos + Clientes | `epic-fgh.contract.json` |
| [epic-ij/](file:///c:/Users/tomke/app%20Juridico/docs/epic-ij) | Tarefas + Atendimentos + Equipe | `epic-ij.contract.json` |
| [epic-klm/](file:///c:/Users/tomke/app%20Juridico/docs/epic-klm) | IA + BI + Mobile/Timesheet | `epic-k, epic-l-bi, epic-m.contract.json` |
| [fase-1-foundation/](file:///c:/Users/tomke/app%20Juridico/docs/fase-1-foundation) | Foundation Multi-tenant | `foundation-multitenant.contract.json` |
| [fase-2-commercial-governance/](file:///c:/Users/tomke/app%20Juridico/docs/fase-2-commercial-governance) | Governança Comercial | `fase-2-commercial-governance.contract.json` |
| [fase-3-platform-console/](file:///c:/Users/tomke/app%20Juridico/docs/fase-3-platform-console) | Console da Plataforma | `fase-3-platform-console.contract.json` |
| [fase-3-rollout-enforcement/](file:///c:/Users/tomke/app%20Juridico/docs/fase-3-rollout-enforcement) | Rollout + Enforcement | `fase-3-rollout-enforcement.contract.json` |
| [publication-origin-rework/](file:///c:/Users/tomke/app%20Juridico/docs/publication-origin-rework) | Rework de Publicações | `publication-origin-rework.contract.json` |

Cada epic contém:
- `overview.md` — Visão geral e escopo
- `contracts.md` — Detalhamento de contratos
- `changelog.md` — Histórico de mudanças
- `runbook.md` — Guia operacional
- `qa.md` — Critérios de teste
- `security-model.md` — Modelo de segurança (quando aplicável)

---

## 7. Regras de Coordenação Multi-Agente

### 7.1 Locks Implícitos

> [!WARNING]
> Nunca edite o mesmo arquivo em paralelo. Respeite os locks:

| Arquivo | Lock exclusivo para |
|---------|-------------------|
| `main.ts` | 1 agente por vez |
| `api.ts` | 1 agente por vez |
| `schema.prisma` | 1 agente por vez |
| `App.tsx` | 1 agente por vez |
| `tokens.css` | 1 agente por vez |
| `ci.yml` | 1 agente por vez |
| Qualquer `*.contract.json` | 1 agente por vez |

### 7.2 Comunicação entre Agentes

Quando dois agentes precisam coordenar:
1. **Defina o contrato primeiro** — O agente Architect cria o contrato JSON
2. **Backend implementa** — Com base no contrato
3. **Frontend consome** — Com base nas interfaces do contrato
4. **Nunca assuma** — Se a interface não está no `api.ts`, ela não existe

### 7.3 Resolução de Conflitos

1. O contrato JSON é a **verdade canônica** — em caso de dúvida, siga o contrato
2. O backend define o formato real da resposta via `build*Payload()`
3. O frontend deve ser **tolerante** a campos extras (aditivo)
4. Em caso de conflito de merge, o agente Architect arbitra

---

## 8. Convenções de Branch

```
main          ← Produção (protegido)
develop       ← Integração contínua
codex/<nome>  ← Branches de agentes IA
feature/<X>   ← Features manuais
fix/<X>       ← Correções
```

> [!IMPORTANT]
> O CI roda em `main`, `develop` e `codex/**`. Sempre faça push para uma branch `codex/<seu-nome>` para validar via CI antes de mergear.

---

## 9. Comandos Essenciais

### Backend
```powershell
# Desenvolvimento
cd backend
npm run dev                           # Inicia com nodemon + ts-node
npm run build                         # Compila TypeScript para dist/
npm run prisma:generate               # Gera Prisma Client
npm run prisma:migrate:dev            # Cria migration (dev)
npm run prisma:migrate:deploy         # Aplica migrations (prod/CI)
```

### Frontend
```powershell
# Desenvolvimento
cd frontend
npm run dev                           # Vite dev server (port 5173)
npm run build                         # Build de produção
npm run test:smoke                    # Playwright smoke tests
npx playwright test <arquivo>.test.ts # Teste específico
```

### Workspace (raiz)
```powershell
# Orchestrator
npm run backend:build                 # Build backend via workspace
npm run frontend:build                # Build frontend via workspace
npm run frontend:test:smoke           # Smoke tests via workspace
```

---

## 10. Anti-Padrões de Agente

> [!CAUTION]
> **NÃO FAÇA:**
> - Alterar código sem pesquisar o codebase primeiro
> - Criar interfaces/tipos duplicados que já existem no `api.ts`
> - Ignorar o contrato JSON e inventar payloads
> - Fazer múltiplas alterações em `main.ts` de uma vez
> - Criar features sem smoke test correspondente
> - Assumir que o banco está disponível — use padrão InMemory fallback
> - Fazer push direto para `main`
> - Editar o mesmo arquivo de outro agente em paralelo
> - Remover campos existentes de qualquer payload
> - Alterar migrations já aplicadas em produção

---

## 11. Checklist do Agente

### Antes de começar qualquer tarefa:
- [ ] Li o contrato JSON relevante
- [ ] Pesquisei rotas existentes no `main.ts`
- [ ] Pesquisei interfaces existentes no `api.ts`
- [ ] Li a documentação do epic correspondente
- [ ] Li as skills relevantes (`lexora-api-contract.md`, `lexora-architecture.md`, `lexora-design-system.md`)

### Antes de submeter código:
- [ ] Build do backend compila sem erros
- [ ] Build do frontend compila sem erros
- [ ] Não adicionei rotas inline no main.ts
- [ ] Usei `register*Routes()` para módulos novos
- [ ] Interfaces novas seguem padrão `ApiXxx`
- [ ] Erros novos têm `code` e `statusCode`
- [ ] Campos são aditivos (não removi nada)
- [ ] Smoke test verifica o fluxo novo
- [ ] Push feito para branch `codex/<nome>` (não main)
