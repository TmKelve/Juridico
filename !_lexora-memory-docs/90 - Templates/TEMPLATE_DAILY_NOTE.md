---
tipo: template
status: template
projeto: lexora
criado_em: 2026-05-29
escopo: memoria-oficial
---

# TEMPLATE — Nota Diária

> Use este template para registrar o trabalho diário, decisões tomadas e pendências geradas em cada sessão.
> Copie este arquivo, renomeie seguindo o padrão `DAILY_YYYY-MM-DD.md` e salve em `00 - Inbox` ou pasta temática.
> Itens relevantes desta nota devem ser promovidos para as pastas definitivas ao final da sessão.

---

## Frontmatter para Notas Diárias

```yaml
---
tipo: daily-note
status: draft
projeto: lexora
data: YYYY-MM-DD
sessao: definir
foco: definir
relacionado_a:
  - '[[00_START_HERE]]'
---
```

---

# Daily Note — YYYY-MM-DD

## Foco do Dia

O que era o objetivo principal desta sessão de trabalho?

---

## Resumo Operacional

O que foi feito nesta sessão? Breve narrativa do que aconteceu.

---

## Decisões Tomadas

Liste as decisões relevantes tomadas durante a sessão:

1. Decisão 1 — contexto e justificativa
2. Decisão 2 — contexto e justificativa

> [!note] Promoção de decisões
> Decisões estruturais devem ser promovidas para um ADR em `10 - Decisoes ADR`.

---

## Arquivos Analisados

| Arquivo / Pasta | O que foi observado |
|---|---|
| | |

---

## Prompts Usados

Links para os prompts registrados nesta sessão:

- [[PROMPT_XXX_TITULO]]

---

## Pendências

- [ ] Pendência 1
- [ ] Pendência 2

> [!note] Promoção de pendências
> Pendências relevantes devem ser promovidas para um item em `13 - Backlog`.

---

## Riscos Identificados

| Risco identificado | Impacto | Encaminhamento |
|---|---|---|
| | | |

---

## Atualizações Necessárias na Memória Oficial

O que precisa ser atualizado ou criado como resultado desta sessão:

- [ ] (documento ou pasta)

---

## Itens que Precisam Virar ADR

| Decisão | Por que precisa de ADR | Status |
|---|---|---|
| | | pendente |

---

## Itens que Precisam Atualizar Estado Atual

| Mudança identificada | Documento a atualizar |
|---|---|
| | `02 - Estado Atual/...` |

---

## Próximos Passos

O que deve ser feito na próxima sessão:

1. Passo 1
2. Passo 2

---

## Links Relacionados

- [[00_START_HERE]]
- (outros documentos criados ou consultados nesta sessão)
