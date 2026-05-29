# 🎨 Skill: lexora-ux-premium

> Padrões de excelência em UX/UI para o projeto Lexora.
> Consulte este arquivo ao criar ou melhorar qualquer interface, garantindo uma experiência premium, coerente e acessível.

---

## 1. Filosofia UX do Lexora

O Lexora é um **SaaS B2B jurídico** usado por profissionais que passam horas na plataforma. A UX deve:

1. **Reduzir carga cognitiva** — O advogado já lida com complexidade no trabalho. A interface deve ser óbvia.
2. **Feedback imediato** — Toda ação deve ter resposta visual em < 100ms.
3. **Consistência absoluta** — O mesmo padrão visual para a mesma funcionalidade em qualquer módulo.
4. **Estética premium** — Design que transmite confiança e profissionalismo, nunca "amador".
5. **Acessível por padrão** — WCAG 2.1 AA mínimo, sem desculpas.

---

## 2. Sistema de Feedback (substituindo alert/confirm)

### 2.1 Toast / Snackbar Global

**REGRA**: Nunca usar `alert()`, `confirm()` ou `window.prompt()`. Sempre usar o sistema de toast.

#### Implementação recomendada:
```tsx
// Criar um ToastProvider global em App.tsx
// Usar um state manager simples ou context

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  description?: string;
  duration?: number;    // ms, default 4000
  action?: {            // Ação inline (ex: Desfazer)
    label: string;
    onClick: () => void;
  };
}
```

#### Posicionamento e estilo:
```css
.toast-container {
  position: fixed;
  bottom: var(--space-6);
  right: var(--space-6);
  z-index: 50;
  display: flex;
  flex-direction: column-reverse;
  gap: var(--space-3);
  max-width: 420px;
}

.toast {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  background: var(--bg-surface);
  border: 1px solid var(--border-default);
  box-shadow: var(--shadow-lg);
  animation: toast-enter 0.3s cubic-bezier(0.21, 1.02, 0.73, 1) forwards;
}

.toast--success { border-left: 3px solid var(--success-600); }
.toast--error   { border-left: 3px solid var(--error-600);   }
.toast--warning { border-left: 3px solid var(--warning-600); }
.toast--info    { border-left: 3px solid var(--info-600);    }

@keyframes toast-enter {
  from { opacity: 0; transform: translateX(100%); }
  to   { opacity: 1; transform: translateX(0); }
}

@keyframes toast-exit {
  from { opacity: 1; transform: translateX(0); }
  to   { opacity: 0; transform: translateX(100%); }
}
```

#### Quando usar cada tipo:
| Tipo | Quando | Duração | Exemplo |
|---|---|---|---|
| `success` | Ação completada | 4s | "Prazo salvo com sucesso" |
| `error` | Falha em ação | 8s (manual dismiss) | "Erro ao salvar. Tente novamente." |
| `warning` | Ação com risco | 6s | "Prazo atrasado será notificado" |
| `info` | Informação contextual | 4s | "3 publicações novas" |

### 2.2 Diálogo de Confirmação

**Para ações destrutivas**, substituir `confirm()` por Dialog customizado:

```tsx
// Padrão de confirmação
<ConfirmDialog
  open={showConfirm}
  title="Excluir prazo?"
  description="Esta ação não pode ser desfeita. O prazo #105 será removido permanentemente."
  variant="destructive"     // destaca botão em vermelho
  confirmLabel="Sim, excluir"
  cancelLabel="Cancelar"
  onConfirm={handleDelete}
  onCancel={() => setShowConfirm(false)}
/>
```

#### Regras de confirmação:
- **Sempre confirmar**: Exclusão, cancelamento, envio irreversível
- **Nunca confirmar**: Salvar, editar, filtrar, navegar
- **Descrição clara**: Dizer exatamente O QUE será afetado
- **Botão destrutivo à direita**, cancelar à esquerda
- **Foco automático no "Cancelar"** (ação segura)

---

## 3. Loading States

### 3.1 Skeleton Screens

**REGRA**: Nunca mostrar apenas texto "Carregando...". Sempre usar skeleton que espelha o layout final.

```css
/* Classe base de skeleton */
.skeleton {
  background: linear-gradient(
    90deg,
    var(--neutral-100) 0%,
    var(--neutral-200) 50%,
    var(--neutral-100) 100%
  );
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s ease-in-out infinite;
  border-radius: var(--radius-md);
}

@keyframes skeleton-shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Variantes */
.skeleton--text     { height: 14px; width: 60%; }
.skeleton--title    { height: 24px; width: 40%; }
.skeleton--avatar   { height: 40px; width: 40px; border-radius: var(--radius-full); }
.skeleton--card     { height: 120px; width: 100%; border-radius: var(--radius-xl); }
.skeleton--row      { height: 48px; width: 100%; }
.skeleton--badge    { height: 22px; width: 80px; border-radius: var(--radius-full); }
.skeleton--button   { height: 40px; width: 120px; border-radius: var(--radius-lg); }
```

#### Skeleton por contexto:
| Contexto | Skeleton |
|---|---|
| KPI card | Retângulo card + circle (ícone) + 2 linhas (texto) |
| Tabela | Header (1 row) + 5 body rows com colunas proporcionais |
| Lista de cards | 3 cards empilhados com shimmer |
| Formulário | Labels + inputs com widths variados |
| Badge | Pill pequeno com shimmer |

### 3.2 Loading Inline (para botões e ações)

```tsx
// Botão com loading
<button disabled={loading} className="btn-primary">
  {loading ? (
    <>
      <Loader2 className="spin" size={16} aria-hidden="true" />
      <span>Salvando...</span>
    </>
  ) : (
    'Salvar prazo'
  )}
</button>
```

```css
.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
```

### 3.3 Progress Bar (para operações longas)

```css
.progress-bar {
  width: 100%;
  height: 4px;
  background: var(--neutral-100);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.progress-bar__fill {
  height: 100%;
  background: var(--action-primary);
  border-radius: var(--radius-full);
  transition: width 0.3s ease;
}

/* Variante indeterminada */
.progress-bar--indeterminate .progress-bar__fill {
  width: 40%;
  animation: progress-indeterminate 1.5s ease-in-out infinite;
}

@keyframes progress-indeterminate {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(350%); }
}
```

---

## 4. Empty States

### Regras
- **Sempre**: Ícone relevante + título + descrição + CTA (quando aplicável)
- **Diferenciar**: "Sem dados" vs "Sem resultados de filtro"
- **Tom**: Positivo e guiador, nunca culpar o usuário

### Padrão
```tsx
<EmptyState
  icon={<FileText size={48} />}
  title="Nenhum documento encontrado"
  description="Comece adicionando documentos ao processo para acompanhar a evolução."
  actionLabel="Adicionar documento"
  onAction={() => setShowUpload(true)}
/>

// Variante de filtro vazio
<EmptyState
  icon={<Search size={48} />}
  title="Nenhum resultado"
  description="Tente ajustar os filtros ou limpar a busca."
  actionLabel="Limpar filtros"
  onAction={handleClearFilters}
/>
```

```css
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: var(--space-12) var(--space-6);
  color: var(--text-muted);
}

.empty-state__icon {
  color: var(--neutral-300);
  margin-bottom: var(--space-4);
}

.empty-state__title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--text-secondary);
  margin-bottom: var(--space-2);
}

.empty-state__description {
  font-size: var(--font-size-sm);
  max-width: 360px;
  margin-bottom: var(--space-6);
}
```

---

## 5. Micro-Animações

### 5.1 Princípios
- **Sutil**: Nunca distrair, apenas guiar o olhar
- **Rápido**: 150-300ms para transições, 200-500ms para animações
- **Respeitar preferências**: `prefers-reduced-motion: reduce` → sem animações

```css
/* Base: respeitar reduced-motion */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### 5.2 Catálogo de Animações

#### Entrada de elementos
```css
/* Fade in + slide up (para cards, itens de lista) */
@keyframes entrance-up {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

.animate-entrance {
  animation: entrance-up 0.3s cubic-bezier(0.21, 1.02, 0.73, 1) forwards;
}

/* Stagger: cada item entra com delay incremental */
.animate-entrance:nth-child(1) { animation-delay: 0ms; }
.animate-entrance:nth-child(2) { animation-delay: 50ms; }
.animate-entrance:nth-child(3) { animation-delay: 100ms; }
.animate-entrance:nth-child(4) { animation-delay: 150ms; }
.animate-entrance:nth-child(5) { animation-delay: 200ms; }
```

#### Hover em cards
```css
.interactive-card {
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}

.interactive-card:hover {
  box-shadow: var(--shadow-card-hover);
  transform: translateY(-2px);
}

.interactive-card:active {
  transform: translateY(0);
  box-shadow: var(--shadow-card);
}
```

#### Transição de conteúdo (ao trocar tabs, filtros)
```css
@keyframes content-fade {
  from { opacity: 0; }
  to   { opacity: 1; }
}

.content-transition {
  animation: content-fade 0.2s ease forwards;
}
```

#### Pulse (para itens que requerem atenção)
```css
@keyframes attention-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.3); }
  50%      { box-shadow: 0 0 0 6px rgba(220, 38, 38, 0); }
}

.requires-attention {
  animation: attention-pulse 2s ease-in-out infinite;
}
```

---

## 6. Formulários Inteligentes

### 6.1 Validação em Tempo Real

```tsx
// Padrão de validação por campo
const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

function validateField(name: string, value: string) {
  const errors = { ...fieldErrors };

  switch (name) {
    case 'email':
      if (!value) errors.email = 'Email é obrigatório';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) errors.email = 'Email inválido';
      else delete errors.email;
      break;
    case 'dueDate':
      if (!value) errors.dueDate = 'Data é obrigatória';
      else if (new Date(value) < new Date()) errors.dueDate = 'Data deve ser futura';
      else delete errors.dueDate;
      break;
  }

  setFieldErrors(errors);
}
```

### 6.2 Campo com Erro
```css
.form-field { margin-bottom: var(--space-4); }

.form-field__label {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  margin-bottom: var(--space-2);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}

.form-field__label--required::after {
  content: '*';
  color: var(--error-600);
}

.form-field__error {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  margin-top: var(--space-1);
  font-size: var(--font-size-xs);
  color: var(--error-600);
}

.form-field__hint {
  margin-top: var(--space-1);
  font-size: var(--font-size-xs);
  color: var(--text-muted);
}
```

### 6.3 Input Masks (CPF, Telefone, Processo)
```tsx
// Padrões de máscara
const masks = {
  cpf:      '###.###.###-##',
  cnpj:     '##.###.###/####-##',
  phone:    '(##) #####-####',
  process:  '#######-##.####.#.##.####',
  currency: 'R$ #.###,##',
};
```

---

## 7. Navegação e Wayfinding

### 7.1 Breadcrumbs
```tsx
<nav aria-label="Breadcrumb" className="breadcrumb">
  <ol>
    <li><a href="/processos">Processos</a></li>
    <li aria-current="page">Reclamatória Trabalhista - Cliente Atlas</li>
  </ol>
</nav>
```

```css
.breadcrumb ol {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  list-style: none;
  padding: 0;
  margin: 0;
  font-size: var(--font-size-sm);
}

.breadcrumb li + li::before {
  content: '/';
  color: var(--text-muted);
  margin-right: var(--space-2);
}

.breadcrumb a {
  color: var(--text-muted);
  text-decoration: none;
}

.breadcrumb a:hover {
  color: var(--action-primary);
}

.breadcrumb [aria-current="page"] {
  color: var(--text-primary);
  font-weight: var(--font-weight-medium);
}
```

### 7.2 Command Palette (Cmd+K / Ctrl+K)
```tsx
// Funcionalidades do command palette:
// 1. Navegar para qualquer página
// 2. Buscar processos, clientes, prazos
// 3. Executar ações rápidas (novo processo, novo prazo)
// 4. Histórico de buscas recentes

// Atalhos de teclado globais:
// Cmd+K      → Abrir command palette
// Cmd+N      → Novo (contexto da página)
// Cmd+S      → Salvar (quando em formulário)
// Escape     → Fechar modal/drawer/palette
// ?          → Mostrar atalhos disponíveis
```

---

## 8. Dark Mode

### Estratégia com tokens existentes:
```css
/* Adicionar ao tokens.css */
@media (prefers-color-scheme: dark) {
  :root {
    --bg-page: var(--neutral-950);
    --bg-surface: var(--neutral-900);
    --bg-subtle: var(--neutral-800);

    --text-primary: var(--neutral-100);
    --text-secondary: var(--neutral-300);
    --text-muted: var(--neutral-500);

    --border-default: var(--neutral-700);
    --border-strong: var(--neutral-600);

    --shadow-card: 0 1px 3px rgba(0, 0, 0, 0.3);
    --shadow-card-hover: 0 10px 24px rgba(0, 0, 0, 0.4);
  }
}

/* Ou com classe para toggle manual */
[data-theme="dark"] {
  /* mesmos overrides acima */
}
```

---

## 9. Debounce e Performance

### Search com debounce
```tsx
// Debounce de 300ms no input de busca
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// Uso
const [query, setQuery] = useState('');
const debouncedQuery = useDebounce(query, 300);

useEffect(() => {
  if (debouncedQuery) fetchResults(debouncedQuery);
}, [debouncedQuery]);
```

### Error Boundary
```tsx
// Adicionar ErrorBoundary em App.tsx para capturar erros de renderização
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    captureException(error, { componentStack: info.componentStack });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-fallback">
          <AlertTriangle size={48} />
          <h2>Algo deu errado</h2>
          <p>Tente recarregar a página ou voltar ao início.</p>
          <button onClick={() => window.location.reload()} className="btn-primary">
            Recarregar página
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

---

## 10. Checklist de Qualidade UX

Antes de concluir qualquer alteração de UI, verificar:

### Funcional
- [ ] Toast para feedback de sucesso/erro (nunca alert)
- [ ] Loading skeleton enquanto dados carregam
- [ ] Empty state adequado (com/sem dados vs com/sem resultados de filtro)
- [ ] Confirmação para ações destrutivas (Dialog, nunca confirm())
- [ ] Debounce em inputs de busca (300ms)
- [ ] Error boundary envolvendo o componente

### Visual
- [ ] Usa tokens de design (cores, espaçamentos, tipografia)
- [ ] Hover states em elementos clicáveis
- [ ] Micro-animações de entrada (cards, itens de lista)
- [ ] Responsivo em 768px e 1024px no mínimo
- [ ] Tabelas com layout de cards em mobile

### Acessibilidade
- [ ] `aria-label` em botões com ícone
- [ ] `aria-hidden="true"` em ícones decorativos
- [ ] `role` semântico em elementos customizados
- [ ] `aria-live` em regiões com conteúdo dinâmico
- [ ] `prefers-reduced-motion` respeita preferência do usuário
- [ ] Contraste WCAG AA em todas as combinações

### Consistência
- [ ] Mesmo padrão de badge/status usado em todo o projeto
- [ ] Mesmo padrão de filtros (FilterBar)
- [ ] Mesmo padrão de paginação
- [ ] Alinhado com lexora-design-system tokens
