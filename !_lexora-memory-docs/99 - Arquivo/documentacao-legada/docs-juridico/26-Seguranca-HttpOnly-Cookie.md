# 🔐 Análise Segurança + Correções Críticas

**Data:** 2 de abril de 2026  
**Prioridade:** 🔴 CRÍTICA  
**Status:** Recomendação + Implementação

> Atualização em 12/05/2026: a migração inicial para cookie HttpOnly foi implementada no código. O backend agora seta cookie de autenticação e expõe `POST /auth/logout`; o frontend passou a usar `credentials: 'include'` e deixou de depender de `localStorage` para o token de sessão.
>
> Evidência de runtime validada localmente em backend:
> - `POST /auth/login` -> `200`
> - `GET /me` com cookie -> `200`
> - `POST /auth/logout` -> `200`
> - `GET /me` após logout -> `401`
>
> Ainda falta expandir cobertura automatizada e validar o fluxo completo frontend + backend no navegador.

---

## 🚨 Vulnerabilidade Encontrada

### **Vulnerabilidade: Token JWT em localStorage**

```
Riscos:
1. XSS (Cross-Site Scripting)
   └─ Attacker injeta JS que acessa localStorage['token']
   └─ Token vaza para servidor attacker
   
2. Exposição em DevTools
   └─ Qualquer pessoa com acesso ao computador vê token
   
3. Sem proteção CSRF
   └─ CSRF attack pode usar token automaticamente
```

### **Impacto**
| Cenário | Risco | Impacto |
|---------|-------|---------|
| XSS attack | Alto | Token roubado, acesso a conta |
| Local access | Alto | Token visível em DevTools |
| CSRF attack | Médio | POST request em nome do user |
| Token expiry | Médio | Token pode valer 24h+ |

---

## ✅ Solução: HttpOnly Cookie + CSRF Token

### **O que muda**

```
ANTES (localStorage):
┌─────────────────────────────────┐
│ localStorage['token'] = "xyz..."  │ ← Vulnerável a XSS
│ (acessível via JS)               │
└─────────────────────────────────┘

DEPOIS (HttpOnly Cookie):
┌─────────────────────────────────┐
│ Cookie: Authorization=xyz...     │ ← Protegido contra XSS
│ (HttpOnly, Secure, SameSite)     │
│ (não acessível via JS)           │
└─────────────────────────────────┘
```

---

## 📋 Implementação Step-by-Step

### **PARTE 1: Backend - Express**

#### 1. Instalar dependências
```bash
npm install cookie-parser express-session
```

#### 2. Atualizar backend/src/index.js
```javascript
import cookieParser from 'cookie-parser'
import session from 'express-session'

app.use(cookieParser())

// Middleware de sessão
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-in-prod',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only
    httpOnly: true,  // ← CRÍTICO: bloq JS access
    sameSite: 'strict', // ← Proteção CSRF
    maxAge: 24 * 60 * 60 * 1000, // 24h
    domain: process.env.COOKIE_DOMAIN || 'localhost',
  }
}))
```

#### 3. Atualizar route POST /auth/login
```javascript
// backend/src/routes/auth.js
router.post('/login', async (req, res) => {
  const { email, password } = req.body

  try {
    // Validar credenciais (já existe)
    const user = await User.findOne({ email })
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    // Gerar JWT
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    )

    // NOVO: Settar cookie ao invés de retornar token
    res.cookie('Authorization', `Bearer ${token}`, {
      httpOnly: true,  // ← JS não acessa
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000,
    })

    // Resposta (token NÃO é mais retornado)
    res.json({
      success: true,
      message: 'Login realizado',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    })
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
})
```

#### 4. Atualizar rota GET /home para usar cookie
```javascript
// backend/src/routes/home.js
import { authenticateToken } from '../middleware/auth.js'

// Middleware já extrai token do cookie automaticamente
router.get('/home', authenticateToken, async (req, res) => {
  // req.user vem do middleware
  const user = await User.findById(req.user.userId)
  res.json({
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    home: {
      welcome: `Bem-vindo, ${user.email}!`,
      menu: getMenuByRole(user.role),
    },
  })
})
```

#### 5. Atualizar middleware de auth (backend/src/middleware/auth.js)
```javascript
import jwt from 'jsonwebtoken'

export const authenticateToken = (req, res, next) => {
  // NOVO: Extrai token do cookie (não do header)
  const authHeader = req.cookies.Authorization
  const token = authHeader?.replace('Bearer ', '')

  if (!token) {
    return res.status(401).json({ message: 'No token provided' })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decoded
    next()
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' })
  }
}
```

#### 6. Rota de logout
```javascript
router.post('/logout', (req, res) => {
  // Limpar cookie
  res.clearCookie('Authorization', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  })
  
  res.json({ success: true, message: 'Logged out' })
})
```

---

### **PARTE 2: Frontend - React**

#### 1. Remover localStorage de token
```javascript
// src/api.ts - ANTES
const token = localStorage.getItem('authToken')
headers['Authorization'] = `Bearer ${token}`

// src/api.ts - DEPOIS
// Cookie é enviado automaticamente pelo browser (credentials: 'include')
```

#### 2. Atualizar api.ts
```typescript
// src/api.ts
const API_BASE_URL = 'http://localhost:3000'

// CRÍTICO: credentials include envia cookies automaticamente
const defaultOptions: RequestInit = {
  credentials: 'include', // ← Envia Authorization cookie
  headers: {
    'Content-Type': 'application/json',
  },
}

export const api = {
  async login(email: string, password: string) {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      ...defaultOptions,
      body: JSON.stringify({ email, password }),
    })
    return res.json()
  },

  async getHome() {
    const res = await fetch(`${API_BASE_URL}/home`, {
      ...defaultOptions,
    })
    return res.json()
  },

  async getProcesses(filters?: any) {
    const params = new URLSearchParams(filters || {})
    const res = await fetch(`${API_BASE_URL}/processes?${params}`, {
      ...defaultOptions,
    })
    return res.json()
  },

  // ... outros métodos seguem o mesmo padrão
}

// REMOVIDO: setAuthToken, clearAuthToken, getAuthToken
// (não há mais localStorage)
```

#### 3. Atualizar App.tsx - Login logic
```tsx
// src/App.tsx - ANTES
const handleLogin = async (email: string, password: string) => {
  const data = await api.login(email, password)
  if (data.token) {
    localStorage.setItem('authToken', data.token) // REMOVIDO
    setUser(data.user)
  }
}

// src/App.tsx - DEPOIS
const handleLogin = async (email: string, password: string) => {
  const data = await api.login(email, password)
  if (data.success) {
    setUser(data.user) // Apenas set user, token está no cookie
    trackAuthEvent('login_success', { role: data.user.role })
  }
}
```

#### 4. Atualizar Logout
```tsx
// src/App.tsx
const handleLogout = async () => {
  await api.logout() // GET ou POST /auth/logout
  // Cookie é automaticamente limpo pelo servidor
  setUser(null)
  navigate('/login')
}
```

#### 5. Atualizar Auth Check (useEffect)
```tsx
// src/App.tsx
useEffect(() => {
  const checkAuth = async () => {
    try {
      const data = await api.getHome()
      setUser(data.user) // Se falhar, user fica null
    } catch {
      setUser(null)
    }
  }
  checkAuth()
}, [])
```

---

## 🔒 Configuração CORS + Cookies

### **Backend (Express)**
```javascript
// backend/src/index.js
import cors from 'cors'

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true, // ← Permite cookies cross-origin
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type'],
  exposedHeaders: ['Set-Cookie'],
}))
```

### **Frontend (.env)**
```bash
# .env.development
VITE_API_URL=http://localhost:3000

# .env.production
VITE_API_URL=https://api.juridico.com
```

---

## 📊 Segurança Comparativa

### **localStorage (Vulnerável)**
```
┌─────────────────────────────────────┐
│ ANTES: localStorage Token           │
├─────────────────────────────────────┤
│ ✗ Acessível via JS (window.xxx)     │
│ ✗ Vê em DevTools (F12)              │
│ ✗ Vulnerável a XSS                  │
│ ✓ Sobrevive reload                  │
│ ✓ Simples de implementar            │
└─────────────────────────────────────┘
```

### **HttpOnly Cookie (Seguro)**
```
┌─────────────────────────────────────┐
│ DEPOIS: HttpOnly Cookie             │
├─────────────────────────────────────┤
│ ✓ NÃO acessível via JS              │
│ ✓ Oculto em DevTools (Security tab) │
│ ✓ Protegido contra XSS              │
│ ✓ SameSite previne CSRF             │
│ ✓ Sobrevive reload                  │
│ ✓ Secure (HTTPS only)               │
│ ⚠ Implica CORS para cross-origin    │
└─────────────────────────────────────┘
```

---

## ✅ Checklist de Implementação

### **Backend**
```
☐ npm install cookie-parser express-session
☐ Atualizar Auth middleware para ler do cookie
☐ POST /auth/login → settar cookie
☐ POST /auth/logout → clearar cookie
☐ Atualizar CORS (credentials: true)
☐ Testar login em http://localhost:5173
☐ npm run build (backend)
☐ Não expõe token em resposta JSON
☐ Cookie flags: HttpOnly, Secure, SameSite=strict
☐ maxAge: 24h (86400000ms)
```

### **Frontend**
```
☐ Remover localStorage.setItem('authToken')
☐ Remover localStorage.getItem('authToken')
☐ Atualizar api.ts: credentials: 'include'
☐ Testar login → Dashboard → Logout
☐ Verificar F12 > Application > Cookies
☐ Cookie deve estar lá ✓
☐ localStorage vazio ✓
☐ npm run build (frontend)
☐ npm run dev (testar)
```

### **Testes de Segurança**
```
☐ XSS Test: Abrir DevTools, tentar acessar window.localStorage['token']
  └─ Resultado esperado: undefined (não existe)

☐ Cookie Inspect: F12 > Application > Cookies
  └─ Authorization cookie visível
  └─ HttpOnly: ✓ (no checkbox)
  └─ Secure: checked (production)
  └─ SameSite: Strict

☐ Login/Logout Flow
  └─ POST login → cookie setado
  └─ GET /home → funciona
  └─ POST logout → cookie removido
  └─ GET /home → 401 Unauthorized

☐ CORS Test
  └─ Frontend (5173) → Backend (3000)
  └─ Cookies enviados automaticamente
  └─ Sem "No 'Access-Control-Allow-Credentials'" error
```

---

## 🚀 Rollout Plan

### **Fase 1: Preparação** (2h)
1. Criar branch: `git checkout -b security/httponly-cookie`
2. Implementar backend (cookie + logout)
3. Implementar frontend (api.ts + App.tsx)

### **Fase 2: Testes** (1h)
1. Teste dev local (localhost:5173 → 3000)
2. Validar segurança (F12 > Cookies)
3. Teste de fluxo (login → home → logout)

### **Fase 3: Deploy** (1h)
1. Merge para main
2. Deploy staging (Vercel + Railway)
3. Validar cookies em staging
4. Deploy produção

**Total:** 4h

---

## 📝 Outras Recomendações de Segurança

| Recomendação | Prioridade | Effort | Status |
|--------------|-----------|--------|--------|
| **TLS/HTTPS** | 🔴 CRÍTICA | 1h | Backend: Railway auto, Frontend: Vercel auto |
| **Rate Limiting** | 🟠 IMPORTANTE | 2h | express-rate-limit na auth |
| **CSRF Token** | 🟡 IMPORTANTE | 2h | Backend gera, frontend envia em header |
| **Password Hashing** | 🟢 OK | Done | bcrypt já implementado |
| **SQL Injection** | 🟢 OK | Done | Prisma ORM protege |
| **Input Validation** | 🟠 IMPORTANTE | 1h | Adicionar validação com zod/joi |
| **API Key auth** | 🟡 IMPORTANTE | 2h | Para integração futura |
| **2FA/MFA** | 🟢 BACKLOG | 8h | Próximo sprint |
| **Audit Logs** | 🟢 BACKLOG | 4h | Registrar ações de admin |

---

## 🎯 Conclusão

**Ação Imediata:**
Implementar HttpOnly Cookie (4h) antes de staging deployment

**Impacto:**
- ✅ Elimina XSS risk para token
- ✅ Protege contra roubo de credenciais
- ✅ OWASP Top 10 #5 (Broken Access Control) mitigado
- ✅ Segue melhores práticas (JWT + Secure cookies)

**Timeline:**
- Hoje: Implementação (4h)
- Amanhã: Deploy staging
- Dia 3: Deploy produção

---

**Próximo Passo:** Iniciar implementação backend em [Parte 1](#parte-1-backend---express)

