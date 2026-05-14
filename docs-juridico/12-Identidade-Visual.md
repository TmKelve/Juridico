# Identidade Visual — Lexora

## 1. Posicionamento visual

**Lexora** é uma plataforma profissional de gestão jurídica moderna.

A identidade visual comunica:
- **Confiança**: visual estável, elegante, sem exagero decorativo
- **Clareza**: interface limpa, hierarquia forte, pouca ambiguidade visual
- **Eficiência sóbria**: aparência premium, orientada à operação, não a enfeite
- **Institucional contemporâneo**: jurídico sem cara de escritório antigo
- **Tecnologia discreta**: moderna, mas sem estética de fintech genérica

### Princípios visuais
- Blocos bem estruturados
- Contraste controlado
- Tipografia limpa
- Poucos acentos de cor
- Ícones simples
- Superfícies claras com pontos de peso escuro
- Informação primeiro, decoração depois

---

## 2. Naming e marca

| Item | Valor | Status |
|---|---|---|
| Nome do produto | **Lexora** | ✓ Aprovado |
| Logo | Símbolo geométrico em linha escura + wordmark | ✓ Aprovado (direção visual) |
| Ícone da aplicação | Símbolo solo para favicon, app icon, avatar | ✓ Aprovado |
| Pacote de arquivos | `/lexora_brand_package/` | ✓ Completo (SVG, PNG, favicon, app icons) |

### Leitura e comunicação da marca

O símbolo escolhido comunica bem:
- **Estrutura**: blocos geométricos bem arrumados
- **Fluxo**: movimento ordenado, não caótico
- **Organização**: sistema jurídico moderno
- **Inteligência operacional**: mais sistema do que clichê de balança/martelo

Ele não cai no clichê literal de símbolo jurídico. Parece um sistema jurídico moderno.

### Recomendação de uso
- Usar **símbolo + wordmark** como assinatura principal em logos e cabeçalhos
- Usar **símbolo sozinho** em favicon, app icon, avatar, sidebar compacta
- Manter **área de respiro** ao redor da marca
- **Evitar**: sombra, gradiente pesado, contorno, efeitos 3D
- Preferir: flat, linha fina, proporções claras

---

## 3. Paleta de cores

O azul do logo Lexora gira em torno de um navy sóbrio: **#223B4D** (brand-800) e **#1D3448** (brand-900).

### Tokens de marca

```css
:root {
  --brand-950: #162633;
  --brand-900: #1D3448;
  --brand-800: #223B4D;
  --brand-700: #2E4B63;
  --brand-600: #3C607D;
  --brand-500: #4C789A;
  --brand-400: #6A97BA;
  --brand-300: #95BAD4;
  --brand-200: #C5D9E8;
  --brand-100: #E8F0F6;
  --brand-50:  #F5F8FB;
}
```

### Tokens de neutros

```css
:root {
  --neutral-950: #0F1720;
  --neutral-900: #17212B;
  --neutral-800: #25313D;
  --neutral-700: #3A4754;
  --neutral-600: #556270;
  --neutral-500: #73808E;
  --neutral-400: #97A3AF;
  --neutral-300: #C2CAD2;
  --neutral-200: #DDE3E8;
  --neutral-100: #EDF1F4;
  --neutral-50:  #F7F9FB;
  --white: #FFFFFF;
}
```

### Tokens semânticos

```css
:root {
  --success-700: #166534;
  --success-600: #15803D;
  --success-100: #DCFCE7;

  --warning-700: #B45309;
  --warning-600: #D97706;
  --warning-100: #FEF3C7;

  --error-700: #B91C1C;
  --error-600: #DC2626;
  --error-100: #FEE2E2;

  --info-700: #1D4ED8;
  --info-600: #2563EB;
  --info-100: #DBEAFE;
}
```

### Tokens funcionais

```css
:root {
  --bg-page: var(--neutral-50);
  --bg-surface: var(--white);
  --bg-subtle: var(--neutral-100);

  --text-primary: var(--neutral-900);
  --text-secondary: var(--neutral-700);
  --text-muted: var(--neutral-500);
  --text-inverse: var(--white);

  --border-default: var(--neutral-200);
  --border-strong: var(--neutral-300);

  --action-primary: var(--brand-800);
  --action-primary-hover: var(--brand-900);
  --action-secondary: var(--neutral-100);
  --action-secondary-hover: var(--neutral-200);

  --focus-ring: #6A97BA;
}
```

### Regra de uso da cor

- **Azul da marca** para ações principais, navegação ativa e destaques de confiança
- **Neutros** para estrutura da interface
- **Semânticas** só quando houver significado real (não como decoração)
- Evitar usar success, warning e error como decoração

---

## 4. Tipografia

### Stack de fonte recomendada

```css
font-family:
  ui-sans-serif,
  system-ui,
  -apple-system,
  BlinkMacSystemFont,
  "Segoe UI",
  Roboto,
  "Helvetica Neue",
  Arial,
  sans-serif;
```

Alternativa com Inter (se desejar adicionar fonte customizada):

```css
font-family:
  Inter,
  ui-sans-serif,
  system-ui,
  -apple-system,
  BlinkMacSystemFont,
  "Segoe UI",
  Roboto,
  "Helvetica Neue",
  Arial,
  sans-serif;
```

### Escala tipográfica

```css
--font-size-xs:   12px;
--font-size-sm:   14px;
--font-size-md:   16px;
--font-size-lg:   18px;
--font-size-xl:   20px;
--font-size-2xl:  24px;
--font-size-3xl:  30px;
--font-size-4xl:  36px;
```

### Pesos de fonte

```css
--font-weight-regular:   400;
--font-weight-medium:    500;
--font-weight-semibold:  600;
--font-weight-bold:      700;
```

### Line-heights

```css
--line-height-tight:   1.2;
--line-height-normal:  1.5;
--line-height-relaxed: 1.65;
```

### Regras de uso

| Nivel | Uso | Tamanho | Peso |
|---|---|---|---|
| H1 | Páginas principais e dashboards executivos | 2xl–4xl | bold (700) |
| H2 | Seções internas | 2xl–3xl | semibold (600) |
| H3 | Cards, tabelas, blocos de detalhe | xl–2xl | semibold (600) |
| Body | Texto padrão | md | regular (400) |
| Body small | Tabelas, metadados e apoio | sm | regular (400) |
| Caption | Labels auxiliares, timestamps, status menores | xs | regular/medium (400–500) |

### Regras de consistência

- Evitar texto pequeno demais em áreas críticas
- Usar semibold para títulos de bloco
- Evitar bold excessivo em tabelas
- Line-height confortável, especialmente em leitura jurídica

---

## 5. Espaçamento e layout

### Escala de espaço (múltiplos de 4)

```css
--space-1:   4px;
--space-2:   8px;
--space-3:   12px;
--space-4:   16px;
--space-5:   20px;
--space-6:   24px;
--space-8:   32px;
--space-10:  40px;
--space-12:  48px;
--space-16:  64px;
```

### Grid

- **Desktop**: 12 colunas
- **Gap padrão**: 24px
- **Cards internos**: gap entre 16px e 24px
- **Padding lateral de páginas**: 24px a 32px

### Breakpoints

```css
--bp-sm:   640px;
--bp-md:   768px;
--bp-lg:   1024px;
--bp-xl:   1280px;
--bp-2xl:  1440px;
```

### Regras de layout

- **Dashboard**: grid modular com blocos de tamanhos previsíveis
- **Detalhes**: coluna principal + coluna lateral de contexto
- **Tabelas**: ocupar largura total, sem esmagar conteúdo no mobile
- **Formulários**: largura média e agrupamento lógico por seção
- Evitar telas com blocos flutuando sem alinhamento

---

## 6. Componentes base

### Botão

**Variantes:**
- **Primary**: ação principal (background brand-800, texto branco)
- **Secondary**: ação neutra (background neutral-100, texto neutral-900)
- **Ghost**: ação discreta (sem fundo, hover suave)
- **Destructive**: ação crítica (background error-600, texto branco)

**Regras:**
- Altura mínima: 40px
- Padding horizontal confortável
- Border-radius moderado (6–8px)
- Foco sempre visível com ring
- Ícone opcional à esquerda
- Não usar 4 cores diferentes de botão na mesma tela sem motivo real

### Input

**Regra obrigatória:**
Todo input **deve ter `<label>` visível**. Nada de depender só de placeholder.

**Estrutura esperada:**
```html
<label for="clientName">Nome do cliente</label>
<input 
  id="clientName" 
  name="clientName" 
  type="text"
  aria-describedby="clientName-help"
/>
<p id="clientName-help">Digite o nome completo.</p>
```

**Regras:**
- Altura mínima: 40px
- Borda discreta (neutral-200)
- Fundo branco
- Foco com ring visível (var(--focus-ring))
- Erro com borda vermelha e mensagem vinculada
- Máscara e formatação apenas quando necessário

### Card

**Uso:**
- Resumo
- Agrupamento de contexto
- Indicadores
- Painéis laterais

**Regras:**
- Fundo surface (white)
- Borda sutil (neutral-200)
- Border-radius médio (8–10px)
- Sombra muito leve ou nenhuma
- Padding interno consistente (1rem)
- Título sempre claro e hierarquizado

### Tabela

**Uso:**
- Processos
- Clientes
- Prazos
- Financeiro
- Usuários

**Regras:**
- Cabeçalho visível e com background sutil
- Zebra (alternância de cores) opcional e bem sutil
- Densidade equilibrada
- Hover leve na linha (neutral-100)
- Ação por linha agrupada sem poluição visual
- Coluna fixa para ações quando necessário
- **NO MOBILE**: virar lista/cartão, nunca mini-tabela ilegível

---

## 7. Iconografia

**Recomendação: Lucide React**

Motivos:
- Visual limpo e consistente
- Moderno e leve
- Ótimo para SaaS operacional
- Traço consistente, sem preenchimento (outline)

**Regras:**
- Tamanho padrão: 16px (inline), 18px (nav), 20–24px (ações)
- Ícone acompanhado de label quando a ação não for óbvia
- Não usar ícone como única pista em ação crítica
- Não misturar múltiplas bibliotecas de ícones

---

## 8. Estados de feedback

### Loading
- Skeleton para cards, tabelas e painéis
- Spinner apenas em ação pontual (não piscante)
- Evitar tela vazia piscando

### Erro
- Mensagem clara explicando o que falhou
- Orientar próximo passo
- Botão "Tentar novamente" quando aplicável

**Exemplo:**
```
"Não foi possível carregar os processos."
[Tentar novamente]
```

### Sucesso
- Toast discreto
- Texto curto e específico
- Auto-fechar em 3 segundos

**Exemplo:**
```
✓ Processo atualizado com sucesso.
```

### Empty state
Deve sempre ter:
- Explicação do vazio
- Próxima ação sugerida

**Exemplo:**
```
Nenhum prazo encontrado para hoje.
[Criar prazo]
```

---

## 9. Acessibilidade

### Contraste
- Manter contraste **AA** no mínimo (WCAG 2.1)
- Texto principal sempre com contraste forte
- Não depender apenas de cor para indicar status

### Foco
- Todo elemento interativo precisa de foco visível
- Usar ring claro e consistente (var(--focus-ring): #6A97BA)
- Não remover outline sem substitução real

**Exemplo:**
```css
:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}
```

### aria-live
Usar para:
- Toast de sucesso
- Erro de formulário
- Carregamento concluído
- Atualização importante da interface

**Exemplo:**
```html
<div aria-live="polite"></div>
<div aria-live="assertive"></div>
```

### Outras regras
- **Label visível** em todos os inputs
- Mensagens de erro vinculadas ao campo via `aria-describedby`
- Navegação completa por teclado
- Target touch confortável (mínimo 40–48px)
- Ordem lógica de tabulação
- Headings bem hierarquizados (H1 → H2 → H3)
- Tabela com cabeçalhos reais (`<th>`)
- Modal com foco preso corretamente
- Links com texto descritivo (não "clique aqui")

---

## 10. Resumo executivo da linguagem visual

**Lexora** deve parecer:

- Confiável
- Precisa
- Organizada
- Sóbria
- Elegante sem ostentação
- Tecnológica sem parecer fria demais

O logo escolhido aponta bem nessa direção. A interface precisa seguir essa mesma lógica: **menos ruído, mais estrutura**.

---

## 11. O que não fazer

| ❌ Não fazer | Impacto visual |
|---|---|
| Usar sombras pesadas em elementos funcionais | Poluição, distração |
| Usar fontes decorativas ou display | Menos profissional |
| Misturar dois azuis diferentes sem token definido | Inconsistência |
| Usar gradientes coloridos em superfícies de conteúdo | Polui hierarquia |
| Ocultar labels, depender só de placeholder | Acessibilidade, confusão |
| Exibir credenciais de teste em tela em produção | Segurança, aparência amadora |
| Usar cores semânticas (success/warning/error) como decoração | Confunde significado |
| Manter CSS legado do scaffold Vite | Manutenção, confusão |

---

## 12. Status do sistema de marca Lexora

### ✓ Aprovado como direção

- Posicionamento visual (confiança, clareza, eficiência sóbria)
- Linguagem institucional contemporânea
- Logo em linha geométrica escura (estrutura + fluxo + organização)
- Tom sóbrio e confiável
- Paleta de cores completa (brand, neutros, semânticas, funcionais)
- Tipografia (system font stack como baseline)
- Espaçamento e layout (escala em múltiplos de 4)
- Componentes base (botão, input, card, tabela)
- Regras de acessibilidade

### 📦 Entregáveis do pacote Lexora

**Localização:** `C:\Users\tomke\app Juridico\lexora_brand_package\lexora_brand_package\`

| Tipo | Conteúdo |
|---|---|
| SVG | Logo primária + branca, ícone primário + branco |
| PNG alta resolução | Logo e ícone em transparente, versão dark-background |
| Favicon | Série completa (ico, 16x16, 32x32, 48x48, apple-touch, android) |
| App icons | Quadrados em 1024, 512, 256 px (primária, branca, navy background) |
| Previews | Fundo claro, fundo escuro, ícone quadrado |

### 📝 Pendente

| # | Decisão | Responsável | Nota |
|---|---|---|---|
| D1 | Refinamento final do wordmark (proporção/espaçamento) | Design | Visual já aprovado |
| D2 | Adotar Lucide React ou manter sem ícones por ora | Dev | Sprint atual |
| D3 | Criar `tokens.css` ou manter em `App.css` | Dev | Sprint atual |
| D4 | Implementar tokens semânticos (sucesso, warning, info) no CSS | Dev | Sprint atual |
| D5 | Documentação de componentes em Storybook ou similar | Dev | Fase 2 |
| D6 | Fonte customizada (Inter) ou manter system-font | Dev/Design | Fase 2 |

---

## 13. Próximos passos para implementação

1. **Criar `frontend/src/tokens.css`** com todos os tokens de cor, tipografia, espaçamento
2. **Integrar SVGs da marca** (logo, ícone) no frontend
3. **Substituir favicon e app icons** com os da pasta lexora_brand_package
4. **Atualizar App.css** para usar tokens (remover hardcodes de cor, substituir classes legacy)
5. **Implementar P1–P4** da revisão de design da tela de login (labels, feedback de erro, ocultar credenciais, estado loading)
6. **Testar contraste** com ferramentas de acessibilidade
