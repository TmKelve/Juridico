# Runbook de Staging

Data: 14/05/2026
Status: pronto para primeira execucao remota

## 1. Objetivo

Executar a primeira promocao do projeto para um ambiente de staging com:

- backend em Postgres persistente
- frontend apontando para a API de staging
- CI minima pronta para validar build, migration e smoke

## 2. Precondicoes

- `git user.name` configurado
- `git user.email` configurado
- baseline local pronta para commit
- repositório remoto disponivel
- instancia Postgres persistente de staging provisionada
- destino de deploy do backend definido
- destino de deploy do frontend definido

## 3. Arquivos De Referencia

- [32-Baseline-Staging-CI.md](32-Baseline-Staging-CI.md)
- [18-Setup-Staging-Producao.md](18-Setup-Staging-Producao.md)
- [31-Plano-Migracao-SQLite-Postgres-Grupo-A.md](31-Plano-Migracao-SQLite-Postgres-Grupo-A.md)
- [backend/.env.staging.example](</C:/Users/tomke/app Juridico/backend/.env.staging.example>)
- [frontend/.env.staging.example](</C:/Users/tomke/app Juridico/frontend/.env.staging.example>)

## 4. Variaveis Minimas

### Backend

```env
PORT=3000
FRONTEND_URL=https://staging.seu-dominio.com
JWT_SECRET=segredo-forte
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DB_NAME?schema=public
```

### Frontend

```env
VITE_API_URL=https://api-staging.seu-dominio.com
VITE_SENTRY_DSN=
VITE_GA_MEASUREMENT_ID=
```

## 5. Ordem De Execucao

1. aplicar secrets e variaveis do ambiente de staging
2. usar a branch `codex/baseline-postgres-staging` como baseline inicial
3. validar CI verde no remoto
4. fazer deploy do backend
5. aplicar `prisma migrate deploy` no banco de staging
6. fazer deploy do frontend
7. executar smoke de staging

## 6. Comandos Locais De Preflight

### Backend

```bash
cd backend
npm run build
npm run prisma:generate
```

### Frontend

```bash
cd frontend
npm run build
npm run test:smoke -- --list
```

### Workspace

```bash
npm run backend:build
npm run backend:prisma:migrate:deploy
npm run frontend:build
```

Observacao:

- o smoke real exige backend e frontend em execucao
- no CI isso ja esta contemplado

## 7. Smoke Pos-Deploy

### API

- `GET /` retorna `SaaS Jurídico API v1`
- `POST /auth/login`
- `GET /me`
- `GET /users` com perfil `ADM`
- `GET /processes`
- `POST /auth/logout`

### Frontend

- login como `ADM`
- abertura de `/usuarios`
- logout
- login como `ADV`
- navegacao por `Home`, `Processos`, `Prazos`, `Agenda`, `Documentos`, `Atendimentos`, `Clientes`, `Publicacoes`, `Modelos`, `Tarefas`
- abertura de detalhe de processo por rota direta

## 8. Critério De Go/No-Go

### Go

- CI verde
- migrations aplicadas sem erro
- backend responde em staging
- frontend responde em staging
- smoke principal passa

### No-Go

- falha em `prisma migrate deploy`
- erro de CORS
- falha de login
- falha de restauracao de sessao
- quebra de `/users` ou `/processes`

## 9. Riscos Ainda Abertos

- baseline Git ja publicada em `codex/baseline-postgres-staging`
- CI minima ja validada com smoke verde no GitHub Actions
- staging remoto ainda nao provisionado nesta thread
- bundle frontend continua acima do warning de 500 kB
- warnings de hooks no frontend ainda existem

## 10. Proximo Passo Depois Do Staging

1. estabilizar warnings e bundle
2. consolidar monitoramento
3. ampliar cobertura E2E para interacoes criticas
4. iniciar o proximo pacote funcional ou de qualidade
