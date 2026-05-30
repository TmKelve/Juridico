# Skill: Mapeamento de Jornada e Usabilidade — Lexora

> **Objetivo**: Definir como executar o "Passo 0" (Product Discovery & Journey Mapping) de qualquer avaliação de interface no Lexora. Esta skill foca na usabilidade prática, carga cognitiva e na fluidez operacional do usuário final (advogado, coordenador, atendimento ou financeiro) no dia a dia do escritório.

---

## Índice

1. [O Princípio do "Job to be Done"](#1-o-princípio-do-job-to-be-done)
2. [Avaliando a Carga Cognitiva](#2-avaliando-a-carga-cognitiva)
3. [Mapeamento de Cliques (Click-Tracking Mental)](#3-mapeamento-de-cliques-click-tracking-mental)
4. [Ergonomia e Arquitetura da Informação](#4-ergonomia-e-arquitetura-da-informação)
5. [O Contexto de Estresse Jurídico](#5-o-contexto-de-estresse-jurídico)
6. [Template de Avaliação de Jornada](#6-template-de-avaliação-de-jornada)

---

## 1. O Princípio do "Job to be Done"

Antes de avaliar botões, cores ou responsividade, toda interface deve responder à pergunta central: **"Qual é o verdadeiro trabalho que o usuário precisa resolver ao abrir esta tela?"**

### Perfis de Usuário (Personas)
- **Advogado/Paralegal (ADV):** Seu *Job to be Done* é cumprir prazos com segurança, analisar documentos e registrar andamentos rapidamente. Eles odeiam formulários longos.
- **Financeiro (FIN):** Seu *Job* é conciliar faturamento e cobrança. Precisam de visões em massa, status claros e zero ambiguidade sobre quem pagou o quê.
- **Atendimento (ATD):** Seu *Job* é encantar o cliente inicial e fechar contratos (CRM). Precisam de atalhos rápidos para o WhatsApp e dados na ponta do dedo.
- **Coordenador/Sócio (ADM):** Seu *Job* é visão gerencial. Precisam bater o olho e saber onde está o "gargalo" (KPIs, painéis de risco).

**Regra Prática:** Se a tela não coloca a ação primária do *Job to be Done* em evidência nos primeiros 3 segundos de leitura visual, a jornada está falha.

---

## 2. Avaliando a Carga Cognitiva

Carga cognitiva é o esforço mental exigido para usar a tela. No Lexora, lutamos ativamente contra a sobrecarga mental.

* **Reconhecimento vs. Lembrança:** O usuário NUNCA deve precisar memorizar o ID de um processo na aba "A" para digitá-lo na aba "B". A navegação cruzada deve sempre carregar o contexto (ex: Criar prazo a partir da Triagem já traz o processo vinculado).
* **Progressive Disclosure (Revelação Progressiva):** Não mostre 30 filtros de uma vez. Mostre uma "Busca Rápida" e botões predefinidos (ex: "Meus Prazos Críticos"). Esconda os filtros complexos em um menu "Avançado".
* **Vocabulário Direto:** Use "Solicitar Documento Faltante" em vez de "Atualizar Status do Checklist". A interface deve falar a língua da intenção, não do banco de dados.

---

## 3. Mapeamento de Cliques (Click-Tracking Mental)

Calcule o custo de interação das tarefas diárias (aquelas feitas 10x, 50x ao dia). 

**Padrão Ouro de Eficiência no Lexora:**
- **Ações Críticas em Massa:** (ex: concluir múltiplos prazos) deve levar no máximo **2 a 3 cliques**.
- **Ações Comuns:** (ex: pedir documento no WhatsApp) deve estar a **1 clique** de distância do contexto onde o problema foi visto.
- **Evitar o "Vai e Volta":** Se o usuário precisa sair da tela de "Processos", ir para "Documentos" e voltar para "Processos" para entender um caso, a jornada está fragmentada. Solução: *Drawers* (Painéis Deslizantes) ou *Modais* que resolvem o problema sem perder a lista base de vista.

---

## 4. Ergonomia e Arquitetura da Informação

Como os olhos percorrem a tela?
1. **Padrão em F (Leitura Ocidental):** O topo e o lado esquerdo recebem mais atenção. Coloque KPIs, abas e buscas importantes no topo (como o padrão `.documents-header-card`).
2. **Posicionamento de Ações Primárias:** Botões que salvam, confirmam ou enviam dados cruciais (`.btn-primary`) devem ficar no canto inferior direito de modais ou alinhados de forma destacada no topo direito da tela.
3. **Escaneabilidade:** O advogado escaneia listas buscando por "problemas" (cores vermelho/laranja). A tela deve usar indicadores de status (`riskTone`, badges) e tipografia em negrito para guiar o olho direto para as "bombas" que precisam ser desarmadas.

---

## 5. O Contexto de Estresse Jurídico

A interface deve absorver o estresse do advogado, projetando segurança:
* **Previsibilidade:** Sempre que uma ação for destrutiva ou enviar mensagem para cliente, deixe óbvio o que vai acontecer antes de confirmar.
* **Tolerância ao Erro (Graceful Recovery):** Se o usuário anexou o PDF no processo errado, a exclusão daquele erro tem que ser indolor.
* **A Ansiedade do Prazo (Tranquilidade Visível):** Se um prazo foi cumprido, a cor verde e o texto "Auditado" devem trazer a sensação de "dever cumprido" e sair da frente para dar lugar ao que está pendente.

---

## 6. Template de Avaliação de Jornada

Ao iniciar o refatoramento de uma tela, utilize este checklist mental de "Passo 0":

- [ ] **Qual é o perfil que mais usa essa tela e qual seu maior gargalo hoje?**
- [ ] **Qual é a ação principal que essa tela deveria resolver em 1 clique?**
- [ ] **Os itens que exigem atenção urgente estão gritando visualmente?**
- [ ] **Há informações inúteis ocupando espaço nobre?**
- [ ] **Se o usuário cometer um erro aqui, quão fácil é desfazer?**
- [ ] **O fluxo integra com ferramentas externas (ex: WhatsApp, Agenda) de forma fluida sem exigir "Ctrl+C / Ctrl+V"?**

Se a resposta para qualquer uma dessas perguntas não for satisfatória, a arquitetura da tela (e não apenas o CSS) precisa ser repensada.
