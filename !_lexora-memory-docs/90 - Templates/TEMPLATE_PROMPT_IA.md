---
tipo: template
status: template
projeto: lexora
criado_em: 2026-05-29
escopo: memoria-oficial
---

# TEMPLATE — Prompt de IA

> Use este template para registrar prompts, instruções e contextos enviados para IAs trabalhando no projeto Lexora.
> Copie este arquivo, renomeie seguindo o padrão `PROMPT_XXX_TITULO_DATA.md` e salve em `12 - IA - Prompts e Sessoes`.

---

## Frontmatter para documentos de Prompt de IA

```yaml
---
tipo: prompt-ia
status: draft
projeto: lexora
criado_em: YYYY-MM-DD
sessao: definir
modelo_ia: definir
etapa: definir
resultado: pendente
relacionado_a:
  - '[[00_START_HERE]]'
---
```

---

# Prompt IA — Título

## Objetivo do Prompt

O que esta instrução busca alcançar? Qual tarefa será delegada à IA?

---

## Contexto Obrigatório

Informações que a IA precisa ter antes de executar a tarefa:

- Estado atual do projeto
- Decisões já tomadas
- Restrições conhecidas

---

## Documentos que a IA Deve Ler Primeiro

Liste os documentos que devem ser lidos pela IA antes de qualquer ação:

1. [[00_START_HERE]] — obrigatório sempre
2. (documento de estado atual, quando existir)
3. (KBs relevantes)
4. (ADRs aceitos relacionados)

---

## Arquivos Permitidos

Liste os arquivos e pastas que a IA está autorizada a ler e/ou escrever:

```
!_lexora-memory-docs/...
docs/...
```

---

## Arquivos Proibidos

Liste explicitamente os arquivos e pastas que a IA **não deve** modificar:

```
.obsidian/
docs-juridico/.obsidian/
(qualquer pasta .obsidian)
```

---

## Ferramentas/Skills Permitidas

Quais ferramentas ou skills a IA pode usar nesta tarefa:

- [ ] Leitura de arquivos
- [ ] Escrita de arquivos novos
- [ ] Edição de arquivos existentes
- [ ] Execução de comandos
- [ ] Outras: (especificar)

---

## Contrato de Leitura

O que a IA pode ler:

- Pastas autorizadas: (listar)
- Arquivos específicos: (listar)
- Proibições explícitas: (listar)

---

## Contrato de Escrita

O que a IA pode criar ou modificar:

- Pode criar novos arquivos em: (listar pastas)
- Pode editar arquivos existentes: Sim/Não — quais?
- Não pode sobrescrever: (listar)
- Não pode apagar: nenhum arquivo
- Não pode mover: nenhum arquivo

---

## Tarefa

Descrição clara e objetiva da tarefa que a IA deve executar. Use linguagem imperativa e específica.

---

## Restrições

Liste todas as restrições que se aplicam a esta execução:

1. Não alterar `.obsidian`.
2. Não sobrescrever arquivos existentes.
3. Não usar documentação legada como fonte oficial.
4. (restrições específicas desta tarefa)

---

## Critérios de Parada

Em quais situações a IA deve parar e aguardar instrução do usuário:

- Se o arquivo de destino já existir.
- Se encontrar divergência entre código e documentação.
- Se encontrar decisão estrutural não documentada.
- (critérios específicos desta tarefa)

---

## Resultado Esperado

Descreva o que deve existir ao final da execução bem-sucedida:

- Arquivo(s) criado(s): (listar)
- Conteúdo esperado: (descrever)
- Formato obrigatório: (frontmatter, estrutura, etc.)

---

## Formato de Resposta Esperado

Como a IA deve reportar ao final:

- Tabela de validação
- Lista de arquivos criados
- Lista de arquivos preservados (já existiam)
- Pontos que precisam de validação do usuário

---

## Critérios de Validação

Como o usuário vai confirmar que a tarefa foi executada corretamente:

- [ ] Critério 1
- [ ] Critério 2

---

## Validação Final Obrigatória

A IA deve confirmar explicitamente:

- [ ] Nenhum arquivo existente foi sobrescrito
- [ ] Nenhuma pasta `.obsidian` foi alterada
- [ ] Nenhum documento legado foi movido
- [ ] Nenhum código foi alterado
- [ ] Todos os arquivos esperados foram criados

---

## Riscos Conhecidos

Riscos identificados antes da execução:

| Risco | Mitigação |
|---|---|
| | |

---

## Observações para Próxima Sessão

Informações úteis para a próxima IA ou sessão que trabalhar neste contexto:

- (o que foi feito)
- (o que ficou pendente)
- (o que não deve ser repetido)

---

## Referências Internas

- [[00_START_HERE]]
- [[SETUP_001_ESTRUTURA_LEXORA_MEMORY_DOCS_CURRENT_2026-05-29]]
