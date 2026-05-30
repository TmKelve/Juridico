---
tipo: setup
status: current
fase: estrutura-memoria-oficial
projeto: lexora
data: 2026-05-29
fonte: claude-code
baseado_em: KB_001_DOCUMENTACAO_MAPEAMENTO_INICIAL_CURRENT_2026-05-29.md
escopo: criacao-estrutura
vault_oficial: 'C:\Users\tomke\app Juridico\!_lexora-memory-docs'
---

# SETUP-001 — Estrutura Oficial da Memória Lexora

> [!important]
> Este documento registra a criação controlada da estrutura inicial da memória oficial do projeto Lexora dentro do vault `!_lexora-memory-docs`.

---

## 1. Resumo Executivo

Em 2026-05-29, foi criada a estrutura inicial do vault oficial de documentação e memória do projeto Lexora. A estrutura foi gerada a partir das decisões registradas no [[KB_001_DOCUMENTACAO_MAPEAMENTO_INICIAL_CURRENT_2026-05-29]], que mapeou a situação documental existente, identificou duplicidades, conflitos e fontes não confiáveis.

O vault `!_lexora-memory-docs` foi estabelecido como **a única memória documental oficial do projeto**, com estrutura de pastas temáticas, hierarquia de confiança definida, templates padronizados e regras claras para IAs e desenvolvedores.

---

## 2. Objetivo do Setup

- Criar a estrutura de pastas da memória oficial dentro do vault já existente.
- Estabelecer o arquivo de entrada `00_START_HERE.md` com as regras da memória.
- Copiar o KB_001 do mapeamento inicial para dentro da estrutura oficial.
- Criar templates padronizados para futura criação de documentos.
- Não mover, apagar ou alterar nenhum documento existente fora do vault.

---

## 3. Estrutura Criada

```
!_lexora-memory-docs/
├── .obsidian/                          (criado pelo usuário — NÃO alterado)
├── 00 - Inbox/                         (notas brutas, rascunhos de sessão)
├── 01 - Knowledge Base/                (KBs, diagnósticos, mapeamentos)
├── 02 - Estado Atual/                  (estado vigente do sistema)
├── 03 - Arquitetura/                   (arquitetura e convenções)
├── 04 - Produto e Requisitos/          (requisitos, perfis, roadmap)
├── 05 - Frontend/                      (documentação de frontend)
├── 06 - Backend e APIs/                (backend, rotas, serviços)
├── 07 - Dados e Contratos/             (contratos de API, esquema)
├── 08 - UX UI/                         (análises UX/UI)
├── 09 - Design System/                 (tokens, componentes, marca)
├── 10 - Decisoes ADR/                  (Architecture Decision Records)
├── 11 - Testes e Evidencias/           (evidências, validações)
├── 12 - IA - Prompts e Sessoes/        (prompts e contextos para IAs)
├── 13 - Backlog/                       (pendências documentais)
├── 90 - Templates/                     (templates oficiais)
└── 99 - Arquivo/                       (legado e arquivados)
    ├── documentacao-legada/
    │   ├── docs-juridico/              (reservado para legado de docs-juridico)
    │   ├── vaults-antigos/             (reservado para configurações de vaults antigos)
    │   └── codex-skills-antigas/       (reservado para skills Codex antigas)
    ├── evidencias-antigas/             (reservado para evidências históricas)
    └── logs-antigos/                   (reservado para logs históricos)
```

> [!note] Pastas de arquivo
> As subpastas dentro de `99 - Arquivo` foram criadas como estrutura vazia. Nenhum documento legado foi movido para elas nesta etapa.

---

## 4. Arquivos Criados

| Arquivo | Pasta | Tipo | Status |
|---|---|---|---|
| `00_START_HERE.md` | `/` (raiz do vault) | indice | current |
| `SETUP_001_ESTRUTURA_LEXORA_MEMORY_DOCS_CURRENT_2026-05-29.md` | `01 - Knowledge Base` | setup | current |
| `TEMPLATE_KB.md` | `90 - Templates` | template | template |
| `TEMPLATE_ADR.md` | `90 - Templates` | template | template |
| `TEMPLATE_ANALISE_TECNICA.md` | `90 - Templates` | template | template |
| `TEMPLATE_ANALISE_UX_UI.md` | `90 - Templates` | template | template |
| `TEMPLATE_PROMPT_IA.md` | `90 - Templates` | template | template |
| `TEMPLATE_DAILY_NOTE.md` | `90 - Templates` | template | template |

---

## 5. Arquivo KB_001 Copiado

| Campo | Valor |
|---|---|
| Arquivo original | `C:\Users\tomke\app Juridico\KB_001_DOCUMENTACAO_MAPEAMENTO_INICIAL_CURRENT_2026-05-29.md` |
| Destino | `01 - Knowledge Base\KB_001_DOCUMENTACAO_MAPEAMENTO_INICIAL_CURRENT_2026-05-29.md` |
| Original preservado | Sim — não foi movido |
| Sobrescrita | Não — destino não existia |

O KB_001 é o documento fundacional desta memória oficial. Contém o mapeamento completo da documentação existente antes da criação desta estrutura.

---

## 6. Decisões Aplicadas

As seguintes decisões, validadas pelo usuário antes desta etapa, foram aplicadas:

1. **Vault oficial:** `!_lexora-memory-docs` é o vault documental oficial. A raiz do projeto não é mais tratada como vault documental.
2. **Vaults legados:** `.obsidian` da raiz e `docs-juridico\.obsidian` são considerados inativos.
3. **Documentação legada:** Documentos de `docs-juridico/01*` a `docs-juridico/27*` não são fonte oficial.
4. **Nova documentação:** Deve nascer do código atual e de evidências verificadas, não de documentação antiga.
5. **Hierarquia de confiança:** Código > documentos `current` em `!_lexora-memory-docs` > ADRs aceitos > KB oficial > evidências recentes > legado.

---

## 7. O que Não Foi Alterado

| Item | Resultado |
|---|---|
| Pasta `.obsidian` do vault `!_lexora-memory-docs` | NÃO alterada |
| Pasta `.obsidian` da raiz do projeto | NÃO alterada |
| Pasta `docs-juridico\.obsidian` | NÃO alterada |
| Pasta `docs/` | NÃO alterada |
| Pasta `docs-juridico/` | NÃO alterada |
| Pasta `frontend/` | NÃO alterada |
| Pasta `backend/` | NÃO alterada |
| Pasta `contracts/` | NÃO alterada |
| Pasta `.codex/` | NÃO alterada |
| KB_001 original na raiz | NÃO movido — preservado no local original |
| Qualquer código do projeto | NÃO alterado |

---

## 8. Regras Iniciais da Memória Oficial

As regras completas estão em [[00_START_HERE]]. Resumo dos princípios:

- Todo documento deve ter frontmatter com `tipo`, `status` e `projeto`.
- Documentos `draft` não são fonte oficial.
- Documentos `deprecated` e `archived` não são fonte vigente.
- Documentos legados só podem ser usados como referência histórica.
- Decisões estruturais devem virar ADR em `10 - Decisoes ADR`.
- Mudanças no estado vigente devem atualizar `02 - Estado Atual`.
- Pendências devem ser registradas em `13 - Backlog`.
- IAs devem ler `00_START_HERE.md` primeiro, sempre.

---

## 9. Riscos Controlados

| Risco | Mitigação aplicada |
|---|---|
| Sobrescrever arquivo existente | Verificação antes de cada criação/cópia |
| Alterar `.obsidian` | Regra explícita de não alteração |
| Confundir legado com fonte oficial | Hierarquia de confiança documentada em `00_START_HERE.md` |
| Mover arquivos originais | KB_001 foi copiado, não movido |
| Criar vault duplicado | Vault `!_lexora-memory-docs` já existia — estrutura apenas criada internamente |

---

## 10. Limitações desta Etapa

> [!warning] O que o SETUP-001 NÃO fez:

- **Não analisou código.** A documentação técnica real do projeto ainda não foi criada.
- **Não arquivou legado.** As pastas `99 - Arquivo` foram criadas vazias. Nenhum documento foi movido.
- **Não validou documentação antiga.** O mapeamento do KB_001 identificou o que existe, mas a validação de cada documento fica para etapas futuras.
- **Não resolveu a governança inteira.** O KB_002 de governança documental ainda precisa ser criado.
- **Não criou estado atual.** A pasta `02 - Estado Atual` está vazia — precisa ser populada com base no estado real do código.
- **Não sincronizou contratos.** A relação entre `contracts/*.contract.json` e `docs/*/contracts.md` ainda não foi validada.

---

## 11. Próxima Etapa Recomendada

**SETUP-002 / KB-002 — Governança Documental**

Criar o documento `KB_002_GOVERNANCA_DOCUMENTAL_CURRENT_2026-05-29.md` em `01 - Knowledge Base`, definindo:
- Processo formal de criação e promoção de documentos.
- Critérios de arquivamento do legado.
- Fluxo de validação de fontes antes do uso.
- Política de sincronização entre contratos JSON e documentação Markdown.
- Critérios de atualização do `02 - Estado Atual`.

Em paralelo, recomenda-se criar:
- `ADR_001_VAULT_OFICIAL_DOCUMENTACAO_LEXORA.md` — formalizar a decisão do vault oficial como ADR.
- `CURRENT_STATE_LEXORA.md` — estado atual real do sistema, baseado no código.

---

## 12. Validação Final

| Item validado | Resultado |
|---|---|
| Vault oficial existia antes do setup | Sim |
| KB_001 original encontrado | Sim |
| Todas as 22 pastas esperadas criadas | Sim |
| `00_START_HERE.md` criado | Sim |
| `SETUP_001` criado | Sim |
| KB_001 copiado para `01 - Knowledge Base` | Sim |
| 6 templates criados em `90 - Templates` | Sim |
| Algum arquivo existente sobrescrito | Não |
| Alguma pasta `.obsidian` alterada | Não |
| Algum documento legado movido | Não |
| Algum código alterado | Não |
| KB_001 original preservado na raiz | Sim |

---

*Criado em: 2026-05-29 | Status: current | Etapa: SETUP-001*
*Vault: !_lexora-memory-docs | Fonte: Claude Code*
