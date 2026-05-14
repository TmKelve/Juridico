# 🔐 Configuração de Monitoramento - Sentry + GA

**Data:** 2 de abril de 2026

---

## 1️⃣ Sentry (Error Tracking)

### Setup Account

1. Vá para [sentry.io](https://sentry.io)
2. Crie account (ou use existente)
3. Crie 2 projects:
   - **Staging:** "Lexora Frontend Staging"
   - **Produção:** "Lexora Frontend Production"
4. Selecione platform: **React**

### Copiar Credentials

Para cada project, copie:
```
Sentry DSN: https://[KEY]@[SENTRY_ORGANIZATION].ingest.sentry.io/[PROJECT_ID]
```

Exemplo:
```
https://1a2b3c4d5e6f7g8h@sentry.io/1234567
```

### Configurar no .env

```bash
# .env (dev — opcional)
VITE_SENTRY_DSN=

# .env.production (staging)
VITE_SENTRY_DSN=https://[STAGING_KEY]@sentry.io/[STAGING_PROJECT]

# .env.production (prod)
VITE_SENTRY_DSN=https://[PROD_KEY]@sentry.io/[PROD_PROJECT]
```

### Testar Integração

Em `src/main.tsx` ou `src/App.tsx`:
```tsx
import { initMonitoring } from './monitoring'

// Ao boot
initMonitoring()

// Teste manual
try {
  throw new Error('Test error from Sentry')
} catch (err) {
  captureException(err)
}
```

Verificar em **Sentry Dashboard** → **Issues** (deve aparecer em segundos)

---

## 2️⃣ Google Analytics (GA4)

### Setup Account

1. Vá para [analytics.google.com](https://analytics.google.com)
2. Crie **Account** (ex: "Lexora SaaS")
3. Crie **Property** por ambiente:
   - **Staging:** "Lexora Staging"
   - **Production:** "Lexora Production"
4. Selecione tipo: **Web**

### Copiar Credentials

Para cada property, procure por:
```
Measurement ID: G-[XXXXXXXXXX]
```

### Configurar no .env

```bash
# .env (dev — opcional)
VITE_GA_MEASUREMENT_ID=

# .env.production (staging)
VITE_GA_MEASUREMENT_ID=G-[STAGING_ID]

# .env.production (prod)
VITE_GA_MEASUREMENT_ID=G-[PROD_ID]
```

### Testar Integração

Abra DevTools → Network → filtro "collect"

Ao fazer login/navegação, deve ver requisições:
```
POST https://www.google-analytics.com/mp/collect?measurement_id=G-XXXX
```

Ou usar **GA4 DebugView**:
1. Analytics → Admin → DebugView
2. Abra site
3. Veja eventos em real-time

---

## 3️⃣ Arquivo .env.example Atualizado

```bash
# Frontend - Development
VITE_API_URL=http://localhost:3000
VITE_SENTRY_DSN=
VITE_GA_MEASUREMENT_ID=

# Frontend - Staging
# VITE_API_URL=https://api-staging.lexora.cloud
# VITE_SENTRY_DSN=https://YOUR_KEY@sentry.io/YOUR_STAGING_PROJECT
# VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXXXX-STAGING

# Frontend - Production
# VITE_API_URL=https://api.lexora.cloud
# VITE_SENTRY_DSN=https://YOUR_KEY@sentry.io/YOUR_PROD_PROJECT
# VITE_GA_MEASUREMENT_ID=G-YYYYYYYYYYYY-PROD
```

---

## 4️⃣ Scripts de Teste

### Testar Sentry Localmente

```bash
# Abra console e execute:
import { captureException } from './monitoring'
const err = new Error('Test Sentry')
captureException(err, { context: 'testing' })
# Verifique em sentry.io
```

### Testar GA Localmente

```bash
# Abra console e execute:
import { trackEvent } from './monitoring'
trackEvent('test_event', { page: 'login', status: 'success' })
# Verifique em Google Analytics > DebugView
```

---

## 5️⃣ Checklist de Deploy

### Antes de Deploy em Staging

- [ ] Sentry projects criados (staging + prod)
- [ ] Sentry DSN copiado para .env
- [ ] GA property criada (staging + prod)
- [ ] GA Measurement ID copiado para .env
- [ ] `.env.production` configurado
- [ ] Build local sem erros: `npm run build`
- [ ] `initMonitoring()` chamado em `main.tsx`
- [ ] Teste manual de erro (Sentry)
- [ ] Teste manual de evento (GA)

### Após Deploy em Staging

- [ ] Acesse https://staging.lexora.cloud
- [ ] Verifique Sentry → Issues (zero ou test only)
- [ ] Verifique GA → DebugView (eventos chegando)
- [ ] Teste login flow (trackAuthEvent deve ficar)
- [ ] Simule erro (deve aparecer em Sentry)

---

## 6️⃣ Ambiente Variables por Plataforma

### Vercel (Recomendado)

1. Vá em **Settings** → **Environment Variables**
2. Adicione para cada environment (Preview/Production):

```
VITE_API_URL = https://api-staging.lexora.cloud (Preview)
VITE_API_URL = https://api.lexora.cloud (Production)
VITE_SENTRY_DSN = https://... (seu DSN)
VITE_GA_MEASUREMENT_ID = G-... (seu GA ID)
```

3. Deploy automático ao fazer push para git

### Docker / Self-Hosted

Crie `.env.production` com valores corretos:
```bash
VITE_API_URL=https://api.lexora.cloud
VITE_SENTRY_DSN=https://...
VITE_GA_MEASUREMENT_ID=G-...
```

Build com:
```bash
npm run build
```

---

## 7️⃣ Troubleshooting

| Problema | Solução |
|----------|---------|
| Sentry não coleta erros | Verifique `initMonitoring()` é chamado; check Network aba |
| GA não mostra eventos | Verifique GA Measurement ID; use DebugView |
| Build falha com env vars | Coloque `.env` na root; prefixe `VITE_` |
| Staging e prod misturados | Crie .env.staging + .env.production separados |

---

## 📋 Resumo Rápido

```
Sentry:   https://sentry.io → Create project → Copy DSN → .env
GA:       https://analytics.google.com → Create property → Copy ID → .env
Test:     Console → trackEvent / captureException
Deploy:   npm run build → Vercel (auto setup) ou Docker
```

---

**Próximo:** Após configurar e testar, faça deploy em staging com `vercel`.
