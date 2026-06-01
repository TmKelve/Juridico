---
tipo: documentacao-tecnica
status: current
projeto: lexora
fase: producao
data_criacao: 2026-05-31
ultima_atualizacao: 2026-05-31
fonte: claude-code
baseado_em:
  - "[[KB_003A_ESTRUTURA_GERAL_E_CONFIGURACOES_CURRENT_2026-05-29]]"
  - "[[KB_003C_BACKEND_E_APIS_ESTADO_ATUAL_CURRENT_2026-05-30]]"
  - "[[BACKLOG_GERAL_LEXORA_CURRENT]]"
  - "BL-001, BL-002, BL-003, BL-004 (concluídos em 2026-05-30)"
autoridade: documentacao-operacional
---

# Build, Deploy e Ambientes — Lexora

> Documento oficial do ambiente de produção e staging. Atualizar sempre que houver mudança em variáveis de ambiente, branches, pipelines ou serviços de infraestrutura.

---

## 1. Visão Geral da Infraestrutura

| Camada | Serviço | URL |
|---|---|---|
| **Frontend** | Vercel | `https://juridico.vercel.app` (produção) |
| **Backend** | Render | `https://juridico-api-staging.onrender.com` |
| **Banco de dados** | PostgreSQL (Render) | gerenciado pelo Render (interno) |
| **CI/CD** | GitHub Actions | `.github/workflows/ci.yml` |

---

## 2. Branches e Ambientes

| Branch | Ambiente Vercel | Observações |
|---|---|---|
| `main` | **Production** | Branch oficial de produção. Configurado em Vercel → Settings → Git → Production Branch |
| `codex/**`, PRs | **Preview** | Deploy preview automático por branch |
| `develop` | Preview | Build de integração (CI roda nessa branch também) |

> `codex/baseline-postgres-staging` foi a branch de staging temporária — substituída por `main` em 2026-05-30 (BL-002).

---

## 3. Frontend — Vercel

### 3.1 Configuração ativa

Arquivo: `vercel.json` (raiz do repositório)

```json
{
  "installCommand": "npm ci && npm --prefix frontend ci",
  "buildCommand": "npm run frontend:build",
  "outputDirectory": "frontend/dist",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

O script `frontend:build` no `package.json` raiz executa `vite build` dentro de `frontend/`.

### 3.2 Variáveis de ambiente — Vercel

Gerenciadas exclusivamente pelo painel Vercel (não versionadas):

| Variável | Ambiente | Valor |
|---|---|---|
| `VITE_API_URL` | Production | `https://juridico-api-staging.onrender.com` |
| `VITE_API_URL` | Preview | `https://juridico-api-staging.onrender.com` |

> Variáveis com prefixo `VITE_` são expostas ao bundle cliente. Nunca adicionar segredos com esse prefixo.

### 3.3 Headers de segurança

Configurados em `vercel.json` (headers globais):
- `Cache-Control: public, max-age=3600, must-revalidate`
- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`

---

## 4. Backend — Render

### 4.1 Serviço

- **Tipo:** Web Service
- **Runtime:** Node.js
- **Entry point:** `node dist/main.js`
- **Working directory:** `backend/`
- **Build command:** `npm ci && npm run build`
- **Start command:** `node dist/main.js`

### 4.2 Variáveis de ambiente — Render

Gerenciadas pelo painel Render → Environment:

| Variável | Obrigatória | Observações |
|---|---|---|
| `DATABASE_URL` | ✅ Sim | PostgreSQL interno do Render |
| `JWT_SECRET` | ✅ Sim | Servidor não sobe sem ela (validação no startup) |
| `NODE_ENV` | ✅ Sim | Deve ser `production` — ativa cookies `secure`, `sameSite: none`, desativa dev mock |
| `FRONTEND_URL` | ✅ Sim | Usado no CORS — deve ser a URL do Vercel |
| `LEXORA_SEED_PASSWORD` | Opcional | Senha dos usuários criados pelo seed. Padrão: `123456` |
| `LEXORA_DEV_PASSWORD` | Opcional | Fallback para `LEXORA_SEED_PASSWORD` |
| `BLOB_READ_WRITE_TOKEN` | Opcional* | Necessário para uploads persistentes via Vercel Blob. Sem ele, usa disco local (efêmero) |

*Configurar antes de ativar módulo de documentos para usuários (BL-045).

### 4.3 Variáveis de IA (opcionais — não ativas em produção)

| Grupo | Variáveis |
|---|---|
| LLM externo | `AI_PROVIDER_URL`, `AI_PROVIDER_TOKEN`, `AI_PROVIDER_AUTH_HEADER` |
| Triagem IA | `TRIAGE_AI_URL`, `TRIAGE_AI_TOKEN`, `TRIAGE_AI_AUTH_HEADER`, `TRIAGE_SCHEDULER_DISABLED` |
| DataJud | `DATAJUD_API_URL`, `DATAJUD_API_KEY` |
| CNJ | `CNJ_API_URL`, `CNJ_API_KEY`, `CNJ_AUTH_HEADER` |
| Diário Oficial | `DIARIO_API_URL`, `DIARIO_API_KEY`, `DIARIO_AUTH_HEADER` |
| OAB | `OAB_API_URL`, `OAB_API_KEY`, `OAB_AUTH_HEADER` |
| Consulta processual | `PROCESS_LOOKUP_API_URL`, `PROCESS_LOOKUP_API_KEY`, `PROCESS_LOOKUP_AUTH_HEADER` |

> Documentação completa em `backend/.env.example` (commit `deed4bc`, BL-073).

---

## 5. Banco de Dados

### 5.1 Schema e migrations

- Schema ativo: `backend/prisma/schema.prisma`
- Migrations: `backend/prisma/migrations/`
- Config canônica: `backend/prisma.config.ts` (working-dir: `backend/`)
- Config workspace-root: `prisma.config.ts` (raiz — delega para os mesmos arquivos)

### 5.2 Seed

O seed JS roda automaticamente no startup do servidor (`seedData()` em `main.ts`). Cria os seguintes usuários se não existirem:

| Email | Role | Senha padrão |
|---|---|---|
| `admin@juridico.com` | ADM | `LEXORA_SEED_PASSWORD` ou `123456` |
| `advogado@juridico.com` | ADV | idem |
| `financeiro@juridico.com` | FIN | idem |
| `atendimento@juridico.com` | ATD | idem |

> O `seed.sql` em `backend/prisma/seed.sql` cria usuários `*.lexora.dev` e pode ser executado manualmente para popular dados mais ricos. Senha do SQL seed: `senha123`.

---

## 6. CI/CD — GitHub Actions

Arquivo: `.github/workflows/ci.yml`

### 6.1 Triggers

```yaml
on:
  push:
    branches: [main, develop, "codex/**"]
  pull_request:
```

### 6.2 Pipeline resumida

```
Checkout
→ Setup Node 22
→ Install backend + frontend deps
→ Build backend (tsc)
→ Build frontend (vite)
→ Validate Epic CDE docs/seed
→ Apply Prisma migrations (banco CI interno)
→ Run backend tests (node --test tests/*.test.cjs)
→ Install Playwright browsers
→ Start backend + frontend
→ Run smoke tests (Playwright)
→ Run Epic CDE smoke tests
→ Upload Playwright artifacts
```

### 6.3 Ambiente CI

| Variável | Valor no CI |
|---|---|
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/juridico_ci` |
| `JWT_SECRET` | `ci-secret-key` |
| `FRONTEND_URL` | `http://localhost:5173` |
| `VITE_API_URL` | `http://localhost:3000` |
| `CI` | `true` |

---

## 7. Prisma — Comandos Úteis

| Comando | Contexto | O que faz |
|---|---|---|
| `npm run prisma:migrate:deploy` | `backend/` | Aplica migrations pendentes (produção/CI) |
| `npm run prisma:migrate:dev` | `backend/` | Cria nova migration em desenvolvimento |
| `npm run prisma:generate` | `backend/` | Regenera o Prisma Client |

---

## 8. Histórico de Decisões de Ambiente

| Data | Decisão | BL |
|---|---|---|
| 2026-05-30 | URL da API definida como `https://juridico-api-staging.onrender.com` | BL-001 |
| 2026-05-30 | Production Branch migrada para `main` (antes: `codex/baseline-postgres-staging`) | BL-002 |
| 2026-05-30 | `VITE_API_URL` removida do Build Command, gerenciada pelo painel Vercel | BL-003, BL-004 |
| 2026-05-30 | `NODE_ENV=production` adicionado no Render | BL-040 |
| 2026-05-30 | `JWT_SECRET` sem fallback — obrigatório no startup | BL-039 |
