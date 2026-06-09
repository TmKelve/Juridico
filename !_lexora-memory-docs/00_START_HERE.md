---
tipo: indice
status: current
projeto: lexora
data: 2026-05-29
ultima_atualizacao: '2026-05-30'
escopo: memoria-oficial
vault_oficial: '!_lexora-memory-docs'
---

# Start Here — Memória Oficial do Projeto Lexora

> [!important] Leia este documento primeiro
> Esta pasta é a **memória documental oficial do projeto Lexora**. Toda IA, agente ou desenvolvedor deve ler este arquivo antes de consultar qualquer outra documentação do projeto.

---

## 1. O que é esta pasta

`!_lexora-memory-docs` é o vault Obsidian oficial de documentação e memória do projeto **Lexora** (SaaS Jurídico).

Esta pasta foi criada para centralizar toda documentação válida, decisões estruturais, estado atual do sistema e contexto necessário para trabalhar no projeto de forma segura e precisa.

**O nome começa com `!` para garantir que apareça no topo do explorador de arquivos do Obsidian.**

### O que esta pasta é:
- A única fonte oficial de documentação do projeto Lexora.
- O local onde novas decisões, análises e estados atuais devem ser registrados.
- O ponto de partida para qualquer IA ou agente que precisar de contexto do projeto.

### O que esta pasta não é:
- Um espelho dos documentos antigos de `docs-juridico/`.
- Um repositório de artefatos técnicos como logs, builds ou resultados de testes brutos.
- Uma cópia automática de documentação legada.

---

## 2. Como Usar a Memória Oficial

### Para desenvolvedores:
1. Leia `00_START_HERE.md` (este arquivo).
2. Consulte `02 - Estado Atual` para entender o estado vigente do sistema.
3. Consulte `01 - Knowledge Base` para diagnósticos e mapeamentos.
4. Consulte `10 - Decisoes ADR` para decisões estruturais aceitas.
5. Se encontrar divergência entre documentação e código, registre em `13 - Backlog`.

### Para IAs e agentes:
Veja a [[#10. Regras para IAs]] abaixo.

### Regra central:
> **Documento recente não é automaticamente documento oficial.**
> Documento oficial depende de: status, localização, fonte, validação e autoridade.

---

## 3. Ordem Recomendada de Leitura

```
1. 00_START_HERE.md                   ← você está aqui
2. 02 - Estado Atual/                 ← estado vigente do sistema (quando existir)
3. 01 - Knowledge Base/               ← diagnósticos e mapeamentos
4. 10 - Decisoes ADR/                 ← decisões estruturais aceitas
5. 03 - Arquitetura/                  ← arquitetura e convenções
6. 07 - Dados e Contratos/            ← contratos de API e modelo de dados
7. Demais pastas conforme necessidade
```

---

## 4. Estrutura de Pastas

| Pasta | Finalidade |
|---|---|
| `00 - Inbox` | Notas brutas, rascunhos, inbox de sessão — não são fonte oficial |
| `01 - Knowledge Base` | KBs validados, diagnósticos, mapeamentos e mapas canônicos oficiais |
| `02 - Estado Atual` | Estado vigente do sistema — a visão mais recente e confiável |
| `03 - Arquitetura` | Arquitetura, convenções, padrões estruturais |
| `04 - Produto e Requisitos` | Requisitos, perfis, casos de uso, roadmap atual |
| `05 - Frontend` | Documentação específica do frontend |
| `06 - Backend e APIs` | Documentação do backend, rotas, serviços |
| `07 - Dados e Contratos` | Contratos de API, modelo de dados, esquema Prisma |
| `08 - UX UI` | Análises de UX/UI, fluxos, jornadas |
| `09 - Design System` | Tokens, componentes, identidade visual vigente |
| `10 - Decisoes ADR` | Architecture Decision Records (ADRs) |
| `11 - Testes e Evidencias` | Evidências de testes, regressão, validações |
| `12 - IA - Prompts e Sessoes` | Prompts de IA, sessões, protocolos de contexto e contextos para agentes |
| `13 - Backlog` | Pendências documentais, itens a criar, a validar |
| `14 - Riscos e Divergencias` | Análises de riscos técnicos, divergências consolidadas e incertezas — ex.: KB-003G |
| `90 - Templates` | Templates oficiais para novos documentos |
| `99 - Arquivo` | Documentação arquivada, legado, evidências antigas |

---

## 5. Hierarquia de Confiança das Fontes

> Quanto mais alto na lista, mais confiável. Em caso de conflito, a fonte mais alta prevalece.

```
1. Código atual e estrutura real do projeto (sempre verificar)
2. Documentos CURRENT dentro de !_lexora-memory-docs
3. ADRs com status accepted ou current
4. Knowledge Base oficial (01 - Knowledge Base)
5. Evidências técnicas recentes vinculadas a análise ou decisão
6. Backlog atual (apenas para pendências e intenções)
7. Prompts e notas de sessão (apenas como contexto auxiliar)
8. Documentos legados (somente como referência histórica — nunca como verdade vigente)
```

---

## 6. Status Documental e Autoridade das Fontes

| Status | Significado | É fonte oficial? |
|---|---|---|
| `current` | Documento vigente e validado | **Sim** |
| `draft` | Rascunho em elaboração | Não |
| `review` | Aguardando validação | Não |
| `deprecated` | Substituído por versão mais recente | Não |
| `archived` | Arquivado — apenas valor histórico | Não |
| `template` | Template base — não é documento real | Não |

Status de ADR:

| Status | Significado |
|---|---|
| `accepted` | Decisão vigente |
| `current` | Decisão vigente e ativa |
| `proposed` | Proposta — ainda não decidida |
| `superseded` | Substituída por ADR mais recente |
| `deprecated` | Descontinuada |
| `rejected` | Rejeitada |

---

## 7. O que Não Deve Ser Usado como Fonte Oficial

> [!warning] Fontes não oficiais
> Os itens abaixo **não devem ser usados como fonte oficial** até validação explícita com o responsável pelo projeto.

### Documentação legada — NÃO é fonte oficial:
- `docs-juridico/01*` a `docs-juridico/27*` — documentação de 02/04/2026, antes de múltiplas fases de desenvolvimento.
- `docs-juridico/10-Roadmap.md` e `19-Roadmap-Q1-Q2.md` — roadmaps históricos.
- `docs-juridico/11-Sprint.md` — sprint de 02/04/2026.
- `docs-juridico/17-Deploy-Checklist.md` — possivelmente superado por documentação posterior.
- `docs-juridico/27-Proximas-Acoes-V1.2.md` — próximas ações de 02/04/2026.
- `frontend/README.md` — arquivo mais antigo do projeto (24/03/2026).

> O próprio `docs-juridico/00-README.md` já declara: *"Documentos anteriores a 28 devem ser tratados como histórico quando conflitarem com o estado real do código."*

### Vaults Obsidian legados — NÃO devem ser usados:
- A pasta `.obsidian` na raiz do projeto (`C:\Users\tomke\app Juridico\.obsidian`) é considerada legada e inativa.
- A pasta `docs-juridico\.obsidian` é considerada legada e inativa.
- O vault oficial é exclusivamente `!_lexora-memory-docs`.

### Agentes Codex — validados em 2026-06-01:
- `.codex/agents/*.toml` — validados e migrados de `docs-juridico` para `!_lexora-memory-docs` (BL-009/BL-076). Referências canônicas atualizadas. Não são fonte oficial de verdade técnica, mas estão alinhados com o vault.
- `.codex/skills/` — auditados em 2026-06-01 (BL-010). `lexora-deploy.md` e `lexora-orchestrator.md` corrigidos. Demais são válidos como metodologia geral.

### Artefatos técnicos — NÃO são documentação principal:
- `frontend/test-results/` — artefatos automáticos gerados pelo Playwright. Puramente técnicos.
- `frontend/test-screenshots/` — screenshots de regressão visual. São artefatos técnicos; podem ser referenciados como evidência, mas não são documentação.

---

## 8. Como Lidar com Divergências entre Código e Documentação

Quando houver conflito entre o que a documentação diz e o que o código faz:

1. **Confie no código.** O comportamento atual verificado da aplicação tem precedência.
2. **Registre a divergência.** Não escolha uma fonte arbitrariamente — abra um item em `13 - Backlog` descrevendo o conflito.
3. **Não atualize documentação sem verificar.** Qualquer atualização documental deve ser baseada em verificação real do código.
4. **Sugira um ADR** se a divergência envolver decisão estrutural.
5. **Nunca propague informação legada** como se fosse verdade vigente.

---

## 9. Fluxo de Entrada, Consolidação e Promoção de Documentos

```
Rascunho / Análise bruta
        ↓
  00 - Inbox
        ↓
  Revisão e validação
        ↓
  Pasta temática relevante
  com status: draft → review → current
        ↓
  Se for decisão estrutural → 10 - Decisoes ADR
  Se for estado vigente     → 02 - Estado Atual
  Se for pendência          → 13 - Backlog
  Se for evidência          → 11 - Testes e Evidencias
        ↓
  Quando obsoleto → 99 - Arquivo (status: archived)
```

---

## 10. Regras para IAs

> [!important] Obrigatório para qualquer IA ou agente que trabalhar no projeto Lexora

### Ordem de leitura obrigatória:
1. Leia `00_START_HERE.md` primeiro (este arquivo).
2. Consulte `02 - Estado Atual` para entender o estado vigente.
3. Consulte os KBs com status `current` em `01 - Knowledge Base`.
4. Consulte ADRs com status `accepted` em `10 - Decisoes ADR`.

### Regras de comportamento:
- **Nunca** trate documentação legada como verdade sem validação explícita.
- **Nunca** altere arquivos `.obsidian` de nenhum vault.
- **Nunca** sobrescreva arquivos existentes.
- **Nunca** mova ou apague documentos sem instrução explícita do usuário.
- **Nunca** trate `draft` ou `deprecated` como fonte oficial.
- Se encontrar **divergência** entre código, documentação e legado: registre a divergência, não escolha uma fonte arbitrariamente.
- Se encontrar **decisão estrutural**: sugira a criação de um ADR.
- Se encontrar **mudança no estado vigente**: sugira atualização em `02 - Estado Atual`.
- Se encontrar **pendência**: sugira item em `13 - Backlog`.
- Antes de criar qualquer arquivo: verifique se já existe. Se existir, não sobrescreva.

---

## 11. Como Registrar Novas Decisões

Toda decisão estrutural deve virar um **ADR** (Architecture Decision Record) em `10 - Decisoes ADR`:

1. Copie o template `[[TEMPLATE_ADR]]` da pasta `90 - Templates`.
2. Nomeie o arquivo como `ADR_XXX_TITULO_CURTO_STATUS_DATA.md`.
3. Preencha todos os campos, especialmente: contexto, problema, decisão e consequências.
4. Mude o status de `proposed` para `accepted` após validação com o responsável.
5. Se a decisão substituir outra, atualize o campo `superseded` no ADR antigo.

---

## 12. Documentos Recomendados — Status

Os documentos abaixo foram identificados como necessários para a memória oficial. Alguns foram criados em etapas anteriores; os demais ainda devem ser gerados com base no estado real do projeto.

> [!success] Documentos criados em etapas anteriores
> [[KB_002_GOVERNANCA_DOCUMENTAL_OFICIAL_CURRENT_2026-05-29]] — Governança documental oficial.
> [[BACKLOG_GERAL_LEXORA_CURRENT]] — Backlog central com 84 itens priorizados.
> KB-003A a KB-003G — Inventário técnico completo (ver seção 14).
> [[MAPA_CANONICO_LEXORA_CURRENT]] — Mapa rápido de qual documento consultar conforme o assunto ou tarefa.
> [[PROTOCOLO_CONTEXTO_ENXUTO_LEXORA_CURRENT]] — Protocolo para reduzir consumo de contexto nas interações com IA.

| Documento | Pasta | Prioridade | Status |
|---|---|---|---|
| [[MAPA_CANONICO_LEXORA_CURRENT]] | `01 - Knowledge Base` | Alta | **Criado** |
| [[PROTOCOLO_CONTEXTO_ENXUTO_LEXORA_CURRENT]] | `12 - IA - Prompts e Sessoes` | Alta | **Criado** |
| [[BUILD_DEPLOY_ENVIRONMENT_CURRENT]] | `03 - Arquitetura` | Alta | **Criado** (2026-06-01, BL-011) |
| `ADR_001_VAULT_OFICIAL_DOCUMENTACAO_LEXORA.md` | `10 - Decisoes ADR` | Alta | A criar |
| `CURRENT_STATE_LEXORA.md` | `02 - Estado Atual` | Alta | A criar |
| `FONTES_OFICIAIS_CURRENT.md` | `01 - Knowledge Base` | Alta | A criar |
| `CONTEXTO_INICIAL_IA_CURRENT.md` | `12 - IA - Prompts e Sessoes` | Alta | A criar |
| [[KB_004_PRODUCT_DISCOVERY_LEXORA_CURRENT_2026-06-09]] | `01 - Knowledge Base` | Alta | **Criado** (2026-06-09, BL-083 + KB-004) |
| [[KB_005_INVENTARIO_UX_UI_CURRENT_2026-06-09]] | `01 - Knowledge Base` | Alta | **Criado** (2026-06-09, KB-005) |
| [[KB_006_DESIGN_SYSTEM_CURRENT_2026-06-09]] | `09 - Design System` | Alta | **Criado** (2026-06-09, KB-006) |

> [!note] Regra de criação
> Todos os documentos devem ser criados com base no código atual e no estado real do projeto — nunca copiados de documentação legada sem validação.

---

## 13. Leitura Recomendada para Novas IAs

> [!tip] Leitura eficiente para novas IAs
> Para entender o projeto Lexora sem consumir contexto desnecessário, siga esta ordem:

1. Leia primeiro [[KB_002_GOVERNANCA_DOCUMENTAL_OFICIAL_CURRENT_2026-05-29]] para entender a governança documental.
2. Consulte [[MAPA_CANONICO_LEXORA_CURRENT]] para decidir quais documentos consultar conforme a tarefa.
3. Consulte [[PROTOCOLO_CONTEXTO_ENXUTO_LEXORA_CURRENT]] para aplicar leitura mínima e reduzir consumo de contexto.
4. Leia [[KB_003G_RISCOS_TECNICOS_E_DIVERGENCIAS_CONSOLIDADAS_CURRENT_2026-05-30]] para obter a visão técnica consolidada da fase KB-003.
5. Consulte [[BACKLOG_GERAL_LEXORA_CURRENT]] para ações operacionais, prioridades, status e dependências.
6. Consulte os KBs detalhados apenas quando precisar aprofundar por área:
   - [[KB_003A_ESTRUTURA_GERAL_E_CONFIGURACOES_CURRENT_2026-05-29]] — estrutura geral e configurações
   - [[KB_003B_FRONTEND_ESTADO_ATUAL_CURRENT_2026-05-29]] — frontend e componentes
   - [[KB_003C_BACKEND_E_APIS_ESTADO_ATUAL_CURRENT_2026-05-30]] — backend, APIs e auth
   - [[KB_003D_DADOS_PRISMA_E_CONTRATOS_CURRENT_2026-05-30]] — dados, Prisma e contratos
   - [[KB_003E_TESTES_QA_E_EVIDENCIAS_CURRENT_2026-05-30]] — testes, QA e evidências
   - [[KB_003F_IA_AGENTES_E_AUTOMACOES_CURRENT_2026-05-30]] — IA, agentes e automações
7. Não use documentação legada como fonte oficial sem validação explícita.

---

## 14. Fase Técnica KB-003 — Concluída

A fase de inventário e consolidação técnica KB-003 foi concluída em 2026-05-30 com os seguintes documentos:

| Documento | Área | Papel |
|---|---|---|
| [[KB_003A_ESTRUTURA_GERAL_E_CONFIGURACOES_CURRENT_2026-05-29]] | Estrutura geral e configurações | Mapeia monorepo, deploy, stack e configurações |
| [[KB_003B_FRONTEND_ESTADO_ATUAL_CURRENT_2026-05-29]] | Frontend | Mapeia React, Vite, componentes, telas e arquitetura frontend |
| [[KB_003C_BACKEND_E_APIS_ESTADO_ATUAL_CURRENT_2026-05-30]] | Backend e APIs | Mapeia Express, rotas, auth, APIs e riscos backend |
| [[KB_003D_DADOS_PRISMA_E_CONTRATOS_CURRENT_2026-05-30]] | Dados, Prisma e contratos | Mapeia schema ativo, migrations, seeds e contratos |
| [[KB_003E_TESTES_QA_E_EVIDENCIAS_CURRENT_2026-05-30]] | Testes, QA e evidências | Mapeia testes, Playwright, CI, logs e evidências |
| [[KB_003F_IA_AGENTES_E_AUTOMACOES_CURRENT_2026-05-30]] | IA, agentes e automações | Mapeia IA runtime, Codex, prompts, automações e riscos |
| [[KB_003G_RISCOS_TECNICOS_E_DIVERGENCIAS_CONSOLIDADAS_CURRENT_2026-05-30]] | Riscos e divergências | Consolida 35 riscos, 15 decisões pendentes, 8 ADRs recomendados e ordem de atuação |

**Documento principal para visão técnica consolidada:**
[[KB_003G_RISCOS_TECNICOS_E_DIVERGENCIAS_CONSOLIDADAS_CURRENT_2026-05-30]]

---

## 15. Próxima Fase Recomendada

> [!note] Status do vault — 2026-06-09
> Fase KB-003 concluída. Sprint P1 concluída. KB-004/005/006 concluídos. Sprint P2 concluída (BL-012/016/022/027/031/035/050/051/052/055/056/063/082/085). Deploy activo em `codex/baseline-postgres-staging`. Utilizador `platform@lexora.dev` criado em produção.

Histórico de fases concluídas:

1. ✅ ~~Resolver os riscos P0~~ — concluído em 2026-05-30.
2. ✅ ~~Sprint P1 (13 itens)~~ — concluída em 2026-06-01.
3. ✅ ~~KB-004 Product Discovery~~ — concluído em 2026-06-09.
4. ✅ ~~KB-005 Inventário UX/UI~~ — concluído em 2026-06-09.
5. ✅ ~~KB-006 Design System~~ — concluído em 2026-06-09.
6. ✅ ~~Sprint P2 quick wins~~ — concluída em 2026-06-09. (BL-012/022/050/051/052/063)
7. ✅ ~~Sprint P2 limpeza P3~~ — concluída em 2026-06-09. (BL-016/035/055/056/082/085)
8. ✅ ~~BL-027/031 Componentização~~ — concluída em 2026-06-09. (EmptyState/PageHeader unificados, código morto removido)

Próximos itens recomendados (ver [[BACKLOG_GERAL_LEXORA_CURRENT]] para detalhes completos):

| Prioridade | Item | Descrição |
|---|---|---|
| 🔴 CRÍTICO | **BL-059** | Auditar `companyScope` em todos os endpoints — risco multi-tenant crítico |
| 🟡 Média | **BL-049** | Refactoring progressivo de `main.ts` (~8.500 linhas) para routers por domínio |
| 🟡 Média | **BL-017** | Criar índice de documentação técnica actual (desbloqueado — KB-003B/C/D ✅) |
| 🟡 Média | **BL-064** | Avaliar `schema_init.sql` — relação com migrations Prisma (desbloqueado por BL-055 ✅) |
| 🟡 Média | **BL-038** | Design System Fase 5 — responsividade (Fases 1–4 concluídas) |

> [!tip] Redução de contexto
> Antes de iniciar novas fases, novas IAs devem consultar [[MAPA_CANONICO_LEXORA_CURRENT]] e [[PROTOCOLO_CONTEXTO_ENXUTO_LEXORA_CURRENT]] para aplicar leitura mínima e evitar releitura desnecessária dos KBs técnicos.

---

*Criado em: 2026-05-29 | Última atualização: 2026-06-09 (UPDATE-START-HERE-010 — histórico Sprint P2 completo; BL-027/031 concluídos; tabela de próximos passos reorganizada) | Status: current | Vault: !_lexora-memory-docs*
*Baseado em: [[KB_001_DOCUMENTACAO_MAPEAMENTO_INICIAL_CURRENT_2026-05-29]], [[KB_002_GOVERNANCA_DOCUMENTAL_OFICIAL_CURRENT_2026-05-29]], [[KB_003G_RISCOS_TECNICOS_E_DIVERGENCIAS_CONSOLIDADAS_CURRENT_2026-05-30]], [[BACKLOG_GERAL_LEXORA_CURRENT]], [[MAPA_CANONICO_LEXORA_CURRENT]], [[PROTOCOLO_CONTEXTO_ENXUTO_LEXORA_CURRENT]]*
