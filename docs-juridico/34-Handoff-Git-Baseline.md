# Handoff Git Baseline

Data: 14/05/2026
Status: pronto para primeiro commit tecnico

## 1. Estado Atual

- repositorio Git local inicializado
- `user.name` nao configurado
- `user.email` nao configurado
- nenhum remoto configurado
- workspace ainda sem commits

## 2. Escopo Do Primeiro Commit

O primeiro commit deve capturar a baseline tecnica atual:

- backend soberano em Postgres
- migracoes Prisma promovidas para Postgres
- legado SQLite preservado
- integracao frontend + backend validada
- smoke Playwright principal definido
- workflow CI minimo criado
- runbooks de staging e baseline atualizados

## 3. Arquivos-Chave Da Baseline

### Workspace

- `.gitignore`
- `package.json`
- `package-lock.json`
- `prisma.config.ts`
- `.github/workflows/ci.yml`

### Backend

- `backend/src/main.ts`
- `backend/src/auth.ts`
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/`
- `backend/prisma-sqlite-legacy/`
- `backend/prisma-postgres/`
- `backend/.env.example`
- `backend/.env.staging.example`
- `backend/package.json`

### Frontend

- `frontend/src/`
- `frontend/admin.users.smoke.test.ts`
- `frontend/adv.screens.smoke.test.ts`
- `frontend/package.json`
- `frontend/.env.example`
- `frontend/.env.staging.example`

### Documentacao

- `docs-juridico/18-Setup-Staging-Producao.md`
- `docs-juridico/20-Guia-Desenvolvimento.md`
- `docs-juridico/26-Seguranca-HttpOnly-Cookie.md`
- `docs-juridico/29-Plano-Producao-Full-Lifecycle.md`
- `docs-juridico/30-Mapeamento-Tela-API-P0.md`
- `docs-juridico/31-Plano-Migracao-SQLite-Postgres-Grupo-A.md`
- `docs-juridico/32-Baseline-Staging-CI.md`
- `docs-juridico/33-Runbook-Staging-Deploy.md`
- `docs-juridico/34-Handoff-Git-Baseline.md`

## 4. Sequencia Recomendada

### Configurar identidade Git local

```bash
git config user.name "SEU NOME"
git config user.email "seu-email@dominio.com"
```

Se quiser persistir globalmente:

```bash
git config --global user.name "SEU NOME"
git config --global user.email "seu-email@dominio.com"
```

### Criar branch de baseline

```bash
git checkout -b codex/baseline-postgres-staging
```

### Revisar escopo

```bash
git status --short
```

### Criar primeiro commit

```bash
git add .
git commit -m "chore: consolidar baseline postgres e staging"
```

## 5. Publicacao No Remoto

### Adicionar remoto

```bash
git remote add origin <URL_DO_REPOSITORIO>
```

### Enviar branch

```bash
git push -u origin codex/baseline-postgres-staging
```

## 6. Verificacao Antes Do Push

Executar no minimo:

```bash
npm run backend:build
npm run frontend:build
cd frontend
npm run test:smoke -- --list
```

Se quiser repetir a prova integrada local completa:

- subir backend com `DATABASE_URL` em Postgres
- subir frontend apontando para `VITE_API_URL`
- rodar `npx playwright test admin.users.smoke.test.ts adv.screens.smoke.test.ts`

## 7. Proximo Passo Depois Do Push

1. configurar secrets de CI
2. provisionar Postgres de staging
3. aplicar `.env.staging.example` no destino
4. deixar o workflow `ci.yml` rodar
5. promover backend e frontend para staging
