# Plano de Producao Full Lifecycle - Lexora SaaS Juridico

Data: 12/05/2026
Status: plano executivo inicial
Escopo: transformar o alpha funcional atual em produto SaaS pronto para producao

## 1. Diagnostico de Partida

O projeto esta em alpha funcional avancado. Frontend e backend compilam, ha telas operacionais para o perfil ADV, autenticacao JWT, API Express, Prisma com SQLite, assets de marca, documentacao ampla e testes Playwright escritos.

O projeto ainda nao esta pronto para producao porque existem gaps de governanca, seguranca, persistencia, contratos de dados, testes, deploy, observabilidade e alinhamento documental.

Evidencias atuais:

- Frontend build: `npm run build` executado com sucesso em `frontend`.
- Backend build: `npm run build` executado com sucesso em `backend`.
- Frontend lint: `npm run lint` executa sem erros, ainda com warnings de dependencias em hooks.
- Documentacao de status esta divergente: documentos antigos tratam Processos/Clientes como pendentes, mas o codigo ja contem telas e rotas para varias areas operacionais.
- Nao ha repositorio Git detectado no workspace atual.

## 2. Principio De Execucao

A transformacao deve acontecer em releases menores, sempre com build, lint, testes e documentacao sincronizados. O objetivo nao e empilhar funcionalidades novas antes de estabilizar a base; o objetivo e chegar a um MVP de producao confiavel e depois expandir para funcionalidades completas.

Ordem recomendada:

1. Governanca e baseline.
2. Seguranca e autenticacao.
3. Banco produtivo e contratos de dados.
4. Funcionalidades P0 completas.
5. Qualidade frontend/design system.
6. Testes e CI.
7. Staging, observabilidade e deploy.
8. Beta controlado.
9. Producao.

## 3. Fase 0 - Governanca E Baseline

Objetivo: tornar o projeto versionavel, auditavel e executavel com criterios objetivos.

Entregaveis:

- Inicializar ou recuperar repositorio Git.
- Definir fluxo de branch: `main`, `develop`, `release/*`, `feature/*`.
- Criar baseline de status real nos documentos.
- Atualizar `00-README.md`, `19-Roadmap-Q1-Q2.md`, `20-Guia-Desenvolvimento.md` e `17-Deploy-Checklist.md`.
- Registrar que `28-Validacao-Telas-ADV-Full-Lifecycle.md` e a evidencia mais recente das telas ADV.
- Definir Definition of Done por tipo de entrega.
- Corrigir scripts de projeto para build/lint/test de frontend e backend.
- Resolver `npm run lint` do frontend sem erros.
- Reduzir warnings de hooks em uma etapa dedicada de refatoracao de carregamento de dados.

Criterios de aceite:

- `npm run build` passa em `frontend`.
- `npm run build` passa em `backend`.
- `npm run lint` passa em `frontend` sem erros.
- Status documental deixa de contradizer o estado real do codigo.
- Git ativo com primeiro commit de baseline.

## 4. Fase 1 - Seguranca E Autenticacao

Objetivo: remover padroes de demo e estabelecer autenticacao segura para producao.

Entregaveis:

- Migrar token JWT de `localStorage` para cookie HttpOnly.
- Implementar `POST /auth/logout`.
- Configurar CORS com origem explicita e `credentials: true`.
- Remover senhas hardcoded do fluxo real.
- Persistir usuarios com senha usando hash `bcrypt`.
- Separar credenciais e segredos por ambiente.
- Validar `JWT_SECRET` obrigatorio fora de desenvolvimento.
- Implementar RBAC real para ADM, ADV, FIN e ATD.
- Adicionar auditoria minima para login, logout e acoes sensiveis.
- Atualizar `26-Seguranca-HttpOnly-Cookie.md` com status de execucao.

Criterios de aceite:

- Token nao fica acessivel por JavaScript.
- Login, restauracao de sessao e logout funcionam com cookie.
- Rotas protegidas bloqueiam usuario nao autenticado.
- Rotas administrativas bloqueiam perfis sem permissao.
- Testes cobrem login, logout, sessao expirada e permissao negada.

## 5. Fase 2 - Backend Production-Ready

Objetivo: transformar a API atual em base sustentavel para staging/producao.

Entregaveis:

- Migrar SQLite para Postgres.
- Revisar `backend/prisma/schema.prisma` para entidades produtivas.
- Criar migrations reprodutiveis.
- Unificar o schema Prisma soberano antes de qualquer migrate de Postgres.
- Separar responsabilidades do backend em modulos ou routers focados.
- Validar payloads de entrada.
- Padronizar erros HTTP.
- Implementar paginacao, filtros e ordenacao no backend.
- Criar seed de desenvolvimento e seed de staging sem dados sensiveis.
- Adicionar testes de API.

Criterios de aceite:

- Backend sobe com Postgres em ambiente local e staging.
- Migrations recriam o banco do zero.
- Endpoints P0 tem validacao de entrada e erro padronizado.
- Testes de API cobrem fluxo feliz, erro de validacao e permissao.

## 6. Fase 3 - Contratos De Dados

Objetivo: estabilizar a relacao tela x API e reduzir derivacoes locais frageis.

Entregaveis:

- Mapear cada tela para seus endpoints.
- Classificar dados como direto da API, derivado, calculado ou materializado.
- Decidir quais agregacoes do dashboard pertencem ao backend.
- Criar contrato para dashboard, processos, prazos, documentos, clientes, tarefas, agenda, publicacoes e atendimentos.
- Criar ou atualizar documento de mapeamento tela x API.

Criterios de aceite:

- Cada tela P0 tem contrato documentado.
- Dados criticos nao dependem de enriquecimento local sem decisao registrada.
- Frontend consome tipos consistentes da API.

## 7. Fase 4 - Funcionalidades P0

Objetivo: fechar o MVP juridico operacional.

P0 obrigatorio:

- Processos: CRUD completo, detalhe, timeline, andamentos e responsavel.
- Clientes: cadastro, detalhe, vinculo com processos e historico basico.
- Prazos: criacao, prioridade, conclusao, atraso e alertas.
- Documentos: cadastro, status, pendencias e vinculo com processo.
- Tarefas: criacao, delegacao, conclusao e origem.
- Agenda: compromissos, audiencias, prazos e retornos.
- Usuarios: gestao por ADM.
- Permissoes: matriz aplicada em API e UI.

Criterios de aceite:

- Cada modulo P0 tem estado loading, vazio, erro e sucesso.
- Cada modulo P0 respeita permissao por perfil.
- Cada modulo P0 possui smoke E2E.
- CRUD principal funciona contra banco persistente.

## 8. Fase 5 - Frontend E Design System

Objetivo: consolidar consistencia visual, usabilidade e manutenibilidade.

Entregaveis:

- Extrair componentes compartilhados para filtros, tabelas, KPI, badges, drawers, modais, empty states e toasts.
- Definir variantes oficiais para KPI/badge/status.
- Normalizar naming CSS entre telas.
- Corrigir warnings de hooks.
- Reduzir bundle com code splitting.
- Validar responsividade desktop, tablet e mobile.
- Validar acessibilidade basica em fluxos P0.

Criterios de aceite:

- Telas P0 usam componentes compartilhados quando aplicavel.
- Nao ha warnings relevantes de lint/hooks.
- Bundle principal fica abaixo do limite definido ou possui decisao documentada.
- Fluxos P0 sao navegaveis por teclado.

## 9. Fase 6 - Testes E CI

Objetivo: impedir regressao silenciosa.

Entregaveis:

- Configurar testes unitarios onde houver regra isolada.
- Configurar testes de API para backend.
- Consolidar Playwright para smoke e fluxos criticos.
- Criar pipeline CI com install, lint, build e testes.
- Definir matriz minima por PR.
- Registrar artefatos de teste.

Criterios de aceite:

- CI bloqueia merge com build/lint/test quebrado.
- Smoke E2E cobre login, dashboard, processos, prazos, documentos, tarefas e clientes.
- Testes de permissao cobrem pelo menos ADM e ADV.

## 10. Fase 7 - Infra, Deploy E Observabilidade

Objetivo: colocar staging/producao em operacao controlada.

Entregaveis:

- Definir provedor de frontend.
- Definir provedor de backend.
- Provisionar Postgres gerenciado.
- Criar ambientes `development`, `staging` e `production`.
- Configurar variaveis por ambiente.
- Garantir um Postgres realmente acessivel ao Prisma antes da troca definitiva do datasource soberano.
- Configurar Sentry ou equivalente.
- Implementar logs estruturados.
- Criar healthcheck.
- Criar rotina de backup.
- Criar rollback documentado.

Criterios de aceite:

- Staging acessivel por URL publica controlada.
- Producao tem deploy reproduzivel.
- Erros aparecem no monitoramento.
- Healthcheck reporta disponibilidade da API.
- Backup do banco esta ativo.

## 11. Fase 8 - Beta E Producao

Objetivo: liberar com controle e feedback real.

Entregaveis:

- Definir grupo beta.
- Criar checklist de suporte.
- Criar termos, politica de privacidade e aviso LGPD inicial.
- Executar rodada de testes de aceitacao.
- Corrigir bugs P0.
- Gerar release candidate.
- Fazer deploy de producao.

Criterios de aceite:

- Nenhum bug P0 aberto.
- Fluxos P0 validados por usuario real ou proxy de negocio.
- Monitoramento ativo.
- Backup ativo.
- Rollback testado ou documentado.

## 12. Backlog Priorizado

### P0 - Bloqueia Producao MVP

- Git e baseline documental.
- Lint frontend zerado.
- Auth com HttpOnly Cookie.
- Senhas com hash.
- CORS seguro.
- Postgres.
- RBAC em API.
- Contrato tela x API para P0.
- CRUD persistente para Processos, Clientes, Prazos, Documentos e Tarefas.
- Testes smoke E2E P0.
- Deploy staging.
- Observabilidade minima.

### P1 - Necessario Para Beta Forte

- Publicacoes e intimacoes com fluxo operacional.
- Modelos de pecas com fluxo de geracao.
- Atendimentos com historico consolidado.
- Notificacoes internas.
- Auditoria expandida.
- Relatorios operacionais basicos.
- Upload real de documentos.
- CI completo com artefatos.

### P2 - Expansao Pos-MVP

- Financeiro completo.
- Integracoes externas.
- Google Calendar.
- WhatsApp/email.
- Assinatura digital.
- PWA.
- Mobile app.
- Multi-tenant avancado.
- SSO/2FA.

## 13. Definition Of Done

Uma entrega so pode ser considerada concluida quando:

- Build passa.
- Lint passa ou excecao esta documentada.
- Teste minimo do escopo passa.
- Permissao foi considerada.
- Estado vazio/loading/erro foi considerado em UI.
- Documentacao impactada foi atualizada.
- Variaveis de ambiente foram documentadas.
- Nao ha credenciais ou dados sensiveis em codigo.

## 14. Primeira Sequencia De Execucao

### Sprint 0 - Baseline

1. Inicializar Git.
2. Criar commit inicial.
3. Atualizar documentos de status.
4. Corrigir lint frontend.
5. Padronizar scripts de verificacao.

### Sprint 1 - Seguranca

1. Migrar JWT para HttpOnly Cookie.
2. Implementar logout.
3. Proteger CORS.
4. Hash de senha.
5. Testar permissoes.

### Sprint 2 - Banco E Contratos

1. Migrar para Postgres.
2. Revisar schema.
3. Definir contratos P0.
4. Ajustar frontend aos contratos.

### Sprint 3 - P0 Operacional

1. Completar CRUDs persistentes.
2. Fechar estados de UI.
3. Expandir E2E.
4. Preparar staging.

## 15. Riscos Principais

- Documentacao antiga pode induzir decisoes erradas.
- O backend atual concentra muitas responsabilidades em `main.ts`.
- Token em `localStorage` bloqueia producao segura.
- SQLite limita staging/producao.
- Testes existentes ainda nao garantem CI confiavel.
- O bundle frontend ja emite alerta de tamanho.
- Nao ha Git detectado, entao nao ha trilha historica local.

## 16. Proxima Acao Recomendada

Executar Sprint 0 imediatamente:

1. Inicializar Git no workspace.
2. Criar baseline commit.
3. Atualizar `00-README.md` com o status real.
4. Corrigir erros de lint do frontend.
5. Rodar build/lint novamente.
