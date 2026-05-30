---
tipo: template
status: template
projeto: lexora
criado_em: 2026-05-29
escopo: memoria-oficial
---

# TEMPLATE — Análise UX/UI

> Use este template para registrar análises de telas, módulos e experiências do usuário.
> Copie este arquivo, renomeie seguindo o padrão `UX_XXX_TITULO_STATUS_DATA.md` e salve em `08 - UX UI`.

---

## Frontmatter para documentos de Análise UX/UI

```yaml
---
tipo: analise-ux-ui
status: draft
projeto: lexora
criado_em: YYYY-MM-DD
atualizado_em: YYYY-MM-DD
responsavel: definir
tela: definir
perfil_afetado: definir
fonte_principal: observacao-direta
relacionado_a:
  - '[[00_START_HERE]]'
---
```

---

# Análise UX/UI — Tela ou Módulo

## Tela ou Módulo Analisado

Nome da tela ou módulo e o caminho no sistema (ex: `/processos/detalhe`).

---

## Objetivo da Tela

Para que serve esta tela? Qual necessidade do usuário ela atende?

---

## Estado Atual Observado

Descreva o que foi observado diretamente na aplicação, com evidências. Não descreva intenções ou o que *deveria* ser — apenas o que *é*.

---

## Fluxo do Usuário

Sequência de ações que o usuário realiza nesta tela:

1. Passo 1
2. Passo 2
3. ...

---

## Hierarquia Visual

Descrição da hierarquia de elementos visuais observada: título, subárea, ações primárias, ações secundárias, informações de suporte.

---

## Componentes Encontrados

| Componente | Localização | Estado (ativo/inativo/erro) |
|---|---|---|
| | | |

---

## Problemas de UX

Para cada problema identificado:

### Problema UX-1: (título curto)

| Campo | Valor |
|---|---|
| Descrição | |
| Impacto no usuário | |
| Severidade | Crítico / Alto / Médio / Baixo |
| Evidência | (screenshot, log ou observação direta) |
| Recomendação | |

---

## Problemas de UI

Para cada problema identificado:

### Problema UI-1: (título curto)

| Campo | Valor |
|---|---|
| Descrição | |
| Impacto visual | |
| Severidade | Crítico / Alto / Médio / Baixo |
| Evidência | (screenshot ou observação direta) |
| Recomendação | |

---

## Acessibilidade

| Critério | Status | Observação |
|---|---|---|
| Contraste de cores | Aprovado/Reprovado/Não verificado | |
| Navegação por teclado | Aprovado/Reprovado/Não verificado | |
| Leitores de tela | Aprovado/Reprovado/Não verificado | |
| Tamanho de alvos de toque | Aprovado/Reprovado/Não verificado | |
| Textos alternativos | Aprovado/Reprovado/Não verificado | |

---

## Responsividade

| Breakpoint | Estado | Observação |
|---|---|---|
| Desktop (>1024px) | | |
| Tablet (768px) | | |
| Mobile (640px) | | |

---

## Evidências Visuais

Links para screenshots ou gravações relacionadas a esta análise:

- (caminho relativo no vault ou path do projeto)

---

## Recomendações Consolidadas

Lista priorizada de melhorias recomendadas:

| Prioridade | Recomendação | Impacto estimado |
|---|---|---|
| P1 | | |
| P2 | | |
| P3 | | |

---

## Pontos a Validar

> [!warning] Itens não confirmados — requerem validação
> - Ponto 1
> - Ponto 2

---

## Encaminhamentos

| Ação | Tipo | Destino |
|---|---|---|
| (descrever) | ADR / Backlog / Estado Atual / Design System | (pasta ou documento) |

---

## Referências Internas

- [[00_START_HERE]]
- [[KB_XXX_RELACIONADO]]
