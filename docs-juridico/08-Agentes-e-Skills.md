# Agentes e Skills para Otimização da Entrega

## 1. Contexto
Objetivo: adotar automação com AI para acelerar planejamento, geração de requisitos e documentação, sem perder controle de produto.

## 2. Agente recomendado: Copilot Chat (GitHub Copilot)
- Usar para escrever prosa técnica rápida (user stories, critérios de aceitação, revisão de texto).
- Perguntar em português natural (e.g. “Gerar matriz de telas e ações para perfil Advogado”).
- Iterar facilmente com comentários inline.

## 3. Skill: agent-customization do VS Code
- Use `agent-customization` para criar agentes internos (prompts e comportamentos):
  - `SAAS jurídico product designer`
  - `MVP backlog generator` 
  - `Security & permissions reviewer`
- Para cada skill, defina frontmatter com `applyTo` para `docs-juridico/**` e use comandos customizados.

## 4. Workflow sugerido com agents
1. Estrutura inicial: gerar arquivos md (pronto).
2. Refinamento: gerar descrição detalhada de tela/UX (wireframe textual).
3. Validação técnica: checar modelagem DB e API specs via prompts.
4. QA de conteúdo: criar roteiro de revisão de documentação com o agente.

## 5. Exemplos de prompts (ideal para skill)
- "Liste 10 APIs REST para o módulo de processos, com rotas, verbos, parâmetros e respostas".
- "Gere teste de aceitação BDD para Home Operacional do Advogado".
- "Crie regra de auditoria para acesso a documentos sensíveis".

## 6. Uso de ferramentas internas de workspace
- `search` no Copilot para encontrar padrões existentes.
- `create_file`/`replace_string_in_file` para aplicar de forma programática no repositório.
- `semantic_search` para reforçar com dados do código fonte quando houver back-end implementado.

## 7. Referência prática
- Centralize prompts e atalhos em `docs-juridico/.obsidian/`, se quiser usar com vscode-obsidian plugin.
- Faça versão de “template de sprint” dentro de `docs-juridico/`, com tarefas perfiladas (MVP/phi). 
