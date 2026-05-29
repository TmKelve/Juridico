# Lexora — Estratégia de Testes

## Propósito

Definir as convenções, padrões e ferramentas para testes unitários, de integração e E2E no projeto Lexora. O objetivo é garantir cobertura mínima por módulo, facilitar refatorações seguras e documentar os padrões já existentes no codebase.

---

## 1. Estado Atual dos Testes

### 1.1 Backend — 67 arquivos de teste (`.test.cjs`)

Os testes do backend usam **`node:test`** (test runner nativo do Node.js) + **`node:assert/strict`**. Todos importam o código compilado de `dist/` (após `tsc`).

**Por módulo:**

| Módulo | Arquivos de teste | Exemplo |
|--------|------------------|---------|
| AI | 8 | [ai-audit.service.test.cjs](file:///c:/Users/tomke/app%20Juridico/backend/src/ai/audit/ai-audit.service.test.cjs) |
| Finance | 10 | [billing.service.test.cjs](file:///c:/Users/tomke/app%20Juridico/backend/src/finance/billing/billing.service.test.cjs) |
| Documents | 8 | [document-approval.service.test.cjs](file:///c:/Users/tomke/app%20Juridico/backend/src/documents/approval/document-approval.service.test.cjs) |
| BI | 5 | [bi-authorizer.test.cjs](file:///c:/Users/tomke/app%20Juridico/backend/src/bi/access-control/bi-authorizer.test.cjs) |
| Authz | 2 | [authz.check.test.cjs](file:///c:/Users/tomke/app%20Juridico/backend/src/authz/policies/authz.check.test.cjs) |
| CRM | 3 | [crm-prospecting.service.test.cjs](file:///c:/Users/tomke/app%20Juridico/backend/src/crm/prospecting/crm-prospecting.service.test.cjs) |
| Attendances | 3 | [attendance-conversion.test.cjs](file:///c:/Users/tomke/app%20Juridico/backend/src/attendances/conversion/attendance-conversion.test.cjs) |
| Communication | 2 | [communication.service.test.cjs](file:///c:/Users/tomke/app%20Juridico/backend/src/communication/communication.service.test.cjs) |
| Deadlines | 2 | [deadline-risk.service.test.cjs](file:///c:/Users/tomke/app%20Juridico/backend/src/deadlines/deadline-risk.service.test.cjs) |
| Timesheet | 5+ | [register-timesheet-routes.test.cjs](file:///c:/Users/tomke/app%20Juridico/backend/src/timesheet/http/register-timesheet-routes.test.cjs) |
| Company | 1 | [company.service.test.cjs](file:///c:/Users/tomke/app%20Juridico/backend/src/company/company.service.test.cjs) |
| Platform | 4+ | Incluindo mobile, platform-actions, platform-billing |
| Jobs | 1 | [finance-collection-dispatch.job.test.cjs](file:///c:/Users/tomke/app%20Juridico/backend/src/jobs/finance/finance-collection-dispatch.job.test.cjs) |

### 1.2 Frontend — 10 arquivos Playwright Smoke Tests

| Arquivo | Escopo |
|---------|--------|
| [admin.users.smoke.test.ts](file:///c:/Users/tomke/app%20Juridico/frontend/admin.users.smoke.test.ts) | Login ADM, tela de usuários, logout |
| [adv.screens.smoke.test.ts](file:///c:/Users/tomke/app%20Juridico/frontend/adv.screens.smoke.test.ts) | Telas do advogado |
| [financeiro.smoke.test.ts](file:///c:/Users/tomke/app%20Juridico/frontend/financeiro.smoke.test.ts) | Fluxo financeiro completo: criar lançamento, cobrar, baixar, parcelamento |
| [clients.communication.smoke.test.ts](file:///c:/Users/tomke/app%20Juridico/frontend/clients.communication.smoke.test.ts) | Comunicação com clientes |
| [epic-cde.smoke.test.ts](file:///c:/Users/tomke/app%20Juridico/frontend/epic-cde.smoke.test.ts) | Funcionalidades epic CDE |
| [epic-ij.smoke.test.ts](file:///c:/Users/tomke/app%20Juridico/frontend/epic-ij.smoke.test.ts) | Funcionalidades epic IJ |
| [foundation.auth.company.smoke.test.ts](file:///c:/Users/tomke/app%20Juridico/frontend/foundation.auth.company.smoke.test.ts) | Autenticação e company foundation |
| [admin.company-foundation.smoke.test.ts](file:///c:/Users/tomke/app%20Juridico/frontend/admin.company-foundation.smoke.test.ts) | Administração de company |
| [platform-admin.smoke.test.ts](file:///c:/Users/tomke/app%20Juridico/frontend/platform-admin.smoke.test.ts) | Painel platform admin |
| [publication-origin-rework.smoke.test.ts](file:///c:/Users/tomke/app%20Juridico/frontend/publication-origin-rework.smoke.test.ts) | Rework de origens de publicação |

**Execução:** `npm --prefix frontend run test:smoke`

> [!IMPORTANT]
> O frontend **NÃO possui testes unitários** atualmente. Não há Vitest/Jest configurado. Apenas Playwright smoke tests.

---

## 2. Padrão Atual de Testes do Backend (node:test)

### 2.1 Estrutura padrão de um `.test.cjs`

```javascript
const test = require('node:test');
const assert = require('node:assert/strict');

// Importa do dist/ compilado
const { ServiceClass, InMemoryRepository } = require('../../dist/module/service.js');

test('descrição do cenário completo', async () => {
  // 1. Arranjar — criar repositórios in-memory com dados seed
  const repository = new InMemoryRepository({ entries: [/* seed */] });

  // 2. Criar service com dependências injetadas
  const service = new ServiceClass({ repository, now: () => new Date('2026-05-21') });

  // 3. Agir
  const result = await service.execute(input);

  // 4. Verificar
  assert.equal(result.status, 'success');
  assert.match(result.id, /^expected_prefix/);
});
```

### 2.2 Padrão de InMemoryRepository

O projeto usa **repositórios in-memory** em vez de mocks de Prisma. Cada módulo extraído expõe:
- `PrismaXxxRepository` — implementação real com Prisma
- `InMemoryXxxRepository` — implementação in-memory para testes

Exemplo real de [billing.service.test.cjs](file:///c:/Users/tomke/app%20Juridico/backend/src/finance/billing/billing.service.test.cjs):

```javascript
const repository = new InMemoryFinanceBillingRepository({
  entries: [{
    id: 41,
    type: 'receivable',
    status: 'open',
    description: 'Honorarios fase recursal',
    amountCents: 185000,
    // ... dados de seed completos
  }],
});

const service = new FinanceBillingService({
  repository,
  paymentProvider: new MockFinancePaymentProvider(),
  auditService: new FinanceAuditService(new InMemoryFinanceAuditRepository()),
  now: () => new Date('2026-05-21T13:00:00.000Z'),
});
```

### 2.3 Padrão de teste de rotas HTTP

Para testar `registerXxxRoutes`, crie um fake app Express (veja [register-ai-routes.test.cjs](file:///c:/Users/tomke/app%20Juridico/backend/src/ai/http/register-ai-routes.test.cjs)):

```javascript
function createFakeApp() {
  return {
    routes: [],
    get(path, handler) { this.routes.push({ method: 'GET', path, handler }); },
    post(path, handler) { this.routes.push({ method: 'POST', path, handler }); },
  };
}

function createResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
    send(payload) { this.body = payload; return this; },
  };
}

test('registerXxxRoutes wires expected endpoints', async () => {
  const { registerXxxRoutes } = require(modulePath);
  const app = createFakeApp();
  registerXxxRoutes({
    app,
    getUserFromReq: () => ({ sub: 1, role: 'ADM', email: 'admin@juridico.com' }),
  });

  const route = app.routes.find(r => r.method === 'POST' && r.path === '/xxx');
  assert.ok(route);

  const res = createResponse();
  await route.handler({ body: { /* payload */ } }, res);
  assert.equal(res.statusCode, 201);
});
```

### 2.4 Padrão de teste de Authz

Veja [authz.check.test.cjs](file:///c:/Users/tomke/app%20Juridico/backend/src/authz/policies/authz.check.test.cjs):

```javascript
test('authz matrix allows global permission for ADM', async () => {
  const { checkAuthorization } = require(authzCheckPath);
  const decision = checkAuthorization({
    actor: { userId: 1, role: 'ADM' },
    permissionKey: 'team.reassignPortfolio',
    resourceType: 'team',
    resourceId: 9,
  });
  assert.equal(decision.allowed, true);
  assert.equal(decision.scope, 'global');
  assert.equal(decision.sensitive, true);
});
```

### 2.5 Padrão de teste de Validators

Veja [company.service.test.cjs](file:///c:/Users/tomke/app%20Juridico/backend/src/company/company.service.test.cjs):

```javascript
test('Validators reject invalid status', async () => {
  const { CompanyContractError, validateCreateCompanyInput } = require('../../dist/company/index.js');

  assert.throws(
    () => validateCreateCompanyInput({ name: 'X', slug: 'x', status: 'wrong' }),
    (error) => error instanceof CompanyContractError && error.code === 'COMPANY_INVALID_STATUS',
  );
});
```

---

## 3. Como Adicionar Vitest ao Projeto

### 3.1 Frontend (recomendado como primeiro passo)

```powershell
cd frontend
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

Criar `frontend/vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.*', 'src/test-setup.ts'],
    },
  },
});
```

Criar `frontend/src/test-setup.ts`:

```typescript
import '@testing-library/jest-dom/vitest';
```

Adicionar scripts ao [package.json](file:///c:/Users/tomke/app%20Juridico/frontend/package.json):

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

### 3.2 Backend (opcional — os testes com `node:test` já funcionam)

> [!NOTE]
> O backend já possui 67 testes funcionando com `node:test`. Migrar para Vitest é **opcional** e deve ser feito **gradualmente**. O padrão `node:test` + `.test.cjs` é o canônico do projeto.

Se decidir adicionar Vitest ao backend:

```powershell
cd backend
npm install -D vitest
```

Criar `backend/vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.vitest.ts'],
    globals: true,
  },
});
```

> [!WARNING]
> **NÃO** renomeie os `.test.cjs` existentes. Novos testes podem usar `.vitest.ts`, mantendo coexistência.

---

## 4. Padrões de Teste para Frontend

### 4.1 Teste de Componente React

```tsx
// src/components/StatusBadge.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StatusBadge } from './StatusBadge';

describe('StatusBadge', () => {
  it('deve renderizar badge com variante "critico" corretamente', () => {
    render(<StatusBadge status="critico" />);
    const badge = screen.getByText('critico');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('status-badge--critico');
  });

  it('deve renderizar badge "ativo" por padrão', () => {
    render(<StatusBadge />);
    expect(screen.getByText('ativo')).toBeInTheDocument();
  });
});
```

### 4.2 Teste de Hook Customizado

```tsx
// src/hooks/useDebounce.test.ts
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useDebounce } from './useDebounce';

describe('useDebounce', () => {
  it('deve retornar o valor atrasado após o delay', async () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'hello' } },
    );

    expect(result.current).toBe('hello');

    rerender({ value: 'world' });
    expect(result.current).toBe('hello'); // ainda não mudou

    act(() => { vi.advanceTimersByTime(300); });
    expect(result.current).toBe('world');

    vi.useRealTimers();
  });
});
```

### 4.3 Teste de Funções do API Client

```typescript
// src/api.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock do fetch global
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('apiClient', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('deve fazer POST para /auth/login com credenciais', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ user: { id: 1, email: 'admin@juridico.com', role: 'ADM' } }),
    });

    // Importe a função após o mock estar configurado
    const { loginUser } = await import('./api');
    const result = await loginUser('admin@juridico.com', '123456');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result.user.role).toBe('ADM');
  });
});
```

---

## 5. Padrões de Teste E2E (Playwright)

### 5.1 Estrutura padrão de smoke test

```typescript
import { expect, type Page, test } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173';

// Helper de login reutilizável
async function loginAs(page: Page, email: string, password: string = '123456') {
  await page.goto(baseURL);
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button:has-text("Entrar")');

  const shell = page.locator('.shell-content-canvas');
  const authError = page.locator('#auth-error, .error-container');
  await Promise.race([
    shell.waitFor({ state: 'visible', timeout: 30000 }),
    authError.waitFor({ state: 'visible', timeout: 30000 }),
  ]);

  if (await authError.isVisible()) {
    throw new Error(`Falha no login: ${(await authError.textContent())?.trim()}`);
  }
  await expect(shell).toBeVisible();
}

test('FIN fluxo completo', async ({ page }) => {
  await loginAs(page, 'financeiro@juridico.com');
  // ... assertions
});
```

### 5.2 Padrão de mock de API no Playwright

Veja [admin.users.smoke.test.ts](file:///c:/Users/tomke/app%20Juridico/frontend/admin.users.smoke.test.ts):

```typescript
async function installAdminMocks(page: Page) {
  await page.route('**/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ user: { id: 1, email: 'admin@juridico.com', role: 'ADM' } }),
    });
  });
  // ... mais rotas mockadas
}
```

### 5.3 Melhorias recomendadas

> [!TIP]
> **Melhore os smoke tests existentes com:**
> - `test.describe()` para agrupar cenários relacionados
> - `data-testid` em vez de seletores CSS frágeis como `.shell-content-canvas`
> - Page Object Model para reutilizar helpers de login
> - Assertions de acessibilidade com `toHaveAttribute('aria-label', ...)`

---

## 6. Mock Data de Desenvolvimento

### 6.1 Dados mock embutidos em [main.ts](file:///c:/Users/tomke/app%20Juridico/backend/src/main.ts)

O arquivo `main.ts` contém dados mock para desenvolvimento (habilitados quando `NODE_ENV !== 'production'` e `LEXORA_DEV_MOCK !== '0'`):

| Variável | Linhas | Descrição |
|----------|--------|-----------|
| `devMockUsers` | L116-121 | 4 usuários (ADM, ADV, FIN, ATD) com senha `123456` |
| `devMockProcesses` | L123-131 | 7 processos com ownerId, fases e status variados |
| `devMockDeadlines` | L133-140 | 6 prazos com offsets dinâmicos de data |
| `devMockAgendaEvents` | L142-149 | 6 eventos de agenda com tipos variados |
| `externalProcessRegistry` | L151-173 | 3 processos de registro externo para lookup |
| `publicationSeed*` | L175-196 | Arrays de tipos, impactos, status, tribunais, textos |
| `templateSeedAreas/Types/Phases/Tags` | L193-196 | Seeds para templates de documentos |

### 6.2 Usuários mock

```typescript
const devMockUsers = [
  { id: 1, email: 'admin@juridico.com', password: '123456', role: 'ADM' },
  { id: 2, email: 'advogado@juridico.com', password: '123456', role: 'ADV' },
  { id: 3, email: 'financeiro@juridico.com', password: '123456', role: 'FIN' },
  { id: 4, email: 'atendimento@juridico.com', password: '123456', role: 'ATD' },
];
```

### 6.3 Funções helper para mock data

| Função | Linha | Propósito |
|--------|-------|-----------|
| `getDevMockUserByEmail(email)` | L299 | Busca usuário mock por email |
| `getDevMockSessionUser(email)` | L303 | Retorna `{ id, email, role }` para sessão |
| `getDevMockProcessesForRole(decoded)` | L309 | Filtra processos por visibilidade do role |
| `getDevMockProcessById(processId)` | L320 | Busca processo mock por ID |
| `getDevMockDeadlinesForRole(decoded)` | L330 | Filtra prazos por processos visíveis |
| `getDevMockAgendaForRole(decoded)` | L361 | Filtra agenda por processos visíveis |

### 6.4 Como reutilizar mock data em testes

Para novos testes, copie as constantes mock diretamente ou importe do dist:

```javascript
// Em testes .test.cjs
const devMockUsers = [
  { id: 1, email: 'admin@juridico.com', role: 'ADM' },
  { id: 2, email: 'advogado@juridico.com', role: 'ADV' },
  { id: 3, email: 'financeiro@juridico.com', role: 'FIN' },
  { id: 4, email: 'atendimento@juridico.com', role: 'ATD' },
];
```

---

## 7. Metas de Cobertura por Módulo

| Camada | Meta Mínima | Prioridade |
|--------|-------------|-----------|
| `authz/` (policies, guards, rbac) | 90% | 🔴 Crítica |
| `finance/` (billing, collections, reconciliation) | 85% | 🔴 Crítica |
| `documents/` (approval, versioning, upload) | 80% | 🟡 Alta |
| `ai/` (summarization, recommendation, drafting) | 80% | 🟡 Alta |
| `bi/` (metrics, exports, snapshots) | 75% | 🟡 Alta |
| `crm/` (conversion, prospecting, process-link) | 75% | 🟡 Alta |
| `timesheet/` (core, approval, reports) | 75% | 🟡 Alta |
| `attendances/` (core, SLA, conversion) | 70% | 🟢 Média |
| `publications/` (pipeline, matching, classification) | 70% | 🟢 Média |
| `triage/` (decision engine, queue) | 70% | 🟢 Média |
| `frontend/src/components/` | 60% | 🟢 Média |
| `frontend/src/hooks/` | 70% | 🟢 Média |
| `frontend/src/api.ts` | 50% | 🟢 Média |

---

## 8. Convenções de Nomenclatura de Testes

### 8.1 Backend (node:test — padrão atual)

```javascript
// Formato: verbo + cenário completo
test('FinanceBillingService generates PIX charge with audit trail and idempotent replay', async () => {});
test('authz matrix allows explicit global sensitive permission for ADM', async () => {});
test('guard throws with the computed decision when permission is denied', async () => {});
```

### 8.2 Backend (Vitest — para novos testes opcionais)

```typescript
describe('DeadlineRiskService', () => {
  it('deve calcular risco crítico quando prazo é amanhã e prioridade é alta', () => {});
  it('deve retornar risco baixo quando prazo é em 30 dias', () => {});
  it('deve considerar carga do advogado na pontuação', () => {});
});
```

### 8.3 Frontend (Vitest + React Testing Library)

```typescript
describe('LoginForm', () => {
  it('deve exibir erro quando email está vazio', () => {});
  it('deve chamar onSubmit com email e senha válidos', () => {});
  it('deve desabilitar botão durante loading', () => {});
});
```

### 8.4 E2E (Playwright)

```typescript
// Formato: ROLE + ação completa
test('ADM consegue abrir a tela de usuários e fazer logout', async ({ page }) => {});
test('FIN consegue executar o fluxo criar lancamento, cobrar e baixar', async ({ page }) => {});
```

---

## 9. Como Executar os Testes

### Backend

```powershell
# Compilar primeiro (obrigatório — testes importam de dist/)
cd backend
npm run build

# Executar todos os testes
node --test src/**/*.test.cjs

# Executar teste específico
node --test src/finance/billing/billing.service.test.cjs

# Com relatório TAP
node --test --test-reporter=tap src/**/*.test.cjs
```

### Frontend (Playwright)

```powershell
cd frontend

# Executar os 4 smoke tests principais
npm run test:smoke

# Executar teste específico
npx playwright test financeiro.smoke.test.ts

# Com UI do Playwright
npx playwright test --ui
```

---

## Anti-padrões

| ❌ Evite | ✅ Prefira |
|----------|-----------|
| Importar diretamente de `src/` nos testes `.cjs` | Importar de `dist/` (após `npm run build`) |
| Mockar Prisma com `jest.mock()` | Usar InMemoryRepository do módulo |
| Testes que dependem de banco real | Repositórios in-memory + dados seed |
| Smoke tests sem tratamento de erro de login | Usar `Promise.race` com shell + authError |
| Seletores CSS frágeis em Playwright | Preferir `data-testid` ou `getByRole` |
| Testes que mutam estado global | Cada test cria suas próprias instâncias |

---

## Checklist para Novos Testes

- [ ] Teste importa do `dist/` (para `.test.cjs`) ou usa Vitest (para `.test.ts`)?
- [ ] Usa InMemoryRepository em vez de mock de Prisma?
- [ ] Dados seed são realistas e compatíveis com os contratos JSON?
- [ ] Teste cobre o happy path E pelo menos 1 caso de erro?
- [ ] Teste verifica idempotência quando aplicável?
- [ ] Assertions são específicas (não apenas `assert.ok(result)`)?
- [ ] Nome do teste descreve o cenário completo?
- [ ] Teste não depende de ordem de execução?
