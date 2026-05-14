# Baseline Staging e CI

Data: 14/05/2026
Status: pronto para uso como baseline de integracao

## 1. Objetivo

Transformar o estado atual do projeto em um fluxo reproduzivel de:

- build backend
- build frontend
- migrate deploy em Postgres limpo
- smoke Playwright dos fluxos criticos

## 2. Scripts Baseline

### Workspace raiz

```bash
npm run backend:build
npm run backend:prisma:migrate:deploy
npm run frontend:build
npm run frontend:test:smoke
```

Observacao:

- `frontend:test:smoke` pressupoe backend e frontend ja em execucao
- no CI, o workflow `.github/workflows/ci.yml` sobe ambos antes do smoke

### Frontend

```bash
npm run test:smoke
```

Suite atual:

- `admin.users.smoke.test.ts`
- `adv.screens.smoke.test.ts`

## 3. Workflow CI

Arquivo:

- `.github/workflows/ci.yml`

O workflow faz:

1. sobe Postgres 16 limpo
2. instala dependencias de `backend` e `frontend`
3. builda backend
4. builda frontend
5. aplica `prisma migrate deploy`
6. sobe backend
7. sobe frontend
8. espera readiness HTTP
9. executa smoke Playwright
10. publica artefatos dos testes

## 4. Variaveis De Ambiente Minimas

### Backend

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DB_NAME?schema=public
FRONTEND_URL=https://staging.seu-dominio.com
JWT_SECRET=valor-forte
PORT=3000
```

### Frontend

```env
VITE_API_URL=https://api-staging.seu-dominio.com
```

## 5. Evidencia Atual

Validado localmente antes desta baseline:

- build backend passando
- build frontend passando
- `prisma migrate deploy` em Postgres limpo passando
- `admin.users.smoke.test.ts` passando
- `adv.screens.smoke.test.ts` passando

## 6. Risco Residual

O maior risco restante nao esta mais em modelagem ou integracao local. Agora esta em:

- credencial real do banco de staging
- identidade Git e baseline versionada
- deploy do backend/frontend em ambiente remoto

## 7. Proximo Passo Operacional

1. configurar `git user.name` e `git user.email`
2. criar o primeiro commit tecnico de baseline
3. apontar staging para um Postgres persistente
4. rodar o workflow CI no repositorio versionado
