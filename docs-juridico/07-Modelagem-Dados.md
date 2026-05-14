# Modelo de Dados Inicial (MVP)

## 1. Entidades principais
- user
- profile
- module
- permission
- action
- scope
- team
- area_juridica
- client
- process
- task
- document
- deadline
- financial_contract
- intake_lead
- event (audiencia, compromisso)
- notification

## 2. Relações essenciais
- user_profiles (n:N)
- profile_permissions (n:N)
- user_scope_overrides
- team_users
- process_responsibles
- task_responsibles
- client_processes
- process_documents
- process_deadlines
- process_events
- process_activities

## 3. Estrutura de permissão
Tabela: permissions
- id
- module
- action
- default_scope (proprio/equipe/global/context)
- sensitive (bool)
- requires_approval (bool)

Tabela: profile_permissions
- profile_id
- permission_id
- allowed (bool)

Tabela: user_scope_overrides
- user_id
- module
- scope
- comments

## 4. Regras de negócio de acesso
- resolve_user_scope(user, resource) -> pertencente, equipe, area, global
- checar permission: perfil + ação + scope + sensibilidade
- exportação requer permissão explícita mesmo para quem vê
- exclusões e aprovações sensíveis com justificativa/log

## 5. MVP: modelo reduzido
- usuários: admin, advogado, estagiario, financeiro, atendimento
- perfis: localizar por slug e nome
- permissões: CRUD por módulo + funções especiais (aprovar, exportar)
- escopo: proprio, equipe, tudo
- menus/dashboards atrelados a perfil e personalização de widgets

## 6. API contract (OpenAPI)
- Defina um arquivo de contrato padrão em `c:\Users\tomke\app Juridico\docs-juridico\openapi\saas-juridico.yaml`.
- Comece com endpoints core:
  - `POST /auth/login`
  - `GET /users`, `POST /users`
  - `GET /profiles`, `GET /permissions`
  - `GET /processes`, `POST /processes`, `GET /processes/{id}`
  - `GET /dashboards/{profile}`
- Referencie esse contrato em `07-Modelagem-Dados.md` para manter sincronizado com o modelo de dados.
