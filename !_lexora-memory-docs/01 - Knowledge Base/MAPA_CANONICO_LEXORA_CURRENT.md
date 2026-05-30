---
tipo: mapa
status: current
projeto: lexora
area: conhecimento-canonico
data: 2026-05-30
fonte: claude-code
baseado_em:
  - '[[00_START_HERE]]'
  - '[[KB_002_GOVERNANCA_DOCUMENTAL_OFICIAL_CURRENT_2026-05-29]]'
  - '[[KB_003G_RISCOS_TECNICOS_E_DIVERGENCIAS_CONSOLIDADAS_CURRENT_2026-05-30]]'
  - '[[BACKLOG_GERAL_LEXORA_CURRENT]]'
escopo: mapa-consulta-canonica
vault_oficial: 'C:\Users\tomke\app Juridico\!_lexora-memory-docs'
autoridade: indice-canonico
---

# MAPA CANÔNICO — Lexora

> [!important] Consulte este mapa antes de abrir vários documentos
> Ele indica qual documento consultar conforme o tipo de dúvida ou tarefa no projeto Lexora. Para protocolo de leitura eficiente, veja [[PROTOCOLO_CONTEXTO_ENXUTO_LEXORA_CURRENT]].

---

## 1. Objetivo

Servir como mapa rápido para indicar qual documento consultar conforme o tipo de dúvida ou tarefa no projeto Lexora.

---

## 2. Regra Principal

Antes de abrir vários documentos, consulte este mapa.

Se a tarefa for ampla, comece por:

1. [[00_START_HERE]]
2. [[KB_002_GOVERNANCA_DOCUMENTAL_OFICIAL_CURRENT_2026-05-29]]
3. [[PROTOCOLO_CONTEXTO_ENXUTO_LEXORA_CURRENT]]
4. [[KB_003G_RISCOS_TECNICOS_E_DIVERGENCIAS_CONSOLIDADAS_CURRENT_2026-05-30]]
5. [[BACKLOG_GERAL_LEXORA_CURRENT]]

---

## 3. Mapa por Assunto

| Assunto/Tarefa | Documento principal | Documentos auxiliares |
|---|---|---|
| Entrada no vault | [[00_START_HERE]] | [[KB_002_GOVERNANCA_DOCUMENTAL_OFICIAL_CURRENT_2026-05-29]] |
| Governança documental | [[KB_002_GOVERNANCA_DOCUMENTAL_OFICIAL_CURRENT_2026-05-29]] | [[PROTOCOLO_CONTEXTO_ENXUTO_LEXORA_CURRENT]] |
| Redução de contexto | [[PROTOCOLO_CONTEXTO_ENXUTO_LEXORA_CURRENT]] | [[MAPA_CANONICO_LEXORA_CURRENT]] |
| Visão técnica consolidada | [[KB_003G_RISCOS_TECNICOS_E_DIVERGENCIAS_CONSOLIDADAS_CURRENT_2026-05-30]] | KB-003A a KB-003F |
| Backlog e ações | [[BACKLOG_GERAL_LEXORA_CURRENT]] | KB relacionado ao item |
| Estrutura geral/deploy | [[KB_003A_ESTRUTURA_GERAL_E_CONFIGURACOES_CURRENT_2026-05-29]] | [[KB_003G_RISCOS_TECNICOS_E_DIVERGENCIAS_CONSOLIDADAS_CURRENT_2026-05-30]] |
| Frontend | [[KB_003B_FRONTEND_ESTADO_ATUAL_CURRENT_2026-05-29]] | KB-005 e KB-006 futuramente |
| Backend/APIs | [[KB_003C_BACKEND_E_APIS_ESTADO_ATUAL_CURRENT_2026-05-30]] | [[KB_003D_DADOS_PRISMA_E_CONTRATOS_CURRENT_2026-05-30]] |
| Dados/Prisma/Contratos | [[KB_003D_DADOS_PRISMA_E_CONTRATOS_CURRENT_2026-05-30]] | [[KB_003G_RISCOS_TECNICOS_E_DIVERGENCIAS_CONSOLIDADAS_CURRENT_2026-05-30]] |
| Testes/QA/Evidências | [[KB_003E_TESTES_QA_E_EVIDENCIAS_CURRENT_2026-05-30]] | [[BACKLOG_GERAL_LEXORA_CURRENT]] |
| IA/Agentes/Automações | [[KB_003F_IA_AGENTES_E_AUTOMACOES_CURRENT_2026-05-30]] | [[KB_003G_RISCOS_TECNICOS_E_DIVERGENCIAS_CONSOLIDADAS_CURRENT_2026-05-30]] |
| Riscos técnicos | [[KB_003G_RISCOS_TECNICOS_E_DIVERGENCIAS_CONSOLIDADAS_CURRENT_2026-05-30]] | [[BACKLOG_GERAL_LEXORA_CURRENT]] |
| Decisões ADR | Pasta `10 - Decisoes ADR` | KB-003G seção de ADRs recomendados |
| Product Discovery | KB-004 futuro | KB-003G + BACKLOG |
| Inventário Funcional/UX/UI | KB-005 futuro | KB-003B + KB-003E |
| Design System | KB-006 futuro | KB-003B + KB-005 futuro |

---

## 4. Mapa por Pasta

| Pasta | Papel | Quando consultar |
|---|---|---|
| `01 - Knowledge Base` | Governança, mapas e documentos canônicos gerais | Quando precisar de orientação geral |
| `03 - Arquitetura` | Estrutura geral e arquitetura | Deploy, stack, arquitetura |
| `05 - Frontend` | Estado frontend | React, telas, componentes |
| `06 - Backend e APIs` | Estado backend | Express, rotas, auth, APIs |
| `07 - Dados e Contratos` | Prisma, dados e contratos | Banco, migrations, contracts |
| `10 - Decisoes ADR` | Decisões arquiteturais | Quando uma decisão precisar ser registrada |
| `11 - Testes e Evidencias` | Testes, QA, logs e evidências | CI, Playwright, screenshots |
| `12 - IA - Prompts e Sessoes` | Protocolos e prompts reutilizáveis; IA runtime, agentes e automações | Reduzir contexto, padronizar prompts, LLM, Codex, automações |
| `13 - Backlog` | Ações operacionais | Prioridades, status, dependências |
| `14 - Riscos e Divergencias` | Consolidação de riscos | Riscos, decisões, próximos passos |

---

## 5. Documentos que Não Devem Ser Usados como Fonte Principal

> [!warning] Fontes não oficiais
> Os itens abaixo não devem ser usados como fonte oficial sem validação explícita.

- `docs-juridico` é legado/inativo — apenas referência histórica.
- Documentação legada só pode ser usada como contexto histórico.
- Em caso de conflito, documentos `CURRENT` no vault oficial prevalecem.
- O backlog é fonte operacional, não fonte absoluta de verdade técnica.
- KB mais recente e específico prevalece sobre KB anterior.
- `.codex/agents/` e `.codex/skills/` são legado potencial — verificar antes de usar.

---

## 6. Ordem de Consulta Recomendada

### Para uma tarefa técnica comum

1. [[00_START_HERE]]
2. [[MAPA_CANONICO_LEXORA_CURRENT]]
3. [[KB_003G_RISCOS_TECNICOS_E_DIVERGENCIAS_CONSOLIDADAS_CURRENT_2026-05-30]]
4. [[BACKLOG_GERAL_LEXORA_CURRENT]]
5. KB específico da área

### Para uma atualização de backlog

1. [[BACKLOG_GERAL_LEXORA_CURRENT]]
2. KB fonte da atualização
3. [[KB_003G_RISCOS_TECNICOS_E_DIVERGENCIAS_CONSOLIDADAS_CURRENT_2026-05-30]]
4. [[MAPA_CANONICO_LEXORA_CURRENT]], se houver dúvida

### Para uma nova fase documental

1. [[00_START_HERE]]
2. [[KB_002_GOVERNANCA_DOCUMENTAL_OFICIAL_CURRENT_2026-05-29]]
3. [[MAPA_CANONICO_LEXORA_CURRENT]]
4. [[KB_003G_RISCOS_TECNICOS_E_DIVERGENCIAS_CONSOLIDADAS_CURRENT_2026-05-30]]
5. [[BACKLOG_GERAL_LEXORA_CURRENT]]
6. KBs diretamente relacionados

---

*Criado em: 2026-05-30 | Status: current | Vault: !_lexora-memory-docs*
*Pasta: 01 - Knowledge Base | Fonte: Claude Code*
*Baseado em: [[00_START_HERE]], [[KB_002_GOVERNANCA_DOCUMENTAL_OFICIAL_CURRENT_2026-05-29]], [[KB_003G_RISCOS_TECNICOS_E_DIVERGENCIAS_CONSOLIDADAS_CURRENT_2026-05-30]], [[BACKLOG_GERAL_LEXORA_CURRENT]]*
