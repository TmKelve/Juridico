# 🔧 Como Implementar O1-O3 (Otimizações da Revisão v2.0)

**Tempo estimado:** 2 horas  
**Dificuldade:** Fácil-Médio  
**Pré-requisito:** Estar familiarizado com React/TypeScript

---

## 📋 O que será feito

| O | Otimização | Arquivo | Tempo |
|---|-----------|---------|--------|
| **O1** | Migrar para `api.ts` | App.tsx | 30 min |
| **O2** | Usar `Dashboard.tsx` novo | App.tsx | 30 min |
| **O3** | Ativar `monitoring.ts` | App.tsx + main.tsx | 30 min |

**Total:** 90 minutos

---

## ✅ Pré-Requisitos

Todos os arquivos já existem:
- ✅ `frontend/src/api.ts` (criado)
- ✅ `frontend/src/monitoring.ts` (criado)
- ✅ `frontend/src/Dashboard.tsx` (criado)
- ✅ `frontend/src/Dashboard.css` (criado)
- ✅ `frontend/src/App.tsx` (atual)
- ✅ `frontend/.env.example` (refência)

---

## 🚀 Passo a Passo

### **Passo 1: Backup do App.tsx Atual** (2 min)

```bash
cd frontend/src
cp App.tsx App.tsx.bak  # Backup seguro
```

### **Passo 2: Preparar .env** (3 min)

Crie ou atualize `frontend/.env`:

```env
VITE_API_URL=http://localhost:3000
# VITE_API_URL=https://api-staging.lexora.cloud  (staging)
# VITE_API_URL=https://api.lexora.cloud           (production)

# Opcional: Adicione quando tiver accounts
# VITE_SENTRY_DSN=https://YOUR_KEY@sentry.io/YOUR_PROJECT_ID
# VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

### **Passo 3: Implementar O1 - Migrar para api.ts** (30 min)

**Arquivo:** `frontend/src/App.tsx`

**O que fazer:**
1. Remover todos os `fetch()` direto
2. Importar do `api.ts`
3. Usar `api.login()`, `api.getMe()`, etc

**Diferenças (antes vs depois):**

#### ❌ ANTES (Atual):
```tsx
const res = await fetch('http://localhost:3000/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
})
if (!res.ok) {
  const body = await res.json()
  setError(body.message)
}
const body = await res.json()
localStorage.setItem('token', body.token)
```

#### ✅ DEPOIS (Novo):
```tsx
import { api, setAuthToken } from './api'

const response = await api.login(email, password)
if (response.status === 200) {
  setAuthToken(response.data.token)
  setUser(response.data.user)
} else {
  setError(response.error)
}
```

**Como copiar:**

Opção A: Copiar arquivo refatorado
```bash
cp App-refatorado.tsx App.tsx
```

Opção B: Manual (recomendado para entender)
1. Abra `App-refatorado.tsx` como referência
2. Atualize seu `App.tsx`:
   - Adicione imports no topo
   - Atualize função `login()`
   - Renomeie a variável ` password` → ` password` (já era)
   - Remova fetch inline, use `api.*`

**Testes após essa etapa:**
```bash
npm run dev
# Login com admin@juridico.com / 123456
# Verificar se redireciona para dashboard
```

---

### **Passo 4: Implementar O2 - Usar Dashboard.tsx** (30 min)

**Arquivo:** `frontend/src/App.tsx`

**O que fazer:**
1. Remover `HomeDashboard` component
2. Importar novo `Dashboard`
3. Usar `<Dashboard user={user} />` em vez de `<HomeDashboard>`

#### ❌ ANTES:
```tsx
import { HomeDashboard } from './OldDashboard'

return (
  <Router>
    <Routes>
      <Route path="/" element={<HomeDashboard home={home} />} />
    </Routes>
  </Router>
)
```

#### ✅ DEPOIS:
```tsx
import { Dashboard } from './Dashboard'

return (
  <Router>
    <Routes>
      <Route path="/" element={<Dashboard user={user} />} />
    </Routes>
  </Router>
)
```

**O Dashboard.tsx já vem com:**
- ✅ 4 perfis (ADM, ADV, FIN, ATD)
- ✅ KPIs dinâmicos
- ✅ Menu responsivo
- ✅ Tabela de processos
- ✅ Acessibilidade WCAG AAA
- ✅ Estilo Lexora (tokens.css)

**Testes após essa etapa:**
```bash
npm run dev
# Login como diferentes usuários:
#   admin@juridico.com → Deve ver "Usuários Ativos"
#   advogado@juridico.com → Deve ver "Meus Processos"
#   financeiro@juridico.com → Deve ver "Recebimentos"
```

---

### **Passo 5: Implementar O3 - Ativar Monitoring** (30 min)

#### **5a. Atualizar App.tsx com tracking:**

```tsx
// No topo
import { initMonitoring, trackPageView, trackEvent, trackAuthEvent, captureException } from './monitoring'

// No useEffect de boot
useEffect(() => {
  initMonitoring()  // ← Adicione isso
}, [])

// Na função login(), após sucesso:
if (response.status === 200) {
  trackAuthEvent('success', { role: response.data.user.role })  // ← Após login
  trackEvent('login_complete', {})
}

// Na função login(), após erro:
if (response.status !== 200) {
  trackAuthEvent('failure', { error_code: response.status })  // ← Após erro
}
```

#### **5b. Opcional: Adicionar ao main.tsx (se usando)**

Se tiver `main.tsx` ou `index.tsx`:

```tsx
// main.tsx (ou index.tsx)
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { initMonitoring } from './monitoring'

// Inicializar no boot global (backup)
initMonitoring()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

**Testes após essa etapa:**
```bash
npm run dev
# Login com admin@juridico.com / 123456
# Abra DevTools (F12) → Network
# Procure por requisição a sentry.io (se VITE_SENTRY_DSN configurado)
# Ou procure por 'gtag' no console (if VITE_GA_MEASUREMENT_ID configurado)
```

---

## 🧪 Teste Completo (Integração)

1. **Parar servidor anterior** (Ctrl+C)
2. **Limpar cache**
   ```bash
   cd frontend
   rm -r dist node_modules/.vite  # ou rm -r
   ```
3. **Iniciar servidor novo**
   ```bash
   npm run dev
   # http://localhost:5173
   ```
4. **Testar fluxo completo:**

```
1. ✅ Página carrega em http://localhost:5173
2. ✅ Login screen aparece (com logo Lexora)
3. ✅ Credenciais "Precisa de credenciais?" abrível
4. ✅ Login com admin@juridico.com / 123456
5. ✅ Botão muda para "Entrando..." durante requisição
6. ✅ Após sucesso, redireciona para Dashboard
7. ✅ Dashboard mostra 4 KPI cards (para ADM)
8. ✅ Menu com items dinâmicos
9. ✅ Tabela de processos visível
10. ✅ Logout button funciona
```

---

## ⚠️ Possíveis Erros & Soluções

| Erro | Causa | Solução |
|------|-------|---------|
| `Cannot find api` | Caminho errado | Verificar `import { api } from './api'` |
| `Dashboard not found` | Arquivo não existe | Verificar `frontend/src/Dashboard.tsx` existe |
| `Sentry error` | VITE_SENTRY_DSN inválido | Remover do .env, deixar vazio por enquanto |
| Estilo quebrado | CSS não importado | Verificar `import './Dashboard.css'` em App.tsx |
| Token undefined | Logout não funcionou | Verificar `clearAuthToken()` em logout |
| CORS error | Backend não roda | Confirmar `npm run dev` no backend |

---

## 📊 Checklist de Implementação

### Fase 1: Setup
- [ ] Backup `App.tsx` feito
- [ ] `.env` atualizado
- [ ] Arquivos (api.ts, monitoring.ts, Dashboard.*) existem

### Fase 2: O1 (api.ts)
- [ ] Imports de `api` adicionados
- [ ] Função `login()` refatorada
- [ ] `setAuthToken()` e `getAuthToken()` usados
- [ ] Login funciona em localhost

### Fase 3: O2 (Dashboard.tsx)
- [ ] Import `Dashboard` adicionado
- [ ] `HomeDashboard` removido
- [ ] Route atualizada para `<Dashboard user={user} />`
- [ ] Dashboard exibe cards + menu + tabela

### Fase 4: O3 (monitoring)
- [ ] `initMonitoring()` chamado no useEffect
- [ ] `trackAuthEvent()` na função login
- [ ] `.env` com VITE_* vars (opcional)
- [ ] Console.log ou DevTools mostra eventos

### Teste Final
- [ ] Login → Dashboard funciona
- [ ] Logout funciona
- [ ] Responsive em mobile
- [ ] Sem console errors
- [ ] Build passa (`npm run build`)

---

## 🎯 Próximos Passos (Após Implementar O1-O3)

1. **Deploy em Staging**
   ```bash
   cd frontend
   vercel deploy  # Preview URL
   ```

2. **Integrar com Backend**
   - Confirmar endpoint `/me` retorna user correto
   - Testar login com 3 usuários diferentes

3. **Testes E2E**
   - Criar teste Cypress para login flow
   - Validar dashboard renderiza por perfil

4. **Adicionar Logout Button ao Dashboard**
   - Colocar em Header do Dashboard
   - Chamar função `logout()` de App.tsx

---

## 📞 Troubleshooting Avançado

### Se login funciona mas dashboard não aparece:
```tsx
// Adicione console.log em App.tsx
useEffect(() => {
  console.log('User state:', user)  // Verificar se user existe
  console.log('Home state:', home)  // Deve ter home data
}, [user, home])
```

### Se monitoring não funciona:
```bash
# Verificar variáveis de env
echo $VITE_SENTRY_DSN

# Ou em JavaScript:
console.log(import.meta.env.VITE_SENTRY_DSN)
```

### Se api.ts não funciona:
```bash
# Verificar que backend roda
curl http://localhost:3000/
# Deve retornar { message: "SaaS Jurídico API v1" }
```

---

## 📚 Documentação Relacionada

- [21-Dashboard-Tecnico.md](21-Dashboard-Tecnico.md) — Como estender Dashboard
- [18-Setup-Staging-Producao.md](18-Setup-Staging-Producao.md) — Deploy em produção
- [20-Guia-Desenvolvimento.md](20-Guia-Desenvolvimento.md) — Padrões e style guide

---

## ⏱️ Timeline Estimada

```
09:00 - 09:15  Passo 1-2 (Backup + .env)       ⏱️ 15 min
09:15 - 09:45  Passo 3 (O1 - api.ts)           ⏱️ 30 min
09:45 - 10:15  Passo 4 (O2 - Dashboard.tsx)    ⏱️ 30 min
10:15 - 10:45  Passo 5 (O3 - monitoring)       ⏱️ 30 min
10:45 - 11:00  Testes + Ajustes                ⏱️ 15 min
11:00 - 11:30  Build + Validação Final         ⏱️ 30 min
────────────────────────────────────────────────────
TOTAL                                           ⏱️ 2 horas 30 min
```

---

**Status:** 🟡 **EM DESENVOLVIMENTO**

Recomendação: Implementar O1-O3 antes de fazer deploy em produção (próximas 2 semanas) ✅

