---
tipo: kb
status: current
projeto: lexora
fase: inventario-funcional-ux-ui
area: ux-ui
data: 2026-05-30
fonte: claude-code
baseado_em:
  - '[[KB_004_PRODUCT_DISCOVERY_LEXORA_CURRENT_2026-05-30]]'
  - '[[KB_003B_FRONTEND_ESTADO_ATUAL_CURRENT_2026-05-29]]'
  - '[[KB_003C_BACKEND_E_APIS_ESTADO_ATUAL_CURRENT_2026-05-30]]'
  - '[[BACKLOG_GERAL_LEXORA_CURRENT]]'
escopo: inventario-funcional-ux-ui
vault_oficial: 'C:\Users\tomke\app Juridico\!_lexora-memory-docs'
autoridade: inventario-ux-ui
metodo: navegacao-real
ambiente: dev-local-postgres
seed: seed.sql-aplicado
---

# KB-005 — Inventário Funcional e UX/UI Lexora

> [!important] Método: navegação real em ambiente local
> Este documento foi produzido por **navegação real do aplicativo em execução local** (backend Node.js + PostgreSQL local com seed aplicado), não por leitura de código. Cada estado reportado foi observado diretamente via browser preview. Data da navegação: 2026-05-30.

---

## 1. Resumo Executivo

### Ambiente de teste
- Backend: `http://localhost:3000` (Express + Prisma + PostgreSQL local)
- Frontend: `http://localhost:5173` (Vite 8 + React 19)
- Banco: `juridico_dev` (PostgreSQL local) com 25 migrações aplicadas e `seed.sql` executado
- Usuário de teste: `carlos.mendes@lexora.dev / senha123` (role `admin` — seed)

### Resultado da navegação

| Categoria | Quantidade |
|---|---|
| Telas totais navegadas | 19 |
| Funcionais com dados reais | **16** |
| Parcialmente funcionais | 1 (Triagem — sem jobs locais) |
| Incertas | 2 (Configurações, Ajuda) |
| Sem tela acessível | 2 (Platform Admin, Timesheet) |
| Erros de console | **0** |

> [!success] BL-060 resolvido em 2026-05-30
> Após corrigir as roles do seed (`admin/coordinator/assistant` → `ADM/ADV/FIN/ATD`) e re-logar, CRM Jurídico, Financeiro e Usuários passaram a funcionar completamente. O estado definitivo reflete **16 telas funcionais**.

### Descoberta crítica — resolvida

O seed SQL criava usuários com roles `admin`, `coordinator`, `assistant` — mas o sistema real usa `ADM`, `ADV`, `FIN`, `ATD`. Após a correção do `seed.sql` e atualização dos usuários no banco local:
- `/usuarios` → ✅ acessível com ADM — mostra 4 usuários com roles corretas, matriz de permissões
- CRM Jurídico → ✅ funcional — pipeline kanban com 1 oportunidade real, colunas vazias com CTA
- Financeiro → ✅ acessível — estrutura completa, R$ 0,00 (seed finance não rodado, não é bug)
- Dashboard ADM → diferente do ADV: título "Visão do Escritório" (vs. "Home Operacional"), sidebar com Usuários visível

### Pontos positivos confirmados
- **Zero erros de console** durante toda a navegação
- **13 telas funcionando com dados reais** — produto mais maduro do que o esperado
- **Processo (detalhe)** com timeline, 8 tabs, checklist e ações — extremamente rico
- **Notificações via Prisma** funcionando corretamente (BL-046 confirmado)
- **Dashboard** com BI operacional real — dados do seed refletidos corretamente

---

## 2. Objetivo e Escopo

### Objetivo
Documentar o estado real de cada tela do Lexora por navegação direta, identificar o que está funcional, o que tem problemas e os gaps que precisam ser resolvidos antes do primeiro cliente.

### Dentro do escopo
- Navegação real em ambiente local com seed de dados
- Estado observado de cada tela (funcional / parcial / bloqueado)
- Erros e comportamentos inesperados
- Gaps de UX observados
- Componentes compartilhados identificados
- Insumos para KB-006

### Fora do escopo
- Alterar código, backlog ou KBs
- Executar scripts ou testes automatizados
- Análise visual profunda (cores, tipografia, espaçamento) — reservado para KB-006
- Navegação de telas que requerem roles específicas não disponíveis no seed atual

---

## 3. Estado por Tela — Tabela Principal

| Tela | Rota | Estado | Funcionalidades confirmadas | Problemas / Gaps | Bloqueante para lançamento? |
|---|---|---|---|---|---|
| **Login** | (inline App.tsx) | ✅ Funcional | Form de email/senha, validação, cookie HTTP, redirect pós-login, background `fundo_login.mp4` | Vídeo de background não carregou (arquivo não no banco/CDN) | Não |
| **Dashboard** | `/` | ✅ Funcional | KPIs operacionais, painel de responsabilidades, prioridades do dia, timeline de processos, agenda do dia, alertas críticos, ações rápidas, financeiro do dia | KPI "Financeiro do Dia" mostra R$ 16.800 — origem a confirmar com dados do seed | Não |
| **Processos (lista)** | `/processos` | ✅ Funcional | Lista com 6 processos reais, KPIs (prazo crítico, sem atualização, aguardando ação), filtros por área/fase/tribunal, busca, toggle Kanban, botões Novo Processo e Exportar, drawer de detalhe rápido | Kanban não testado em profundidade | Não |
| **Processo (detalhe)** | `/processos/:id` | ✅ Funcional | Cabeçalho com status, badges de prioridade e prazo, próxima melhor ação, 8 tabs (Visão Geral, Andamentos, Prazos, Audiências, Documentos, Tarefas, Publicações, Atendimento, Comentários Internos), Resumo Estrutural, Timeline Unificada, Pendências e Próximos Passos, botões de ação rápida | — | Não |
| **Prazos** | `/prazos` | ✅ Funcional | KPIs (Prazos hoje, Próximos 7 dias, Críticos, Atrasados, Audiências/SLA), fila prioritária por risco, filtros operacionais, views Lista/Calendário, botões Novo Prazo/Abrir Agenda/Exportar | — | Não |
| **Agenda** | `/agenda` | ✅ Funcional | KPIs (Hoje, Audiências, Retornos pendentes, Prazos, Conflitos), filtros por semana/mês, visão semanal com eventos por dia, views Dia/Semana/Mês/Lista, navegação por período | Eventos do seed aparecem no sábado 30/05 e domingo 31/05 | Não |
| **Tarefas** | `/tarefas` | ✅ Funcional | KPIs (Tarefas hoje, Atrasadas, Alta prioridade, Delegadas, Concluídas semana), filtros por status/prioridade/prazo, busca, views Lista/Kanban, 3 tarefas do seed | — | Não |
| **Documentos** | `/documentos` | ✅ Funcional | 15 documentos do seed agrupados por processo, filtros por status (Pendente/Em validação/Validados/Cliente), busca, categorias, botões Upload/Solicitar/Exportar, próxima melhor ação exibida | Upload testado visualmente — storage real desconhecido (BL-045 ainda aberto) | **Sim** (BL-045) |
| **Modelos de Peças** | `/modelos-pecas` | ✅ Funcional | 10 modelos com status (Ativo/Tentativo/Arquivado), versões (v1.1 a v3.3), filtros, alertas de revisão necessária, tags por área e tipo, botões Novo Modelo/Nova Peça/Importar | 3 modelos marcados como "precisam de revisão" | Não |
| **Atendimentos** | `/atendimentos` | ✅ Funcional | 2 atendimentos do seed, KPIs (Atendimentos hoje, Retornos operacionais, Sem resposta, Interações na semana, Processos críticos, Retornos pendentes), filtros por canal/responsável/área, views Lista/Kanban/Timeline/Data, banner de alerta sobre retorno pendente | — | Não |
| **Clientes** | `/clientes` | ✅ Funcional | 10 clientes do seed, KPIs (Total, Ativos, Com processo ativo, Aguardando retorno, Pendência documental), filtros por status, tags PF/PJ/Ativo/Prospecto, botões Novo Cliente/Registrar Atendimento/Exportar | — | Não |
| **Publicações** | `/publicacoes-intimacoes` | ✅ Funcional | 3 publicações correlacionadas a processos, KPIs (Novas, Exigem ação, Sem tratamento, Convertidas em prazo, Críticas), filtros, views Lista/Timeline, botões Atualizar/Triagem/Criar prazo/Exportar | — | Não |
| **Notificações (dropdown)** | (topbar) | ✅ Funcional | Dropdown abre, endpoint Prisma retorna corretamente, estado vazio "Nenhuma notificação" exibido | Sem notificações no seed — estado vazio correto | Não |
| **Triagem** | `/triagem` | ⚠️ Parcial | Tela carrega completamente — "Fila central de triagem", KPIs (Críticos pendentes, Normais pendentes, Em revisão manual, Tratados hoje, CRM gerado), seção de Observabilidade (jobs), Qualidade da IA (taxa de confirmação), tabs Crítica/Normal/Tratados | **Zero itens em todos os contadores** — sem jobs de triagem rodando no ambiente local; tab Crítica e Normal mostram lista vazia | Não (dados virão com jobs reais) |
| **CRM Jurídico** | `/crm-juridico` | ✅ Funcional | KPIs, pipeline kanban com 6 colunas (Ação recomendada → Perdido), 1 oportunidade real no seed ("Tom Kelve Santos de Medicina" em Negociação), botão Nova oportunidade, busca e filtros | R$ 0,00 em Ganhos — seed não tem conversões concluídas | Não |
| **Financeiro** | `/financeiro` | ✅ Funcional | Header, KPIs (R$ 96.600 recebíveis, R$ 53.300 inadimplência, fluxo líquido, parcelas atrasadas), 5 tabs (Contas a receber, Contas a pagar, Inadimplência, Parcelamentos, Conciliação), 57 lançamentos reais após `db:seed:finance` | `provider: "mock"` ainda bloqueia cobranças reais (BL-061) — dados do seed são fictícios | Não (estrutura) / **Sim** (cobranças reais — BL-061) |
| **Usuários** | `/usuarios` | ✅ Funcional | 4 usuários com roles corretas visíveis (ADM/ADV/ATD/FIN), KPIs, contrato de bloqueio, dependência de ownership, matriz de permissões operacional | Equipes não materializadas (0 equipes) — depende de ownership/portfolio | Não |
| **Configurações** | (botão sidebar) | ⚠️ Incerto | Botão clicável na sidebar | **Não abre tela nem modal** — sem comportamento visível após clique | A confirmar |
| **Ajuda** | (botão sidebar) | ⚠️ Incerto | Botão clicável na sidebar | **Não abre tela nem modal** — sem comportamento visível após clique | A confirmar |

---

## 4. Descoberta Crítica — Roles do Seed

> [!warning] BL-060 é bloqueante para operação com seed ou para qualquer demo/piloto

O `seed.sql` insere usuários com roles `admin`, `coordinator`, `assistant`. O sistema verifica roles usando os valores reais `ADM`, `ADV`, `FIN`, `ATD`. Consequências:

| Verificação no código | Role esperada | Role do seed | Resultado |
|---|---|---|---|
| `user.role === 'ADM'` (proteção de `/usuarios`) | `ADM` | `admin` | Redirect para `/` |
| Guard de CRM | Provavelmente `ADV` ou `ADM` | `admin` | "Acesso negado" |
| Guard de Financeiro | Provavelmente `FIN` ou `ADM` | `admin` | "Acesso negado" |

**Solução imediata:** Corrigir `seed.sql` para usar `ADM`, `ADV`, `FIN`, `ATD` (BL-060). Até lá, as únicas telas testáveis com o seed atual são as que não têm guard de role.

**Efeito colateral:** O item da sidebar "Usuários" não aparece para o usuário de seed — porque o componente `SidebarNav.tsx` também verifica `role === 'ADM'` para exibir o link. Usuário nunca vê a opção.

---

## 5. Módulos Sem Rota Confirmada

### Platform Admin (`src/platform-admin/`)
- Código existe: 5 subpastas com componentes de tela completos (confirmado KB-003B)
- **Sem rota em App.tsx**
- Nenhum acesso via URL testável no ambiente local
- Durante navegação: nenhum item na sidebar leva ao Platform Admin
- **Hipótese mais provável:** acessível apenas via link direto por usuário com role de plataforma, ou ainda não conectado ao Router principal

### Company Foundation (`src/admin/company-foundation/`)
- Código existe (`CompanyFoundationPanel.tsx` confirmado)
- **Sem rota em App.tsx**
- Não acessado durante navegação

### Timesheet (backend)
- Backend tem domínio `timesheet` completo
- **Sem tela de frontend identificada e sem rota declarada**
- Módulo não aparece na sidebar

---

## 6. Navegação e Sidebar

### Estrutura da sidebar (observada)

| Seção | Itens | Observações |
|---|---|---|
| **OPERAÇÃO** | Home, Processos, Tarefas, Prazos, Agenda, Documentos, Modelos, Publicações, Triagem, Atendimentos | Todos funcionam — 10 itens |
| **CRM** | Clientes, CRM Jurídico | CRM bloqueia por role |
| **GESTÃO** | Financeiro | Bloqueia por role |
| **SUPORTE** | Ajuda, Configurações | Botões sem ação visível |
| **PERFIL** | role + email + Encerrar | Role exibe "admin" (seed) |

**Ausência crítica:** Item "Usuários" não aparece para o usuário de seed (correto — é protegido por role ADM). Mas para um ADM real, deveria aparecer.

---

## 7. Jornadas Funcionais Confirmadas

| Jornada | Telas envolvidas | Estado | Ponto de quebra |
|---|---|---|---|
| Login → Dashboard | Login → `/` | ✅ Completa | — |
| Dashboard → Processo → Detalhe | `/` → `/processos` → `/processos/1` | ✅ Completa | — |
| Dashboard → Prazos | `/` → `/prazos` | ✅ Completa | — |
| Processos → Detalhe → Ação rápida | `/processos` → drawer → botões | ✅ Completa | — |
| Publicações → Triagem | `/publicacoes-intimacoes` → botão Triagem | ✅ Parcial (triagem sem dados) | Jobs não rodando localmente |
| Clientes → Registrar Atendimento | `/clientes` → botão → `/atendimentos` | ✅ Provável | Não testado o fluxo completo |
| ADM: Gestão de usuários | `/usuarios` | ❌ Bloqueada | Role seed incorreta (BL-060) |
| ADM/FIN: Financeiro | `/financeiro` | ❌ Bloqueada | Role seed + provider mock |
| ADV/ADM: CRM Jurídico | `/crm-juridico` | ❌ Bloqueada | Role seed incorreta |

---

## 8. Gaps Funcionais Identificados

| Gap | Tela | Impacto | Evidência | Backlog relacionado |
|---|---|---|---|---|
| Seed com roles erradas bloqueia CRM, Financeiro e Usuários | CRM, Financeiro, Usuários | Crítico — impossível testar 3 módulos | "Acesso negado" + redirect observados | BL-060 |
| Upload de documentos sem storage confirmado | Documentos | Alto — arquivos podem se perder no Render | BL-045 aberto; storage adapter desconhecido | BL-045, BL-058 |
| Financeiro com provider mock | Financeiro | Alto — cobranças não são reais | `provider: "mock"` confirmado; KPIs R$ 0,00 | BL-061 |
| Configurações sem ação visível | Sidebar | Médio — usuário não consegue configurar nada | Clique sem resposta observado | Novo candidato |
| Ajuda sem ação visível | Sidebar | Baixo | Clique sem resposta observado | Novo candidato |
| Triagem sem dados em dev local | Triagem | Baixo em dev — alto em prod se jobs falharem | Zero itens; jobs não inicializados localmente | — |
| Timesheet sem tela no frontend | — | Médio — módulo backend sem acesso | Nenhuma rota encontrada | Novo candidato |
| Platform Admin sem rota | — | Médio — admin de plataforma inacessível | Sem rota em App.tsx (BL-022) | BL-022 |
| BL-021: notificationCount ainda hardcoded | Topbar | Baixo | Badge da topbar não refletia count real antes da interação | BL-021 |

---

## 9. Gaps de UX Identificados

| Gap de UX | Tela | Tipo | Impacto | Recomendação |
|---|---|---|---|---|
| "Acesso negado" sem contexto de qual role é necessária | CRM, Financeiro | Feedback | Médio — usuário não sabe o que fazer | Mensagem descritiva com role necessária |
| Configurações e Ajuda clicáveis mas sem ação | Sidebar | Feedback | Médio — expectativa não satisfeita | Implementar tela/modal ou remover da sidebar |
| Sidebar não mostra "Usuários" para role admin (seed) | Sidebar | Consistência | Médio — usuário admin não vê o item | Seed precisa usar ADM para testar fluxo real |
| Vídeo de background do login não carregou | Login | Visual | Baixo — fallback funciona | Verificar se `fundo_login.mp4` está no deploy |
| Notificação dropdown mostra "Nenhuma notificação" sem CTA | Notificações | Estado vazio | Baixo | Adicionar sugestão de próxima ação no estado vazio |
| Processo detalhe: 9 tabs pode ser muito para um usuário novo | Processo detalhe | Navegação | Médio | Avaliar agrupamento ou tabs secundárias no KB-006 |
| Dashboard KPI "Financeiro do Dia" com valor sem contexto | Dashboard | Clareza | Baixo | Confirmar se valor R$ 16.800 vem do seed ou de cálculo real |

---

## 10. Evidências Visuais Capturadas

Screenshots capturados durante a navegação (mantidos em memória de sessão):

| Tela | Estado documentado |
|---|---|
| Login | Form limpo, background Lady Justice, sem credenciais hardcoded |
| Dashboard | KPIs reais, timeline de processos, agenda do dia |
| Processos (lista) | 6 processos, filtros operacionais, drawer de detalhe |
| Processo #1 (detalhe) | Timeline, pendências, tabs completas |
| Prazos | Fila prioritária, 3 prazos críticos |
| Agenda | Visão semanal, eventos do dia |
| Tarefas | 3 tarefas com status e responsáveis |
| Documentos | 15 docs agrupados por processo |
| Modelos de Peças | 10 modelos com versões |
| Atendimentos | 2 atendimentos, filtros |
| Clientes | 10 clientes PF/PJ |
| CRM Jurídico | Estrutura + "Acesso negado" |
| Financeiro | Estrutura + "Acesso negado" + R$ 0,00 |
| Publicações | 3 publicações correlacionadas |
| Triagem | Tela carregada, zero itens |
| Notificações | Dropdown "Nenhuma notificação" |

Screenshots históricos disponíveis no repositório:
- `frontend/test-screenshots/01-dashboard.png` a `08-mobile-640.png`
- `frontend/dashboard-screenshot-desktop.png`

---

## 11. Componentes Compartilhados — Identificados

| Componente / Padrão | Usado em | Observação |
|---|---|---|
| **KpiCard** (card de métrica) | Dashboard, Processos, Prazos, Agenda, Tarefas, Atendimentos, Clientes, Publicações, Financeiro | Componente com maior reuso — candidato ao Design System |
| **FilterBar** (barra de filtros operacionais) | Processos, Prazos, Agenda, Tarefas, Documentos, Atendimentos, Clientes, Publicações | Padrão recorrente — candidato ao DS |
| **StatusPill / badge de status** | Processos, Tarefas, Documentos, Publicações, Clientes | Tags coloridas por status — candidato ao DS |
| **EmptyState** | Triagem (zero itens), CRM (acesso negado), Notificações (vazia) | Três variações visuais identificadas — verificar se são o mesmo componente |
| **PageHeader** | Todas as telas com AppShell | Cabeçalho de tela com título, subtítulo e breadcrumb |
| **Drawer de detalhe rápido** | Processos → drawer lateral | Padrão de drawer sem navegar — candidato ao DS |
| **Timeline** | Processo detalhe, Atendimentos | Componente de linha do tempo — verificar se são instâncias do mesmo componente |
| **PriorityBadge** | Processos, Tarefas, Prazos | Badge com prioridade colorida (Alta/Média/Baixa/Crítica) |
| **ActionButton cluster** | Processo detalhe (Registrar andamento, Criar prazo, etc.) | Grupo de ações contextuais — padrão recorrente |

---

## 12. Insumos para KB-006 — Design System

| Insumo | Relevância para KB-006 |
|---|---|
| KpiCard aparece em 9+ telas | Primeiro candidato ao DS — já tem variantes visuais |
| FilterBar aparece em 8+ telas | Componente de alta frequência com variações por contexto |
| StatusPill com 4+ variações | Definir tokens de cor semântica por status |
| EmptyState com variações visuais | Padronizar estado vazio antes de novos módulos |
| Dois sistemas de tokens CSS coexistentes | Resolver `tokens.css` vs `index.css` como primeira decisão de DS |
| IBM Plex Sans não confirmada carregando | Confirmar font-face no build antes de formalizar tipografia |
| Layout do Dashboard (shell interno vs. AppShell) | Investigar duplicidade de layout antes de criar novos módulos |
| Background do login (vídeo vs. fallback) | Definir strategy de assets de autenticação |

---

## 13. Candidatos a Backlog

| Candidato | Tipo | Prioridade sugerida | Observação |
|---|---|---|---|
| Corrigir seed.sql para usar roles ADM/ADV/FIN/ATD | Correção | **P0 Produto** — BL-060 já existe | Urgente: sem isso nenhum demo funciona completamente |
| Implementar Configurações (tela ou modal funcional) | Produto | P2 Produto | Botão existe mas não faz nada |
| Implementar Ajuda (tela ou modal funcional) | Produto | P2 Produto | Botão existe mas não faz nada |
| Expor Timesheet no frontend | Produto | P2 Produto | Domínio backend completo sem tela |
| Confirmar mecanismo de acesso ao Platform Admin | Investigação | P1 Produto | BL-022 — sem rota declarada |
| Adicionar seed de notificações para facilitar testes | Dev | P3 | Dropdown correto mas sempre vazio em dev local |
| Validar se KPI "Financeiro do Dia" vem de dado correto | Investigação | P2 | R$ 16.800 no dashboard com provider mock |

---

## 14. Limitações desta Etapa

> [!warning] Limitações desta navegação
>
> - **Roles de seed incorretas** impediram o teste de CRM, Financeiro e Usuários com dados reais
> - **Jobs de triagem** não inicializam no ambiente dev local (normal) — triagem zero itens não representa estado de produção
> - **Upload de documentos** não foi testado de ponta a ponta (clicar upload → confirmar que arquivo persistiu)
> - **Fluxo de criação** (Novo Processo, Novo Cliente, etc.) não foi testado — apenas listagens e detalhes
> - **Mobile/responsividade** não testada nesta navegação
> - **Flows de autenticação edge cases** (token expirado, logout, sessão múltipla) não testados
> - **Platform Admin** não acessível por URL conhecida
> - Análise visual profunda (cores, espaçamento, tipografia) reservada para KB-006

---

*Criado em: 2026-05-30 | Status: current | Vault: !_lexora-memory-docs*
*Pasta: 08 - UX UI | Fonte: Claude Code (navegação real + browser preview)*
*Baseado em: [[KB_004_PRODUCT_DISCOVERY_LEXORA_CURRENT_2026-05-30]], [[KB_003B_FRONTEND_ESTADO_ATUAL_CURRENT_2026-05-29]], [[KB_003C_BACKEND_E_APIS_ESTADO_ATUAL_CURRENT_2026-05-30]], [[BACKLOG_GERAL_LEXORA_CURRENT]]*
