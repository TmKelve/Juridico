# Migracao UI - Stack Alvo Oficial

Data: 17/05/2026  
Status: soberano para novas entregas de UI

## 1. Objetivo

Definir a stack alvo oficial da migracao de UI e as regras de convivio com o CSS legado durante a transicao.

## 2. Stack Alvo Oficial

- framework de UI: `React + TypeScript` (frontend atual)
- estilizacao: `Tailwind CSS` como camada principal
- componentes base: `shadcn/ui` (sobre `Radix UI`)
- primitives acessiveis: `Radix UI` direto quando nao houver componente adequado no `shadcn/ui`
- variacoes de produto: wrappers locais no dominio `src/components/*` para padronizar contrato visual e de comportamento
- icones: `lucide-react`

## 3. Hierarquia de Decisao de Componentes

Ordem obrigatoria:

1. usar componente de `shadcn/ui` quando atender sem regressao de UX
2. usar primitive `Radix UI` pura quando precisar controle de composicao/estado que o `shadcn` nao cobre bem
3. criar wrapper local quando:
   - houver repeticao em 2 ou mais telas
   - houver regra de dominio (ex.: badge de status juridico, tabela com acoes padrao por perfil)
   - for necessario proteger o time de breaking changes do vendor

## 4. Quando Usar Shadcn vs Radix Puro vs Wrappers Locais

### `shadcn/ui` (padrao)

Use quando:

- o componente ja existe e cobre layout + estados esperados
- precisa acelerar entrega com consistencia visual
- personalizacao necessaria e de baixo acoplamento (tokens, tamanho, variant, slots)

Evite quando:

- a customizacao exigida quebra a semantica original do componente
- o custo de override for maior que compor a primitive

### `Radix UI` puro (excecao controlada)

Use quando:

- precisa controle fino de foco, teclado, portais ou composicao avancada
- o comportamento acessivel depende de fluxo nao coberto no `shadcn`
- o componente final ainda sera encapsulado para nao vazar complexidade no app

Obrigatorio:

- documentar no PR por que o `shadcn` nao atendia
- adicionar testes de interacao de teclado/foco no fluxo critico

### Wrappers locais (padrao de produto)

Use quando:

- mesmo padrao de componente aparece de forma recorrente
- ha regras de negocio ou visual corporativo que devem ser unicas
- precisa estabilizar API interna para evitar variacao entre telas

Regra:

- wrapper local nao deve duplicar estilo de cada tela; ele centraliza contrato e estados.

## 5. Estrategia de Convivencia com CSS Legado

## 5.1 Principios

- nao bloquear entrega por refatoracao global de CSS legado
- toda nova tela/novo modulo entra no stack alvo
- telas antigas migram por fatias com risco controlado

## 5.2 Regras praticas

- proibir novo CSS global legado para funcionalidades novas
- isolar legado por escopo de tela/modulo; evitar seletores genericos
- preferir tokens utilitarios do Tailwind em vez de classes ad hoc
- quando tocar tela legada, migrar primeiro componentes de alto reuso (botao, input, modal, tabela)
- remover CSS legado morto somente com evidencias de nao uso (busca por referencia + validacao visual)

## 5.3 Criterio de saida do legado

Um modulo pode ser considerado migrado quando:

- nao depende de folha CSS global legada para layout principal
- usa componentes do stack alvo nos fluxos criticos
- passou nos criterios de pronto definidos no documento `37`

## 6. Convencoes Minimas de Implementacao

- estados obrigatorios: default, hover, foco visivel, disabled, loading, erro
- semantica HTML correta (button, input, label, table, dialog)
- navegacao por teclado preservada
- `aria-*` apenas quando necessario e coerente com o papel do elemento

## 7. Governanca

- qualquer excecao arquitetural deve ser registrada no PR
- decisoes que alterem padrao global devem atualizar este documento e o checklist de PR (`37`)

