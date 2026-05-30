---
tipo: kb
status: current
projeto: lexora
fase: governanca-documental
data: 2026-05-29
fonte: claude-code
baseado_em:
  - '[[00_START_HERE]]'
  - '[[SETUP_001_ESTRUTURA_LEXORA_MEMORY_DOCS_CURRENT_2026-05-29]]'
  - '[[KB_001_DOCUMENTACAO_MAPEAMENTO_INICIAL_CURRENT_2026-05-29]]'
escopo: governanca-oficial
vault_oficial: 'C:\Users\tomke\app Juridico\!_lexora-memory-docs'
autoridade: fonte-oficial
---

# KB-002 — Governança Documental Oficial

> [!important] Este documento é fonte oficial
> Este KB formaliza as regras de governança documental do projeto Lexora. Toda IA, agente e desenvolvedor deve seguir estas regras ao trabalhar com a documentação do projeto.

---

## 1. Resumo Executivo

Este documento formaliza a **governança documental oficial do projeto Lexora**, consolidando três etapas anteriores:

1. **[[KB_001_DOCUMENTACAO_MAPEAMENTO_INICIAL_CURRENT_2026-05-29]]** — mapeamento completo da documentação existente, identificação de vaults, duplicidades, conflitos e fontes não confiáveis.
2. **[[SETUP_001_ESTRUTURA_LEXORA_MEMORY_DOCS_CURRENT_2026-05-29]]** — criação da estrutura oficial do vault `!_lexora-memory-docs`, templates e arquivo de orientação.
3. **Validação explícita do usuário** — sobre vault oficial, legado, fontes de verdade e regras para IAs.

A partir deste documento, o **KB-002 passa a ser a referência oficial de governança documental** do projeto Lexora. Qualquer processo que não estiver descrito aqui deve ser tratado como indefinido, e uma proposta de ADR deve ser gerada antes de criar precedente.

O projeto Lexora opera com **múltiplas IAs** (Codex, Claude Code, Antigravity com Gemini) e requer regras explícitas e consistentes para que diferentes agentes possam trabalhar no mesmo projeto sem contaminar a memória oficial com documentação obsoleta ou não validada.

---

## 2. Objetivo do Documento

Este KB define:

- Como a memória oficial deve ser usada por IAs e desenvolvedores.
- Quais fontes têm autoridade para orientar implementação e decisões.
- Quais fontes são legado e como devem ser tratadas.
- Como lidar com documentos conflitantes ou divergentes.
- Como novas decisões estruturais devem ser registradas.
- Como múltiplas IAs devem operar no projeto sem conflito.
- Como evitar que documentação antiga contamine decisões atuais.

---

## 3. Escopo da Governança

### Dentro do escopo:

- Knowledge Base (`01 - Knowledge Base`)
- Architecture Decision Records — ADRs (`10 - Decisoes ADR`)
- Documentação técnica (`03 - Arquitetura`, `06 - Backend e APIs`, `07 - Dados e Contratos`)
- Documentação de UX/UI (`08 - UX UI`)
- Documentação de design system (`09 - Design System`)
- Documentação de produto e requisitos (`04 - Produto e Requisitos`, `05 - Frontend`)
- Prompts e sessões de IA (`12 - IA - Prompts e Sessoes`)
- Backlog documental (`13 - Backlog`)
- Evidências técnicas (`11 - Testes e Evidencias`)
- Documentos legados (como categoria a ser gerenciada, não como fonte oficial)
- Artefatos técnicos (como categoria a ser referenciada, não como documentação principal)
- Skills e agentes de IA (governança de uso e validade)

### Fora do escopo desta etapa:

- Reorganização física de documentos antigos para `99 - Arquivo`
- Alteração de qualquer código
- Validação técnica profunda de frontend ou backend
- Criação de Constituição Visual do Design System
- Criação de arquivos `.base` (Obsidian Bases)
- Criação de arquivos `.canvas` (Obsidian Canvas)
- Arquivamento físico de legado

---

## 4. Decisões Oficiais Validadas

As decisões abaixo foram explicitamente validadas pelo usuário responsável pelo projeto e passam a ter força de regra oficial:

| # | Decisão | Status |
|---|---|---|
| D1 | O vault oficial de documentação é `!_lexora-memory-docs` | **Vigente** |
| D2 | A raiz do projeto não é vault documental oficial | **Vigente** |
| D3 | A pasta `.obsidian` da raiz do projeto é legado/inativa | **Vigente** |
| D4 | A pasta `docs-juridico\.obsidian` é legado/inativa | **Vigente** |
| D5 | Documentos `docs-juridico\01*` a `docs-juridico\27*` não são fonte oficial | **Vigente** |
| D6 | `.codex\skills` e `.codex\agents` antigos não são fonte oficial sem validação | **Vigente** |
| D7 | `frontend\test-results` é artefato técnico, não documentação | **Vigente** |
| D8 | `frontend\test-screenshots` é artefato técnico/evidência visual, não documentação | **Vigente** |
| D9 | Nova documentação oficial nasce do código atual, estado real e evidências verificadas | **Vigente** |
| D10 | Documento recente não é automaticamente documento oficial | **Vigente** |
| D11 | Documento oficial depende de status, localização, fonte, validação e autoridade | **Vigente** |
| D12 | O projeto usa Codex, Claude Code e Antigravity com Gemini — todas as IAs seguem este KB | **Vigente** |

> [!note] Formalização como ADR
> As decisões acima devem ser formalizadas como `ADR_001_VAULT_OFICIAL_DOCUMENTACAO_LEXORA.md` em etapa futura.

---

## 5. Hierarquia Oficial de Confiança das Fontes

Em qualquer situação de dúvida ou conflito, a hierarquia abaixo determina qual fonte prevalece. **Quanto mais alto na lista, maior a autoridade.**

```
1. Código atual, estrutura real do projeto e comportamento verificado da aplicação
2. Documentos com status CURRENT dentro de !_lexora-memory-docs
3. ADRs com status accepted ou current
4. Knowledge Base oficial (01 - Knowledge Base) com status current
5. Evidências técnicas recentes, quando vinculadas a análise ou decisão documentada
6. Backlog atual (apenas para pendências e intenção de trabalho)
7. Prompts e notas de sessão (apenas como contexto auxiliar)
8. Documentos legados (somente referência histórica — nunca verdade vigente sem validação)
```

> [!warning] Regra de conflito
> **Quando houver conflito entre fontes, a IA não deve escolher arbitrariamente.** Deve registrar a divergência, identificar as fontes conflitantes, classificar o impacto e solicitar validação do usuário antes de prosseguir.

---

## 6. Status Documental e Autoridade

### Status de documentos gerais

| Status | Significado | É fonte oficial? | Pode orientar implementação? |
|---|---|---|---|
| `current` | Documento vigente e validado, dentro do vault oficial | **Sim** | **Sim** |
| `draft` | Rascunho em elaboração | Não | Não |
| `review` | Aguardando validação pelo responsável | Não | Não |
| `deprecated` | Substituído por versão mais recente | Não | Não — apenas referência |
| `archived` | Preservado por histórico | Não | Não — apenas referência histórica |
| `template` | Modelo base para criação de documentos | Não | Não |

### Status de ADR

| Status | Significado | É decisão vigente? |
|---|---|---|
| `proposed` | Decisão proposta, ainda não validada | Não |
| `accepted` | Decisão aceita e vigente | **Sim** |
| `current` | Decisão vigente e ativa | **Sim** |
| `superseded` | Substituída por ADR mais recente | Não — verificar o substituto |
| `deprecated` | Decisão obsoleta | Não |
| `rejected` | Decisão rejeitada explicitamente | Não |

### Regra central

> **Documento oficial depende de: status + localização + fonte + validação + autoridade.**
> Nenhum desses fatores sozinho é suficiente.

---

## 7. Estrutura Oficial da Memória

A estrutura vigente do vault `!_lexora-memory-docs` após o SETUP-001:

| Pasta | Papel | Pode ser fonte oficial? | Observações |
|---|---|---|---|
| `00 - Inbox` | Rascunhos, notas brutas de sessão, entradas não processadas | Não | Documentos aqui são temporários — devem ser promovidos ou descartados |
| `01 - Knowledge Base` | KBs validados, diagnósticos, mapeamentos | Sim (se `current`) | Principal repositório de conhecimento do projeto |
| `02 - Estado Atual` | Estado vigente do sistema | Sim (se `current`) | Deve refletir o código real — atualizar sempre que o sistema mudar |
| `03 - Arquitetura` | Arquitetura, padrões, convenções estruturais | Sim (se `current`) | Deve ser derivado do código atual |
| `04 - Produto e Requisitos` | Requisitos, perfis, casos de uso, roadmap | Sim (se `current`) | Separar intenção validada de intenção histórica |
| `05 - Frontend` | Documentação de frontend | Sim (se `current`) | Derivada do código e telas reais |
| `06 - Backend e APIs` | Backend, rotas, serviços, módulos | Sim (se `current`) | Derivada do código atual |
| `07 - Dados e Contratos` | Contratos de API, modelo de dados, Prisma | Sim (se `current`) | Validar contra contratos JSON existentes |
| `08 - UX UI` | Análises de UX/UI, fluxos, jornadas | Sim (se `current`) | Derivada de observação direta das telas |
| `09 - Design System` | Tokens, componentes, identidade visual | Sim (se `current`) | `lexora_brand_package/` é a fonte primária de assets |
| `10 - Decisoes ADR` | Architecture Decision Records | Sim (se `accepted` ou `current`) | Registrar toda decisão estrutural aqui |
| `11 - Testes e Evidencias` | Evidências de testes, validações | Sim (se vinculada a análise) | Não mover artefatos brutos — apenas evidências relevantes |
| `12 - IA - Prompts e Sessoes` | Prompts, contextos, sessões de IA | Auxiliar | Registrar prompts reutilizáveis e outputs relevantes |
| `13 - Backlog` | Pendências documentais | Auxiliar | Não é fonte — é lista de trabalho a fazer |
| `90 - Templates` | Templates para criação de documentos | Não | São modelos — não representam estado ou decisão |
| `99 - Arquivo` | Documentação arquivada, legado, evidências antigas | Não (apenas histórico) | Subpastas: `documentacao-legada/`, `evidencias-antigas/`, `logs-antigos/` |

---

## 8. Regras para Documentos Oficiais

Todo documento que pretende ter autoridade oficial **deve** satisfazer todos os critérios abaixo:

### Critérios obrigatórios

- [ ] Estar localizado dentro de `!_lexora-memory-docs`
- [ ] Ter frontmatter com `tipo`, `status` e `projeto` declarados
- [ ] Ter `status: current` (ou `accepted` para ADRs)
- [ ] Ter sido criado ou validado com base em fontes verificáveis (código, evidências, decisões explícitas)
- [ ] Não contradizer uma fonte de maior autoridade sem registrar a divergência

### Regras adicionais

- Documentos `draft`, `deprecated` e `archived` **não são fonte vigente** — podem ser consultados como contexto, nunca como orientação.
- **Decisões estruturais** devem virar ADR em `10 - Decisoes ADR`.
- **Mudanças no estado vigente** do sistema devem atualizar `02 - Estado Atual`.
- **Pendências** identificadas devem ser registradas em `13 - Backlog`.
- **Divergências** entre fontes devem ser registradas explicitamente — nunca resolvidas por inferência sem validação.
- **Evidências** devem estar vinculadas a uma análise ou decisão — evidência solta não tem autoridade documental.
- **Todo documento criado por IA** deve declarar `fonte: claude-code`, `fonte: codex`, `fonte: gemini` ou equivalente no frontmatter.

---

## 9. Regras para Documentos Legados

### O que é legado no contexto Lexora

| Item | Status de Legado |
|---|---|
| `.obsidian` da raiz do projeto | Legado/inativo — vault encerrado |
| `docs-juridico\.obsidian` | Legado/inativo — vault paralelo encerrado |
| `docs-juridico\01*` a `docs-juridico\27*` | Legado — o próprio `00-README.md` da pasta já o declara |
| Documentos com número duplicado em `docs-juridico` (22, 23, 36) | Legado inconsistente — versões intermediárias sem resolução |
| `.codex\agents\*.toml` (02/04/2026) | Legado potencial — criados antes de múltiplas fases de desenvolvimento |
| `.codex\skills\` | Legado potencial — sem validação de uso atual |
| Screenshots soltos na raiz do projeto | Evidências históricas não indexadas |
| Logs soltos (`*.log`) na raiz | Artefatos de execução — sem valor documental |
| `frontend\README.md` (24/03/2026) | Legado — arquivo mais antigo, possivelmente desatualizado |
| `frontend\PLAYWRIGHT_INTERACTIVE_RESULTS.md` (02/04/2026) | Legado — resultado de sessão pontual |

### Como tratar legado

| Situação | Ação correta |
|---|---|
| Legado contém contexto histórico útil | Consultar como referência, não como verdade |
| Legado contém uma ideia ainda válida | Revalidar contra o código atual → criar novo documento `current` se confirmada |
| Legado contém uma decisão ainda vigente | Promover para ADR com status `accepted` |
| Legado contradiz código atual | Confiar no código — registrar divergência |
| Legado contradiz documento `current` | Confiar no documento `current` — registrar divergência |
| Legado está completamente obsoleto | Marcar para arquivamento futuro em `99 - Arquivo` |

> [!warning] Proibição
> Legado **não pode orientar implementação** sem validação explícita do responsável pelo projeto.
> Legado **não pode ser movido** sem aprovação explícita do usuário.

---

## 10. Regras para Artefatos Técnicos

Artefatos técnicos são gerados automaticamente pelo processo de desenvolvimento e **não são documentação principal**.

| Artefato | Localização | Tratamento |
|---|---|---|
| Resultados de testes Playwright | `frontend\test-results\` | Artefato técnico — não é documentação |
| Screenshots de regressão visual | `frontend\test-screenshots\` | Evidência técnica — pode ser referenciada em análise |
| Resultados de testes (raiz) | `test-results\` | Artefato técnico mínimo |
| Logs de execução | `*.log` espalhados no projeto | Artefato de execução — sem valor documental permanente |
| Screenshots soltos na raiz | `atendimentos-*.png`, `github-actions-page.png` etc. | Evidências históricas de sessão — sem indexação formal |

### Regras para artefatos

- Artefatos técnicos podem ser usados como **evidência pontual** em uma análise.
- Evidências relevantes devem ser **referenciadas com link**, não necessariamente copiadas.
- Resultados brutos de testes **não devem ser importados** para a memória oficial sem curadoria.
- Screenshots de regressão visual que documentem estado de uma tela específica podem ser **referenciados** em `08 - UX UI` ou `11 - Testes e Evidencias` em etapa futura.
- Artefatos não devem poluir o vault com conteúdo técnico não curado.

---

## 11. Regras para Múltiplas IAs

O projeto Lexora opera com múltiplos sistemas de IA simultaneamente: **Codex**, **Claude Code** e **Antigravity com Gemini**. Esta seção define o comportamento esperado de qualquer IA que trabalhar no projeto.

### Ordem de leitura obrigatória (para toda IA)

1. `00_START_HERE.md` — sempre primeiro
2. `02 - Estado Atual/` — estado vigente do sistema (quando existir)
3. KBs com `status: current` em `01 - Knowledge Base`
4. ADRs com `status: accepted` ou `current` em `10 - Decisoes ADR`

### Regras de comportamento obrigatórias

| # | Regra | Razão |
|---|---|---|
| R1 | Ler `00_START_HERE.md` antes de qualquer ação | Orientação da memória oficial |
| R2 | Não consultar legado como fonte oficial | Risco de contaminar decisões com dados obsoletos |
| R3 | Não usar `.codex\skills` antigas sem validação | Podem ter sido criadas por outra IA sem aprovação |
| R4 | Não alterar nenhuma pasta `.obsidian` | Configuração do vault é responsabilidade do usuário |
| R5 | Não sobrescrever documentos existentes | Proteção da memória oficial |
| R6 | Não mover ou apagar arquivos sem instrução explícita | Preservação do estado atual |
| R7 | Não tratar `draft` ou `deprecated` como fonte oficial | Status declarado tem força de regra |
| R8 | Declarar quais fontes foram usadas na resposta | Rastreabilidade e auditoria |
| R9 | Separar fatos, inferências e recomendações | Clareza epistemológica |
| R10 | Registrar divergências encontradas em vez de escolher arbitrariamente | Evitar decisões não rastreáveis |
| R11 | Sugerir ADR para qualquer decisão estrutural identificada | Rastreabilidade de decisões |
| R12 | Sugerir atualização de `02 - Estado Atual` quando o sistema mudar | Manutenção da fonte de verdade vigente |
| R13 | Sugerir item de backlog para pendências identificadas | Controle do trabalho documental |
| R14 | Confirmar validação final ao concluir qualquer tarefa | Garantia de entrega controlada |
| R15 | Verificar se arquivo de destino existe antes de criar | Proteção contra sobrescrita |

### O que fazer ao encontrar uma situação nova não coberta por este KB

1. Não assumir. Registrar a situação.
2. Verificar se existe ADR ou KB que cubra o caso.
3. Se não existir, registrar como item de backlog.
4. Propor ADR se for decisão estrutural.
5. Aguardar validação do usuário antes de prosseguir.

---

## 12. Fluxo Oficial de Criação e Promoção de Documentos

```
┌─────────────────────────────────────┐
│  Necessidade de documentação        │
│  identificada (por IA ou dev)       │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  00 - Inbox                         │
│  Rascunho inicial / notas brutas    │
│  status: draft                      │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Análise e elaboração               │
│  (usar template da 90 - Templates)  │
│  status: draft → review             │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Revisão pelo responsável           │
│  (usuário ou par técnico)           │
└──────────────┬──────────────────────┘
               │
       ┌───────┴───────┐
       │               │
       ▼               ▼
  Aprovado         Rejeitado
       │               │
       ▼               ▼
  status: current  descartar ou
                   arquivar
       │
       ▼
  ┌────────────────────────────────────┐
  │  Classificação e destino           │
  ├────────────────────────────────────┤
  │ Decisão estrutural → 10 - ADR      │
  │ Estado vigente    → 02 - Estado    │
  │ Pendência         → 13 - Backlog   │
  │ Evidência         → 11 - Testes    │
  │ Conhecimento geral→ 01 - KB        │
  └────────────────────────────────────┘
               │
               ▼
  Quando substituído ou obsoleto
               │
               ▼
  status: deprecated → 99 - Arquivo
  status: archived
```

---

## 13. Como Lidar com Divergências

Quando houver conflito entre código, documentação nova, documentação legada, prints, contratos ou skills, a IA ou desenvolvedor **não deve escolher automaticamente**. O processo correto é:

### Protocolo de divergência

1. **Identificar** as fontes conflitantes com precisão.
2. **Registrar** a divergência (em `13 - Backlog` ou inline no documento em análise).
3. **Classificar** o impacto: alto (afeta implementação), médio (afeta documentação), baixo (informativo).
4. **Recomendar** qual fonte deve prevalecer, com justificativa.
5. **Aguardar validação** do usuário antes de agir.
6. **Criar ADR** se a resolução exigir decisão estrutural.

### Exemplos de divergências comuns

| Cenário | Tratamento |
|---|---|
| Contrato JSON (`contracts/*.json`) diverge de documentação Markdown (`docs/*/contracts.md`) | Verificar código-fonte real — nenhum dos dois é automaticamente correto |
| `docs-juridico/04-Permissoes.md` define permissão diferente do código atual | Código prevalece — registrar divergência, propor atualização do documento |
| Skill antiga em `.codex/` contradiz regra deste KB | Este KB prevalece — registrar e aguardar validação |
| Screenshot mostra UI diferente da documentação | Verificar tela atual — screenshot pode estar desatualizado |
| Documento `current` diz X, mas `00-README.md` diz Y | Investigar data e fonte — registrar divergência antes de concluir |
| ADR proposto contradiz ADR aceito | ADR aceito prevalece — o novo deve referenciar o existente e propor supersedência |

---

## 14. Governança de Skills e Agentes de IA

### Sistemas de IA em uso no projeto

| Sistema | Tipo | Status de Skills/Agentes |
|---|---|---|
| **Codex** | Agente de desenvolvimento | Skills em `.codex/` são potencialmente legadas — verificar antes de usar |
| **Claude Code** | Assistente técnico (este sistema) | Skills em `.claude/` são mais recentes — verificar consistência |
| **Antigravity com Gemini** | Agente adicional | Skills e contexto desconhecidos — não assumir consistência |

### Regras para skills e agentes

- **Skills antigas em `.codex/`** são tratadas como legado até validação explícita pelo usuário.
- **Skills novas** (criadas ou usadas nesta sessão) devem ser documentadas em `12 - IA - Prompts e Sessoes`.
- **Regras oficiais para IAs** (como este KB) devem ser promovidas para KB ou ADR — não podem ficar apenas em prompts de chat.
- **Prompts reutilizáveis** devem ser armazenados em `12 - IA - Prompts e Sessoes` usando o `[[TEMPLATE_PROMPT_IA]]`.
- **Outputs relevantes de IA** devem virar KB, ADR, análise técnica ou item de backlog — não podem ficar apenas no histórico do chat.
- **Nenhuma IA deve criar skills ou agentes** sem instrução explícita e validação do usuário.

### Risco de skills paralelas não coordenadas

> [!warning] Risco identificado
> Se Codex, Claude Code e Antigravity usarem skills diferentes com regras diferentes, podem gerar documentação, código e decisões conflitantes no mesmo projeto. Este KB é a medida de mitigação — toda IA deve lê-lo antes de agir.

---

## 15. Plano Conceitual de Arquivamento Futuro

As subpastas abaixo já existem em `99 - Arquivo` e estão reservadas para arquivamento futuro. **Nenhuma movimentação deve ser feita sem aprovação explícita do usuário.**

```
99 - Arquivo/
├── documentacao-legada/
│   ├── docs-juridico/          ← para receber docs-juridico/01* a 27* quando arquivados
│   ├── vaults-antigos/         ← para configurações de .obsidian antigos
│   └── codex-skills-antigas/   ← para skills/.codex quando validadas como obsoletas
├── evidencias-antigas/         ← para screenshots e prints históricos sem indexação
└── logs-antigos/               ← para logs de execução antigos
```

### Critérios para arquivamento (a ser executado em etapa futura)

| Documento / Grupo | Critério para arquivar |
|---|---|
| `docs-juridico/01*` a `27*` | Após criação de equivalente `current` no vault oficial |
| `.codex/agents/` antigos | Após validação de que não são usados por nenhum sistema ativo |
| `.codex/skills/` antigas | Após validação de que foram substituídas por skills novas |
| Screenshots soltos na raiz | Após curadoria e indexação das evidências relevantes |
| Logs antigos | A qualquer momento — sem valor documental permanente |

---

## 16. Riscos Reduzidos por Esta Governança

Esta governança mitiga diretamente os seguintes riscos identificados no [[KB_001_DOCUMENTACAO_MAPEAMENTO_INICIAL_CURRENT_2026-05-29]]:

| Risco identificado | Como esta governança mitiga |
|---|---|
| Dois vaults Obsidian ativos sem coordenação | Vault oficial único definido — outros são legado |
| Documentação obsoleta orientando implementação | Hierarquia de confiança + regras de status documental |
| Fontes de verdade concorrentes | Hierarquia única e explícita definida neste KB |
| IAs usando skills antigas sem validação | Regra explícita: `.codex` é legado até validação |
| Confusão entre documentação e artefato técnico | Distinção clara entre documentação oficial e artefatos |
| Decisões sem rastreabilidade | Fluxo de ADR obrigatório para decisões estruturais |
| Perda de contexto entre sessões de IA | `00_START_HERE.md` como ponto de entrada obrigatório |
| Divergências não documentadas | Protocolo de divergência definido nesta seção |
| Numeração conflitante em docs-juridico (22, 23, 36) | Esses documentos são legado — não devem ser referenciados como oficial |
| Skills de IAs diferentes conflitando | Este KB é a referência única para todas as IAs |

---

## 17. Limitações desta Etapa

> [!note] O que o KB-002 NÃO faz

- **Não valida tecnicamente o frontend** — a estrutura de telas, componentes e rotas ainda precisa ser mapeada.
- **Não valida o backend** — serviços, rotas e módulos precisam de inventário técnico próprio.
- **Não reconstrói documentação oficial** — apenas estabelece as regras para que ela seja criada corretamente.
- **Não cria Constituição Visual** do Design System — o `lexora_brand_package/` existe, mas não foi documentado no vault.
- **Não arquiva legado** — as pastas `99 - Arquivo` estão vazias até aprovação explícita.
- **Não cria Bases ou Canvas** — ferramentas reservadas para etapas futuras.
- **Não altera código** — governança documental é separada do desenvolvimento.
- **Não substitui o futuro inventário técnico** — que deve mapear o estado real do sistema a partir do código.

---

## 18. Próxima Etapa Recomendada

### KB-003 — Inventário Técnico do Estado Atual do Projeto

A próxima etapa deve criar `KB_003_INVENTARIO_TECNICO_ESTADO_ATUAL_CURRENT_YYYY-MM-DD.md` em `01 - Knowledge Base`, mapeando o estado real do projeto **a partir do código e da estrutura verificada**, não de documentação legada.

**Escopo recomendado para KB-003:**

- Stack atual (frontend, backend, banco de dados, deploy)
- Estrutura de pastas e módulos do frontend
- Estrutura de pastas e módulos do backend
- Rotas principais implementadas
- Componentes de UI existentes
- Tokens de design e CSS existentes
- Contratos de API (JSON e Markdown) — comparar e validar
- Testes existentes (smoke tests, testes de regressão)
- Scripts disponíveis
- Evidências relevantes do estado atual
- Riscos técnicos identificados
- Divergências entre código e documentação existente

### Documentos futuros recomendados (não criar agora)

| Documento | Pasta | Prioridade |
|---|---|---|
| `CURRENT_STATE_LEXORA.md` | `02 - Estado Atual` | Alta — primeiro a ser criado após KB-003 |
| `ADR_001_VAULT_OFICIAL_DOCUMENTACAO_LEXORA.md` | `10 - Decisoes ADR` | Alta — formalizar D1–D12 como ADR |
| `FONTES_OFICIAIS_CURRENT.md` | `01 - Knowledge Base` | Alta |
| `CONTEXTO_INICIAL_IA_CURRENT.md` | `12 - IA - Prompts e Sessoes` | Alta |
| `BACKLOG_DOCUMENTACAO_CURRENT.md` | `13 - Backlog` | Média |
| `KB_003_INVENTARIO_TECNICO_ESTADO_ATUAL_CURRENT.md` | `01 - Knowledge Base` | Alta |

> [!note] Regra de criação
> Todos os documentos acima devem ser criados com base no código atual e no estado real do projeto. Nenhum deve ser derivado de documentação legada sem validação explícita.

---

## 19. Validação Final

### Verificação desta entrega

| Item validado | Resultado |
|---|---|
| Vault oficial existe | Sim |
| `00_START_HERE.md` encontrado e lido | Sim |
| `SETUP_001` encontrado | Sim |
| `KB_001` encontrado dentro do vault | Sim |
| KB-002 criado no caminho correto | Sim |
| Apenas o KB-002 foi criado | Sim |
| Algum arquivo existente foi sobrescrito | Não |
| Alguma pasta `.obsidian` foi alterada | Não |
| Algum documento legado foi movido | Não |
| Algum documento legado foi apagado | Não |
| Algum documento legado foi renomeado | Não |
| Algum código foi alterado | Não |
| Alguma reorganização física foi executada | Não |

### Arquivo criado

- `01 - Knowledge Base\KB_002_GOVERNANCA_DOCUMENTAL_OFICIAL_CURRENT_2026-05-29.md`

### Arquivos consultados

- `!_lexora-memory-docs\00_START_HERE.md`
- `!_lexora-memory-docs\01 - Knowledge Base\SETUP_001_ESTRUTURA_LEXORA_MEMORY_DOCS_CURRENT_2026-05-29.md` (existência verificada)
- `!_lexora-memory-docs\01 - Knowledge Base\KB_001_DOCUMENTACAO_MAPEAMENTO_INICIAL_CURRENT_2026-05-29.md` (existência verificada)

### Arquivos preservados

- Todos os documentos existentes foram preservados intactos.
- KB_001 original na raiz do projeto permanece no local original.

### Pontos que precisam de validação do usuário

1. **ADR_001:** As decisões D1–D12 desta seção 4 devem ser formalizadas como `ADR_001_VAULT_OFICIAL_DOCUMENTACAO_LEXORA.md`. Aguarda aprovação para criar.
2. **Próxima etapa:** Confirmar se KB-003 (Inventário Técnico) deve ser a próxima etapa, ou se há prioridade diferente.
3. **Nomes com acentos:** As pastas foram criadas sem acentos (`Decisoes`, `Testes e Evidencias`). Confirmar se o usuário deseja renomear.
4. **Skills `.codex`:** Confirmar quais skills/agentes do `.codex/` ainda estão em uso ativo pelo Codex — para decidir o que arquivar e o que manter.

---

*Criado em: 2026-05-29 | Status: current | Vault: !_lexora-memory-docs*
*Fonte: Claude Code | Baseado em: [[00_START_HERE]], [[SETUP_001_ESTRUTURA_LEXORA_MEMORY_DOCS_CURRENT_2026-05-29]], [[KB_001_DOCUMENTACAO_MAPEAMENTO_INICIAL_CURRENT_2026-05-29]]*
