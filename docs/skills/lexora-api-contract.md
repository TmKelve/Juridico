# Lexora — Contrato de API Frontend ↔ Backend

> Skill: define as regras, padrões e convenções para a comunicação entre o frontend React e o backend Express do Lexora.

---

## 1. Propósito

Este documento é a referência canônica para qualquer agente ou desenvolvedor que precise:
- Criar, alterar ou consumir endpoints da API
- Entender a estrutura de request/response
- Mapear interfaces TypeScript do `api.ts` ao backend
- Garantir compatibilidade com contratos existentes

---

## 2. Catálogo de Contratos

Os 12 arquivos JSON em [contracts/](file:///c:/Users/tomke/app%20Juridico/contracts) definem o contrato formal de cada módulo:

| # | Arquivo | Escopo | Módulos cobertos |
|---|---------|--------|------------------|
| 1 | [epic-a-publications.contract.json](file:///c:/Users/tomke/app%20Juridico/contracts/epic-a-publications.contract.json) | Publicações/Intimações Automáticas | Coleta, normalização, matching, classificação, triagem, automação de prazos/tarefas |
| 2 | [epic-b-finance.contract.json](file:///c:/Users/tomke/app%20Juridico/contracts/epic-b-finance.contract.json) | Financeiro Real | Lançamentos, cobranças, webhook, conciliação, régua de cobrança, parcelamento, relatórios |
| 3 | [epic-fgh.contract.json](file:///c:/Users/tomke/app%20Juridico/contracts/epic-fgh.contract.json) | Triagem + Documentos + Clientes + Comunicação | Triagem inteligente, upload/versionamento de documentos, checklist, aprovação, portal do cliente, comunicação multicanal, consentimento, prospecção |
| 4 | [epic-ij.contract.json](file:///c:/Users/tomke/app%20Juridico/contracts/epic-ij.contract.json) | Tarefas + Atendimentos + Equipe + Permissões | Workflow de tarefas, SLA de atendimentos, conversão, follow-ups, carteiras, portfólios, produtividade, authz |
| 5 | [epic-k.contract.json](file:///c:/Users/tomke/app%20Juridico/contracts/epic-k.contract.json) | IA Jurídica de Produto | Resumos, recomendações, rascunhos, sugestão de checklist, auditoria de IA |
| 6 | [epic-l-bi.contract.json](file:///c:/Users/tomke/app%20Juridico/contracts/epic-l-bi.contract.json) | BI Executivo Avançado | Métricas, snapshots, dashboards, exportação |
| 7 | [epic-m.contract.json](file:///c:/Users/tomke/app%20Juridico/contracts/epic-m.contract.json) | Mobile + Timesheet | Apontamento de horas, aprovação, relatórios de timesheet, feed mobile |
| 8 | [foundation-multitenant.contract.json](file:///c:/Users/tomke/app%20Juridico/contracts/foundation-multitenant.contract.json) | Fundação SaaS Multiempresa | Empresas, memberships, login, contexto de sessão, avaliação de acesso, escopo cross-tenant |
| 9 | [fase-2-commercial-governance.contract.json](file:///c:/Users/tomke/app%20Juridico/contracts/fase-2-commercial-governance.contract.json) | Governança Comercial | Planos, assinaturas, faturamento, transições de status, bloqueios |
| 10 | [fase-3-platform-console.contract.json](file:///c:/Users/tomke/app%20Juridico/contracts/fase-3-platform-console.contract.json) | Console Operacional Plataforma | Gestão de empresas, memberships, convites, suporte, auditoria de plataforma |
| 11 | [fase-3-rollout-enforcement.contract.json](file:///c:/Users/tomke/app%20Juridico/contracts/fase-3-rollout-enforcement.contract.json) | Rollout e Enforcement Global | Backfill de companyId, constraints, auditoria cross-tenant |
| 12 | [publication-origin-rework.contract.json](file:///c:/Users/tomke/app%20Juridico/contracts/publication-origin-rework.contract.json) | Rework de Origem de Publicações | captureRecord, pipeline timeline, correlationId, ações derivadas |

> [!IMPORTANT]
> Cada contrato segue a regra **aditivo somente**: novos campos devem ser opcionais e não podem quebrar payloads existentes consumidos pelo frontend.

---

## 3. Padrões de API

### 3.1 Estrutura de Rotas no Backend

O backend é um monolito Express em [main.ts](file:///c:/Users/tomke/app%20Juridico/backend/src/main.ts) (8218 linhas). As rotas seguem dois padrões:

**Padrão A — Rotas inline (legado, no main.ts)**
```typescript
app.get('/deadlines', async (req, res) => {
  const decoded = getUserFromReq(req);
  if (!decoded) return res.status(401).send({ message: 'Token nao fornecido ou invalido' });
  // ... lógica
  res.json(items);
});
```

**Padrão B — Rotas extraídas (preferido para novos módulos)**
```typescript
// Arquivo: backend/src/finance/http/register-finance-routes.ts
export function registerFinanceRoutes(input: {
  app: express.Express;
  prisma: any;
  getUserFromReq: (req: express.Request) => { sub: number; role: string; email: string } | null;
  devMockEnabled?: boolean;
}) {
  input.app.get('/finance/entries', async (req, res) => { /* ... */ });
  input.app.post('/finance/entries', async (req, res) => { /* ... */ });
}
```

Chamada no main.ts (final do arquivo):
```typescript
registerFinanceRoutes({ app, prisma, getUserFromReq, devMockEnabled });
registerEpicIjRoutes({ app, prisma, getUserFromReq });
registerAiRoutes({ app, getUserFromReq });
registerBiRoutes({ app, getUserFromReq, productivityService, financeService, ... });
registerTimesheetRoutes({ app, getUserFromReq, repository });
registerMobileRoutes({ app, prisma, getUserFromReq, repository });
registerPlatformActionsRoutes({ app, prisma, getUserFromReq });
registerPlatformBillingRoutes({ app, prisma, getUserFromReq });
registerPlatformConsoleRoutes({ app, prisma, getUserFromReq });
```

### 3.2 Convenções de Rota HTTP

| Método | Path | Uso |
|--------|------|-----|
| `GET` | `/module` | Listar recursos |
| `GET` | `/module/:id` | Detalhe de recurso |
| `POST` | `/module` | Criar recurso |
| `PUT` | `/module/:id/status` | Atualizar status |
| `POST` | `/module/:id/action` | Executar ação no recurso |
| `POST` | `/module/:id/settle` | Baixa manual (finance) |
| `POST` | `/module/billing/generate` | Gerar cobrança |
| `POST` | `/module/webhooks/payment` | Webhook externo |
| `GET` | `/module/reports/cashflow` | Relatórios |

### 3.3 Resposta Padrão

**Sucesso (200/201):**
```json
{
  "entry": { "id": 1, "type": "receivable", "status": "open", "..." },
  "auditEvent": { "id": "uuid", "scope": "finance", "action": "finance.entry.create" },
  "idempotency": "created"
}
```

**Erro:**
```json
{
  "message": "Descrição legível do erro",
  "code": "FIN_ENTRY_INVALID",
  "details": { "field": "amountCents", "reason": "Valor deve ser positivo" }
}
```

---

## 4. Tratamento de Erros

### 4.1 Hierarquia de Erros do Backend

Todas as classes de erro customizadas estendem `Error` com campos `code`, `statusCode` e `details`:

```typescript
// Padrão DomainError — regras de negócio
export class DeadlineDomainError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly statusCode = 400,
    readonly retryable = false,
    readonly details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = 'DeadlineDomainError';
  }
}
```

| Classe | Arquivo | Uso |
|--------|---------|-----|
| `CrmContractError` | [crm-opportunity.types.ts](file:///c:/Users/tomke/app%20Juridico/backend/src/crm/opportunities/crm-opportunity.types.ts) | Erros de contrato CRM (oportunidades) |
| `CrmContractError` | [crm-audit.validators.ts](file:///c:/Users/tomke/app%20Juridico/backend/src/crm/audit/crm-audit.validators.ts) | Erros de auditoria CRM |
| `DeadlineDomainError` | [deadline-errors.ts](file:///c:/Users/tomke/app%20Juridico/backend/src/deadlines/deadline-errors.ts) | Regras de prazo |
| `FinanceDomainError` | [errors.ts](file:///c:/Users/tomke/app%20Juridico/backend/src/finance/shared/errors.ts) | Regras financeiras |
| `TaskDomainError` | [task-errors.ts](file:///c:/Users/tomke/app%20Juridico/backend/src/tasks/core/task-errors.ts) | Regras de tarefa |
| `TimeEntryError` | [time-entry.errors.ts](file:///c:/Users/tomke/app%20Juridico/backend/src/timesheet/core/time-entry.errors.ts) | Timesheet |
| `AuthzForbiddenError` | [authz.guard.ts](file:///c:/Users/tomke/app%20Juridico/backend/src/authz/guards/authz.guard.ts) | Permissão negada (403) |
| `CompanyDomainError` | [company.service.ts](file:///c:/Users/tomke/app%20Juridico/backend/src/company/company.service.ts) | Regras de empresa |
| `CompanyContractError` | [company.validators.ts](file:///c:/Users/tomke/app%20Juridico/backend/src/company/company.validators.ts) | Validação de empresa |
| `SubscriptionDomainError` | [subscription.service.ts](file:///c:/Users/tomke/app%20Juridico/backend/src/subscription/subscription.service.ts) | Regras de assinatura |
| `PlanDomainError` | [plan.service.ts](file:///c:/Users/tomke/app%20Juridico/backend/src/plans/plan.service.ts) | Regras de plano |
| `CrossTenantAccessError` | [cross-tenant.guard.ts](file:///c:/Users/tomke/app%20Juridico/backend/src/shared/company-scope/cross-tenant.guard.ts) | Bloqueio cross-tenant |
| `CompanyRequestContextError` | [company-request-context.ts](file:///c:/Users/tomke/app%20Juridico/backend/src/shared/request-context/company-request-context.ts) | Contexto de company faltante |
| `TeamOwnershipError` | [team-ownership.service.ts](file:///c:/Users/tomke/app%20Juridico/backend/src/team/team-ownership.service.ts) | Equipe |
| `PortfolioReassignmentError` | [portfolio-reassignment.service.ts](file:///c:/Users/tomke/app%20Juridico/backend/src/ownership/portfolio-reassignment.service.ts) | Reatribuição de portfólio |
| `ProductivitySnapshotError` | [productivity-snapshot.service.ts](file:///c:/Users/tomke/app%20Juridico/backend/src/productivity/productivity-snapshot.service.ts) | Produtividade |
| `PlatformAuditError` | [platform-audit.service.ts](file:///c:/Users/tomke/app%20Juridico/backend/src/platform/audit/platform-audit.service.ts) | Auditoria de plataforma |
| `PlatformCompanyAccessError` | [company-admin.policy.ts](file:///c:/Users/tomke/app%20Juridico/backend/src/platform/company-admin/company-admin.policy.ts) | Acesso de plataforma |

### 4.2 Padrão de Catch no Handler

```typescript
try {
  const result = await service.execute(command, actor);
  res.status(201).json(result);
} catch (error: any) {
  // Erros de AuthZ retornam 403 com decision
  if (error instanceof AuthzForbiddenError) {
    return res.status(403).json({ message: 'Acesso negado', decision: error.decision });
  }
  // DomainError contém statusCode
  res.status(error?.statusCode ?? 500).send({
    message: error?.message ?? 'Falha ao executar operação',
    code: error?.code,
  });
}
```

### 4.3 Códigos de Erro por Módulo

Os códigos seguem o padrão `PREFIXO_OPERAÇÃO`:
- **FIN_**: Financeiro (`FIN_ENTRY_INVALID`, `FIN_CHARGE_DUPLICATE`, etc.)
- **TRIAGE_**: Triagem (`TRIAGE_DUPLICATE`, `TRIAGE_INVALID_TARGET`)
- **DOCUMENT_**: Documentos (`DOCUMENT_DUPLICATE_UPLOAD`, `DOCUMENT_NOT_FOUND`)
- **TASK_**: Tarefas (`TASK_INVALID`, `TASK_TRANSITION_INVALID`)
- **ATTENDANCE_**: Atendimentos (`ATTENDANCE_CONVERSION_INVALID`)
- **AI_**: IA (`AI_PROVIDER_UNAVAILABLE`, `AI_BUDGET_EXCEEDED`)
- **BI_**: BI (`BI_METRIC_INVALID`, `BI_PERMISSION_DENIED`)
- **TIMESHEET_**: Timesheet (`TIMESHEET_CONFLICT`, `TIMESHEET_PERIOD_CLOSED`)
- **IDEMPOTENCY_CONFLICT**: Transversal a todos os módulos
- **COMPANY_**: Empresa/multi-tenant
- **AUTH_**: Autenticação
- **SUBSCRIPTION_**: Assinatura

---

## 5. Modelo de Autenticação

### 5.1 JWT Cookie-Based

A autenticação usa JWT em cookie httpOnly:

```typescript
// backend/src/auth.ts
export type UserToken = {
  sub: number;    // ID do usuário
  role: string;   // 'ADM' | 'ADV' | 'FIN' | 'ATD'
  email: string;
};

export function signUserToken(user: { id: number; email: string; role: string }) {
  return jwt.sign(
    { sub: user.id, role: user.role, email: user.email },
    JWT_SECRET,
    { expiresIn: '8h' }
  );
}
```

**Cookie definido no login:**
```typescript
res.cookie('Authorization', `Bearer ${token}`, {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' : 'strict',
  maxAge: 8 * 60 * 60 * 1000,  // 8 horas
  path: '/',
});
```

**Extração do token:**
```typescript
function getAuthToken(req: express.Request) {
  // 1. Tenta cookie primeiro
  const cookies = parseCookies(req.headers.cookie);
  const cookieToken = cookies['Authorization'];
  if (cookieToken) return cookieToken.replace('Bearer ', '');
  // 2. Fallback para header Authorization
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  return auth.slice('Bearer '.length);
}
```

### 5.2 Quatro Papéis Tenant

| Papel | Código | Acesso | Descrição |
|-------|--------|--------|-----------|
| Coordenador | `ADM` | Total | Todos os módulos + gestão de usuários |
| Advogado | `ADV` | Operacional | Processos, prazos, documentos, tarefas, CRM, IA |
| Financeiro | `FIN` | Financeiro | Financeiro + visão de processos (somente leitura) |
| Atendimento | `ATD` | Limitado | Atendimentos, clientes, CRM, triagem |

### 5.3 Permissões por Módulo

O sistema de permissões está em [permissions.ts](file:///c:/Users/tomke/app%20Juridico/backend/src/authz/rbac/permissions.ts). Exemplos:

**Permissões de Finanças (`hasFinancePermission`):**
```
finance:view, finance:entry, finance:billing,
finance:settlement, finance:reconciliation, finance:export
```

**Permissões RBAC granulares (`authzPermissionCatalog`):**
```
task.view, task.create, task.update, task.linkEntities,
task.followup.schedule, task.bulkReassignOwner (sensitive),
attendance.view, attendance.create, attendance.updateSla,
attendance.closeOutOfSla (sensitive),
ai.summary.generate, ai.draft.generate (sensitive),
bi.view, bi.snapshot.generate, bi.export.generate (sensitive),
timesheet.entry.create, timesheet.entry.approve (sensitive)
```

### 5.4 Middleware de Autenticação

```typescript
// Padrão usado em rotas inline
const decoded = getUserFromReq(req);
if (!decoded) return res.status(401).send({ message: 'Token nao fornecido ou invalido' });

// Padrão com verificação de permissão (finance)
const requireFinance = (req, res, permission) => {
  const decoded = getUserFromReq(req);
  if (!decoded) { res.status(401)...; return null; }
  if (!hasFinancePermission(decoded.role, permission)) { res.status(403)...; return null; }
  return decoded;
};

// Padrão com AuthZ granular (epic-ij)
const actor = await loadActorContext(prisma, decoded);
ensureAuthorized({
  actor,
  permissionKey: 'task.update',
  resourceType: 'task',
  resourceId: task.id,
  context: {
    ownerUserId: task.ownerUserId,
    teamId: task.teamId,
    portfolioId: task.portfolioId,
    allowedScopes: ['own', 'team', 'portfolio', 'global'],
  },
});
```

---

## 6. Criando Novos Endpoints — Guia Passo a Passo

### Passo 1: Definir contrato no JSON

Adicione o comando ao arquivo de contrato correspondente:
```json
{
  "mymodule.entity.create": {
    "input": {
      "name": "string",
      "processId": "number|null",
      "idempotencyKey": "string|null"
    },
    "output": {
      "entity": "myEntity",
      "auditEvent": "auditEvent",
      "idempotency": "created|replayed"
    },
    "errors": ["MY_ENTITY_INVALID", "IDEMPOTENCY_CONFLICT"],
    "idempotency": {
      "scope": "mymodule.entity.create",
      "dedupeBy": ["scope", "idempotencyKey"]
    }
  }
}
```

### Passo 2: Implementar a rota no backend

Crie um `register*Routes()` para módulos novos:

```typescript
// backend/src/mymodule/http/register-mymodule-routes.ts
import type express from 'express';

export function registerMyModuleRoutes(input: {
  app: express.Express;
  prisma: any;
  getUserFromReq: (req: express.Request) => { sub: number; role: string; email: string } | null;
}) {
  input.app.post('/mymodule/entities', async (req, res) => {
    const decoded = input.getUserFromReq(req);
    if (!decoded) return res.status(401).send({ message: 'Token nao fornecido ou invalido' });

    try {
      const command = {
        name: req.body.name,
        processId: req.body.processId ?? null,
        idempotencyKey: req.body.idempotencyKey ?? null,
      };
      const actor = { source: 'user', userId: decoded.sub, email: decoded.email, role: decoded.role } as const;
      const result = await service.create(command, actor);
      res.status(201).json(result);
    } catch (error: any) {
      res.status(error?.statusCode ?? 500).send({
        message: error?.message ?? 'Falha ao criar entidade',
        code: error?.code,
      });
    }
  });
}
```

### Passo 3: Registrar no main.ts

```typescript
import { registerMyModuleRoutes } from './mymodule/http/register-mymodule-routes';

// No final do arquivo, antes de app.listen:
registerMyModuleRoutes({ app, prisma, getUserFromReq });
```

### Passo 4: Adicionar interface e método no frontend

```typescript
// frontend/src/api.ts

// 1. Adicione a interface de resposta
export interface ApiMyEntity {
  id: number;
  name: string;
  processId: number | null;
  createdAt: string;
}

// 2. Adicione o método no objeto `api`
export const api = {
  // ... métodos existentes
  createMyEntity: (data: { name: string; processId?: number | null }) =>
    apiClient<{ entity: ApiMyEntity }>('/mymodule/entities', {
      method: 'POST',
      body: data,
    }),
};
```

### Passo 5: Consumir no componente React

```typescript
const handleCreate = async () => {
  const res = await api.createMyEntity({ name: 'Teste', processId: 1 });
  if (res.status === 201) {
    // Sucesso
  } else {
    // res.error contém a mensagem
  }
};
```

---

## 7. Type Safety: Frontend ↔ Backend

### 7.1 Mapeamento de Tipos

O [api.ts](file:///c:/Users/tomke/app%20Juridico/frontend/src/api.ts) (2020 linhas) contém todas as interfaces que espelham os payloads do backend:

| Interface Frontend | Builder Backend | Contrato JSON |
|-------------------|-----------------|---------------|
| `ApiFinanceEntry` | `buildFinanceEntryPayload()` | `finance.entry.*` |
| `ApiDeadline` | `buildDeadlinePayload()` | `deadlines.*` |
| `ApiDocument` | `buildDocumentPayload()` | `document.*` |
| `ApiPublication` | `buildPublicationPayload()` | `publication.*` |
| `ApiTask` | `buildTaskPayload()` | `task.*` |
| `ApiTriageItem` | `buildTriageItemPayload()` | `triage.*` |
| `ApiCrmLead` | `buildCrmLeadPayload()` | `crm.lead.*` |
| `ApiCrmOpportunity` | `buildCrmOpportunityPayload()` | `crm.opportunity.*` |
| `ApiAttendance` | `buildLegacyAttendancePayload()` | `attendance.*` |

### 7.2 Cliente API

O `apiClient` é a função base com tipagem genérica:
```typescript
export async function apiClient<T = unknown>(
  path: string,
  options: ApiOptions = {}
): Promise<ApiResponse<T>> {
  // Sempre usa credentials: 'include' para enviar cookies
  // Sempre envia Content-Type: application/json
}
```

Retorno sempre inclui `status`, `data` e opcionalmente `error`:
```typescript
export interface ApiResponse<T = unknown> {
  status: number;
  data: T;
  error?: string;
}
```

---

## 8. Anti-Padrões

> [!CAUTION]
> **NÃO FAÇA:**
> - Criar rotas sem autenticação (`getUserFromReq` é **obrigatório**)
> - Remover campos existentes de payloads — sempre aditivo
> - Ignorar idempotencyKey em mutações — use `IDEMPOTENCY_CONFLICT`
> - Usar `any` em interfaces do api.ts — sempre tipar corretamente
> - Fazer validação apenas no frontend — backend é source of truth
> - Retornar stacktraces em produção
> - Criar classes de erro sem `statusCode` e `code`

---

## 9. Checklist para Novo Endpoint

- [ ] Contrato JSON atualizado com input/output/errors/idempotency
- [ ] Classe de erro criada com `code`, `statusCode`, `details`
- [ ] Rota usa `getUserFromReq()` para autenticação
- [ ] Verificação de permissão adequada ao papel
- [ ] Try/catch com padrão de erro consistente
- [ ] Builder de payload criado (`build*Payload()`)
- [ ] Interface TypeScript adicionada ao `api.ts`
- [ ] Método adicionado ao objeto `api` com tipagem genérica
- [ ] Campos novos são opcionais e aditivos
- [ ] Auditoria registrada para mutações (`auditEvent`)
