# Acompanhamento de Sprint (issues, entregáveis, métricas)

## 1. Template de sprint (2 semanas)
- Objetivo da sprint
- Principais entregáveis
- Backlog (user stories + tarefas)
- Critérios de aceitação
- Dependências

## 2. Métricas-chave
- % completion de histórias planejadas
- lead time (do início ao done)
- cycle time por tipo (feature, bug, tech debt)
- bugs críticos abertos
- sentimento do time (NPS interno)

## 3. Example Sprint 1
- Objetivo: estrutura de acesso e perfis + API de usuários
- Entregáveis:
  - cadastro/login (API + UI)
  - perfis e permissões CRUD
  - dashboard inicial (home de perfil simplificada)
  - testes automatizados (unit + integration)
- Métricas:
  - 80% das stories concluídas
  - 0 regressões em auth
  - < 5 bugs de prioridade P1

## 4. Example Sprint 2
- Objetivo: módulo Processos
- Entregáveis:
  - CRUD de processos
  - listagem com filtros + kanban básico
  - detalhe do processo + timeline
  - regra de escopo/permissão APROVADA
- Métricas:
  - 90% coverage unit tests em processo
  - performance: listagem 10000 registros em < 1s (API)

## 5. Observações de uso
- Mantenha as tarefas no Obsidian com tags: #sprint #feat #bug #tech-debt
- Use tabela para status: To do / In progress / Review / Done
- Vincule diretamente com issues do repositório (ex: GH issue 42).
