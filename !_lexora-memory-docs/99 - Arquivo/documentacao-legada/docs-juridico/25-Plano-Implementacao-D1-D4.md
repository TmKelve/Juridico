# 🔧 Plano Implementação Dashboard v1.2 (D1-D4)

**Status:** Pronto para implementação  
**Estimativa:** 9h total  
**Prioridade:** M1 (Important) + M2 (Nice-to-have)

---

## **D1: Trocar Emojis por FeatherIcons** ⭐ CRÍTICO

### Problema
- Emojis são "burros" (não setam cor, tamanho dinâmico)
- Aparência não-profissional para SaaS jurídico
- Sem acessibilidade (screen reader fala "emoji")

### Solução
Usar `react-feather` (lightweight, sem dependência SVG)

### Implementação

#### 1. Instalar dependência
```bash
npm install react-feather feather-icons
```

#### 2. Atualizar Dashboard.tsx

**Antes:**
```tsx
<div className="dashboard-header">
  <h1>👤 {user?.email}</h1>
  <button onClick={handleRefresh}>🔄 Atualizar</button>
</div>

const profileCards: Record<string, Card[]> = {
  ADM: [
    { label: 'Usuários Ativos', value: '12', icon: '👥', color: 'primary' },
    { label: 'Processos em Aberto', value: '48', icon: '⚖️', color: 'success' },
    { label: 'Tarefas Atrasadas', value: '3', icon: '⏰', color: 'warning' },
    { label: 'Receita Mês', value: 'R$ 45.200', icon: '💰', color: 'success' },
  ],
  // ...
}
```

**Depois:**
```tsx
import { User, RefreshCw, Users, Scale, Clock, DollarSign, Home, CheckSquare, Eye, MessageSquare, Settings } from 'react-feather'

<div className="dashboard-header">
  <h1><User size={24} /> {user?.email}</h1>
  <button onClick={handleRefresh} aria-label="Atualizar dashboard">
    <RefreshCw size={20} /> Atualizar
  </button>
</div>

const profileCards: Record<string, Card[]> = {
  ADM: [
    { label: 'Usuários Ativos', value: '12', icon: Users, color: 'primary' },
    { label: 'Processos em Aberto', value: '48', icon: Scale, color: 'success' },
    { label: 'Tarefas Atrasadas', value: '3', icon: Clock, color: 'warning' },
    { label: 'Receita Mês', value: 'R$ 45.200', icon: DollarSign, color: 'success' },
  ],
  // ...
}
```

#### 3. Atualizar renderização de cards
```tsx
const CardIcon = card.icon
<div className="card-icon">
  <CardIcon size={32} color={`var(--${card.color}-600)`} />
</div>
```

#### 4. Atualizar menu items
```tsx
const menuItems = [
  { label: 'Início', icon: Home },
  { label: 'Processos', icon: Scale },
  { label: 'Equipe', icon: Users },
  { label: 'Agenda', icon: Clock },
  { label: 'Relatórios', icon: BarChart2 },
  { label: 'Navegação', icon: Compass },
  { label: 'Mensagens', icon: MessageSquare },
  { label: 'Configurações', icon: Settings },
]

menuItems.map(item => {
  const ItemIcon = item.icon
  return (
    <button key={item.label} className="menu-item">
      <ItemIcon size={20} />
      {item.label}
    </button>
  )
})
```

#### 5. Atualizar CSS (Dashboard.css)
```css
/* Icons ajustam cor + tamanho */
.dashboard-header button {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.card-icon {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-lg);
  background: rgba(34, 59, 77, 0.08); /* brand-50 */
}

.menu-item svg {
  stroke-width: 2;
  transition: transform 0.2s ease;
}

.menu-item:hover svg {
  transform: scale(1.1);
}

.status svg {
  width: 16px;
  height: 16px;
}
```

### Testes Validação
```
✅ Build passa sem erro
✅ Icons carregam com cores corretas
✅ Hover effect com scale
✅ Screen reader anúncia label (+icon size)
✅ Mobile responsível (size reduzido em tablet)
```

### Resultado
- ✅ Aparência profissional
- ✅ Tamanho dinâmico
- ✅ Cores semânticas aplicáveis
- ✅ Acessibilidade melhorada (aria-label)
- ✅ Sem dependência pesada (9KB)

**Tempo:** 2h | **Impacto:** Alto

---

## **D2: Menu Dinâmico** ✅ JÁ IMPLEMENTADO

```tsx
// Dashboard.tsx
useEffect(() => {
  const loadMenu = async () => {
    const data = await api.getHome()
    setMenuItems(data.home.menu) // Vem do backend
  }
  loadMenu()
}, [])
```

**Status:** ✅ Feito, ready para usar

---

## **D3: Paginação na Tabela** ⭐ IMPORTANTE

### Problema
- Tabela mostra apenas 5 processos
- User precisa clicar "Ver todos" para paginação completa
- Comportamento esperado: paginação na dashboard (10 itens/página)

### Solução
Adicionar paginação com navegação (prev/next/page numbers)

### Implementação

#### 1. Adicionar state
```tsx
const [processPage, setProcessPage] = useState(1)
const processesPerPage = 10
const totalProcessPages = Math.ceil(processes.length / processesPerPage)

const paginatedProcesses = processes.slice(
  (processPage - 1) * processesPerPage,
  processPage * processesPerPage
)
```

#### 2. Renderizar tabela paginada
```tsx
<table className="processes-table">
  <thead>
    <tr>
      <th>ID</th>
      <th>Título</th>
      <th>Cliente</th>
      <th>Fase</th>
      <th>Status</th>
      <th>Ações</th>
    </tr>
  </thead>
  <tbody>
    {paginatedProcesses.map(p => (
      <tr key={p.id}>
        <td>{p.id}</td>
        <td>{p.title}</td>
        <td>{p.client}</td>
        <td>{p.phase}</td>
        <td><span className={`status-${p.status}`}>{p.status}</span></td>
        <td>
          <button onClick={() => handleView(p.id)}>Ver</button>
        </td>
      </tr>
    ))}
  </tbody>
</table>
```

#### 3. Adicionar paginator
```tsx
<div className="pagination" role="navigation" aria-label="Pagination">
  <button 
    disabled={processPage === 1}
    onClick={() => setProcessPage(processPage - 1)}
    aria-label="Página anterior"
  >
    ← Anterior
  </button>

  {Array.from({ length: totalProcessPages }, (_, i) => (
    <button
      key={i + 1}
      className={processPage === i + 1 ? 'active' : ''}
      onClick={() => setProcessPage(i + 1)}
      aria-current={processPage === i + 1 ? 'page' : undefined}
    >
      {i + 1}
    </button>
  ))}

  <button 
    disabled={processPage === totalProcessPages}
    onClick={() => setProcessPage(processPage + 1)}
    aria-label="Próxima página"
  >
    Próxima →
  </button>

  <span className="pagination-info">
    Página {processPage} de {totalProcessPages}
  </span>
</div>
```

#### 4. Adicionar CSS
```css
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: var(--space-2);
  margin-top: var(--space-4);
  padding: var(--space-3) 0;
  border-top: 1px solid var(--neutral-200);
}

.pagination button {
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--brand-200);
  background: white;
  border-radius: var(--radius-base);
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s ease;
}

.pagination button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination button:hover:not(:disabled) {
  background: var(--brand-50);
  border-color: var(--brand-400);
}

.pagination button.active {
  background: var(--brand-600);
  color: white;
  border-color: var(--brand-600);
}

.pagination-info {
  font-size: 0.875rem;
  color: var(--neutral-600);
  margin-left: var(--space-4);
}

@media (max-width: 640px) {
  .pagination {
    flex-wrap: wrap;
  }

  .pagination button {
    padding: var(--space-1) var(--space-2);
    font-size: 0.75rem;
  }
}
```

### Testes Validação
```
✅ Primeira página renderiza 10 itens
✅ Botão "Anterior" desabilitado na página 1
✅ Botão "Próxima" desabilitado na última página
✅ Números de página funcionam
✅ Aria-current="page" no botão ativo
✅ Mobile: wrap em 1 item por linha
```

### Resultado
- ✅ Tabela exibe até 10 processos por página
- ✅ Navegação clara (prev/next/números)
- ✅ Acessibilidade com role + aria
- ✅ Responsive (ajusta em mobile)
- ✅ Mantém scroll position

**Tempo:** 4h | **Impacto:** Médio-Alto

---

## **D4: Timeout e Retry para Loading** 🟢 BOM-A-TER

### Problema
- Se API demora > 10s, user fica sem feedback
- Sem retry para falhas temporárias

### Solução
Adicionar timeout + retry automático

### Implementação

#### 1. Criar utilidade de timeout
```tsx
// src/utils/timeout.ts
export const withTimeout = <T,>(
  promise: Promise<T>,
  timeoutMs: number = 10000
): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
    ),
  ])
}

export const withRetry = async <T,>(
  fn: () => Promise<T>,
  retries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError
  for (let i = 0; i < retries; i++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }
  throw lastError
}
```

#### 2. Usar em Dashboard.tsx
```tsx
const handleRefresh = async () => {
  setLoading(true)
  setError(null)
  
  try {
    const [home, processes] = await Promise.all([
      withRetry(() => withTimeout(api.getHome(), 10000)),
      withRetry(() => withTimeout(api.getProcesses(), 10000)),
    ])
    
    setUser(home.user)
    setProcesses(processes.data)
    setSuccessMessage('Dashboard atualizado com sucesso')
  } catch (error) {
    setError(error.message === 'Request timeout' 
      ? 'Timeout na requisição. Verifique sua conexão.' 
      : 'Erro ao carregar dashboard'
    )
    captureException(error, { context: 'dashboard_refresh' })
  } finally {
    setLoading(false)
  }
}
```

#### 3. Adicionar feedback visual
```tsx
{loading && (
  <div className="loading-state" role="status" aria-live="polite">
    <Loader className="spinner" />
    <p>Carregando página{timeout && ` (${timeout}s...)`}</p>
  </div>
)}

{error && (
  <div className="alert alert-error" role="alert" aria-live="assertive">
    {error}
    <button onClick={handleRefresh}>Tentar novamente</button>
  </div>
)}
```

#### 4. Adicionar CSS
```css
.loading-state {
  text-align: center;
  padding: var(--space-8);
}

.spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.alert-error {
  background: var(--error-50);
  border: 1px solid var(--error-300);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  margin-bottom: var(--space-4);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.alert-error button {
  background: var(--error-600);
  color: white;
  padding: var(--space-2) var(--space-3);
  border: none;
  border-radius: var(--radius-base);
  cursor: pointer;
}
```

### Testes Validação
```
✅ Requisição completa em < 1s (sucesso)
✅ Timeout disparado após 10s
✅ Retry automático 3x com delay 1s
✅ Mensagem "timeout" em erro de conexão
✅ Botão "Tentar novamente" funciona
✅ Spinner para visual feedback
```

### Resultado
- ✅ Melhor UX com timeout
- ✅ Retry automático para flutua temporárias
- ✅ Feedback claro ao user
- ✅ Acessibilidade (role + aria-live)
- ✅ Analytics tracking de erros

**Tempo:** 2h | **Impacto:** Médio

---

## **Roadmap de Implementação**

### **Sprint 1 (Essa semana)** 
```
[ D1 ] Trocar emojis → FeatherIcons         [ 2h ]
[ D3 ] Adicionar paginação na tabela        [ 4h ]
[ D4 ] Timeout + Retry                      [ 2h ]
────────────────────────────────────────────────
       Total: 8h = 1 dia (full-time)
```

### **Sprint 2 (Próxima semana)**
```
[ D5 ] Conectar dados reais (API)           [ 4h ]
[ D6 ] Adicionar gráficos (Recharts)        [ 6h ]
[ D7 ] Dark mode                            [ 3h ]
────────────────────────────────────────────────
       Total: 13h = 2 dias (full-time)
```

---

## **Checklist de Conclusão**

```
Antes de merge:
☐ npm run lint → 0 errors, 0 warnings
☐ npm run build → 0 errors
☐ npm run dev → Funciona em localhost:5173
☐ Teste manual: Desktop 1920x1080
☐ Teste manual: Tablet 768x1024
☐ Teste manual: Mobile 375x812
☐ Acessibilidade: Tab order correto
☐ Screen reader: Todos elementos anunciados
☐ Performance: Lighthouse > 90
☐ Analytics: Events rastreados (trackEvent)
☐ Documentação: README atualizado

Git:
☐ git add .
☐ git commit -m "feat(dashboard): D1/D3/D4 implementation"
☐ git push origin feature/dashboard-improvements
☐ PR criado + revisado
☐ 2 approvals antes de merge
```

---

**Próxima Ação:** Iniciar implementação com [D1-FeatherIcons](./25-D1-FeatherIcons.md) (2h = hoje)

