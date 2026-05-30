---
tipo: template
status: template
projeto: lexora
criado_em: 2026-05-29
escopo: memoria-oficial
---

# TEMPLATE — Architecture Decision Record (ADR)

> Use este template para registrar decisões estruturais do projeto Lexora.
> Copie este arquivo, renomeie seguindo o padrão `ADR_XXX_TITULO_STATUS_DATA.md` e preencha cada seção.
> Salve em `10 - Decisoes ADR`.

---

## Frontmatter para documentos ADR

```yaml
---
tipo: adr
status: proposed
projeto: lexora
criado_em: YYYY-MM-DD
atualizado_em: YYYY-MM-DD
responsavel: definir
substitui: ~
substituido_por: ~
relacionado_a:
  - '[[00_START_HERE]]'
---
```

> Valores de status permitidos: `proposed`, `accepted`, `current`, `superseded`, `deprecated`, `rejected`

---

# ADR_XXX — Título da Decisão

## Status

`proposed`

> Altere para `accepted` após validação. Se for substituído por outro ADR, use `superseded` e preencha `Substituída por`.

---

## Data

YYYY-MM-DD

---

## Responsável

Nome ou papel do responsável pela decisão.

---

## Escopo

Qual área, módulo, processo ou sistema esta decisão afeta.

---

## Contexto

Descreva a situação que tornou esta decisão necessária. Qual é o estado atual? Quais forças ou restrições existem?

---

## Problema

Qual é a questão central que esta decisão precisa responder? Formule como pergunta quando possível.

---

## Decisão

Descreva a decisão tomada de forma clara e objetiva. Use linguagem declarativa: *"Decidimos que..."*

---

## Alternativas Consideradas

| Alternativa | Motivo de rejeição |
|---|---|
| Alternativa A | |
| Alternativa B | |

---

## Consequências Positivas

- Consequência positiva 1
- Consequência positiva 2

---

## Consequências Negativas

- Consequência negativa 1
- Consequência negativa 2

---

## Impacto no Projeto

Descreva como esta decisão afeta o desenvolvimento, a arquitetura, os processos ou a equipe.

---

## Substitui

Se esta decisão substitui outra, liste aqui: [[ADR_XXX_ANTERIOR]]

---

## Substituída Por

Se esta decisão foi superada por outra, liste aqui: [[ADR_XXX_POSTERIOR]]

---

## Critérios de Revisão

Esta decisão deve ser revisada quando:

- (condição 1)
- (condição 2)

---

## Links Relacionados

- [[00_START_HERE]]
- [[KB_XXX_RELACIONADO]]
