---
tipo: kb
status: current
projeto: lexora
fase: inventario-tecnico
area: estrutura-geral-configuracoes
data: 2026-05-29
fonte: claude-code
baseado_em:
  - '[[00_START_HERE]]'
  - '[[SETUP_001_ESTRUTURA_LEXORA_MEMORY_DOCS_CURRENT_2026-05-29]]'
  - '[[KB_001_DOCUMENTACAO_MAPEAMENTO_INICIAL_CURRENT_2026-05-29]]'
  - '[[KB_002_GOVERNANCA_DOCUMENTAL_OFICIAL_CURRENT_2026-05-29]]'
escopo: estrutura-geral-configuracoes
vault_oficial: 'C:\Users\tomke\app Juridico\!_lexora-memory-docs'
autoridade: inventario-tecnico
---

# KB-003A — Estrutura Geral e Configurações do Projeto

> [!important] Fonte primária: código e estrutura real
> Este documento foi produzido exclusivamente a partir da leitura direta de arquivos, pastas e configurações do projeto. Documentação legada não foi usada como fonte.

---

## 1. Resumo Executivo

O projeto Lexora é um **SaaS jurídico fullstack** organizado como **monorepo coordenado** (não workspace npm formal), com dois pacotes independentes: `frontend/` e `backend/`, orquestrados por um `package.json` raiz que usa scripts com `--prefix` para delegar comandos.

### Organização principal
- **Frontend:** React **19.2.4** + Vite **8.x** + TypeScript **~5.9.3** + React Router DOM **7.13.2** + Tailwind CSS **3.4.17** + Radix UI — SPA hospedada no Vercel.
- **Backend:** Express.js puro (`express@5.2.1`) + Prisma ORM + PostgreSQL — hospedado no Render (staging confirmado; produção a validar). Pacotes NestJS instalados, mas sem uso aparente no fluxo HTTP principal — ver callout abaixo e [[KB_003C_BACKEND_E_APIS_ESTADO_ATUAL_CURRENT_2026-05-30]].
- **Banco de dados:** PostgreSQL em produção e CI; SQLite legado (`dev.db`) ainda presente localmente.
- **CI/CD:** GitHub Actions (`ci.yml`) com build, migração, Playwright smoke tests — ativo em branches `main`, `develop` e `codex/**`.
- **Contratos:** 12 arquivos JSON em `contracts/` cobrem epics e fases — paralelismo não validado com `docs/*/contracts.md`.
- **Documentação técnica ativa:** `docs/` com estrutura por epic/fase + `docs/skills/` com referências de arquitetura.
- **Memória oficial:** `!_lexora-memory-docs/` — vault Obsidian criado nas etapas anteriores.

> [!important] Correção factual da stack frontend — UPDATE-KB-003A-003B (2026-05-29)
> A versão anterior deste documento citava **React 18** por inferência, sem verificar o `package.json`. Após validação cruzada com `frontend/package.json` e com o KB-003B, foi confirmado que o frontend usa **React 19.2.4**, React DOM 19.2.4, React Router DOM 7.13.2, Vite 8.x e TypeScript ~5.9.3. Esta correção não altera o escopo do KB-003A — apenas corrige a stack registrada.

> [!important] Correção factual da arquitetura backend — UPDATE-KB-003A-003C (2026-05-30)
> A versão anterior deste documento descrevia o backend como **Express/NestJS híbrido**. Após o [[KB_003C_BACKEND_E_APIS_ESTADO_ATUAL_CURRENT_2026-05-30]], confirmado por leitura direta de `backend/src/main.ts` e `backend/package.json`, o servidor HTTP principal é **Express.js puro** (`express@5.2.1`), com todos os endpoints definidos inline em `main.ts` (~8.500 linhas) e alguns módulos delegados via funções `register*Routes()`. Os pacotes NestJS (`@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express`, `@nestjs/cli`) estão instalados no `backend/package.json`, mas não foram identificados como parte do fluxo HTTP principal. Esta correção não remove a necessidade de validar o papel dessas dependências — apenas corrige a descrição arquitetural vigente.

### Validação manual da Vercel — 2026-05-29

> [!important] Fato confirmado
> Validação manual no painel da Vercel confirmou: **Root Directory = `./`**, **Production Branch = `codex/baseline-postgres-staging`** e **Build Command de Production injeta explicitamente `VITE_API_URL=https://juridico-api-staging.onrender.com`**. O risco de Production consumir backend de staging está **confirmado** — não é mais suspeita.

- `vercel.json` da **raiz** é o candidato ativo principal (Root Directory = `./`).
- `frontend/vercel.json` é provável configuração legada/inativa.
- Production Branch atual: `codex/baseline-postgres-staging` — não é `main`.
- Output Directory confirmado: `frontend/dist`.
- Install Command confirmado: `npm ci && npm --prefix frontend ci`.

### Riscos estruturais identificados
- `prisma/schema.prisma` na raiz é legado (02/04/2026) — o schema atual está em `backend/prisma/`.
- `backend/prisma/dev.db` (SQLite) ainda presente localmente.
- `node_modules/` na raiz contém apenas 26 pacotes — ausência de workspace formal.
- Arquivos soltos na raiz (logs, screenshots, snapshots, `KB_001`) poluem o repositório.
- Dois `vercel.json` com datas diferentes (raiz e `frontend/`).
- URL do backend de staging hardcoded no `vercel.json` raiz.
- `.codex/` e `.obsidian/` na raiz estão no `.gitignore` — mas existem localmente.

---

## 2. Objetivo do Documento

Este documento serve como **base de referência estrutural** para os próximos inventários técnicos por área:

| Inventário | Área |
|---|---|
| [[KB_003B_FRONTEND_ESTADO_ATUAL]] (a criar) | Frontend — componentes, rotas, estado, telas |
| [[KB_003C_BACKEND_E_APIS_ESTADO_ATUAL]] (a criar) | Backend — módulos, rotas, serviços, main.ts |
| [[KB_003D_DADOS_PRISMA_E_CONTRATOS]] (a criar) | Prisma schema, migrations, contratos JSON |
| [[KB_003E_TESTES_QA_E_EVIDENCIAS]] (a criar) | Playwright, smoke tests, evidências |
| [[KB_003F_IA_AGENTES_E_AUTOMACOES]] (a criar) | .claude, .codex, skills, agentes, workflows |
| [[KB_003G_RISCOS_TECNICOS_E_DIVERGENCIAS]] (a criar) | Consolidação de riscos e divergências |

---

## 3. Escopo e Fora do Escopo

### Analisado nesta etapa

- Estrutura de pastas da raiz
- Arquivos de configuração da raiz e de `frontend/` e `backend/` (primeiro nível)
- `package.json` de todos os três pacotes (raiz, frontend, backend)
- `vercel.json` raiz e frontend
- `prisma.config.ts` raiz e backend
- `.gitignore` raiz
- `.env.example` de frontend e backend
- `vite.config.ts` do frontend
- `.github/workflows/ci.yml`
- `.claude/`, `.codex/` (estrutura)
- `.playwright-mcp/` (inventário)
- `contracts/`, `docs/`, `scripts/`, `media/`, `lexora_brand_package/` (nível superficial)
- Artefatos soltos na raiz
- `test-results/` e `node_modules/` (existência e papel)

### Fora do escopo desta etapa

- Componentes internos do frontend (`src/components/`)
- Rotas internas do backend (controllers, services, providers)
- Schema Prisma em profundidade
- Contratos JSON em profundidade
- Testes Playwright e seus resultados
- UX/UI e telas
- Design System e tokens
- Skills e agentes em detalhe

---

## 4. Estrutura Geral da Raiz

| Item | Tipo | Papel provável | Fonte oficial? | Observações | Ponto a validar |
|---|---|---|---|---|---|
| `!_lexora-memory-docs/` | Pasta | Vault Obsidian oficial — memória do projeto | Sim | Criado no SETUP-001 | — |
| `frontend/` | Pasta | Pacote React/Vite — SPA do Lexora | Sim (código) | Tem `package.json` próprio | — |
| `backend/` | Pasta | Pacote Express.js puro — API do Lexora | Sim (código) | Tem `package.json` próprio; NestJS instalado mas sem uso aparente no fluxo HTTP principal | Ver [[KB_003C_BACKEND_E_APIS_ESTADO_ATUAL_CURRENT_2026-05-30]] |
| `contracts/` | Pasta | Contratos de API por epic/fase (JSON) | Ponto a validar | 12 arquivos JSON — relação com `docs/*/contracts.md` não validada | Qual é fonte autoritativa: JSON ou Markdown? |
| `docs/` | Pasta | Documentação técnica por epic/fase + skills | Ponto a validar | Estruturada, mais recente que docs-juridico, mas não validada contra código | Verificar no KB-003B/C/D |
| `prisma/` | Pasta | Schema Prisma **legado** da raiz | Não | `schema.prisma` de 02/04/2026 — schema real está em `backend/prisma/` | Remover ou confirmar que é legado |
| `scripts/` | Pasta | Seeds de teste para CI | Sim (técnico) | Contém apenas `test-seed/epic-cde.seed.json` e README | — |
| `.claude/` | Pasta | Configuração Claude Code — settings, skills, launch | Técnico/ativo | `settings.json` atualizado 29/05/2026 | Verificar skills em KB-003F |
| `.codex/` | Pasta | Agentes e skills Codex/OpenAI — **legado provável** | Não (até validação) | Criado em 02/04/2026; no `.gitignore` | Validar uso ativo com usuário |
| `.github/` | Pasta | GitHub Actions CI/CD | Sim (técnico) | Workflow `ci.yml` ativo | — |
| `.git/` | Pasta | Repositório Git | Técnico | — | — |
| `.obsidian/` | Pasta | Config vault Obsidian **legado** da raiz | Não | Decisão D3 do KB-002: inativo | Não usar |
| `.playwright-mcp/` | Pasta | Logs e snapshots do Playwright MCP | Técnico | 19 logs + 11 snapshots YML — de sessões de mai/2026 | Limpar em momento oportuno |
| `lexora_brand_package/` | Pasta | Assets de identidade visual da marca | Sim (design) | SVG, PNG, favicon — criado 02/04/2026 | Documentar no KB Design System |
| `media/` | Pasta | Assets de mídia | Técnico | `fundo_login.mp4` — background de login | No `.gitignore` — confirmar se em produção |
| `node_modules/` | Pasta | Dependências npm da raiz | Técnico | Apenas 26 pacotes — coordenador sem workspace formal | — |
| `test-results/` | Pasta | Resultado de testes (raiz) | Técnico | Apenas `.last-run.json` | No `.gitignore` |
| `package.json` | Arquivo | Orchestrator scripts raiz | Sim | Coordena frontend e backend via `--prefix` | — |
| `package-lock.json` | Arquivo | Lockfile npm da raiz | Técnico | Atualizado 12/05/2026 | — |
| `vercel.json` | Arquivo | Configuração de deploy no Vercel | Sim (deploy) | Build frontend; backend no Render (staging hardcoded) | URL de prod do backend? |
| `prisma.config.ts` | Arquivo | Config Prisma da raiz — delega ao backend | Técnico | Aponta para `backend/prisma/` | Verificar se é usado em prod |
| `.gitignore` | Arquivo | Regras de exclusão do git | Sim | Bem estruturado; exclui `.codex/`, `.obsidian/`, `test-results/`, `media/` | — |
| `.env` | Arquivo | Variáveis de ambiente locais | Segredo | Existe; conteúdo não lido | Não commitar |
| `atendimentos-*.png` (3) | Arquivo | Screenshots soltos de sessão de trabalho | Não | De 15/05/2026 — evidências de UX sem indexação | Organizar em `99 - Arquivo/evidencias-antigas` |
| `atendimentos-snapshot.md` | Arquivo | Snapshot textual de tela — solto | Não | De 15/05/2026 — sem frontmatter | Indexar ou arquivar |
| `github-actions-page.png` | Arquivo | Screenshot da CI GitHub Actions | Não | De 14/05/2026 — evidência histórica | Arquivar |
| `vercel-login-before-test.png` | Arquivo | Screenshot Vercel pré-teste | Não | De 15/05/2026 — evidência histórica | Arquivar |
| `backend.log` | Arquivo | Log de execução do backend | Técnico | De 26/05/2026 — sem valor documental | Ignorar/limpar |
| `frontend-dev*.log` (4) | Arquivo | Logs de dev server do frontend | Técnico | De 15/05/2026 — artefatos de sessão | Ignorar/limpar |
| `KB_001_...CURRENT.md` | Arquivo | Cópia do KB-001 na raiz | Duplicata | Original criado antes do vault existir; cópia oficial em `01 - KB/` | Pode ser removido da raiz |

---

## 5. Organização Técnica Inferida

### Fatos confirmados

- O projeto tem **dois pacotes independentes**: `frontend/` e `backend/`, cada um com `package.json` e `package-lock.json` próprios.
- A raiz tem um `package.json` de **coordenação** com scripts que delegam via `npm --prefix`.
- Não há campo `workspaces` no `package.json` raiz — **não é um npm workspace formal**.
- O `vercel.json` raiz confirma que o frontend vai para **Vercel** e o backend tem URL em `https://juridico-api-staging.onrender.com` (Render).
- O CI (`ci.yml`) instala, builda e testa ambos os pacotes separadamente.
- O Prisma tem **dois pontos de entrada**: `prisma.config.ts` na raiz (delega para `backend/prisma/`) e `backend/prisma.config.ts` próprio.
- O `backend/prisma/dev.db` é um arquivo SQLite ainda presente localmente.
- O `scripts/` contém apenas seed de teste para CI (`epic-cde.seed.json`).
- **Root Directory da Vercel confirmado como `./`** — o projeto aponta para a raiz do repositório.
- **Production Branch confirmada como `codex/baseline-postgres-staging`** — não é `main` nem `develop`.
- **Build Command de Production confirmado:** `VITE_API_URL=https://juridico-api-staging.onrender.com npm run frontend:build`.
- **Output Directory confirmado:** `frontend/dist`.
- **Install Command confirmado:** `npm ci && npm --prefix frontend ci`.
- `vercel.json` da raiz é o arquivo de configuração ativo no Vercel (Root Directory = `./`).
- `frontend/vercel.json` é provável legado/inativo — sem evidência de projeto Vercel separado apontando para `frontend/`.

### Inferências

> [!warning] Inferências — não verificadas diretamente no código

- A arquitetura parece ser de **deploy separado**: frontend é uma SPA estática (Vercel), backend é um servidor Express/Node (Render ou equivalente). São desacoplados no deploy.
- O `node_modules/` na raiz com 26 pacotes provavelmente contém apenas dependências globais mínimas (dotenv, prisma, etc.) usadas pelo `prisma.config.ts` raiz.
- A pasta `prisma/` raiz com `schema.prisma` de 02/04/2026 parece ser um **resquício legado** de quando o Prisma era gerenciado na raiz. Atualmente, o schema real está em `backend/prisma/schema.prisma`.
- A ausência de arquivo `.env.example` na raiz (existe no backend e no frontend) sugere que a raiz não tem variáveis de ambiente próprias além das propagadas por `prisma.config.ts`.

### Pontos a validar

- ~~Confirmar qual `vercel.json` o Vercel usa~~ → **Resolvido:** raiz é o ativo (Root Directory = `./`).
- ~~URL do backend hardcoded~~ → **Confirmado como risco real** — ver R1 atualizado na seção 13.
- Definir se `codex/baseline-postgres-staging` deve continuar como Production Branch ou migrar para `main`.
- Definir URL oficial da API em **produção** (diferente da URL de staging).
- Decidir se `frontend/vercel.json` deve ser removido ou arquivado.
- Confirmar se `prisma.config.ts` raiz ainda é usado ou se foi substituído pelo `backend/prisma.config.ts`.
- Confirmar se `prisma/schema.prisma` da raiz pode ser removido com segurança.
- Confirmar a relação exata entre `contracts/*.json` e `docs/*/contracts.md`.

---

## 6. Arquivos de Configuração da Raiz

| Arquivo | Papel | Principais informações encontradas | Impacto | Ponto a validar |
|---|---|---|---|---|
| `package.json` (raiz) | Orchestrator — scripts de coordenação | Scripts: `backend:build`, `backend:prisma:*`, `frontend:build`, `frontend:lint`, `frontend:test:smoke` | Alto | Confirmar se todos os scripts estão sendo usados |
| `package-lock.json` (raiz) | Lockfile npm raiz | Atualizado 12/05/2026 | Médio | Pode estar desatualizado se deps da raiz mudaram |
| `vercel.json` (raiz) | **Configuração Vercel ativa** (Root Directory = `./`) | Build: `VITE_API_URL=...onrender.com npm run frontend:build`; Output: `frontend/dist`; SPA rewrite; headers de cache e segurança | **Alto** | ⚠️ URL backend staging hardcoded no buildCommand — **risco confirmado (R1)** |
| `prisma.config.ts` (raiz) | Config Prisma delegando ao backend | `schema: backend/prisma/schema.prisma`; migrations: `backend/prisma/migrations`; `DATABASE_URL` de env | Médio | Confirmar se é usado ou redundante com `backend/prisma.config.ts` |
| `.gitignore` (raiz) | Regras de exclusão git | Exclui: `node_modules`, `dist`, `*.log`, `.env*`, `.codex/`, `.obsidian/`, `test-results/`, `media/`, `backend/prisma/dev.db` | Alto | Confirmar que arquivos sensíveis nunca foram commitados |
| `.env` (raiz) | Variáveis de ambiente locais | Existe — conteúdo não lido | Alto (segredo) | Não deve existir no git |
| `vercel.json` (frontend) | Config Vercel **provável legado/inativo** (02/04/2026) | SPA rewrite básico sem headers de segurança; Root Directory da Vercel = `./`, portanto este arquivo não é o ativo | Médio | ✅ Validação manual indica que raiz é o diretório ativo — confirmar remoção ou arquivamento |
| `vite.config.ts` | Build tool do frontend | React plugin; alias `@` → `./src` | Médio | — |
| `tsconfig.json` (frontend) | TypeScript raiz do frontend | Referencia `tsconfig.app.json` e `tsconfig.node.json` | Baixo | — |
| `tsconfig.json` (backend) | TypeScript do backend | Atualizado 29/05/2026 | Baixo | — |
| `eslint.config.js` | Linting do frontend | ESLint com plugins React Hooks e React Refresh | Baixo | — |
| `components.json` | Config shadcn/ui | Tailwind + Radix UI + aliases | Médio | Confirmar versão do shadcn/ui |
| `tailwind.config.ts` | Configuração Tailwind CSS | 17/05/2026 | Baixo | — |
| `postcss.config.cjs` | PostCSS para Tailwind | 17/05/2026 | Baixo | — |
| `backend/prisma.config.ts` | Config Prisma do backend | 02/04/2026 — pode ser legado | Médio | Verificar se é o arquivo ativo ou se é substituído pelo da raiz |
| `.github/workflows/ci.yml` | GitHub Actions CI | Node 22; Postgres 16; build, migrate, smoke tests | **Alto** | Ver seção 8 |

---

## 7. Package Manager, Scripts e Dependências de Alto Nível

### Package manager

- **npm** — confirmado por `package-lock.json` em todos os níveis.
- **Sem workspaces formais** — raiz usa `--prefix` para orquestrar.
- Node.js: **22** na CI; versão local não verificada diretamente.

### Scripts da raiz

| Script | Tipo | Papel | Observações |
|---|---|---|---|
| `backend:build` | Build | Compila o backend TypeScript | Delega para `backend/` |
| `backend:prisma:generate` | Prisma | Gera o client Prisma | — |
| `backend:prisma:migrate:dev` | Prisma | Cria e aplica migration (dev) | Requer banco de dados local |
| `backend:prisma:migrate:deploy` | Prisma | Aplica migrations (produção) | Usado no CI |
| `frontend:build` | Build | Compila o frontend Vite | Delega para `frontend/` |
| `frontend:lint` | Qualidade | Roda ESLint no frontend | — |
| `frontend:test:smoke` | Testes | Roda smoke tests Playwright | Delega para `frontend/` |
| `test` | CI placeholder | `echo "Error: no test specified"` | **Ponto de atenção** — sem teste centralizado |

### Frontend — dependências de alto nível

| Dependência | Tipo | Papel | Observações | Ponto a validar |
|---|---|---|---|---|
| `react@^19.2.4`, `react-dom@^19.2.4` | Prod | Framework UI principal | **React 19** — corrige inferência anterior de React 18 | Confirmar compatibilidade de todas as libs com React 19 |
| `react-router-dom@^7.13.2` | Prod | Roteamento SPA | Router v7 (breaking changes vs v6) | — |
| `@radix-ui/*` (9 pacotes) | Prod | Componentes UI acessíveis (shadcn/ui) | — | — |
| `lucide-react@^1.7.0` | Prod | Ícones | Versão recente | — |
| `class-variance-authority@^0.7.1`, `clsx@^2.1.1`, `tailwind-merge@^3.6.0` | Prod | Utilitários de classes CSS (padrão shadcn/ui) | — | — |
| `tailwindcss@^3.4.17` | Dev | Framework CSS | v3 (não v4) | — |
| `vite@^8.0.1`, `@vitejs/plugin-react@^6.0.1` | Dev | Build tool | **Vite 8** — versão muito recente | Monitorar estabilidade |
| `typescript@~5.9.3`, `typescript-eslint@^8.57.0` | Dev | TypeScript e linting | Versão recente | — |
| `@types/node@^24.12.0` | Dev | Tipos Node.js | Node 24 | — |
| `@playwright/test@^1.59.1` | Dev | Testes E2E | Versão recente | — |

### Backend — dependências de alto nível

> [!important] Correção factual — UPDATE-KB-003A-003C (2026-05-30)
> O servidor HTTP do backend é **Express.js puro** (`express@5.2.1`). Os pacotes NestJS estão instalados como dependências, mas **não foram identificados como parte do fluxo HTTP principal** após leitura direta de `backend/src/main.ts`. O ponto de entrada real é `main.ts` (~8.500 linhas), um monolito Express com endpoints definidos inline e alguns módulos delegados via `register*Routes()`. Validar posteriormente o papel das dependências NestJS (legado, preparação futura ou uso interno não HTTP).

| Dependência | Tipo | Papel |
|---|---|---|
| `express@5.2.1` | Prod | **Framework HTTP principal** — Express.js puro; confirmado por `main.ts` |
| `@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express` | Prod | Pacotes NestJS instalados — **sem uso aparente no fluxo HTTP principal** |
| `@prisma/client`, `prisma` | Prod | ORM PostgreSQL |
| `jsonwebtoken` | Prod | Autenticação JWT |
| `bcrypt` | Prod | Hash de senhas |
| `cors` | Prod | CORS middleware |
| `reflect-metadata`, `rxjs` | Prod | Dependências NestJS — instaladas mas papel a confirmar |
| `ts-node-dev` | Prod | Dev server com hot reload |
| `@nestjs/cli` | Prod | CLI do NestJS — **em `dependencies` de produção** (ponto de atenção — BL-012) |
| `typescript@^6.0.2` | Prod | TypeScript 6 — versão muito recente; `ignoreDeprecations: "6.0"` em tsconfig |
| `@types/express`, `pg` | Dev | Tipos TypeScript e driver PostgreSQL |

> [!warning] `@nestjs/cli` em `dependencies` de produção — BL-012
> `@nestjs/cli` está em `dependencies` (não `devDependencies`) do backend. Aumenta o bundle de produção desnecessariamente. Relacionado ao item **BL-012** no backlog. A decisão de mover ou remover NestJS deve ser tomada após validar o papel dessas dependências — não nesta etapa.

---

## 8. Build, Deploy e Ambiente

| Arquivo/Pasta | Papel | Evidência encontrada | Risco | Ponto a validar |
|---|---|---|---|---|
| `vercel.json` (raiz) | Deploy do **frontend** no Vercel | `buildCommand`, `outputDirectory: frontend/dist`, rewrites SPA, headers de segurança | **Alto** | URL do backend de staging hardcoded; confirmar URL de prod |
| `frontend/vercel.json` | Config Vercel **antiga** do frontend | SPA rewrite simples, sem headers de segurança — data 02/04/2026 | Médio | Pode conflitar com `vercel.json` raiz — qual o Vercel usa? |
| `.github/workflows/ci.yml` | CI/CD GitHub Actions | Triggers: `main`, `develop`, `codex/**`; Node 22; Postgres 16; build + migrate + smoke | Alto | Workflow ativo e funcional baseado na estrutura atual |
| `backend/.env` | Ambiente backend local | Existe (29/05/2026) — não lido | Alto (segredo) | Confirmar que nunca foi commitado |
| `backend/.env.example` | Template de env do backend | PORT, JWT_SECRET, DATABASE_URL (Postgres), DATAJUD_API_KEY, FINANCE_* | Médio | Confirmar se todas as vars de prod estão documentadas |
| `frontend/.env.example` | Template de env do frontend | VITE_API_URL, VITE_SENTRY_DSN, VITE_GA_MEASUREMENT_ID (dev/staging/prod) | Médio | Sentry e GA não configurados (vazios) — confirmar se ativos em prod |
| `frontend/dist/` | Output de build do frontend | Existe (29/05/2026) | Técnico | No `.gitignore` — build local presente |
| `backend/dist/` | Output de build do backend | Existe (27/05/2026) | Técnico | No `.gitignore` — build local presente |
| `backend/prisma/migrations/` | Histórico de migrations Postgres | Existe (29/05/2026) | Alto | Fonte de verdade do schema evolutivo — documentar no KB-003D |
| `backend/prisma/dev.db` | SQLite local legado | Existe (12/05/2026) | Médio | No `.gitignore`; não deve ir para CI — confirmar que não interfere |
| `backend/prisma/schema.postgres.prisma` | Schema alternativo Postgres | Existe (14/05/2026) | Ponto a validar | Relação com `schema.prisma` principal — possível artefato de migração |

### CI/CD — detalhamento do `ci.yml`

```
Triggers: push em main, develop, codex/**; pull_request
Ambiente: Ubuntu Latest, Node 22, Postgres 16
Passos:
  1. Checkout
  2. Setup Node (cache npm: backend e frontend lockfiles)
  3. npm ci (backend)
  4. npm ci (frontend)
  5. build (backend)
  6. build (frontend)
  7. Validate Epic CDE docs + seed (node --test)
  8. Prisma migrate deploy
  9. Playwright install (chromium)
  10. Start backend (nohup)
  11. Start frontend (nohup)
  12. Wait for backend (curl 30s)
  13. Wait for frontend (curl 40s)
  14. Run smoke tests (frontend)
  15. Run epic-cde smoke test (Playwright)
  16. Upload artifacts (test-results, playwright-report, backend.log, frontend.log)
```

### Deploy — modelo inferido

```
Frontend → Vercel (SPA estática)
             ↓ build: Vite → frontend/dist
             ↓ VITE_API_URL aponta para backend

Backend  → Render (staging: juridico-api-staging.onrender.com)
             ↓ Express.js puro (main.ts ~8.500 linhas)
             ↓ Postgres (banco externo)
```

### Validação manual da Vercel — 2026-05-29

> [!important] Fatos confirmados pelo usuário via painel da Vercel
> Estes valores foram observados diretamente no painel do projeto Vercel. São fatos, não inferências.

| Item validado | Valor observado | Conclusão |
|---|---|---|
| Root Directory | `./` | `vercel.json` da raiz é o arquivo de configuração ativo |
| Production Branch | `codex/baseline-postgres-staging` | Production não rastreia `main` — risco operacional |
| Production Domain | `juridico-tau.vercel.app` | Domínio de produção atual confirmado |
| Build Command | `VITE_API_URL=https://juridico-api-staging.onrender.com npm run frontend:build` | ⚠️ URL de staging hardcoded no build de Production — **risco confirmado** |
| Output Directory | `frontend/dist` | Consistente com `vercel.json` raiz — correto |
| Install Command | `npm ci && npm --prefix frontend ci` | Consistente com `vercel.json` raiz — correto |

**Implicação imediata:** O domínio `juridico-tau.vercel.app` (Production) está sendo servido com `VITE_API_URL` apontando para `juridico-api-staging.onrender.com`. O frontend de produção consome a API de staging — a menos que haja variável de ambiente do Vercel sobrescrevendo o valor no ambiente Production (a confirmar).

---

## 9. Documentação, Memória e Legado

| Local | Status documental | Papel | Pode orientar decisões? | Observações |
|---|---|---|---|---|
| `!_lexora-memory-docs/` | **Oficial (current)** | Vault Obsidian oficial — memória do projeto | **Sim** | Fonte de verdade documental |
| `docs/` | Ponto a validar | Documentação técnica por epic/fase + skills | Apenas após validação | Mais recente que docs-juridico, mas não validada contra código |
| `docs/skills/` | Ponto a validar | Referências de arquitetura, UX, deploy para agentes | Apenas após validação | Arquivos com data 29/05/2026 — possivelmente atualizados por agentes |
| `99 - Arquivo/documentacao-legada/docs-juridico/` | **Legado (archived)** | 44 docs de 02/04/2026 a 17/05/2026 | **Não** | Arquivado no ARCHIVE-001 |
| `99 - Arquivo/documentacao-legada/vaults-antigos/` | **Legado (archived)** | Config `.obsidian` antigo de docs-juridico | **Não** | Arquivado no ARCHIVE-001 |
| `KB_001_...md` (raiz) | Duplicata | Cópia do KB-001 antes do vault existir | Não (usar a cópia no vault) | Original em `01 - Knowledge Base` é a cópia oficial |
| `atendimentos-snapshot.md` | Artefato solto | Snapshot textual de sessão de mai/2026 | Não | Sem frontmatter; sem status; solto na raiz |
| `contracts/` | Ponto a validar | Contratos de API JSON por epic/fase | Apenas após comparação | Relação com `docs/*/contracts.md` não validada |

---

## 10. IA, Agentes e Automações Visíveis na Raiz

| Item | Tipo | Papel provável | Status de confiança | Próximo passo |
|---|---|---|---|---|
| `.claude/` | Config Claude Code | Settings, skills, launch.json para Claude Code | Ativo — confiável | Verificar skills em KB-003F |
| `.claude/settings.json` | Config | Configurações Claude Code (29/05/2026) | Atual | — |
| `.claude/settings.local.json` | Config local | Configurações locais (29/05/2026) | Atual | Não commitar |
| `.claude/skills/` | Skills Claude Code | Skills instaladas para este projeto | A verificar | KB-003F |
| `.claude/launch.json` | Config | Configuração de launch (26/05/2026) | A verificar | — |
| `.codex/` | Config Codex/OpenAI | Agentes e skills em TOML/YAML (02/04/2026) | **Legado provável** | Validar uso ativo; no `.gitignore` |
| `.codex/config.toml` | Config | Configuração Codex raiz (27/03/2026) | **Legado** | — |
| `.codex/agents/` | Agentes | 11 agentes + subpasta `legacy/` (02/04/2026) | **Legado provável** | Validar com usuário |
| `.codex/skills/` | Skills | 13 skills Codex (02/04/2026) | **Legado provável** | Validar com usuário |
| `.codex/skill-automations/` | Automações | 7 automações Codex (02/04/2026) | **Legado provável** | Validar com usuário |
| `.github/workflows/ci.yml` | CI/CD | Pipeline GitHub Actions ativo | **Ativo e confiável** | Documentar em KB-003E |
| `.playwright-mcp/` | Logs MCP | 19 logs + 11 snapshots de sessões mai/2026 | Artefato técnico | Limpar quando conveniente |
| `docs/skills/` | Skills de documentação | Referências de arquitetura para IAs (10 arquivos) | Ponto a validar | Verificar consistência com código no KB-003F |

---

## 11. Artefatos Técnicos Soltos

| Artefato | Tipo | Local | Deve permanecer? | Recomendação futura |
|---|---|---|---|---|
| `atendimentos-baseline.png` | Screenshot de UX | Raiz | Não (raiz) | Indexar em `11 - Testes e Evidências` ou arquivar em `99 - Arquivo/evidencias-antigas` |
| `atendimentos-list-focus.png` | Screenshot de UX | Raiz | Não (raiz) | Idem |
| `atendimentos-staging-after-refine.png` | Screenshot de UX | Raiz | Não (raiz) | Idem |
| `atendimentos-snapshot.md` | Snapshot textual | Raiz | Não (raiz) | Promover para `08 - UX UI` com frontmatter, ou arquivar |
| `github-actions-page.png` | Screenshot CI | Raiz | Não (raiz) | Arquivar em `99 - Arquivo/evidencias-antigas` |
| `vercel-login-before-test.png` | Screenshot deploy | Raiz | Não (raiz) | Arquivar |
| `KB_001_...CURRENT.md` | Documento duplicata | Raiz | Não (raiz) | Cópia oficial está no vault; este pode ser removido |
| `backend.log` (raiz) | Log de execução | Raiz | Não | Ignorar; no `.gitignore` |
| `frontend-dev*.log` (4) | Logs dev server | Raiz | Não | Ignorar; no `.gitignore` |
| `frontend/test-results/` | Artefatos Playwright | Frontend | Técnico — sim | Manter; no `.gitignore`; não mover |
| `frontend/test-screenshots/` | Screenshots de regressão | Frontend | Técnico — sim | Manter como artefato; referenciar em evidências futuras |
| `test-results/` (raiz) | Metadado de testes | Raiz | Técnico | Apenas `.last-run.json`; no `.gitignore` |
| `.playwright-mcp/` | Logs do Playwright MCP | Raiz | Técnico — transitório | Limpar quando conveniente |
| `backend/*.log` (múltiplos) | Logs de execução backend | Backend raiz | Não | No `.gitignore`; sem valor permanente |
| `frontend/dashboard-screenshot-desktop.png` | Screenshot de UX | Frontend raiz | Não | No `.gitignore`; artefato de sessão antiga |

---

## 12. Divergências e Incertezas

| Divergência/Incerteza | Evidência | Impacto | Recomendação | Prioridade |
|---|---|---|---|---|
| ~~Dois `vercel.json` com propósitos sobrepostos~~ → **Parcialmente resolvido** | Root Directory = `./` confirmado — `vercel.json` raiz é o ativo; `frontend/vercel.json` é legado/inativo | Médio | Remover ou arquivar `frontend/vercel.json` para eliminar ambiguidade | Alta |
| ~~URL do backend de staging hardcoded~~ → **CONFIRMADO como risco real** | Validação manual da Vercel: Build Command de Production usa `VITE_API_URL=https://juridico-api-staging.onrender.com` | **P0 — Production pode consumir API de staging** | Remover URL do buildCommand; configurar `VITE_API_URL` por ambiente nas env vars da Vercel | **P0 / Alta** |
| Production Branch = `codex/baseline-postgres-staging` (não `main`) | Validação manual da Vercel | **Alto** — branch de staging como Production; mudanças em `main` não chegam a Production automaticamente | Definir estratégia de branching: migrar Production para `main` ou manter branch de release | Alta |
| `prisma/schema.prisma` raiz vs `backend/prisma/schema.prisma` | Raiz tem schema de 02/04/2026; backend tem o atual | Médio — risco de confusão para IAs e devs | Confirmar que a raiz é legado; documentar e remover em etapa futura | Alta |
| Dois `prisma.config.ts` (raiz e backend) | Ambos existem; raiz delega para backend | Médio | Confirmar qual é o ponto de entrada em produção | Média |
| `backend/prisma/dev.db` (SQLite) ainda presente | Arquivo no diretório backend | Médio — não deve ir para CI ou staging | Confirmar que está no `.gitignore` e não interfere | Média |
| `@nestjs/cli` em `dependencies` (não `devDependencies`) | `backend/package.json` | Baixo-Médio — aumenta bundle de produção | Mover para `devDependencies` — relacionado ao BL-012 | Baixa |
| ~~Descrição do backend como Express/NestJS híbrido~~ → **CORRIGIDO — UPDATE-KB-003A-003C** | KB-003C confirmou Express puro em `backend/src/main.ts`; NestJS instalado mas sem uso aparente no fluxo HTTP principal | Médio — informação incorreta pode induzir IAs e devs a erros arquiteturais | Corrigido neste documento. Ponto residual: validar papel real das dependências NestJS (legado, preparação futura ou uso interno não HTTP) | **Resolvido / P1 residual** |
| `contracts/` JSON vs `docs/*/contracts.md` | Dois formatos descrevendo contratos por epic | Alto — qual é autoritativo? | Comparar e definir fonte única (KB-003D) | Alta |
| `docs/skills/` com timestamps de 29/05/2026 | Arquivos atualizados hoje — por agente? | Médio — podem não refletir código real | Validar conteúdo de cada skill no KB-003F | Média |
| `tmp_hash.js` em `backend/` | Arquivo presente; no `.gitignore` | Baixo | Confirmar que está ignorado e não é funcional | Baixa |
| `backend/prisma/schema.postgres.prisma` | Arquivo adicional ao `schema.prisma` principal | Médio — artefato de migração? | Verificar no KB-003D | Média |

---

## 13. Riscos Estruturais Iniciais

### Alta Prioridade

**R1 — ⚠️ CONFIRMADO: URL de staging hardcoded no Build Command de Production**
- Status: **Risco confirmado** — validação manual do painel Vercel em 2026-05-29.
- Descrição: O Build Command de Production no Vercel injeta explicitamente `VITE_API_URL=https://juridico-api-staging.onrender.com`. Isso significa que o frontend de `juridico-tau.vercel.app` (Production) está buildado para consumir a API de staging — a menos que haja uma variável de ambiente `VITE_API_URL` no nível do ambiente Production do Vercel sobrescrevendo o valor (ainda não confirmado).
- Evidência: Painel Vercel → Production Overrides → Build Command: `VITE_API_URL=https://juridico-api-staging.onrender.com npm run frontend:build`
- Impacto: **Crítico** — usuários reais em `juridico-tau.vercel.app` podem estar consumindo dados de staging; qualquer instabilidade ou limpeza da API de staging afeta Production diretamente.
- Recomendação:
  1. Verificar imediatamente se há `VITE_API_URL` configurado nas Environment Variables do Vercel para o ambiente Production (isso seria um override que protege do buildCommand).
  2. Remover `VITE_API_URL` do `buildCommand` no `vercel.json`.
  3. Configurar `VITE_API_URL` por ambiente nas Environment Variables do Vercel (Production → URL real; Preview → URL staging).
  4. Definir e registrar a URL oficial da API de produção.
- Prioridade: **P0 — ação imediata recomendada**.
- Próximo passo: Criar item P0 no `13 - Backlog`.

**R2 — ✅ PARCIALMENTE RESOLVIDO: `vercel.json` ativo identificado**
- Status: **Incerteza parcialmente resolvida** — Root Directory = `./` confirmado.
- Descrição: O Root Directory da Vercel está confirmado como `./`. Portanto, o `vercel.json` da raiz do repositório é o arquivo de configuração ativo. O `frontend/vercel.json` (02/04/2026) é provável legado/inativo — não há evidência de projeto Vercel separado apontando para `frontend/`.
- Evidência: Painel Vercel → Root Directory = `./`
- Impacto residual: `frontend/vercel.json` ainda existe no repositório e pode causar confusão para desenvolvedores e IAs que não souberem desta validação.
- Recomendação: Remover ou arquivar `frontend/vercel.json` para eliminar ambiguidade permanentemente.
- Próximo passo: Decisão do usuário sobre destino do `frontend/vercel.json`.

**R3 — Contratos em dois formatos sem fonte autoritativa definida**
- Descrição: Contratos de API existem como JSON (`contracts/`) e como Markdown (`docs/*/contracts.md`). Não há indicação de qual é gerado a partir do qual, ou qual é a fonte de verdade.
- Evidência: 12 JSON em `contracts/`; arquivos `contracts.md` em cada pasta de epic/fase em `docs/`.
- Impacto: Backend e frontend podem estar implementando contratos diferentes.
- Recomendação: Definir fonte única; documentar no KB-003D após comparação.
- Próximo passo: KB-003D — Dados, Prisma e Contratos.

**R4 — `prisma/schema.prisma` legado na raiz do projeto**
- Descrição: A raiz tem `prisma/schema.prisma` de 02/04/2026, provavelmente o schema inicial antes da migração para `backend/prisma/`.
- Evidência: Data 02/04/2026; `prisma.config.ts` da raiz já aponta para `backend/prisma/`.
- Impacto: Confusão para IAs e desenvolvedores; potencial uso acidental do schema errado.
- Recomendação: Confirmar que é legado e remover em etapa futura.
- Próximo passo: Validar no KB-003D.

### Média Prioridade

**R5 — `backend/prisma/dev.db` (SQLite) presente localmente**
- Descrição: Arquivo SQLite ainda presente no backend, possivelmente de desenvolvimento anterior à migração para Postgres.
- Evidência: Arquivo `dev.db` de 12/05/2026; no `.gitignore`.
- Impacto: Baixo se no `.gitignore`; risco de uso acidental se `DATABASE_URL` não estiver configurada.
- Recomendação: Confirmar que está no `.gitignore` e que `DATABASE_URL` sempre é definida.

**R6 — `docs/` não validada contra o código atual**
- Descrição: A pasta `docs/` contém documentação técnica por epics/fases que pode ou não refletir o estado atual do backend e frontend.
- Evidência: Pasta existe, estruturada, com dados de mai/2026 — mas não foi comparada ao código.
- Impacto: IAs podem usar `docs/` como fonte oficial sem validação.
- Recomendação: Validar nos KB-003B (frontend), KB-003C (backend) e KB-003D (contratos).

**R7 — `.codex/` não validado e fora do git**
- Descrição: Pasta de agentes e skills criada em 02/04/2026, explicitamente no `.gitignore`, sem validação de uso atual.
- Evidência: Criação em 02/04/2026; no `.gitignore`; KB-002 classifica como legado provável.
- Impacto: Agentes podem estar ativos ou obsoletos — não se sabe sem validação.
- Recomendação: Validar com usuário no KB-003F.

### Baixa Prioridade

**R8 — Artefatos soltos na raiz**
- Descrição: Screenshots, logs e snapshot textual soltos na raiz do projeto.
- Evidência: 3 PNGs, 4 logs, 1 MD, 1 cópia do KB-001 — todos na raiz.
- Impacto: Poluem o repositório e o vault Obsidian (aparecem na busca).
- Recomendação: Organizar ou arquivar em etapa futura controlada.

**R9 — `@nestjs/cli` em `dependencies` do backend**
- Descrição: CLI do NestJS listado em dependências de produção.
- Evidência: `backend/package.json`.
- Impacto: Aumenta o bundle de produção sem necessidade.
- Recomendação: Mover para `devDependencies`.

---

## 14. Recomendações Iniciais

### Organização Estrutural
1. Remover ou arquivar `prisma/schema.prisma` da raiz após confirmação de que é legado.
2. Remover `KB_001_...CURRENT.md` da raiz (cópia oficial está no vault).
3. Organizar artefatos soltos (screenshots, logs, snapshot) em pastas específicas ou arquivá-los.
4. Considerar remover `frontend/vercel.json` se confirmado que o `vercel.json` raiz é o ativo.

### Configurações
1. **[P0]** Verificar se há `VITE_API_URL` nas Environment Variables do Vercel para o ambiente Production — se não houver, Production está consumindo staging.
2. **[P0]** Remover `VITE_API_URL` do `buildCommand` no `vercel.json` raiz.
3. **[P0]** Configurar `VITE_API_URL` por ambiente nas Environment Variables do Vercel: Production → URL real da API; Preview → URL staging.
4. **[P0]** Definir e registrar a URL oficial da API de produção (atualmente desconhecida).
5. Definir se Production Branch deve continuar como `codex/baseline-postgres-staging` ou migrar para `main`/branch de release estável.
6. Remover ou arquivar `frontend/vercel.json` — confirmado como provável legado (Root Directory = `./`).
7. Mover `@nestjs/cli` para `devDependencies` no `backend/package.json`.
8. Confirmar relação entre `prisma.config.ts` da raiz e do backend.

### Documentação
1. Documentar relação entre contratos JSON e Markdown como prioridade no KB-003D.
2. Validar conteúdo de `docs/skills/` contra código atual no KB-003F.
3. Verificar se `docs/` pode ser promovida para fonte oficial ou deve permanecer como referência.

### IA e Automações
1. Validar com usuário quais skills e agentes do `.codex/` estão em uso ativo.
2. Documentar skills do `.claude/` no KB-003F.
3. Registrar regras de uso de `docs/skills/` para IAs após validação.

### Artefatos Técnicos
1. Limpar `.playwright-mcp/` quando conveniente (logs de sessões antigas).
2. Limpar logs de backend da pasta raiz do projeto.
3. Avaliar arquivamento dos screenshots soltos em `99 - Arquivo/evidencias-antigas`.

---

## 15. Próximos Inventários Recomendados

| Ordem | Inventário | Escopo principal | Por que agora |
|---|---|---|---|
| 1 | **KB-003B — Frontend Estado Atual** | Componentes, rotas, telas, estado, App.tsx | Base para validar docs/ e contratos |
| 2 | **KB-003C — Backend e APIs Estado Atual** | main.ts, módulos, rotas, services, auth | Entender o monolito antes de comparar contratos |
| 3 | **KB-003D — Dados, Prisma e Contratos** | schema.prisma, migrations, contratos JSON vs MD | Resolver divergência de fontes de contrato |
| 4 | **KB-003E — Testes, QA e Evidências** | Playwright, smoke tests, CI resultados | Confirmar cobertura e baseline atual |
| 5 | **KB-003F — IA, Agentes e Automações** | .claude, .codex, docs/skills, workflows | Resolver status de skills e agentes |
| 6 | **KB-003G — Riscos Técnicos e Divergências** | Consolidação de R1–R9 e divergências | Fechar o ciclo de inventário |
| 7 | **KB-004 — Product Discovery Lexora** | Módulos funcionais, perfis, roadmap atual | Após entender o código real |
| 8 | **KB-005 — Inventário Funcional e UX/UI das Telas** | Telas implementadas, fluxos, gaps de UX | Após KB-003B e KB-004 |
| 9 | **KB-006 — Design System e Constituição Visual** | Tokens, componentes, Tailwind, brand package | Após KB-003B e KB-005 |

---

## 16. Limitações desta Etapa

> [!note] O que o KB-003A NÃO faz

- **Não analisa internamente** o código do frontend, backend, schema Prisma ou contratos.
- **Não valida** se `docs/` reflete o código atual.
- **Não executa** nenhum script, build ou teste.
- **Não instala** nenhum pacote ou plugin.
- **Não resolve** as divergências identificadas — apenas as registra.
- **Não substitui** os inventários KB-003B a KB-003G, que tratarão cada área em profundidade.

---

## 17. Validação Final

| Item validado | Resultado |
|---|---|
| Vault oficial existe | **Sim** |
| `00_START_HERE.md` encontrado | **Sim** |
| `SETUP_001` encontrado | **Sim** |
| `KB_001` encontrado | **Sim** |
| `KB_002` encontrado | **Sim** |
| `ARCHIVE_001` encontrado | **Sim** |
| KB-003A criado no caminho correto | **Sim** |
| Apenas o KB-003A foi criado | **Sim** |
| Algum arquivo existente foi sobrescrito | **Não** |
| Alguma pasta `.obsidian` foi alterada | **Não** |
| Algum código foi alterado | **Não** |
| Alguma configuração foi alterada | **Não** |
| Algum script foi executado | **Não** |
| Algum pacote foi instalado | **Não** |

### Arquivo criado
- `03 - Arquitetura/KB_003A_ESTRUTURA_GERAL_E_CONFIGURACOES_CURRENT_2026-05-29.md`

### Atualizações aplicadas neste documento
- **UPDATE-KB-003A (2026-05-29):** Validação manual do painel Vercel pelo usuário — Root Directory, Production Branch, Build Command, Output Directory e Install Command confirmados. R1 elevado a confirmado. R2 parcialmente resolvido. Seções 1, 5, 6, 8, 12, 13, 14 e 17 atualizadas.
- **UPDATE-KB-003A-003B (2026-05-29):** Correção factual da stack frontend — React 18 substituído por React 19.2.4 (confirmado no `frontend/package.json`). Versões de Vite 8.x, TypeScript ~5.9.3 e React Router DOM 7.13.2 registradas. Tabela de dependências do frontend expandida com versões reais. Seções 1 e 7 atualizadas.
- **UPDATE-KB-003A-003C (2026-05-30):** Correção factual da arquitetura backend — descrição "Express/NestJS híbrido" substituída por "Express.js puro (`express@5.2.1`)". Confirmado por leitura direta de `backend/src/main.ts` e `backend/package.json` no contexto do KB-003C. Ponto residual registrado: validar papel real das dependências NestJS instaladas. Seções 1, 4, 7, 8, 12 e 17 atualizadas.

### Arquivos consultados (lidos diretamente)
- `!_lexora-memory-docs/00_START_HERE.md`
- `!_lexora-memory-docs/01 - Knowledge Base/SETUP_001_*.md` (existência)
- `!_lexora-memory-docs/01 - Knowledge Base/KB_001_*.md` (existência)
- `!_lexora-memory-docs/01 - Knowledge Base/KB_002_*.md` (existência)
- `!_lexora-memory-docs/01 - Knowledge Base/ARCHIVE_001_*.md` (existência)
- `package.json` (raiz, frontend, backend)
- `vercel.json` (raiz)
- `frontend/vercel.json` (existência confirmada)
- `prisma.config.ts` (raiz)
- `backend/.env.example`
- `frontend/.env.example`
- `frontend/vite.config.ts`
- `.github/workflows/ci.yml`
- `.gitignore` (raiz)
- **Painel Vercel** — validação manual fornecida pelo usuário em 2026-05-29 (Root Directory, Production Branch, Build Command, Output Directory, Install Command)
- `frontend/package.json` — leitura direta para correção da stack (UPDATE-KB-003A-003B)
- `frontend/package-lock.json` — existência confirmada
- `05 - Frontend/KB_003B_FRONTEND_ESTADO_ATUAL_CURRENT_2026-05-29.md` — validação cruzada de stack
- `06 - Backend e APIs/KB_003C_BACKEND_E_APIS_ESTADO_ATUAL_CURRENT_2026-05-30.md` — contexto para UPDATE-KB-003A-003C
- `backend/package.json` — leitura apenas para contexto (UPDATE-KB-003A-003C)
- `backend/src/main.ts` — leitura apenas para contexto (UPDATE-KB-003A-003C)

### Pastas analisadas
- Raiz completa (primeiro nível)
- `frontend/` (primeiro nível)
- `backend/` (primeiro nível)
- `backend/src/` (primeiro nível — nomes de módulos)
- `backend/prisma/` (primeiro nível)
- `frontend/src/` (primeiro nível)
- `contracts/`, `docs/`, `scripts/`, `media/`, `lexora_brand_package/`, `.claude/`, `.codex/`, `.github/`, `.playwright-mcp/`

### Pontos que precisam de validação do usuário

1. **[P0] Verificar Environment Variables do Vercel** — há `VITE_API_URL` configurado para o ambiente Production? Se não houver, Production está consumindo staging agora.
2. **[P0] Definir URL oficial da API de produção** — necessária para configurar as env vars do Vercel corretamente.
3. **Definir Production Branch** — manter `codex/baseline-postgres-staging` ou migrar para `main`?
4. **Decidir destino do `frontend/vercel.json`** — remover, arquivar em `99 - Arquivo` ou manter?
5. **`prisma/schema.prisma` da raiz** — confirmar que é legado e pode ser removido.
6. **Contratos JSON vs Markdown** — qual é a fonte autoritativa? Aguarda KB-003D.
7. **Skills e agentes do `.codex/`** — quais ainda estão em uso ativo pelo Codex?
8. **`backend/prisma/schema.postgres.prisma`** — é artefato de migração ou schema ativo?

---

*Criado em: 2026-05-29 | Atualizado em: 2026-05-30 (UPDATE-KB-003A-003C) | Status: current | Vault: !_lexora-memory-docs*
*Fonte: Claude Code — leitura direta da estrutura do projeto + validação manual do painel Vercel pelo usuário*
*Baseado em: [[00_START_HERE]], [[KB_001_DOCUMENTACAO_MAPEAMENTO_INICIAL_CURRENT_2026-05-29]], [[KB_002_GOVERNANCA_DOCUMENTAL_OFICIAL_CURRENT_2026-05-29]]*
