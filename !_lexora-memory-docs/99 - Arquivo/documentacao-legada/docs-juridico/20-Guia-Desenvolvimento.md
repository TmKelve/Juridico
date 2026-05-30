# Guia de Desenvolvimento

Data: 14/05/2026
Status: revisado para a baseline atual

## 1. Estrutura Do Workspace

```text
app Juridico/
|- backend/
|  |- prisma/
|  |  |- schema.prisma
|  |  |- schema.postgres.prisma
|  |  `- migrations/
|  |- src/
|  |  |- auth.ts
|  |  |- main.ts
|  |  `- generated/
|  |- .env
|  |- .env.example
|  `- package.json
|- frontend/
|  |- src/
|  |- package.json
|  `- admin.users.smoke.test.ts
|- docs-juridico/
|- prisma.config.ts
`- package.json
```

Observacao:

- a raiz agora e apenas orquestradora de scripts
- o schema Prisma soberano fica em `backend/prisma/schema.prisma`
- o historico SQLite antigo foi preservado em `backend/prisma-sqlite-legacy/`

## 2. Scripts Principais

### Raiz

```bash
npm run backend:build
npm run backend:prisma:generate
npm run frontend:build
npm run frontend:lint
```

### Backend

```bash
npm run dev
npm run build
npm run prisma:generate
npm run prisma:migrate:dev
npm run prisma:postgres:validate
npm run prisma:postgres:generate
npm run prisma:postgres:pull
npm run prisma:postgres:status
npm run prisma:cutover:validate
npm run prisma:cutover:generate
npm run prisma:cutover:status
npm run prisma:cutover:migrate:create -- --name init_postgres
```

## 3. Setup Local

### Backend `.env`

Use `backend/.env.example` como base.

```env
PORT=3000
FRONTEND_URL=http://localhost:5173
JWT_SECRET=change-me
DATABASE_URL=postgresql://postgres:SENHA@localhost:5432/juridico_dev?schema=public
```

Opcional de transicao:

```env
POSTGRES_DATABASE_URL=postgresql://postgres:SENHA@localhost:5432/juridico_dev?schema=public
```

### Frontend

```env
VITE_API_URL=http://localhost:3000
```

## 4. Fluxo De Desenvolvimento

1. iniciar backend em `backend`
2. iniciar frontend em `frontend`
3. validar build e lint antes de encerrar a tarefa
4. quando a mudanca tocar auth ou navegacao critica, rodar smoke de navegador

## 5. Estado Atual De Auth

- login via `POST /auth/login`
- sessao mantida por cookie HttpOnly
- `GET /me` para restaurar sessao
- `POST /auth/logout` para encerrar sessao
- o frontend nao deve usar `localStorage` para token
- em desenvolvimento, o backend aceita `localhost` e `127.0.0.1` como origem equivalente para evitar atrito de CORS

## 6. Estado Atual De Banco

- runtime soberano atual usa Postgres
- `backend/prisma/migrations` ja aponta para a baseline Postgres
- `schema.postgres.prisma` e `prisma-postgres/` permanecem como artefatos de transicao e evidencia do cutover
- o legado SQLite esta em `backend/prisma-sqlite-legacy/`
- o bootstrap local cria usuarios base e processos de exemplo para sustentar smoke do frontend em banco limpo

## 7. Regras Praticas

- nao use `npx prisma` na raiz
- use os scripts do `backend`
- trate `docs-juridico/19-Roadmap-Q1-Q2.md` como historico
- use `docs-juridico/29`, `30` e `31` como baseline atual de producao e migracao

## 8. Troubleshooting

### Prisma Postgres falhando

Ordem de diagnostico:

1. confirmar `POSTGRES_DATABASE_URL`
2. rodar `npm run prisma:postgres:pull`
3. rodar `npm run prisma:postgres:status`
4. so depois mexer no schema soberano

### Sessao nao restaura

Verificar:

- `FRONTEND_URL` no backend
- `credentials: 'include'` no frontend
- cookie `Authorization` presente apos login

## 9. Documentos Relacionados

- [18-Setup-Staging-Producao.md](18-Setup-Staging-Producao.md)
- [26-Seguranca-HttpOnly-Cookie.md](26-Seguranca-HttpOnly-Cookie.md)
- [29-Plano-Producao-Full-Lifecycle.md](29-Plano-Producao-Full-Lifecycle.md)
- [30-Mapeamento-Tela-API-P0.md](30-Mapeamento-Tela-API-P0.md)
- [31-Plano-Migracao-SQLite-Postgres-Grupo-A.md](31-Plano-Migracao-SQLite-Postgres-Grupo-A.md)

