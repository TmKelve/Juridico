# Modelo de Permissões e Matriz

## 1. Quatro camadas de controle
1. Perfil-base (SOC, ADM, COO, ADV, EST, ATD, FIN, CLI)
2. Ação (ver, criar, editar, excluir, aprovar, exportar)
3. Escopo (próprio, equipe, área, global, contexto)
4. Sensibilidade (documentos sensíveis, financeiro, LGPD)

## 2. Entidades-chave
- users
- profiles
- permissions
- modules
- actions
- scopes
- teams
- user_profiles
- profile_permissions
- user_scope_overrides

## 3. Exemplo de permissão semântica
- processos.editar.proprio
- processos.ver.equipe
- financeiro.ver.global.sensivel
- documentos.excluir.global.requires_approval

## 4. Matriz resumida por módulo
### Módulo Início / Dashboards
- ver dashboard, alertas (todos seguidos pelo escopo)
- configurar widgets (SOC/ADM/COO/ADV/ATD/FIN)
- exportar (SOC/ADM/COO/ADV/FIN)

### Módulo CRM
- leads: ver/criar/editar/mudar etapa (SOC/ADM/COO/ADV/ATD)
- converter lead (SOC/ADM/COO/ATD)
- exportar relatórios (SOC/ADM/COO) 

### Módulo Clientes
- ver/editar/caixas, sensível: escopo e perfil

### Módulo Processos
- fluxo completo: criar, editar, fase, andamento, atribuir (SOC/ADM/COO/ADV)
- estagiário: executar tch

### Módulo Financeiro
- contas, cobrança, pagamentos (FIN/SOC)
- visibilidade parcial para ADV/ADM

### Módulo Administração
- usuários/perfis/permissões (SOC/ADM)
- logs/auditoria (SOC/ADM)

## 5. Regras transversais
- Exclusão soft delete
- Auditoria de dados sensíveis
- Permissão exportar independente de ver
- Escopo sempre prevalece
- Portal do cliente isolado
