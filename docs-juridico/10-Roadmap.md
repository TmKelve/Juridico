# Roadmap de Produto (v1 e v2)

## 1. Visão geral de fases
- v1 (MVP vendável): Home por perfil, Processos, Prazos, Documentos, Tarefas, Cliente e Financeiro básico, Administração e Perfis.
- v2 (Produto forte): Publicações, Portal do Cliente, OCR, Chat interno, Relatórios avançados, IA assistida.

## 2. Roadmap por release
### Release 1 (MVP-core)
- Perfis: ADM, ADV, EST, FIN, ATD
- Módulos: Início, Processos, Clientes, Prazos, Documentos, Tarefas, Financeiro (básico), CRM jurídico, Administração básica
- Permissões: CRUD por módulo, escopo próprio/equipe
- UX: menu adaptado, painel de responsabilidades, actions quick

### Release 2 (MVP refinado)
- Perfis: COO, SOC; com opção de multi-perfil
- Módulos adicionais: Agenda/Audiências, Publicações, Portal do Cliente v1
- Funcionalidades: filtros salváveis, dashboards configuráveis por perfil, trilha audit
- Integrações: e-mail/agenda, banco de dados de tribunais

### Release 3 (Premium)
- IA: sugestão de jurisprudência, drafting de peças, extração de texto OCR
- Mobile completo + offline parcial
- BI avançado, flex dashboards, alertas em tempo real
- Gestão de risco operacional, score de processos, compliance LGPD

## 3. Roadmap de produto técnico
- v1: API REST OpenAPI, autenticação JWT + RBAC/ABAC, logs de auditoria, multi-tenant opcional
- v2: microserviços (processos, finanças, crm, etc.), fila de eventos, extensões de marketplace, webhooks

## 4. Priorização de features (1 a 5)
1. Home perfil + painel responsabilidades (5)
2. Detalhe do processo forte (5)
3. Permissões x escopo granular (5)
4. Processos + prazos + tarefas (4)
5. Financeiro básico + CRM básico (4)
6. Portal do cliente (3)
7. IA assistida (2)

## 5. Entregáveis de cada sprint
- sprint 1: setup backend + DB + auth + users/profiles
- sprint 2: módulo Processos + permissão + UI lista/detalhe
- sprint 3: módulo Prazos + Agenda + notificações
- sprint 4: Documentos + upload + versionamento
- sprint 5: Financeiro + contratos + cobrança
