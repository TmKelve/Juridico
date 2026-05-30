# Setup Staging -> Producao

Data: 14/05/2026
Status: baseline revisada para o estado atual do projeto

## 1. Premissas Atuais

- frontend buildando em `frontend`
- backend buildando em `backend`
- autenticacao via cookie HttpOnly
- schema soberano ainda em `backend/prisma/schema.prisma`
- migracao para Postgres preparada, mas ainda sem credencial valida confirmada

## 2. Checklist Pre-Deploy

### Backend

- [ ] `PORT` configurado
- [ ] `FRONTEND_URL` configurado para o frontend real
- [ ] `JWT_SECRET` configurado com valor forte
- [ ] Postgres acessivel com credencial valida
- [ ] `npm run build` passando em `backend`
- [ ] `npm run prisma:migrate:deploy` ou baseline equivalente aprovado para o ambiente

### Frontend

- [ ] `VITE_API_URL` apontando para a API do ambiente
- [ ] `npm run build` passando em `frontend`
- [ ] smoke de login e fluxo administrativo validado

## 3. Ambiente Recomendado

### Frontend

- Vercel ou hospedagem estatica equivalente

### Backend

- Railway, Fly.io, Render, Azure App Service, ECS ou VPS com Node

### Banco

- Postgres gerenciado

SQLite nao deve ser usado em staging ou producao.

## 4. Variaveis De Ambiente

### Frontend

```env
VITE_API_URL=https://api-staging.seu-dominio.com
VITE_SENTRY_DSN=
VITE_GA_MEASUREMENT_ID=
```

### Backend Staging

```env
PORT=3000
FRONTEND_URL=https://staging.seu-dominio.com
JWT_SECRET=troque-este-valor
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DB_NAME?schema=public
```

### Backend Producao

```env
PORT=3000
FRONTEND_URL=https://app.seu-dominio.com
JWT_SECRET=valor-forte-e-rotacionavel
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DB_NAME?schema=public
```

Observacao:

- o runtime soberano ja usa `DATABASE_URL` apontando para Postgres
- `POSTGRES_DATABASE_URL` ficou apenas como apoio de transicao local e pode ser removido quando o ambiente estiver consolidado

## 5. Sequencia Recomendada

1. validar credenciais reais do Postgres com o `DATABASE_URL` do ambiente
2. validar estado de migration com `npx prisma migrate status --schema=prisma/schema.prisma`
3. aplicar migrations com `npm run prisma:migrate:deploy`
4. rodar `npm run build` no backend
5. rodar `npm run build` no frontend
6. subir backend em staging
7. publicar frontend em staging
8. executar smoke de login, `/me`, `/home`, `/users`, `/processes`

## 6. Smoke Minimo Pos-Deploy

### API

- `POST /auth/login`
- `GET /me`
- `POST /auth/logout`
- `GET /home`
- `GET /users`
- `GET /processes`

### Frontend

- login com perfil `ADM`
- reload com sessao preservada por cookie
- acesso a `/usuarios`
- logout com retorno para a tela de login

## 7. Estado Atual

O cutover soberano para Postgres ja foi validado localmente em uma instancia isolada do workspace. O proximo bloqueio real saiu da modelagem e passou a ser de ambiente: definir a credencial definitiva do Postgres de desenvolvimento/staging e integrar o frontend completo contra esse runtime.

Evidencia adicional em 14/05/2026:

- smoke integrado frontend + backend passou em banco Postgres limpo
- `admin.users.smoke.test.ts` passou
- `adv.screens.smoke.test.ts` passou

