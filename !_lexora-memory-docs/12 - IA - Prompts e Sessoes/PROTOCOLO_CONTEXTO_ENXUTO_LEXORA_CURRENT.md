---
tipo: protocolo
status: current
projeto: lexora
area: contexto-ia
data: 2026-05-30
fonte: claude-code
baseado_em:
  - '[[00_START_HERE]]'
  - '[[KB_002_GOVERNANCA_DOCUMENTAL_OFICIAL_CURRENT_2026-05-29]]'
  - '[[KB_003G_RISCOS_TECNICOS_E_DIVERGENCIAS_CONSOLIDADAS_CURRENT_2026-05-30]]'
  - '[[BACKLOG_GERAL_LEXORA_CURRENT]]'
escopo: reducao-consumo-contexto
vault_oficial: 'C:\Users\tomke\app Juridico\!_lexora-memory-docs'
autoridade: protocolo-operacional
---

# PROTOCOLO — Contexto Enxuto Lexora

> [!important] Leia este protocolo antes de iniciar qualquer tarefa no Lexora
> Este documento define como IAs devem consultar a memória oficial do projeto consumindo o mínimo de contexto possível, sem perder segurança, rastreabilidade e precisão.

---

## 1. Objetivo

Definir como IAs devem consultar a memória oficial do Lexora consumindo o mínimo de contexto possível, sem perder segurança, rastreabilidade e precisão.

---

## 2. Regra Principal

Para qualquer tarefa, a IA deve começar pela **menor base suficiente**.

Não ler todos os KBs por padrão.

### Ordem padrão de leitura:

1. [[00_START_HERE]]
2. [[KB_002_GOVERNANCA_DOCUMENTAL_OFICIAL_CURRENT_2026-05-29]]
3. [[MAPA_CANONICO_LEXORA_CURRENT]]
4. [[KB_003G_RISCOS_TECNICOS_E_DIVERGENCIAS_CONSOLIDADAS_CURRENT_2026-05-30]]
5. [[BACKLOG_GERAL_LEXORA_CURRENT]]
6. Apenas os KBs diretamente relacionados à tarefa

---

## 3. Quando Ler Cada Documento

| Necessidade | Leia primeiro | Leia depois apenas se necessário |
|---|---|---|
| Entender governança | [[KB_002_GOVERNANCA_DOCUMENTAL_OFICIAL_CURRENT_2026-05-29]] | [[00_START_HERE]] |
| Entender estado técnico geral | [[KB_003G_RISCOS_TECNICOS_E_DIVERGENCIAS_CONSOLIDADAS_CURRENT_2026-05-30]] | KB-003A a KB-003F |
| Executar ação operacional | [[BACKLOG_GERAL_LEXORA_CURRENT]] | KB relacionado ao item |
| Criar novo KB | [[00_START_HERE]] + [[KB_002_GOVERNANCA_DOCUMENTAL_OFICIAL_CURRENT_2026-05-29]] + [[MAPA_CANONICO_LEXORA_CURRENT]] + [[KB_003G_RISCOS_TECNICOS_E_DIVERGENCIAS_CONSOLIDADAS_CURRENT_2026-05-30]] | KBs do tema |
| Atualizar backlog | [[BACKLOG_GERAL_LEXORA_CURRENT]] + KB fonte | [[KB_003G_RISCOS_TECNICOS_E_DIVERGENCIAS_CONSOLIDADAS_CURRENT_2026-05-30]] |
| Trabalhar frontend | [[KB_003B_FRONTEND_ESTADO_ATUAL_CURRENT_2026-05-29]] | KB-005/KB-006 futuramente |
| Trabalhar backend | [[KB_003C_BACKEND_E_APIS_ESTADO_ATUAL_CURRENT_2026-05-30]] | [[KB_003D_DADOS_PRISMA_E_CONTRATOS_CURRENT_2026-05-30]] |
| Trabalhar dados/Prisma | [[KB_003D_DADOS_PRISMA_E_CONTRATOS_CURRENT_2026-05-30]] | [[KB_003G_RISCOS_TECNICOS_E_DIVERGENCIAS_CONSOLIDADAS_CURRENT_2026-05-30]] |
| Trabalhar testes/QA | [[KB_003E_TESTES_QA_E_EVIDENCIAS_CURRENT_2026-05-30]] | [[BACKLOG_GERAL_LEXORA_CURRENT]] |
| Trabalhar IA/agentes | [[KB_003F_IA_AGENTES_E_AUTOMACOES_CURRENT_2026-05-30]] | [[KB_003G_RISCOS_TECNICOS_E_DIVERGENCIAS_CONSOLIDADAS_CURRENT_2026-05-30]] |
| Trabalhar riscos | [[KB_003G_RISCOS_TECNICOS_E_DIVERGENCIAS_CONSOLIDADAS_CURRENT_2026-05-30]] | [[BACKLOG_GERAL_LEXORA_CURRENT]] |
| Trabalhar produto | KB-004 futuro | [[KB_003G_RISCOS_TECNICOS_E_DIVERGENCIAS_CONSOLIDADAS_CURRENT_2026-05-30]] |
| Trabalhar UX/UI | KB-005 futuro | [[KB_003B_FRONTEND_ESTADO_ATUAL_CURRENT_2026-05-29]] + [[KB_003E_TESTES_QA_E_EVIDENCIAS_CURRENT_2026-05-30]] |
| Trabalhar Design System | KB-006 futuro | [[KB_003B_FRONTEND_ESTADO_ATUAL_CURRENT_2026-05-29]] + KB-005 futuro |

---

## 4. Regras para Reduzir Contexto

- Não reler KB-003A a KB-003F se KB-003G for suficiente.
- Não abrir arquivos técnicos inteiros se um KB atual já resume o tema.
- Não consultar documentação legada sem necessidade explícita.
- Não repetir regras globais em prompts.
- Não copiar trechos grandes de documentos para respostas.
- Preferir citações, caminhos e resumos objetivos.
- Para tarefas pequenas, ler apenas [[00_START_HERE]], [[KB_002_GOVERNANCA_DOCUMENTAL_OFICIAL_CURRENT_2026-05-29]], [[MAPA_CANONICO_LEXORA_CURRENT]] e o arquivo alvo.
- Para updates de backlog, ler apenas backlog, KB fonte e KB-003G.
- Para novos KBs, ler apenas KB-003G, backlog e 1 ou 2 KBs diretamente relacionados.
- Se houver conflito entre economia de contexto e segurança, **priorizar segurança**.

---

## 5. Padrão de Prompt Enxuto

Modelo reutilizável para novas tarefas:

```txt
Você está no projeto:
C:\Users\tomke\app Juridico

Use:
- 00_START_HERE
- KB-002
- MAPA_CANONICO
- KB-003G
- BACKLOG

Tarefa:
[descrever tarefa]

Leia apenas documentos diretamente necessários.

Altere apenas:
[caminho do arquivo permitido]

Regras críticas:
- Não alterar código/config/testes/logs/schema/package.
- Não executar comandos.
- Não criar arquivos extras.
- Não usar legado como fonte oficial.

Validação:
- Arquivos alterados.
- Itens criados/atualizados.
- Próxima etapa.
```

---

## 6. Checklist Mínimo de Validação

| Item | Resultado |
|---|---|
| Documentos base lidos | Sim/Não |
| Apenas arquivos permitidos alterados | Sim/Não |
| Nenhum código/config/teste/schema/log alterado | Sim/Não |
| Nenhum comando executado | Sim/Não |
| Rastreabilidade atualizada, se aplicável | Sim/Não |
| Próxima etapa indicada | Sim/Não |

---

## 7. Limites

> [!warning] Este protocolo não substitui o KB-002
> Em caso de conflito, prevalece:

1. [[KB_002_GOVERNANCA_DOCUMENTAL_OFICIAL_CURRENT_2026-05-29]] — para governança documental.
2. [[KB_003G_RISCOS_TECNICOS_E_DIVERGENCIAS_CONSOLIDADAS_CURRENT_2026-05-30]] — para visão técnica consolidada.
3. [[BACKLOG_GERAL_LEXORA_CURRENT]] — para ações operacionais.
4. KB específico mais recente — para detalhe por área.

---

*Criado em: 2026-05-30 | Status: current | Vault: !_lexora-memory-docs*
*Pasta: 12 - IA - Prompts e Sessoes | Fonte: Claude Code*
*Baseado em: [[00_START_HERE]], [[KB_002_GOVERNANCA_DOCUMENTAL_OFICIAL_CURRENT_2026-05-29]], [[KB_003G_RISCOS_TECNICOS_E_DIVERGENCIAS_CONSOLIDADAS_CURRENT_2026-05-30]], [[BACKLOG_GERAL_LEXORA_CURRENT]]*
