---
tipo: template
status: template
projeto: lexora
criado_em: 2026-05-29
escopo: memoria-oficial
---

# TEMPLATE — Análise Técnica

> Use este template para registrar análises técnicas de módulos, arquivos, serviços ou decisões de implementação.
> Copie este arquivo, renomeie seguindo o padrão `AT_XXX_TITULO_STATUS_DATA.md` e salve na pasta temática relevante.

---

## Frontmatter para documentos de Análise Técnica

```yaml
---
tipo: analise-tecnica
status: draft
projeto: lexora
criado_em: YYYY-MM-DD
atualizado_em: YYYY-MM-DD
responsavel: definir
modulo: definir
fonte_principal: codigo-atual
relacionado_a:
  - '[[00_START_HERE]]'
---
```

---

# Análise Técnica — Título

## Objetivo da Análise

O que esta análise busca responder ou documentar.

---

## Escopo

Quais módulos, arquivos ou funcionalidades estão no escopo desta análise. Descreva também o que está **fora do escopo**.

---

## Arquivos Analisados

Liste os arquivos ou pastas que foram diretamente lidos ou inspecionados:

```
backend/src/...
frontend/src/...
```

---

## Método de Verificação

Como a análise foi conduzida:

- [ ] Leitura direta do código-fonte
- [ ] Execução e observação do comportamento
- [ ] Análise de logs
- [ ] Comparação com documentação existente
- [ ] Outros: (descrever)

---

## Estrutura Identificada

Descreva a estrutura encontrada no código — módulos, camadas, padrões, convenções.

---

## Tecnologias Encontradas

| Tecnologia | Versão | Uso no módulo |
|---|---|---|
| | | |

---

## Dependências

| Dependência | Tipo | Impacto |
|---|---|---|
| | interna/externa | |

---

## Evidências Encontradas

Links para evidências concretas que sustentam as conclusões:

- (arquivo:linha ou screenshot ou log)

---

## Riscos Técnicos

| Risco | Impacto | Probabilidade | Mitigação |
|---|---|---|---|
| | Alto/Médio/Baixo | Alta/Média/Baixa | |

---

## Recomendações

Lista de recomendações objetivas baseadas nos achados desta análise.

1. Recomendação 1
2. Recomendação 2

---

## Pontos a Validar

> [!warning] Itens não confirmados — requerem validação
> - Ponto 1
> - Ponto 2

---

## Limitações da Análise

O que não foi verificado ou o que pode ter ficado fora do escopo desta análise.

---

## Encaminhamentos

| Ação | Tipo | Destino |
|---|---|---|
| (descrever) | ADR / Backlog / Estado Atual / KB | (pasta ou documento) |

---

## Referências Internas

- [[00_START_HERE]]
- [[KB_XXX_RELACIONADO]]
