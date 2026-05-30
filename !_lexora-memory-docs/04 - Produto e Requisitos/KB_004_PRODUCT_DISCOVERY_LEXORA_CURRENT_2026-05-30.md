---
tipo: kb
status: current
projeto: lexora
fase: product-discovery
area: produto
data: 2026-05-30
fonte: claude-code
baseado_em:
  - '[[00_START_HERE]]'
  - '[[KB_003G_RISCOS_TECNICOS_E_DIVERGENCIAS_CONSOLIDADAS_CURRENT_2026-05-30]]'
  - '[[KB_003B_FRONTEND_ESTADO_ATUAL_CURRENT_2026-05-29]]'
  - '[[KB_003C_BACKEND_E_APIS_ESTADO_ATUAL_CURRENT_2026-05-30]]'
  - '[[BACKLOG_GERAL_LEXORA_CURRENT]]'
escopo: product-discovery
vault_oficial: 'C:\Users\tomke\app Juridico\!_lexora-memory-docs'
autoridade: descoberta-produto
---

# KB-004 — Product Discovery Lexora

> [!important] Fontes e limites de confiança
> Este documento combina dois tipos de insumos: (1) **inventário técnico real** lido diretamente do código (KB-003B, KB-003C, KB-003G) e (2) **contexto de produto fornecido pelo responsável** (Tom, 2026-05-30). Fatos confirmados, inferências e hipóteses são explicitamente distinguidos ao longo do documento. Nenhum código foi alterado, nenhum backlog foi atualizado, nenhum usuário real foi entrevistado.

---

## 1. Resumo Executivo

O **Lexora** é um SaaS jurídico próprio, B2B, desenvolvido para **escritórios de advocacia**. O produto tem como proposta central ser uma **suite integrada de gestão jurídica** — não uma ferramenta pontual, mas um sistema completo que cobre o ciclo operacional do escritório: processos, prazos, atendimentos, documentos, CRM, financeiro, publicações, triagem automatizada e IA assistiva.

### Estado atual (confirmado por Tom, 2026-05-30)

O produto está em **fase pré-lançamento com beta funcional de cobertura desigual**:
- Algumas telas estão **completamente funcionais** (fluxo completo com dados reais)
- Algumas telas têm **interface pronta mas funcionalidades parciais** (botão existe, ação não funciona)
- As **jornadas ainda não foram validadas** com usuários reais de escritórios
- Podem existir **gaps funcionais** que só aparecerão com uso real
- **Não há clientes em produção ainda** — o ambiente de produção estava sendo usado como homologação pelo próprio Tom

### Implicação para produto

O estado atual **não é MVP pronto para lançamento** — é um **beta funcional avançado** que requer:
1. Mapeamento do que está funcional vs. quebrado por módulo
2. Validação de jornadas com escritórios reais
3. Análise de gaps funcionais
4. Correção das lacunas críticas antes do primeiro cliente

### Separação explícita

**Fatos confirmados:**
- 16 rotas de frontend implementadas cobrindo os módulos principais
- Backend com ~20 domínios de serviço implementados
- Roles definidas: ADM, ADV, FIN, ATD + platform roles
- Integração DataJud (lookup de processos por número) via chave demo
- IA determinística ativa; LLM externo não configurado
- Notificações agora persistem no banco (BL-046 concluído)
- Finance usa `provider: "mock"` — sem pagamentos reais

**Inferências (alta confiança):**
- Módulos de processos, prazos, tarefas, clientes e atendimentos têm maior maturidade (mais rotas, mais código)
- Finance é o domínio backend mais rico mas com bloqueio do provider mock
- Triagem e publicações formam um pipeline automatizado mais complexo

**Hipóteses (precisam de validação):**
- Advogados são os usuários mais frequentes do produto
- Os módulos de processos e prazos são os mais críticos para escritórios
- A completude da suite é um diferencial real, mas pode dificultar onboarding
- Há gaps de funcionalidade que só aparecem no uso real por um escritório

---

## 2. Objetivo do Documento

Este documento serve para:

- Consolidar a visão de produto do Lexora com base em inventário técnico real e contexto do responsável
- Mapear módulos, personas, jornadas, funcionalidades e estado de implementação
- Identificar hipóteses que precisam de validação antes do lançamento
- Orientar o **KB-005 — Inventário Funcional e UX/UI**: quais telas mapear, quais fluxos validar
- Orientar o **KB-006 — Design System e Constituição Visual**: quais padrões consolidar
- Apoiar a priorização do backlog operacional
- Documentar as perguntas de produto que o responsável deve responder antes do lançamento

---

## 3. Escopo e Fora do Escopo

### Dentro do escopo

- Visão do produto e proposta de valor
- Personas e papéis de usuário
- Mapeamento de módulos e estado de implementação
- Jornadas macro e por persona
- Funcionalidades confirmadas, inferidas e incertas
- Hipóteses de produto e perguntas de validação
- Oportunidades e riscos de produto
- Relação com backlog e riscos técnicos
- Insumos para KB-005 e KB-006

### Fora do escopo

- Implementar funcionalidades
- Alterar código, backlog, KBs, ADRs ou configurações
- Criar telas ou protótipos
- Validar com usuários reais (etapa futura)
- Definir roadmap final (requer validação)
- Criar Design System
- Executar testes ou deploys

---

## 4. Visão do Produto

| Elemento | Descrição | Evidência | Confiança |
|---|---|---|---|
| Tipo de produto | SaaS B2B, produto próprio | Confirmado por Tom | Alta |
| Público-alvo | Escritórios de advocacia | Confirmado por Tom | Alta |
| Proposta central | Suite integrada de gestão jurídica — ferramenta completa, não pontual | Confirmado por Tom | Alta |
| Modelo de acesso | Multi-empresa (multi-tenant): cada escritório é uma empresa com membros e roles próprias | Código: `CompanyContext`, `companyId`, memberships | Alta |
| Módulos principais | ~16 módulos com rotas de frontend confirmadas | KB-003B — leitura de rotas em App.tsx | Alta |
| IA no produto | Triagem automatizada (determinística) + sumarização + recomendação de documentos | KB-003F | Alta |
| Integrações externas | DataJud (busca de processos por número), CNJ, OAB, CPF | KB-003C | Alta (mas chave demo) |
| Estado do produto | Beta funcional de cobertura desigual — pré-lançamento | Confirmado por Tom | Alta |
| Financeiro | Controle de cobranças, pagamentos, inadimplência, relatórios — provider mock | KB-003C, KB-003D | Alta (mock) |
| Diferencial possível | Completude da suite + triagem automatizada de publicações + IA assistiva | Inferência por inventário | Média |
| Posicionamento de mercado | Não validado com mercado | Hipótese | Baixa |
| Modelo de preço/plano | `subscription`, `plans`, `billing` existem no backend | KB-003C | Média |

---

## 5. Problemas que o Produto Parece Resolver

| Problema/Dor | Usuário impactado | Como o Lexora tenta resolver | Evidência | Hipótese a validar |
|---|---|---|---|---|
| Perda de prazos processuais | Advogado | Módulo de Prazos com alertas e controle de vencimentos | Rota `/prazos`, domínio `deadlines` com risk e batch-actions | Prazos são realmente integrados com processos ou apenas manuais? |
| Desorganização de processos | Advogado | Módulo de Processos com detalhe por processo, documentos e tarefas vinculadas | Rota `/processos`, `/processos/:id` | Processos são criados manualmente ou vêm do DataJud? |
| Triagem manual de publicações | Advogado | Pipeline automatizado de publicações e intimações com triagem IA | Domínio `publications`, `triage`, `triage-ai.provider.ts` | Usuários confiam na triagem automática ou querem revisar tudo? |
| Gestão de clientes dispersa | Advogado, Atendente | Módulo de Clientes com carteira unificada e CRM | Rota `/clientes`, `/crm-juridico`, domínio `crm` | O CRM e Clientes são percebidos como módulos distintos ou confusos? |
| Controle financeiro jurídico | Financeiro, ADM | Módulo Financeiro com cobranças, recebimentos, inadimplência | Domínio `finance` rico, rota `/financeiro` | Finance com provider mock bloqueia adoção real |
| Falta de visibilidade operacional | Gestor/ADM | Dashboard com KPIs operacionais, BI executivo | Rota `/`, domínio `bi`, módulo dashboard com widgets | O dashboard reflete operação real ou ainda tem dados mock? |
| Atendimento sem histórico | Atendente, Advogado | Módulo de Atendimentos com registro e SLA | Rota `/atendimentos`, domínio `attendances` com SLA | Fluxo de atendimento está completo (criação → encerramento)? |
| Documentos e peças dispersos | Advogado | Módulo de Documentos + Modelos de Peças com upload e templates | Rotas `/documentos`, `/modelos-pecas` | Storage de documentos ainda incerto (BL-045) |
| Agenda fragmentada | Advogado | Módulo de Agenda integrado com processos e prazos | Rota `/agenda` | Agenda sincroniza com prazos e atendimentos automaticamente? |
| Colaboração em equipe sem controle | ADM | Gestão de usuários, roles, timesheet | Rota `/usuarios`, domínio `team`, `timesheet` | Timesheet está exposto no frontend? |

---

## 6. Personas e Usuários Prováveis

| Persona | Papel no sistema | Role | Objetivos | Dores | Módulos relevantes | Confiança |
|---|---|---|---|---|---|---|
| **Advogado** | Usuário principal operacional | ADV | Gerir processos, prazos, documentos, clientes, publicações e triagem do dia a dia | Perder prazo, duplicar trabalho manual, falta de visibilidade processual | Dashboard, Processos, Prazos, Documentos, Publicações, Triagem, Tarefas, Clientes | Alta |
| **Administrador do Escritório** | Gestor da operação | ADM | Visibilidade da operação, gestão de usuários, controle financeiro, relatórios | Falta de visão executiva, usuários sem controle, financeiro desorganizado | Dashboard, Usuários, Financeiro, BI, Agenda, CRM | Alta |
| **Financeiro** | Responsável pela área financeira | FIN | Controlar cobranças, recebimentos, inadimplência, emitir relatórios | Cobrança manual, baixa inadimplência sem automação | Financeiro (módulo principal) | Alta |
| **Atendente** | Primeiro contato com clientes | ATD | Registrar atendimentos, gerenciar agenda, qualificar leads | Perder informação de atendimento, falta de histórico do cliente | Atendimentos, Agenda, Clientes, CRM | Alta |
| **Gestor Jurídico** | Visão estratégica e de performance | ADM ou role específica | KPIs de operação, produtividade da equipe, gestão de portfólio | Falta de dados consolidados, dificuldade de delegar com rastreabilidade | Dashboard BI, Processos, Timesheet | Média (inferência) |
| **Platform Admin** | Administrador de plataforma (Lexora) | Platform role | Gerenciar empresas, onboarding, suporte, billing de plataforma | — | Platform Admin console (sem rota declarada) | Média |

---

## 7. Papéis, Permissões e Responsabilidades

| Papel/Role | Evidência | Responsabilidade provável | Módulos acessados | Ponto a validar |
|---|---|---|---|---|
| `ADM` | `roles.ts`, `main.ts`: `user.role === 'ADM'` protege `/usuarios` | Gestão do escritório: usuários, financeiro, dashboard executivo | Tudo + `/usuarios` exclusivo | Lista completa de permissões por role (BL-083 aberto) |
| `ADV` | `roles.ts`, sidebar title dinâmico por role | Operação jurídica do dia a dia | Dashboard, Processos, Prazos, Documentos, Clientes, Atendimentos, Agenda, Templates, Tarefas, CRM, Publicações, Triagem | Quais rotas são restritas ao ADV? |
| `FIN` | `roles.ts` | Operação financeira | Financeiro (principal) | Acesso ao financeiro é exclusivo do FIN ou o ADM também acessa? |
| `ATD` | `roles.ts` | Atendimento e relacionamento | Atendimentos, Clientes, CRM, Agenda | Atendentes têm acesso restrito a processos? |
| Platform roles | `roles.ts` mapeamento `ADM→company_admin`, `ADV→lawyer` | Roles de plataforma multi-tenant separadas das roles de escritório | Platform Admin console | BL-083: roles ainda precisam ser confirmadas via leitura de `roles.ts` e `permissions/matrix.ts` |

> [!warning] Roles aguardando validação
> BL-083 (aberto): a lista definitiva de roles e permissões por módulo ainda precisa ser lida de `backend/src/roles/roles.ts` e `backend/src/permissions/matrix.ts`. As permissões descritas aqui são inferências baseadas em evidências parciais.

---

## 8. Módulos e Domínios do Produto

| Módulo/Domínio | Objetivo | Usuário principal | Funcionalidades aparentes | Estado aparente | Evidência |
|---|---|---|---|---|---|
| **Login / Auth** | Autenticação segura | Todos | Login com email/senha, sessão via cookie HTTP, proteção de rotas | Funcional | KB-003B rota login inline App.tsx; P0 auth resolvidos |
| **Dashboard** | Visão operacional diária | ADV, ADM | KPIs, tarefas do dia, prazos próximos, processos recentes, agenda, BI | Funcional | Rota `/`; estrutura interna rica (containers, hooks, widgets) |
| **Processos** | Gestão processual | ADV | Lista de processos, detalhe por processo, documentos vinculados, tarefas, prazos | Funcional | Rotas `/processos`, `/processos/:id`; domínio `publications` + `datajud` |
| **Prazos** | Controle de prazos processuais | ADV | Lista de prazos, status de vencimento, risco, batch actions | Funcional | Rota `/prazos`; domínio `deadlines` com risk e batch-actions |
| **Agenda** | Compromissos e audiências | ADV, ATD | Eventos, compromissos, audiências, retornos agendados | Funcional | Rota `/agenda`; domínio integrado com processos |
| **Documentos** | Gestão de arquivos jurídicos | ADV | Upload, versionamento, vinculação a processos, aprovação | Parcialmente implementado | Rota `/documentos`; storage adapter não confirmado (BL-045) |
| **Modelos de Peças** | Templates jurídicos reutilizáveis | ADV | Criação e uso de modelos de petições e documentos | Funcional | Rota `/modelos-pecas`; domínio `documents/checklist`, `ai/drafting` |
| **Tarefas** | Gestão de tarefas internas | ADV, ADM | Criação, atribuição, acompanhamento, workflow | Funcional | Rota `/tarefas`; domínio `tasks` com workflow e followup |
| **Atendimentos** | Registro de atendimentos a clientes | ATD, ADV | Criação, histórico, SLA, conversão para processo | Funcional | Rota `/atendimentos`; domínio `attendances` com SLA e conversion |
| **Clientes** | Carteira de clientes do escritório | ADV, ATD | Cadastro, histórico, comunicação, portal | Funcional | Rota `/clientes`; domínio `clients` com consent e portal |
| **CRM Jurídico** | Pipeline de leads e oportunidades | ADV, ADM | Leads, oportunidades, prospecção, conversão para cliente | Funcional | Rota `/crm-juridico`; domínio `crm` rico (leads, opportunities, prospecting) |
| **Financeiro** | Controle financeiro do escritório | FIN, ADM | Cobranças, recebimentos, inadimplência, conciliação, relatórios, webhooks | Parcialmente implementado | Rota `/financeiro`; `FinanceCharge.provider: "mock"` — pagamentos não reais (BL-061) |
| **Publicações e Intimações** | Monitoramento de diários oficiais | ADV | Captura, ingestão, classificação, correlação com processos, reprocessamento | Funcional | Rota `/publicacoes-intimacoes`; domínio `publications` com pipeline complexo |
| **Triagem** | Triagem automatizada de publicações | ADV | Decisão automatizada, explainabilidade, fila de triagem, SLA | Funcional | Rota `/triagem`; domínio `triage` + IA determinística |
| **Usuários** | Gestão de membros do escritório | ADM | Cadastro, roles, convites | Funcional | Rota `/usuarios` (ADM only); domínio `platform/memberships` |
| **Notificações** | Alertas em tempo real | Todos | Notificações de prazos, publicações, tarefas; marcar como lida | Funcional (recém corrigido) | BL-046 concluído — agora usa Prisma; anterior era mock |
| **Platform Admin** | Console de administração da plataforma | Platform Admin | Gestão de empresas, onboarding, suporte, billing de plataforma | Implementado sem rota | `src/platform-admin/` existe com telas; sem rota em App.tsx (BL-022) |
| **Admin Company Foundation** | Fundação de nova empresa | ADM ou Platform Admin | Setup inicial da empresa no sistema | Implementado sem rota | `src/admin/company-foundation/` existe; sem rota declarada |
| **BI / Métricas** | Visão executiva e relatórios | ADM | Métricas de performance, snapshots, exports | Implementado (acesso via Dashboard) | Domínio `bi` rico; acesso via dashboard widgets |
| **Timesheet** | Controle de horas trabalhadas | ADV, ADM | Lançamento, aprovação, relatórios de horas | Implementado no backend | Domínio `timesheet`; **ausência de rota confirmada no frontend** |

---

## 9. Estado de Implementação por Módulo

> [!important] Esta seção é um insumo crítico para KB-005
> Baseada na combinação de inventário técnico (KB-003B, KB-003C) + declaração do responsável (Tom, 2026-05-30): "temos algumas telas finalizadas com suas funcionalidades, outros temos algumas telas que têm o botão da funcionalidade mas ainda não funciona."

| Módulo | Estado técnico confirmado | Lacunas conhecidas | Validação necessária |
|---|---|---|---|
| Login | Funcional | Credenciais removidas (P0 resolvido) | Testar login real com usuário do banco |
| Dashboard | Funcional (estrutura) | KPIs dependem de dados reais; widgets podem ter dados mock | Validar com dados reais do banco |
| Processos | Funcional | DataJud usa chave demo (BL-084) | Fluxo completo: criar → vincular → acompanhar |
| Prazos | Funcional | — | Alertas de prazo próximo chegam ao usuário? |
| Agenda | Funcional | — | Integração bidirecional com prazos e atendimentos |
| Documentos | Parcial | Storage adapter desconhecido (BL-045) — upload pode não persistir | Testar upload → download; confirmar storage |
| Modelos de Peças | Funcional | Integração IA para geração de rascunho (determinístico) | Fluxo criar modelo → usar no processo |
| Tarefas | Funcional | — | Workflow de tarefa completo; notificações de followup |
| Atendimentos | Funcional | — | Conversão de atendimento para processo |
| Clientes | Funcional | — | Histórico completo; vinculação com processos |
| CRM Jurídico | Funcional | — | Pipeline lead → oportunidade → cliente |
| Financeiro | Parcial | `provider: "mock"` — cobranças fictícias (BL-061) | Webhooks reais? Conciliação funcional? |
| Publicações | Funcional | — | Pipeline completo: captura → correlação → alerta |
| Triagem | Funcional | IA determinística (não LLM) | Precisão da triagem automática; taxa de falsos positivos |
| Usuários | Funcional | Role check `/admin/seed-finance` com bug (BL-041) | Convite e onboarding de novo membro |
| Notificações | Funcional (recém corrigido) | BL-046 resolvido | Notificações aparecem na topbar após ação real |
| Platform Admin | Interface sem rota | Sem rota declarada no Router (BL-022) | Como é acessado atualmente? |
| Timesheet | Backend implementado | Sem rota de frontend confirmada | Há tela de timesheet no frontend? |

---

## 10. Jornada Macro do Usuário

| Etapa | Ação do usuário | Módulos envolvidos | Valor entregue | Dor reduzida | Ponto a validar |
|---|---|---|---|---|---|
| 1. Acesso | Login seguro no sistema | Auth / Login | Acesso protegido ao escritório | Credenciais dispersas | Cookie funciona em cross-domain? (P0 resolvido) |
| 2. Orientação diária | Verificar dashboard ao entrar | Dashboard / BI | Visão do dia: prazos, tarefas, publicações novas | Falta de contexto ao começar o dia | KPIs mostram dados reais? |
| 3. Gestão processual | Acompanhar processos e prazos | Processos / Prazos | Controle do portfólio processual | Prazo perdido; esquecimento | Alerta chega antes do vencimento? |
| 4. Triagem de publicações | Revisar publicações do dia | Publicações / Triagem | Intimações capturadas e correlacionadas automaticamente | Triagem manual de diários | Taxa de acerto da triagem automática |
| 5. Atendimento e CRM | Registrar atendimento ou qualificar lead | Atendimentos / CRM | Histórico de contato centralizado | Informação perdida em e-mail/WhatsApp | Conversão atendimento→processo funciona? |
| 6. Documentos e peças | Criar ou usar modelo de peça | Documentos / Templates | Eficiência na produção jurídica | Retrabalho de documentos | Storage de upload persistente? |
| 7. Agenda | Planejar audiências e compromissos | Agenda | Visibilidade de compromissos futuros | Conflito de agenda | Agenda sincroniza com prazos? |
| 8. Financeiro | Registrar cobrança ou ver inadimplência | Financeiro | Saúde financeira do escritório | Cobrança manual, inadimplência descontrolada | Provider real configurado? |
| 9. Notificações | Receber alertas de ação necessária | Notificações | Avisos proativos sem precisar verificar tudo | Informação não chega ao usuário certo | Notificações chegam em tempo real? |
| 10. Gestão de equipe | Gerenciar membros, timesheet | Usuários / Timesheet | Visibilidade da produtividade da equipe | Falta de rastreabilidade do trabalho | Timesheet exposto no frontend? |

---

## 11. Jornadas por Persona

### Advogado (ADV)

| Etapa | Objetivo | Tela/Módulo | Resultado esperado | Dor/Risco |
|---|---|---|---|---|
| Login | Acessar o sistema | Login | Acesso à conta do escritório | Cookie expirado sem aviso claro |
| Verificar prazos do dia | Não perder prazo crítico | Dashboard + Prazos | Lista ordenada por urgência | KPI de prazos com dado real? |
| Consultar processo | Entender situação de processo específico | Processos / Detalhe | Visão completa: documentos, tarefas, prazos, histórico | DataJud com chave demo |
| Triar publicações | Verificar intimações do dia | Publicações / Triagem | Intimações correlacionadas automaticamente ao processo | Falso positivo da triagem automática |
| Gerar documento | Redigir petição com base em modelo | Templates / Documentos | Rascunho gerado com IA; documento salvo | Upload pode não persistir (BL-045) |
| Registrar tarefa | Delegar ou anotar ação interna | Tarefas | Tarefa criada e atribuída | Notificação de followup chega? |

### Administrador do Escritório (ADM)

| Etapa | Objetivo | Tela/Módulo | Resultado esperado | Dor/Risco |
|---|---|---|---|---|
| Verificar dashboard executivo | Visão de performance do escritório | Dashboard / BI | KPIs de produtividade, receita, inadimplência | Dados reais vs. mock |
| Gerenciar usuários | Adicionar membro ou ajustar role | Usuários | Membro com role correta no sistema | Bug no role check seed-finance (BL-041) |
| Revisar financeiro | Ver cobranças e inadimplência | Financeiro | Relatório de saúde financeira | Provider mock não gera cobrança real |
| Acompanhar CRM | Ver funil de leads e oportunidades | CRM Jurídico | Pipeline de novos clientes atualizado | Conversão lead→cliente implementada? |

### Financeiro (FIN)

| Etapa | Objetivo | Tela/Módulo | Resultado esperado | Dor/Risco |
|---|---|---|---|---|
| Registrar cobrança | Cobrar cliente por serviço | Financeiro | Cobrança gerada e vinculada ao cliente | Provider mock — cobrança não é real (BL-061) |
| Verificar inadimplência | Identificar clientes em atraso | Financeiro | Lista de inadimplentes com ação possível | Dado de inadimplência é real? |
| Gerar relatório | Relatório mensal para sócios | Financeiro / BI | Relatório exportável | Export de relatório implementado? |

### Atendente (ATD)

| Etapa | Objetivo | Tela/Módulo | Resultado esperado | Dor/Risco |
|---|---|---|---|---|
| Registrar atendimento | Documentar contato com cliente | Atendimentos | Atendimento salvo com histórico | Conversão para processo automática? |
| Qualificar lead | Registrar novo potencial cliente | CRM Jurídico | Lead criado no funil | Pipeline de CRM funcional? |
| Agendar retorno | Marcar próximo contato | Agenda | Compromisso na agenda do advogado | Agenda sincroniza entre usuários? |

---

## 12. Funcionalidades Confirmadas, Inferidas e Incertas

### Funcionalidades Confirmadas

| Funcionalidade | Módulo | Evidência | Usuário |
|---|---|---|---|
| Login/logout com cookie HTTP seguro | Auth | KB-003B, KB-003C, P0 resolvidos | Todos |
| Listagem e detalhe de processos | Processos | Rota `/processos`, `/processos/:id` | ADV |
| Controle e listagem de prazos | Prazos | Rota `/prazos`, domínio `deadlines` | ADV |
| Gestão de tarefas com workflow | Tarefas | Rota `/tarefas`, domínio `tasks/workflow` | ADV, ADM |
| Registro de atendimentos com SLA | Atendimentos | Rota `/atendimentos`, `attendances/sla` | ATD, ADV |
| Carteira de clientes | Clientes | Rota `/clientes`, domínio `clients` | ADV, ATD |
| CRM com leads e oportunidades | CRM Jurídico | Rota `/crm-juridico`, domínio `crm` rico | ADV, ADM |
| Modelos de peças jurídicas | Templates | Rota `/modelos-pecas` | ADV |
| Agenda de compromissos | Agenda | Rota `/agenda` | ADV, ATD |
| Publicações e intimações (pipeline) | Publicações | Rota `/publicacoes-intimacoes`, domínio `publications` | ADV |
| Triagem automatizada de publicações | Triagem | Rota `/triagem`, domínio `triage`, IA determinística | ADV |
| Notificações persistidas no banco | Notificações | BL-046 concluído, endpoints Prisma | Todos |
| Gestão de usuários (ADM) | Usuários | Rota `/usuarios`, role ADM only | ADM |
| Dashboard com widgets | Dashboard | Rota `/`, estrutura rica de containers e hooks | Todos |
| Busca de processo via DataJud | Processos | `datajud.provider.ts`, integração CNJ | ADV |

### Funcionalidades Inferidas

| Funcionalidade | Módulo | Base da inferência | Confiança | O que validar |
|---|---|---|---|---|
| Alertas proativos de prazo vencendo | Prazos / Notificações | Domínio `deadlines` com risk + notificações agora no banco | Alta | Notificação é criada automaticamente quando prazo aproxima? |
| Conversão atendimento → processo | Atendimentos / Processos | Domínio `attendances/conversion` existe | Alta | Fluxo funciona de ponta a ponta? |
| Conversão lead → cliente | CRM / Clientes | Domínio `crm/conversion` existe | Alta | Dados migram corretamente? |
| Geração de rascunho de documento via IA | Templates / IA | `ai/drafting` + `DocumentDraftingService` | Alta | Endpoint HTTP exposto? (BL-082 aberto) |
| Dashboard BI com métricas de produtividade | Dashboard / BI | Domínio `bi` com metrics, snapshots | Alta | KPIs mostram dados reais do banco? |
| Exportação de relatório financeiro | Financeiro | `finance/reports` no domínio | Média | Relatório é exportável (PDF/Excel)? |
| Comunicação com cliente (email/SMS) | Clientes / Comunicação | Domínio `communication` com HTTP dispatcher | Média | Canal real (email? WhatsApp?) está integrado? |
| Controle de horas (timesheet) | Timesheet | Domínio `timesheet` no backend | Média | Existe tela no frontend? |
| Onboarding de empresa via Admin | Platform Admin | `src/admin/company-foundation/` | Média | Acessível hoje via qual caminho? |
| Planos e assinatura do SaaS | Billing | Domínio `subscription`, `plans`, `billing` | Média | Billing real ou apenas estrutura? |

### Funcionalidades Incertas ou Mockadas

| Funcionalidade | Motivo da incerteza | Impacto no produto | Próximo passo |
|---|---|---|---|
| Pagamentos e cobranças reais | `FinanceCharge.provider: "mock"` (BL-061) | Financeiro não opera em produção real | Tom confirmar provider real (BL-061, depende de acesso Render) |
| Upload e armazenamento de documentos | `storageAdapter` concreto não identificado (BL-045) | Uploads podem ser efêmeros no Render (disco local) | Localizar instanciação do storageAdapter em main.ts (BL-082 conexo) |
| Busca DataJud em produção | Chave demo no `.env.example` (BL-084) | Lookup de processos pode falhar em produção | Tom confirmar chave real no Render (BL-084) |
| Platform Admin no frontend | Sem rota em App.tsx (BL-022) | Administração de plataforma inacessível por rota normal | Investigar mecanismo de acesso (BL-022) |
| Notificações proativas automáticas | Jobs/schedulers em memória | Notificações criadas automaticamente vs. apenas por ação | Verificar `backend/src/jobs/` e `notifications/` |
| Sumarização e recomendação IA | Endpoints `/ai/summary`, `/ai/recommendation` sem tipos no frontend (BL-081) | Frontend não chama IA mesmo com backend pronto | Confirmar endpoints (BL-082) e adicionar tipos ao api.ts (BL-081) |
| Módulos com botões sem ação | Declarado por Tom | Funcionalidades visíveis mas quebradas | Mapeamento em KB-005 (tela por tela) |

---

## 13. Proposta de Valor por Módulo

| Módulo | Valor para o usuário | Valor para o negócio | Risco atual | Prioridade de validação |
|---|---|---|---|---|
| Processos + Prazos | Não perder prazo; ter visão processual completa | Core do produto jurídico — razão de existir | DataJud com chave demo | P0 Produto |
| Publicações + Triagem | Eliminar triagem manual de diários oficiais | Diferencial competitivo claro | Precisão da IA determinística | P0 Produto |
| Dashboard + BI | Visão operacional em tempo real | Retenção — advogado volta todo dia | KPIs dependem de dados reais | P1 Produto |
| Clientes + Atendimentos + CRM | Relacionamento centralizado | Entrada de novos casos; funil de clientes | Conversão lead→processo ainda a validar | P1 Produto |
| Documentos + Templates | Reduz retrabalho de produção jurídica | Produtividade diária visível | Storage não confirmado | P1 Produto |
| Financeiro | Controle financeiro do escritório | Receita do escritório visível; base para billing | Provider mock bloqueia uso real | P2 Produto |
| Tarefas + Agenda | Organização e delegação internas | Colaboração da equipe | — | P2 Produto |
| IA (sumarização, drafting) | Reduz tempo de análise e redação | Diferencial de produto futuro | Sem LLM externo; UI não conectada | P3 Produto |
| Platform Admin | Gestão de empresas para o operador do SaaS | Escala do produto (multi-escritório) | Sem rota declarada | P3 Produto |

---

## 14. Hipóteses de Produto

| Hipótese | Tipo | Evidência atual | Como validar | Prioridade |
|---|---|---|---|---|
| O módulo de processos + prazos é o ponto de entrada principal do advogado | Problema | Domínio mais rico, primeiro na sidebar | Entrevista com advogados de escritório | Alta |
| A triagem automática de publicações é o maior diferencial do Lexora vs. concorrentes | Valor | Pipeline complexo; IA integrada | Comparar com ferramentas existentes; testar taxa de acerto | Alta |
| A completude da suite gera percepção de complexidade no onboarding | Usabilidade | 16+ módulos; sem jornada validada | Teste de onboarding com usuário de escritório real | Alta |
| Escritórios preferem uma ferramenta única a várias especializadas | Valor | Proposta de suite completa do Tom | Survey ou entrevista com decisores de escritórios | Alta |
| O módulo financeiro é bloqueante para adoção (sem provider real) | Operação | `provider: "mock"` confirmado | Confirmar provider real (BL-061) | Alta |
| Notificações proativas são críticas para retenção diária | Valor | Domínio existente; recém corrigido | Medir engajamento diário após notificações reais | Média |
| Advogados usam mobile em audiências e atendimentos | Usabilidade | `src/mobile/` existe no backend | Verificar responsividade e feed mobile | Média |
| A IA de sumarização reduz significativamente o tempo de análise processual | IA | `ai/summarization` implementado | Teste A/B: com/sem IA em revisão de processo | Média |
| Escritórios menores (1-5 advogados) têm necessidade diferente de escritórios médios (10-30) | Problema | Multi-tenant com gestão de membros | Segmentar entrevistas por porte | Média |
| O DataJud real (vs. demo) é crítico para o produto funcionar corretamente | Operação | Chave demo identificada (BL-084) | Confirmar chave real no Render | Alta |

---

## 15. Perguntas de Discovery

### Produto

- Qual é o módulo que Tom usa com mais frequência no produto hoje?
- Quais telas têm funcionalidade incompleta confirmada por Tom?
- O produto tem um fluxo de onboarding de novo escritório definido?
- Existe documentação de quais features foram planejadas mas não implementadas?

### Usuários

- Advogados de qual tipo de escritório são o público-alvo prioritário? (trabalhista, cível, criminal, consultivo?)
- O escritório-alvo tem 1-5 advogados, 5-20 ou 20+?
- Os usuários são técnicos ou precisam de produto muito simples?
- Há usuário cliente final (portal do cliente) previsto?

### Operação jurídica

- O produto cobre OAB e CNJ além do TJ? (Diário da Justiça, TRT, etc.)
- A correlação de publicação com processo é automática ou precisa de revisão manual?
- O pulo do DataJud demo para DataJud real já está planejado?
- Há integração com sistema de protocolo eletrônico (e-SAJ, PJe)?

### Financeiro

- Qual é o provider de pagamento planejado? (Pagar.me, Asaas, Stripe?)
- O módulo financeiro cobre honorários, custas e despesas separadamente?
- Há previsão de nota fiscal eletrônica (NFS-e)?

### IA

- O produto vai comunicar IA como diferencial ao usuário?
- A IA determinística atual cobre as necessidades reais ou precisa de LLM?
- Existe preocupação com privacidade de dados sensíveis para LLM externo?

### Administração

- O Platform Admin é para Tom gerenciar os escritórios clientes?
- Como é feito o onboarding de um novo escritório hoje?
- Billing da plataforma (cobrança dos escritórios pelo uso do Lexora) está planejado?

### Notificações

- Quais eventos devem gerar notificação proativa? (prazo próximo, nova publicação, tarefa atrasada?)
- Notificações devem chegar também por email ou só no produto?

### Documentos

- Onde os documentos devem ser armazenados? (S3, Azure Blob, Google Cloud Storage?)
- Há limite de tamanho ou volume de documentos por escritório?

### Segurança e Confiança

- Escritórios terão preocupação com dados jurídicos sensíveis na nuvem?
- Há necessidade de certificado ou compliance jurídico (OAB, LGPD, ISO)?

---

## 16. Priorização Inicial de Produto

> [!note] Diferença entre prioridade de produto e prioridade técnica
> A prioridade técnica (P0-P3 do backlog) reflete urgência de correção técnica ou de segurança. A **prioridade de produto** (P0-P3 Produto abaixo) reflete importância para o usuário e para o lançamento comercial. Um item pode ser P3 técnico e P0 Produto simultaneamente.

| Iniciativa/Módulo | Valor para usuário | Valor para negócio | Risco técnico | Urgência | Prioridade sugerida |
|---|---|---|---|---|---|
| Mapeamento de telas funcionais vs. quebradas | Alta | Alta | Baixo | Imediata | P0 Produto |
| Validação de jornada do advogado (processos + prazos) | Alta | Alta | Médio | Imediata | P0 Produto |
| Confirmar provider financeiro real | Alta | Alta | Médio | Alta | P0 Produto |
| Confirmar storage de documentos | Alta | Alta | Médio | Alta | P0 Produto |
| Confirmar DataJud com chave real | Alta | Alta | Baixo | Alta | P0 Produto |
| Validar triagem automática (taxa de acerto) | Alta | Alta | Baixo | Alta | P1 Produto |
| Conectar frontend de IA (sumarização, drafting) | Média | Alta | Médio | Média | P1 Produto |
| Definir e implementar onboarding de escritório | Alta | Alta | Médio | Média | P1 Produto |
| Validar jornada do financeiro (sem mock) | Alta | Alta | Alto | Média | P1 Produto |
| Expor Timesheet no frontend | Média | Média | Baixo | Baixa | P2 Produto |
| Notificações por email | Média | Média | Médio | Baixa | P2 Produto |
| Portal do cliente | Média | Alta | Alto | Baixa | P3 Produto |
| LLM externo para IA avançada | Alta (futuro) | Alta (futuro) | Alto | Futura | P3 Produto |

---

## 17. Relação com Riscos Técnicos

| Risco técnico (KB-003G) | Impacto no produto | Módulo afetado | Bloqueia lançamento? | Recomendação |
|---|---|---|---|---|
| RISK-001: Production consumindo staging | **Resolvido** (BL-004 concluído) | Todos | Resolvido | — |
| RISK-002: JWT fallback | **Resolvido** (BL-039 concluído) | Auth / Todos | Resolvido | — |
| RISK-003: Credenciais hardcoded | **Resolvido** (BL-020 concluído) | Login | Resolvido | — |
| RISK-004: NODE_ENV não definido | **Resolvido** (BL-040 concluído) | Cookies / Auth | Resolvido | — |
| RISK-005: Notificações em memória | **Resolvido** (BL-046 concluído) | Notificações | Resolvido | — |
| RISK-008: StorageAdapter desconhecido | Upload pode ser efêmero | Documentos | **Sim** — uploads perdidos no restart | Resolver BL-045 antes de lançamento |
| RISK-014: companyScope sem garantia por FK | Vazamento cross-tenant | Todos os módulos de domínio | **Sim** — risco de segurança crítico | Auditar BL-059 antes de lançamento |
| RISK-029: FinanceCharge com provider mock | Financeiro não opera em produção | Financeiro | **Sim** — se módulo financeiro for necessário | Resolver BL-061 antes de lançamento |
| RISK-022: Role check seed-finance incorreto | Endpoint admin pode estar acessível indevidamente | Usuários / Admin | Sim | Resolver BL-041 (quick win) |
| RISK-035: docs/skills não validados | IA de desenvolvimento desatualizada | IA / Agentes | Não (produto) | Resolver BL-010 em paralelo |

---

## 18. Relação com Backlog

| Item backlog | Impacto no produto | Tipo | Recomendação |
|---|---|---|---|
| BL-002 — Production Branch | Deploy em branch de staging é operacionalmente arriscado | Decisão | Tom decide antes do lançamento |
| BL-041 — Role check seed-finance | Endpoint admin potencialmente acessível | Correção técnica | Quick win — executar antes do lançamento |
| BL-045/BL-058 — Storage de documentos | Uploads podem ser perdidos | Validação | Resolver antes do lançamento |
| BL-059 — companyScope audit | Risco de vazamento de dados entre escritórios | Segurança | Crítico — resolver antes do primeiro cliente |
| BL-061 — FinanceCharge provider | Módulo financeiro não opera em produção | Validação | Confirmar provider antes de apresentar ao cliente |
| BL-081 — Tipos IA no api.ts | Frontend não chama endpoints de IA | Implementação | Aguarda BL-082 (mapear endpoints) |
| BL-082 — Endpoints drafting/checklist | Incerteza sobre exposição HTTP da IA | Validação | Executar antes de comunicar IA como feature |
| BL-083 — Roles reais | Permissões por módulo não totalmente confirmadas | Validação | Executar antes de onboarding de escritório |
| BL-084 — DataJud chave real | Busca de processos pode falhar em produção | Validação | Tom confirma via painel Render |
| BL-022 — Platform Admin sem rota | Admin da plataforma inacessível via URL | Validação | Investigar mecanismo de acesso |

---

## 19. Oportunidades de Produto

| Oportunidade | Persona beneficiada | Módulo | Valor esperado | Evidência | Próximo passo |
|---|---|---|---|---|---|
| Triagem automática como diferencial de marketing | Advogado | Publicações / Triagem | Reduz horas de triagem manual; diferencia do concorrente | Pipeline complexo já implementado | Medir taxa de acerto da triagem; comunicar o diferencial |
| Sumarização de processos com IA | Advogado | IA / Processos | Economiza tempo de análise em processos longos | `ai/summarization` implementado no backend | Conectar frontend (BL-081/BL-082) |
| Notificações proativas de prazo | Advogado | Notificações / Prazos | Reduz prazo perdido; gera retenção diária | Backend de jobs + notificações agora persistentes | Implementar job automático de notificação de prazo |
| CRM jurídico para captação de clientes | ADM / ADV | CRM | Funil de clientes para crescimento do escritório | Domínio CRM rico com prospecting | Validar jornada lead→cliente em teste com escritório real |
| Dashboard BI executivo para sócios | ADM | Dashboard / BI | Visão de performance e rentabilidade | Domínio BI com snapshots e metrics | Garantir que KPIs mostram dados reais |
| Portal do cliente final | Cliente do escritório | Clientes | Auto-serviço para o cliente ver seus processos | `clients/portal` existe no backend | Avaliar como feature diferencial futura |
| Integração com PJe e e-SAJ | Advogado | Processos / Publicações | Captura automática de movimentações processuais | DataJud já presente | Avaliar custo/benefício vs. DataJud atual |
| Timesheet para controle de horas faturáveis | Advogado / ADM | Timesheet | Base para cobrança por hora; transparência com cliente | Domínio timesheet implementado no backend | Expor no frontend; validar modelo de cobrança |
| Billing de plataforma (Lexora cobra escritórios) | Tom / operador | Subscription / Plans | Monetização do SaaS | Domínio `subscription`, `plans`, `billing` existe | Definir modelo de preço e ativar billing |

---

## 20. Riscos de Produto

| Risco de produto | Impacto | Evidência | Mitigação sugerida |
|---|---|---|---|
| Suite muito ampla dificulta onboarding do primeiro escritório | Alto | 16+ módulos; sem fluxo de onboarding definido | Definir fluxo de onboarding mínimo; selecionar módulos prioritários para v1 |
| Financeiro não opera sem provider real | Alto | `provider: "mock"` confirmado | Priorizar configuração de provider antes de apresentar ao cliente |
| Documentos podem se perder com disco local no Render | Alto | BL-045 aberto | Confirmar e migrar para storage persistente antes do lançamento |
| Jornadas com botões sem ação geram frustração no usuário | Alto | Confirmado por Tom | Mapear no KB-005 e corrigir antes de qualquer demo |
| DataJud com chave demo em produção | Alto | BL-084 aberto | Tom confirma chave real antes do lançamento |
| Triagem automática com falsos positivos gera desconfiança | Médio | IA determinística sem validação com dados reais | Testar taxa de acerto antes de comunicar como diferencial |
| Módulo de IA não conectado ao frontend | Médio | BL-081/BL-082 abertos | Conectar após mapear endpoints; não comunicar feature sem UI |
| companyScope sem auditoria pode vazar dados entre escritórios | Crítico | BL-059 aberto | Auditar antes do primeiro cliente real |
| Platform Admin sem rota pode indicar fluxo de onboarding quebrado | Médio | BL-022 aberto | Investigar e mapear mecanismo de acesso |
| Posicionamento como "ferramenta completa" pode competir com ferramentas especializadas consolidadas | Médio | Hipótese de mercado | Validar proposta de valor em entrevistas com escritórios |

---

## 21. Roadmap de Discovery Recomendado

| Etapa | Objetivo | Saída esperada | Depende de |
|---|---|---|---|
| Discovery 1 — Mapeamento funcional | Mapear telas funcionais vs. parciais vs. quebradas por módulo | Matriz de estado real por módulo | KB-005 (parte 1) |
| Discovery 2 — Jornada do advogado | Percorrer jornada principal (processos + prazos + publicações) de ponta a ponta | Jornada validada com dados reais; lista de bugs de jornada | Dados reais no banco; P0 resolvidos ✅ |
| Discovery 3 — Gaps críticos | Resolver storage, DataJud real, provider financeiro, companyScope | Produto pronto para primeiro escritório piloto | BL-045, BL-061, BL-084, BL-059 |
| Discovery 4 — Piloto com escritório real | Apresentar produto para 1-2 escritórios reais em beta fechado | Feedback de usuário real; lista de ajustes prioritários | Gaps críticos resolvidos |
| Discovery 5 — Validar IA como diferencial | Medir taxa de acerto da triagem; conectar sumarização ao frontend | Estratégia de IA do produto definida | BL-081, BL-082; chave DataJud real |
| Discovery 6 — Preparar KB-005 e KB-006 | Inventário funcional completo + constituição visual | Insumos para UX e Design System | KB-005 dependente de jornadas validadas |

---

## 22. Insumos para KB-005 — Inventário Funcional e UX/UI

| Insumo deste documento | Como usar no KB-005 |
|---|---|
| Lista de 16 rotas confirmadas (seção 8) | Listar todas as telas a mapear no inventário |
| Estado por módulo (seção 9) | Classificar cada tela como funcional/parcial/quebrada |
| Jornada por persona (seção 11) | Mapear fluxo de navegação real por jornada |
| Funcionalidades incertas (seção 12) | Priorizar quais telas precisam de investigação profunda |
| Platform Admin e Company Foundation sem rota (seção 9) | Investigar mecanismo de acesso; mapear telas existentes |
| Timesheet sem rota no frontend (seção 9) | Verificar se existe tela oculta ou não implementada |
| Proposta de valor por módulo (seção 13) | Orientar prioridade de análise UX por valor de negócio |

---

## 23. Insumos para KB-006 — Design System e Constituição Visual

| Insumo deste documento | Como usar no KB-006 |
|---|---|
| 16+ módulos com telas próprias | Inventariar componentes compartilhados vs. por módulo |
| Dois sistemas de tokens coexistentes (tokens.css vs. index.css) | Resolver antes de criar Design System formal |
| IBM Plex Sans sem import confirmado | Confirmar fonte antes de documentar identidade visual |
| shadcn/ui + tokens.css coexistentes | Definir sistema canônico de tokens como base do DS |
| Personas e jornadas (seções 6-11) | Orientar decisões de UX e hierarquia visual por jornada |

---

## 24. Candidatos a Backlog de Produto

> [!note] Estes candidatos não duplicam itens técnicos existentes. São itens de produto e discovery, não de correção técnica.

| Candidato | Tipo | Prioridade sugerida | Área | Dependência | Observação |
|---|---|---|---|---|---|
| Mapear por tela quais funcionalidades estão funcionais vs. quebradas (KB-005 parte 1) | Discovery | P0 Produto | Produto / UX | — | Base para KB-005; resolve ambiguidade de Tom sobre o que está "pronto" |
| Definir fluxo de onboarding de novo escritório no produto | Discovery | P0 Produto | Produto / UX | BL-022 (Platform Admin) | Sem onboarding definido, primeiro cliente terá dificuldades |
| Confirmar modelo de preço e planos para escritórios | Discovery | P1 Produto | Produto / Negócio | Domínio subscription existente | Base para ativar billing real |
| Realizar teste de jornada com escritório jurídico real (beta fechado) | Validação | P1 Produto | Produto | Gaps críticos resolvidos | Primeiro feedback de usuário real |
| Definir quais módulos compõem o "Lexora Essencial" (MVP comercial) | Decisão | P1 Produto | Produto | Mapeamento funcional | Escritório não precisa de todos os 16 módulos no dia 1 |
| Validar se a triagem automática tem taxa de acerto aceitável com dados reais | Validação | P1 Produto | Produto / IA | DataJud real (BL-084) | Diferencial só funciona se taxa de acerto for alta |
| Comunicar IA no produto: definir linguagem e expectativa para o usuário | Produto | P2 Produto | UX / Produto | BL-081, BL-082 | Evitar frustração com IA determinística vs. expectativa de LLM |
| Investigar necessidade de portal do cliente (cliente do escritório) | Discovery | P3 Produto | Produto | — | `clients/portal` já existe no backend |
| Definir estratégia de notificações por email (não apenas in-app) | Produto | P2 Produto | Produto / Backend | — | Retenção fora da sessão ativa |

---

## 25. Limitações desta Etapa

> [!warning] O que este documento não é
>
> - Análise baseada em inventário técnico (código, KBs) + declaração do responsável — **sem entrevista com usuários reais de escritórios**
> - **Sem validação de mercado** — o posicionamento, diferenciais e hipóteses de valor não foram testados com decisores de escritórios
> - **Sem análise visual profunda** — UX e usabilidade das telas não foram avaliados (reservado para KB-005)
> - **Sem decisão final de roadmap** — as prioridades sugeridas são ponto de partida, não compromisso
> - **Sem alterar código, backlog ou KBs** — nenhum arquivo de projeto foi modificado
> - **Sem criação de protótipos** ou design de novas telas
> - **Incertezas permanecem** — state por tela, roles completas, storage, DataJud real, provider financeiro e Platform Admin ainda precisam de investigação

---

## 26. Validação Final

| Item validado | Resultado |
|---|---|
| KB-004 criado no caminho correto (`04 - Produto e Requisitos`) | Sim |
| Apenas o KB-004 foi criado | Sim |
| 00_START_HERE lido | Sim |
| KB-003G lido (sessão anterior) | Sim |
| KB-003B lido | Sim |
| KB-003C lido | Sim |
| BACKLOG lido (sessão) | Sim |
| Contexto de produto fornecido por Tom incorporado | Sim |
| Nenhum backlog foi alterado | Sim |
| Nenhum KB existente foi alterado | Sim |
| Nenhum código/config/teste/log/schema/package foi alterado | Sim |
| Nenhum comando foi executado | Sim |

---

*Criado em: 2026-05-30 | Status: current | Vault: !_lexora-memory-docs*
*Pasta: 04 - Produto e Requisitos | Fonte: Claude Code + Tom (responsável de produto)*
*Baseado em: [[00_START_HERE]], [[KB_003G_RISCOS_TECNICOS_E_DIVERGENCIAS_CONSOLIDADAS_CURRENT_2026-05-30]], [[KB_003B_FRONTEND_ESTADO_ATUAL_CURRENT_2026-05-29]], [[KB_003C_BACKEND_E_APIS_ESTADO_ATUAL_CURRENT_2026-05-30]], [[BACKLOG_GERAL_LEXORA_CURRENT]]*
