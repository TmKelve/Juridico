# Decisão de Stack para Primeiro Staging

Data: 14/05/2026  
Status: recomendado para execucao

## 1. Objetivo

Escolher a stack mais simples para publicar o primeiro staging funcional do projeto sem abrir nova frente de infraestrutura.

## 2. Decisão Recomendada

- frontend em `Vercel`
- backend em `Render`
- banco em `Neon Postgres`

## 3. Motivo da Escolha

Essa combinacao atende o estado atual do projeto com o menor atrito operacional:

- o frontend ja esta em Vite e sobe com facilidade na Vercel
- o backend Node/Express compila sem dependencias exoticas
- o Postgres gerenciado reduz o custo de operacao do primeiro staging
- a configuracao por variaveis de ambiente ja esta pronta no codigo e nos exemplos `.env`

## 4. Mapeamento Operacional

### Frontend

- plataforma: `Vercel`
- diretorio raiz: `frontend`
- build command: `npm run build`
- output directory: `dist`
- variavel obrigatoria: `VITE_API_URL`

### Backend

- plataforma: `Render`
- diretorio raiz: `backend`
- build command: `npm ci && npm run build`
- start command: `node dist/main.js`
- variaveis obrigatorias:
  - `DATABASE_URL`
  - `FRONTEND_URL`
  - `JWT_SECRET`
  - `PORT`

### Banco

- plataforma: `Neon`
- engine: `PostgreSQL`
- uso inicial: 1 banco de staging persistente
- acesso: connection string unica em `DATABASE_URL`

## 5. Domínios Recomendados

- frontend staging:
  - `https://juridico-staging.vercel.app`
- backend staging:
  - `https://juridico-api-staging.onrender.com`

Se os nomes reais diferirem, o importante e manter:

- `FRONTEND_URL` apontando para o frontend publico
- `VITE_API_URL` apontando para a API publica

## 6. Sequência de Execução

1. criar banco Postgres de staging no Neon
2. copiar a connection string para `DATABASE_URL`
3. criar servico backend no Render
4. configurar `FRONTEND_URL`, `JWT_SECRET` e `DATABASE_URL`
5. executar deploy do backend
6. rodar `prisma migrate deploy` no backend de staging
7. criar projeto frontend na Vercel apontando para `frontend`
8. configurar `VITE_API_URL`
9. publicar o frontend
10. rodar smoke de staging

## 7. Critério de Aceite

O primeiro staging esta pronto quando:

- `GET /` da API responde
- login funciona no frontend remoto
- sessao persiste por cookie
- `/usuarios` abre com perfil `ADM`
- `/processes` responde sem erro
- logout encerra a sessao corretamente

## 8. O Que Não Fazer Agora

- nao introduzir Docker antes do primeiro staging funcionar
- nao abrir Kubernetes, Terraform ou infraestrutura mais pesada
- nao trocar de provider por preferencia pessoal sem um bloqueio tecnico real
- nao abrir novas features antes do staging remoto estar operacional

## 9. Próximo Passo Depois da Publicação

1. rodar smoke remoto completo
2. registrar URLs oficiais de staging
3. conectar monitoramento basico
4. decidir o pacote seguinte: hardening ou novo modulo P0
