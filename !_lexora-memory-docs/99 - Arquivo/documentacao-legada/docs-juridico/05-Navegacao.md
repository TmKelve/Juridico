# Arquitetura de Navegação e Menu

## 1. Espinha dorsal de navegação
1. Início
2. CRM Jurídico
3. Clientes
4. Processos
5. Agenda / Prazos / Publicações
6. Documentos / Peças
7. Financeiro
8. Atendimento / Colaboração
9. Gestão do Escritório
10. Administração / Segurança
11. Portal do Cliente (opcional)

## 2. Menu lateral por perfil
### Advogado
- Início, Meus Processos, Prazos, Agenda, Clientes, Documentos, Tarefas, Publicações

### Estagiário
- Início, Minhas Tarefas, Processos Atribuídos, Documentos, Checklists, Agenda

### Financeiro
- Início, Recebimentos, Contratos, Cobranças, Contas a Pagar, Notas, Relatórios

### Administrativo
- Início, Escritório, Processos, Equipe, Tarefas, Agenda, Relatórios, Configurações

### Sócio
- Início, Dashboard Executivo, Carteira, Financeiro, Comercial, Equipe, Relatórios, Administração

## 3. Fluxos principais de navegação
- Lead → Processo: CRM → Cliente → Processo
- Operação de caso: Processos → Detalhe → Prazos → Documentos → Tarefas
- Financeiro: Contratos → Cobranças → Recebimentos → Faturamento
- Gestão: Dashboard Administrativo → Carga → Relatórios

## 4. Comportamento da área central
- header com busca global e ações rápidas
- cards frozados para metas/prazos
- drawer lateral contextual para detalhe rápido
- mudanças de aba sem recarregar

## 5. Variantes de layout
- Desktop 12 colunas, lateral fixa
- Tablet menu recolhível, cards 2 colunas
- Mobile home card stack, bottom sheet filtros, rodapé ação
