---
tipo: template
status: template
projeto: lexora
criado_em: 2026-05-29
escopo: memoria-oficial
---

# TEMPLATE — Knowledge Base (KB)

> Use este template para criar novos documentos de Knowledge Base em `01 - Knowledge Base`.
> Copie este arquivo, renomeie seguindo o padrão `KB_XXX_TITULO_STATUS_DATA.md` e preencha cada seção.

---

## Frontmatter para documentos KB

```yaml
---
tipo: kb
status: draft
projeto: lexora
criado_em: YYYY-MM-DD
atualizado_em: YYYY-MM-DD
responsavel: definir
fonte_principal: definir
relacionado_a:
  - '[[00_START_HERE]]'
---
```

> Valores de status permitidos: `draft`, `review`, `current`, `deprecated`, `archived`
> Só promova para `current` após validação com o responsável pelo projeto.

---

# KB_XXX — Título do Knowledge Base

## Resumo

Descrição breve do que este documento aborda e qual problema ele responde.

---

## Status Documental

| Campo | Valor |
|---|---|
| Status atual | draft |
| Baseado em | (código, evidência, análise direta, legado validado) |
| Validado por | (nome ou "pendente") |
| Substituído por | — |

---

## Escopo

O que este documento cobre e, explicitamente, o que ele **não** cobre.

---

## Contexto

Por que este documento existe? Qual foi o gatilho para sua criação?

---

## Fontes Usadas

Liste as fontes consultadas para este KB:

- [ ] Código-fonte (pasta, arquivo ou módulo específico)
- [ ] Evidências verificadas (links internos ou paths)
- [ ] Documentos `current` do vault
- [ ] ADRs aceitos
- [ ] Legado (identificar explicitamente e não tratar como verdade)

---

## Fatos Confirmados

Liste apenas o que foi verificado diretamente — no código, em evidências ou em documentação `current`.

- Fato 1
- Fato 2

---

## Inferências

O que foi concluído a partir dos fatos, mas não verificado diretamente. Marque explicitamente como inferência.

> [!warning] Inferência — não verificado diretamente
> - Inferência 1
> - Inferência 2

---

## Decisões Relacionadas

Links para ADRs ou outras decisões que afetam este KB:

- [[ADR_XXX_TITULO]]

---

## Riscos

| Risco | Impacto | Mitigação |
|---|---|---|
| (descrever) | Alto/Médio/Baixo | (ação) |

---

## Divergências Conhecidas

Se houver conflito entre este documento e outras fontes, registre aqui em vez de escolher uma fonte arbitrariamente.

| Fonte A | Fonte B | Natureza do conflito | Encaminhamento |
|---|---|---|---|
| | | | |

---

## Próximos Passos

- [ ] Item de ação 1
- [ ] Item de ação 2

---

## Critério de Atualização

Este documento deve ser revisado quando:

- O módulo ou área descrita sofrer alteração relevante.
- Um ADR relacionado for aceito ou superseded.
- O estado real do código divergir do que está documentado aqui.

---

## Referências Internas

- [[00_START_HERE]]
- [[SETUP_001_ESTRUTURA_LEXORA_MEMORY_DOCS_CURRENT_2026-05-29]]
