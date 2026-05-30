---
tipo: kb
status: current
projeto: lexora
fase: arquivamento-documental
data: 2026-05-29
fonte: claude-code
baseado_em:
  - '[[00_START_HERE]]'
  - '[[SETUP_001_ESTRUTURA_LEXORA_MEMORY_DOCS_CURRENT_2026-05-29]]'
  - '[[KB_001_DOCUMENTACAO_MAPEAMENTO_INICIAL_CURRENT_2026-05-29]]'
  - '[[KB_002_GOVERNANCA_DOCUMENTAL_OFICIAL_CURRENT_2026-05-29]]'
escopo: arquivamento-controlado
vault_oficial: 'C:\Users\tomke\app Juridico\!_lexora-memory-docs'
autoridade: registro-operacional
---

# ARCHIVE-001 — Arquivamento Controlado da Documentação Legada

> [!important] Registro operacional
> Este documento registra a movimentação controlada da documentação legada `docs-juridico` para a área de arquivo da memória oficial. Todo o conteúdo foi preservado — nada foi apagado ou editado.

---

## 1. Resumo Executivo

Em 2026-05-29, foi executado o arquivamento controlado da pasta `docs-juridico` e de sua configuração de vault Obsidian paralelo (`.obsidian`), com base nas decisões registradas em [[KB_002_GOVERNANCA_DOCUMENTAL_OFICIAL_CURRENT_2026-05-29]].

**44 arquivos de documentação** foram movidos da raiz do projeto para:
`99 - Arquivo\documentacao-legada\docs-juridico`

**5 arquivos de configuração** do vault Obsidian paralelo foram movidos para:
`99 - Arquivo\documentacao-legada\vaults-antigos\docs-juridico-obsidian-config`

A pasta `docs-juridico` ficou vazia após a movimentação e foi removida. A pasta `.obsidian` foi desmontada sem criar uma pasta `.obsidian` dentro do vault oficial, eliminando qualquer risco de confusão com configurações ativas.

Todo o conteúdo foi preservado integralmente como referência histórica — nenhum arquivo foi editado, apagado ou sobrescrito.

---

## 2. Objetivo do Arquivamento

O objetivo foi **remover da raiz do projeto a principal fonte de documentação legada concorrente**, reduzindo o risco de que IAs ou desenvolvedores consultem documentos de 02/04/2026 como se fossem fonte oficial do estado atual do sistema.

A pasta `docs-juridico` funcionava como um vault Obsidian paralelo independente, com:
- Documentação criada majoritariamente em 02/04/2026 (8+ semanas antes do estado atual)
- Configuração `.obsidian` própria que criava ambiguidade sobre qual vault era o oficial
- Numeração de documentos conflitante (números 22, 23 e 36 com múltiplos arquivos)
- Documentos que, segundo o próprio `00-README.md` da pasta, deveriam ser tratados como histórico

Ao arquivar o conteúdo dentro da memória oficial, o legado permanece acessível como referência histórica, mas deixa de competir com a documentação oficial como fonte de verdade.

---

## 3. Escopo Executado

### O que foi movido

| Grupo | Origem | Destino | Qtd. arquivos |
|---|---|---|---|
| Documentação legada | `docs-juridico\` | `99 - Arquivo\documentacao-legada\docs-juridico\` | 44 |
| Configuração vault paralelo | `docs-juridico\.obsidian\` | `99 - Arquivo\documentacao-legada\vaults-antigos\docs-juridico-obsidian-config\` | 5 |
| **Total** | | | **49** |

### Arquivos de documentação arquivados (44)

```
00-README.md
01-Visao-Geral.md
02-Perfis.md
03-Dashboards.md
04-Permissoes.md
05-Navegacao.md
06-Wireframes.md
07-Modelagem-Dados.md
08-Agentes-e-Skills.md
09-Casos-de-Uso.md
10-Roadmap.md
11-Sprint.md
12-Identidade-Visual.md
13-Analise-Contraste-Login.md
14-Revisao-Design-Login-Fechamento.md
15-Teste-Acessibilidade-Manual.md
16-Relatorio-Validacao-Testes.md
17-Deploy-Checklist.md
18-Setup-Staging-Producao.md
19-Roadmap-Q1-Q2.md
20-Guia-Desenvolvimento.md
21-Dashboard-Tecnico.md
22-Revisao-Login-Completa-v1.1.md
22-Revisao-Login-v2.0.md
22-Setup-Sentry-GA.md
23-Guia-Implementacao-O1-O3.md
23-Implementacao-O1-O2-O3-Completa.md
23-Sessao-Completa-v1.1.md
24-Revisao-Dashboard-Completa.md
25-Plano-Implementacao-D1-D4.md
26-Seguranca-HttpOnly-Cookie.md
27-Proximas-Acoes-V1.2.md
28-Validacao-Telas-ADV-Full-Lifecycle.md
29-Plano-Producao-Full-Lifecycle.md
30-Mapeamento-Tela-API-P0.md
31-Plano-Migracao-SQLite-Postgres-Grupo-A.md
32-Baseline-Staging-CI.md
33-Runbook-Staging-Deploy.md
34-Handoff-Git-Baseline.md
35-Decisao-Stack-Staging-MVP.md
36-Migracao-UI-Stack-Alvo.md
36-Validacao-Epic-9-10-Regressao.md
37-Governanca-UI-PR-Checklist.md
test-acessibilidade-login.js
```

### Arquivos de configuração do vault paralelo arquivados (5)

```
app.json
appearance.json
core-plugins.json
graph.json
workspace.json
```

> [!note] Renomeação da pasta `.obsidian`
> A pasta `.obsidian` de `docs-juridico` foi desmontada e seu conteúdo foi movido para `docs-juridico-obsidian-config` — sem criar uma pasta `.obsidian` dentro do vault oficial. Isso evita que o Obsidian interprete erroneamente essa pasta como configuração ativa de um vault.

---

## 4. Fora do Escopo

Os seguintes itens **não foram alterados** nesta etapa:

| Item | Status |
|---|---|
| `frontend/` | Preservado integralmente |
| `backend/` | Preservado integralmente |
| `contracts/` | Preservado integralmente |
| `docs/` | Preservado integralmente |
| `.codex/` | Preservado integralmente |
| `.claude/` | Preservado integralmente |
| `prisma/` | Preservado integralmente |
| `scripts/` | Preservado integralmente |
| `frontend/test-results/` | Preservado como artefato técnico |
| `frontend/test-screenshots/` | Preservado como artefato técnico |
| `test-results/` (raiz) | Preservado |
| Logs soltos (`*.log`) | Preservados na raiz |
| Screenshots soltos (`*.png`) | Preservados na raiz |
| `.obsidian` da raiz do projeto | Preservado sem alteração |
| `.obsidian` do vault oficial | Preservado sem alteração |
| Qualquer código | Não alterado |
| Qualquer configuração ativa do Obsidian | Não alterada |

---

## 5. Destinos de Arquivamento

| Conteúdo | Destino final |
|---|---|
| Documentação legada (44 arquivos) | `!_lexora-memory-docs\99 - Arquivo\documentacao-legada\docs-juridico\` |
| Configuração vault paralelo (5 arquivos) | `!_lexora-memory-docs\99 - Arquivo\documentacao-legada\vaults-antigos\docs-juridico-obsidian-config\` |

---

## 6. Critérios Usados para Classificar como Legado

A classificação de `docs-juridico` como legado foi baseada em:

1. **[[KB_001_DOCUMENTACAO_MAPEAMENTO_INICIAL_CURRENT_2026-05-29]]** — mapeamento identificou que a maioria dos documentos (01–27) foi criada em 02/04/2026, antes de múltiplas fases de desenvolvimento.
2. **[[KB_002_GOVERNANCA_DOCUMENTAL_OFICIAL_CURRENT_2026-05-29]]** — decisão D5 formalizada: documentos `docs-juridico\01*` a `docs-juridico\27*` não são fonte oficial.
3. **Existência de vault Obsidian paralelo** — `docs-juridico\.obsidian` criava ambiguidade sobre qual vault era o oficial, aumentando o risco de IAs trabalharem com contexto errado.
4. **Auto-declaração de obsolescência** — o próprio `docs-juridico\00-README.md` declarava: *"Documentos anteriores a 28 devem ser tratados como histórico quando conflitarem com o estado real do código."*
5. **Numeração inconsistente** — documentos com números duplicados (22, 23, 36) tornavam qualquer referência por número ambígua e insegura.
6. **Risco de fonte de verdade concorrente** — com dois vaults e duas estruturas de documentação, IAs diferentes poderiam consultar fontes diferentes e gerar decisões conflitantes.

---

## 7. Integridade e Preservação

> [!important] Nenhum conteúdo foi perdido

- **Nenhum arquivo foi apagado** — todos foram movidos para a área de arquivo.
- **Nenhum conteúdo foi editado** — os arquivos foram movidos sem alteração de conteúdo.
- **Nenhum arquivo foi sobrescrito** — os destinos estavam vazios antes da movimentação.
- **A estrutura interna foi preservada** — os 44 documentos estão na mesma estrutura flat que tinham em `docs-juridico`.
- **O arquivo `test-acessibilidade-login.js`** — embora seja código JavaScript, estava dentro de `docs-juridico` como parte de sua documentação e foi arquivado junto ao restante do conteúdo da pasta.

Todo o conteúdo permanece acessível em `99 - Arquivo\documentacao-legada\docs-juridico` para consulta histórica.

---

## 8. Impacto Esperado

Com `docs-juridico` arquivado, esperam-se os seguintes benefícios imediatos:

| Benefício | Descrição |
|---|---|
| **Raiz mais limpa** | A raiz do projeto deixa de ter uma pasta de documentação concorrente |
| **Vault único e claro** | Apenas `!_lexora-memory-docs` aparece como vault de documentação na raiz |
| **Redução de risco para IAs** | IAs que explorarem o projeto não encontrarão `docs-juridico` como candidata a fonte oficial |
| **Eliminação do vault paralelo** | Sem `.obsidian` em `docs-juridico`, não há mais dois vaults disputando atenção |
| **Numeração de KB linear** | A progressão KB-001, KB-002, ARCHIVE-001, KB-003 fica clara e sem concorrência |

---

## 9. Riscos Remanescentes

Mesmo após este arquivamento, os seguintes riscos continuam existindo e devem ser tratados nas próximas etapas:

| Risco | Prioridade | Próxima ação recomendada |
|---|---|---|
| `.codex/agents/` e `.codex/skills/` ainda sem validação | Alta | Validar com usuário quais ainda são usados ativamente |
| `docs/` ainda não comparado ao código atual | Alta | KB-003 deve mapear `docs/` contra o estado real do código |
| Contratos JSON (`contracts/`) não comparados com documentação Markdown (`docs/*/contracts.md`) | Alta | Incluir no escopo do KB-003 |
| Screenshots soltos na raiz do projeto (`*.png`) | Média | Curadoria futura — indexar ou arquivar os relevantes |
| Logs soltos na raiz não têm valor documental permanente | Baixa | Podem ser ignorados ou limpos manualmente |
| Documentação oficial do vault (`!_lexora-memory-docs`) ainda está incipiente | Alta | KB-003 inicia a reconstrução baseada no código atual |
| `docs/skills/` pode estar desatualizada em relação ao código | Média | Incluir no escopo do KB-003 |

---

## 10. Próxima Etapa Recomendada

### KB-003 — Inventário Técnico do Estado Atual do Projeto

Com o legado principal arquivado, a próxima etapa deve criar um inventário técnico baseado **exclusivamente no estado real do código e da estrutura verificada** — sem consultar `docs-juridico` como fonte.

**Por que KB-003 agora?**
- A raiz do projeto está mais limpa e sem fonte de verdade concorrente.
- A memória oficial existe e tem governança definida.
- É possível agora mapear o estado real sem ambiguidade sobre quais documentos são válidos.

**Escopo recomendado para KB-003:**

- Stack atual verificada (frontend, backend, banco de dados, deploy)
- Estrutura de pastas e módulos do frontend (`frontend/src/`)
- Estrutura de pastas e módulos do backend (`backend/src/`)
- Rotas principais implementadas
- Componentes de UI existentes e estado atual
- Tokens de design, CSS e Tailwind
- Contratos de API — comparar JSON (`contracts/`) com Markdown (`docs/*/contracts.md`)
- Testes existentes (smoke tests, testes interativos)
- Scripts disponíveis (`scripts/`)
- Evidências do estado atual (screenshots de testes, snapshots)
- Riscos técnicos identificados no código
- Divergências entre código e documentação existente em `docs/`

---

## 11. Validação Final

| Item validado | Resultado |
|---|---|
| KB-002 encontrado antes da execução | **Sim** |
| `docs-juridico` existia antes da movimentação | **Sim** |
| `docs-juridico\.obsidian` existia antes da movimentação | **Sim** |
| Documentação legada (44 arquivos) movida para `99 - Arquivo` | **Sim** |
| Configuração `.obsidian` (5 arquivos) movida para `docs-juridico-obsidian-config` | **Sim** |
| Nenhuma pasta `.obsidian` ativa foi alterada | **Sim** |
| Nenhum código foi alterado | **Sim** |
| `frontend` preservado | **Sim** |
| `backend` preservado | **Sim** |
| `contracts` preservado | **Sim** |
| `docs` preservado | **Sim** |
| `.codex` preservado | **Sim** |
| `frontend\test-results` preservado | **Sim** |
| `frontend\test-screenshots` preservado | **Sim** |
| Nenhum arquivo foi sobrescrito | **Sim** |
| Pasta `docs-juridico` vazia removida da raiz | **Sim** |
| Relatório ARCHIVE-001 criado | **Sim** |

---

*Criado em: 2026-05-29 | Status: current | Vault: !_lexora-memory-docs*
*Fonte: Claude Code | Etapa: ARCHIVE-001*
*Baseado em: [[00_START_HERE]], [[KB_001_DOCUMENTACAO_MAPEAMENTO_INICIAL_CURRENT_2026-05-29]], [[KB_002_GOVERNANCA_DOCUMENTAL_OFICIAL_CURRENT_2026-05-29]]*
