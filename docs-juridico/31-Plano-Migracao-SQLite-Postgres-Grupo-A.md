# Plano de Migracao SQLite -> Postgres - Grupo A

Data: 12/05/2026
Status: pronto para execucao tecnica
Escopo: migrar o backend atual de SQLite para Postgres sem ampliar o dominio

## 1. Objetivo

Migrar apenas o dominio ja persistido no backend atual:

- `User`
- `Process`
- `Andamento`
- `Prazo`
- `Documento`
- `Atendimento`

Fica fora deste plano:

- `Client` como entidade propria
- `Task` como entidade propria
- `Event`/`Agenda` como entidade propria
- `Publication`
- `Template`
- permissao granular persistida

## 2. Regra Principal

A migracao de banco nao deve introduzir novas entidades, novos endpoints nem alterar o contrato funcional das telas ja existentes. O objetivo e trocar o motor de persistencia com o menor raio de mudanca possivel.

## 3. Precondicoes

- schema Prisma soberano: `backend/prisma/schema.prisma`
- migrations soberanas: `backend/prisma/migrations`
- scripts Prisma operacionais no `backend`
- frontend e backend compilando
- fluxo de autenticacao com cookie HttpOnly validado
- schema Postgres paralelo validado em `backend/prisma/schema.postgres.prisma`

## 4. Mudancas Tecnicas Necessarias

### Schema Prisma

Alterar datasource de:

- `provider = "sqlite"`

Para:

- `provider = "postgresql"`

Manter as entidades e relacoes atuais.

### Configuracao

Separar variaveis durante a transicao:

- `DATABASE_URL` para o runtime atual em SQLite
- `POSTGRES_DATABASE_URL` para validacao e migrate do schema Postgres

Isso evita colisao entre o `.env` do backend e o `.env` da raiz durante a fase de migracao.

### Aplicacao backend

O backend hoje nao depende de SQL especifico do SQLite. Em tese, a troca de banco deve ser transparente ao codigo Express/Prisma, desde que:

- migrations sejam recriadas de forma limpa
- seed funcione contra Postgres
- datas e defaults sejam validados em runtime

## 5. Estrategia Recomendada

### Etapa 1 - Congelar baseline

- congelar o schema atual do Grupo A
- nao aceitar novas entidades durante a migracao
- validar build do backend

### Etapa 2 - Criar branch de migracao

- branch dedicada de banco
- sem misturar UI, auth ou contrato de telas

### Etapa 3 - Preparar ambiente Postgres

- provisionar instancia local ou staging
- definir `DATABASE_URL`
- validar conectividade

### Etapa 4 - Atualizar schema

- trocar `sqlite` por `postgresql`
- revisar tipos default de datas
- revisar constraints e nomes de tabela se necessario

### Etapa 5 - Recriar migrations

Como o historico atual nasceu em SQLite, a opcao mais segura para o Grupo A e:

- preservar as migrations antigas como historico
- gerar uma migration baseline limpa para Postgres em branch de migracao

Observacao:

- nao misturar replay cego de migrations SQLite em Postgres sem validar compatibilidade

### Etapa 6 - Seed e bootstrap

- garantir seed de usuarios
- manter upgrade automatico de senha hash
- validar contagem e relacoes basicas

### Etapa 7 - Verificacao funcional

- login
- `/me`
- `/home`
- `/users`
- `/processes`
- `/processes/:id`
- criacao de `andamento`, `prazo`, `documento`, `atendimento`

### Etapa 8 - Promocao para staging

- aplicar migrations em staging
- rodar smoke E2E principal
- observar erros de conexao, timeout e encoding

## 6. Riscos Especificos

### Risco 1 - Historico de migration incompatível

Motivo:

- migrations atuais foram geradas sob `sqlite`

Mitigacao:

- gerar baseline Postgres nova em branch dedicada

### Risco 2 - Dados locais nao portados

Motivo:

- `backend/prisma/dev.db` e local

Mitigacao:

- tratar dados locais como descartaveis ou exportar somente seed minima

### Risco 3 - Ambientes mistos

Motivo:

- parte do workspace ainda carrega referencias antigas a SQLite em docs

Mitigacao:

- atualizar `18-Setup-Staging-Producao.md` e `20-Guia-Desenvolvimento.md` quando a migracao iniciar

### Risco 4 - Confusao entre toolchains Prisma

Motivo:

- workspace raiz ainda possui Prisma 7 instalado

Mitigacao:

- usar apenas scripts delegados para `backend`
- alinhar/remover toolchain Prisma 7 antes da execucao da migracao

## 7. Critérios De Aceite

- `backend npm run prisma:generate` passa
- backend sobe com Postgres
- seed executa com sucesso
- `npm run build` no backend passa
- smoke funcional de auth e processos passa
- frontend nao precisa de alteracao de contrato para continuar funcionando

## 8. Sequencia De Execucao Recomendada

1. alinhar ou remover Prisma 7 da raiz
2. provisionar Postgres de desenvolvimento
3. trocar datasource do schema soberano
4. gerar baseline de migration para Postgres
5. executar seed
6. validar endpoints P0
7. subir staging

## 9. Proxima Acao Objetiva

Precondicao ja resolvida:

- a toolchain Prisma 7 foi removida da raiz do workspace

Proximo passo:

- disponibilizar um Postgres real acessivel ao Prisma e validar `npm run prisma:postgres:status`

## 10. Evidencia Atual De Preparacao

Validado em 14/05/2026:

- `npm run prisma:postgres:validate` passou
- `npm run prisma:postgres:generate` passou
- `npm run prisma:postgres:pull` falhou por autenticacao
- `npm run build` no backend passou

Bloqueio atual:

- existe um conjunto real de processos `postgres` em execucao na maquina
- `psql` local em `C:\Program Files\PostgreSQL\18\bin\psql.exe` respondeu com falha de senha para o usuario configurado no `.env`
- a string `postgresql://johndoe:...@localhost:5432/mydb?schema=public` nao representa uma credencial valida para a instancia atual
- o `P1001` observado via Prisma precisa ser lido junto com a falha explicita de autenticacao obtida no `psql`

Leitura tecnica:

- o schema do Grupo A ja esta apto para Postgres
- a execucao da migracao depende agora de alinhar credenciais e database reais para a instancia existente, nao de modelagem

## 11. Proxima Acao Operacional

1. confirmar usuario, senha e nome do database validos para a instancia Postgres local ou de staging
2. atualizar `POSTGRES_DATABASE_URL` no `backend/.env`
3. validar com `npm run prisma:postgres:pull`
4. validar com `npm run prisma:postgres:status`
5. so depois trocar o datasource soberano `backend/prisma/schema.prisma`

## 12. Evolucao Da Preparacao Em 14/05/2026

Evidencia adicional:

- foi criada uma instancia Postgres isolada do workspace em porta `5433`
- `psql` confirmou conexao real em `juridico_dev`
- `npm run prisma:postgres:pull` deixou de falhar por conectividade e passou a falhar por banco vazio
- `npm run prisma:postgres:status` confirmou o conflito esperado entre provider `postgresql` e `migration_lock.toml` legado em `sqlite`

Decisao operacional:

- manter o historico SQLite soberano intacto em `backend/prisma/migrations`
- criar um workspace paralelo de cutover em `backend/prisma-postgres/`
- gerar a baseline Postgres nesse workspace paralelo antes de promover a troca do schema soberano

Evidencia produzida:

- `backend/prisma-postgres/migrations/migration_lock.toml` agora fixa `provider = "postgresql"`
- foi gerada a migration `20260514224911_init_postgres`
- o SQL baseline contem as tabelas `User`, `Process`, `Andamento`, `Prazo`, `Documento` e `Atendimento` com seus indices e foreign keys

Status objetivo apos esta etapa:

- conectividade Postgres validada em instancia isolada do workspace
- baseline Postgres criada com sucesso
- runtime oficial ainda nao cortado para Postgres

## 13. Corte Soberano Executado Em 14/05/2026

Mudancas efetivadas:

- `backend/prisma/schema.prisma` passou a usar `provider = "postgresql"` com `DATABASE_URL`
- `backend/prisma/migrations` foi promovido para a baseline Postgres
- o historico SQLite anterior foi preservado em `backend/prisma-sqlite-legacy/`

Verificacao fresca:

- `npm run prisma:generate` com `DATABASE_URL=postgresql://postgres@localhost:5433/juridico_dev?schema=public` passou
- `npx prisma migrate status --schema=prisma/schema.prisma` retornou `Database schema is up to date!`
- `npm run build` no backend passou
- smoke do backend em runtime soberano Postgres passou com:
  - login `ADM`
  - `GET /me`
  - `GET /users`
  - `POST /processes`
  - `POST /auth/logout`

Estado do projeto apos o corte:

- o caminho soberano de desenvolvimento do backend agora e Postgres
- SQLite ficou apenas como historico legado local
- o proximo passo nao e mais migracao estrutural, e sim estabilizacao de ambiente e integracao frontend completa contra esse runtime
