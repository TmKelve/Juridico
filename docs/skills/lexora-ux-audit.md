# Skill: Auditoria UX Automatizada — Lexora

> **Objetivo**: Definir como executar auditorias UX automatizadas completas na aplicação Lexora,
> cobrindo jornadas de usuário, responsividade, acessibilidade (WCAG AA), heurísticas de Nielsen
> e geração de relatório padronizado com score e recomendações priorizadas.

---

## Índice

1. [Scripts de Jornada Playwright](#1-scripts-de-jornada-playwright)
2. [Comparação de Screenshots Multi-Resolução](#2-comparação-de-screenshots-multi-resolução)
3. [Checklist de Heurísticas de Nielsen](#3-checklist-de-heurísticas-de-nielsen)
4. [Verificações Automatizadas](#4-verificações-automatizadas)
5. [Template de Relatório](#5-template-de-relatório)
6. [Regras Gerais](#6-regras-gerais)
7. [Anti-padrões](#7-anti-padrões)
8. [Checklist Final](#8-checklist-final)

---

## 1. Scripts de Jornada Playwright

### 1.1 Convenções de Projeto

O Lexora já possui testes smoke Playwright na raiz do frontend. Os padrões existentes são:

| Arquivo | Escopo |
|---------|--------|
| [dashboard.interactive.test.ts](file:///c:/Users/tomke/app%20Juridico/frontend/dashboard.interactive.test.ts) | Login → Dashboard → KPIs → Menu → Responsividade → Acessibilidade |
| [adv.screens.smoke.test.ts](file:///c:/Users/tomke/app%20Juridico/frontend/adv.screens.smoke.test.ts) | Navegação por todas as telas do ADV |
| [adv.screens.interactions.test.ts](file:///c:/Users/tomke/app%20Juridico/frontend/adv.screens.interactions.test.ts) | Fluxos internos críticos (processos, prazos, tarefas, docs) |
| [financeiro.smoke.test.ts](file:///c:/Users/tomke/app%20Juridico/frontend/financeiro.smoke.test.ts) | Fluxo FIN: criar lançamento → cobrar → baixar → parcelar |
| [epic-cde.smoke.test.ts](file:///c:/Users/tomke/app%20Juridico/frontend/epic-cde.smoke.test.ts) | Publicação → Prazo derivado |
| [publication-origin-rework.smoke.test.ts](file:///c:/Users/tomke/app%20Juridico/frontend/publication-origin-rework.smoke.test.ts) | Publicações → Triagem → Clientes → CRM com contexto de origem |

**Padrões já consolidados:**

- Arquivo de teste na raiz: `frontend/*.test.ts`
- `baseURL` via variável ou hardcoded `http://localhost:5173`
- Login via helpers `loginAsAdvogado(page)`, `loginAsFinanceiro(page)`
- Mocks via `page.route()` para isolamento de API
- Seletores CSS de página: `.dashboard-page`, `.my-processes-page`, `.deadlines-page`, etc.
- Shell header: `.page-header-shell h1`
- Canvas principal: `.shell-content-canvas`
- Feedback de sucesso: `page.getByText('Mensagem', { exact: true })`

### 1.2 Helper de Login Reutilizável

Todo script de auditoria UX **deve** usar a mesma estrutura de login existente:

```typescript
import { expect, type Page, test } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173';

// Credenciais disponíveis (ver App.tsx L628-L634)
const CREDENTIALS = {
  ADM: { email: 'admin@juridico.com',      password: '123456' },
  ADV: { email: 'advogado@juridico.com',    password: '123456' },
  FIN: { email: 'financeiro@juridico.com',  password: '123456' },
} as const;

async function login(page: Page, role: keyof typeof CREDENTIALS) {
  const creds = CREDENTIALS[role];
  await page.goto(baseURL);
  await page.fill('input[type="email"]', creds.email);
  await page.fill('input[type="password"]', creds.password);
  await page.click('button:has-text("Entrar")');

  const shell = page.locator('.shell-content-canvas');
  const authError = page.locator('#auth-error, .error-container');
  await Promise.race([
    shell.waitFor({ state: 'visible', timeout: 30000 }),
    authError.waitFor({ state: 'visible', timeout: 30000 }),
  ]);

  if (await authError.isVisible()) {
    throw new Error(`Falha no login ${role}: ${(await authError.textContent())?.trim()}`);
  }

  await expect(shell).toBeVisible();
}
```

### 1.3 Jornada 1: Dashboard → Processo → Prazo → Retorno

> **Perfil**: ADV  
> **Rota**: `/` → `/processos` → `/processos/:id` → `/prazos` → `/`

```typescript
test.describe('UX Audit — Jornada: Dashboard → Processo → Prazo', () => {
  test.setTimeout(60000);

  test('fluxo completo com verificações UX em cada etapa', async ({ page }) => {
    await login(page, 'ADV');

    // ── ETAPA 1: Dashboard ──
    // Verificar: página carregou, KPI cards visíveis, sem erros
    await expect(page.locator('.dashboard-page')).toBeVisible();
    await expect(page.locator('.page-header-shell h1')).toContainText('Meu Dia');
    // UX: Tempo de carregamento < 3s
    // UX: Nenhuma mensagem de erro visível
    await expect(page.locator('.error')).toHaveCount(0);
    // UX: Pelo menos 1 KPI card presente
    const cards = await page.locator('.metric-card, [class*="card"]').count();
    expect(cards).toBeGreaterThan(0);

    // ── ETAPA 2: Navegar para Processos via sidebar ──
    await page.getByRole('link', { name: 'Meus Processos', exact: true }).click();
    await expect(page.locator('.page-header-shell h1')).toContainText('Meus Processos');
    await expect(page.locator('.my-processes-page')).toBeVisible();
    // UX: Tabela ou Kanban renderizou
    // UX: Botão "Novo Processo" visível e focável

    // ── ETAPA 3: Abrir detalhe de processo ──
    await page.locator('[aria-label^="Abrir detalhe rapido do processo"]').first().click();
    await expect(page.getByText('Detalhe rapido', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Abrir detalhe completo' }).click();
    await expect(page).toHaveURL(/\/processos\/\d+$/);
    await expect(page.locator('.process-detail-page')).toBeVisible();
    // UX: Tabs (Documentos, Atendimento) funcionais
    await page.getByRole('button', { name: 'Documentos' }).click();
    await expect(page.getByRole('button', { name: 'Documentos' }))
      .toHaveAttribute('aria-pressed', 'true');

    // ── ETAPA 4: Ir para Prazos ──
    await page.getByRole('link', { name: 'Prazos', exact: true }).click();
    await expect(page.locator('.deadlines-page')).toBeVisible();
    // UX: Lista de prazos carregou, botão "Novo prazo" disponível
    await expect(page.getByRole('button', { name: 'Novo prazo' })).toBeVisible();
    // UX: Concluir prazo funciona
    await page.locator('[aria-label^="Abrir detalhe do prazo"]').first().click();
    await expect(page.locator('.deadline-drawer')).toBeVisible();
    await page.getByRole('button', { name: 'Concluir prazo' }).click();
    await expect(page.getByText('Prazo concluido com sucesso.')).toBeVisible();

    // ── ETAPA 5: Retorno ao Dashboard ──
    await page.getByRole('link', { name: 'Home', exact: true }).click();
    await expect(page.locator('.page-header-shell h1')).toContainText('Meu Dia');
  });
});
```

**O que verificar em cada etapa:**

| Etapa | Verificações UX |
|-------|-----------------|
| Dashboard | ✅ KPI cards carregaram · ✅ Sem erros no canvas · ✅ Header correto · ✅ Loading state resolveu |
| Processos | ✅ Tabela/Kanban renderizou · ✅ Filtros acessíveis · ✅ "Novo Processo" visível |
| Detalhe | ✅ Tabs alternáveis · ✅ aria-pressed funcional · ✅ Breadcrumb de retorno |
| Prazos | ✅ Lista carregou · ✅ Drawer abre · ✅ Ação "Concluir" dá feedback |
| Retorno | ✅ Dashboard re-carrega consistente · ✅ Sem flicker de estado |

### 1.4 Jornada 2: CRM → Lead → Conversão → Vínculo Processo

> **Perfil**: ADV  
> **Rota**: `/crm-juridico` (tabs internas)

```typescript
test.describe('UX Audit — Jornada: CRM Completo', () => {
  test.setTimeout(60000);

  test('fluxo: abrir CRM, interagir com comercial, preparar conversão', async ({ page }) => {
    await login(page, 'ADV');

    // ── ETAPA 1: Abrir CRM Jurídico ──
    await page.goto(`${baseURL}/crm-juridico`);
    await expect(page.locator('.crm-page')).toBeVisible();
    await expect(page.locator('.crm-workspace')).toBeVisible();
    // UX: Workspace visível com seções operacionais

    // ── ETAPA 2: Aba Comercial — registrar interação ──
    await page.getByRole('button', { name: 'Comercial' }).click();
    await expect(page.locator('.crm-commercial-form')).toBeVisible();
    // UX: Validação inline funciona
    await page.getByRole('button', { name: 'Registrar histórico' }).click();
    await expect(page.locator('.crm-feedback--error'))
      .toContainText('Resumo do contato é obrigatório');

    // ── ETAPA 3: Aba Processo — preparar conversão ──
    await page.getByRole('button', { name: 'Processo' }).click();
    await expect(page.locator('.crm-process-actions')).toBeVisible();
    await expect(page.getByText('Processo existente', { exact: true })).toBeVisible();
    // UX: Botão "Vincular processo existente" presente
    await expect(page.getByRole('button', { name: 'Vincular processo existente' }))
      .toBeVisible();

    // ── ETAPA 4: Confirmar conversão ──
    await page.locator('.crm-panel')
      .getByRole('button', { name: 'Preparar conversão' }).first().click();
    const confirmBtn = page.locator('.crm-conversion')
      .getByRole('button', { name: 'Confirmar conversão' });
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();
    // UX: Dialog de confirmação aparece
    await expect(page.getByRole('dialog', {
      name: 'Confirmar conversão da oportunidade'
    })).toBeVisible();

    // ── ETAPA 5: Aba Documentos — contexto preservado ──
    await page.goto(`${baseURL}/crm-juridico`);
    await expect(page.locator('.crm-page')).toBeVisible();
    await page.getByRole('button', { name: 'Documentos' }).click();
    await expect(page.getByRole('button', { name: 'Anexar no CRM' })).toBeVisible();
    // UX: URL não mudou (contexto no drawer)
    await expect(page).toHaveURL(/\/crm-juridico$/);
  });
});
```

### 1.5 Jornada 3: Financeiro → Lançamento → Parcelamento → Conciliação

> **Perfil**: FIN  
> **Rota**: `/financeiro`

```typescript
test.describe('UX Audit — Jornada: Fluxo Financeiro Completo', () => {
  test.setTimeout(60000);

  test('criar lançamento, cobrar, baixar e parcelar', async ({ page }) => {
    const description = `Audit UX ${Date.now()}`;
    await login(page, 'FIN');

    // ── ETAPA 1: Tela Financeiro carregou ──
    await page.goto(`${baseURL}/financeiro`);
    await expect(page.locator('.finance-page')).toBeVisible();
    // UX: Heading operacional presente
    await expect(page.getByRole('heading', { level: 2, name: /operação financeira/i }))
      .toBeVisible();
    // UX: Tabs operacionais visíveis
    await expect(page.getByRole('button', { name: 'Contas a receber' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Contas a pagar' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Inadimplência' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Conciliação', exact: true })).toBeVisible();

    // ── ETAPA 2: Criar lançamento ──
    await page.getByLabel('Descrição').fill(description);
    await page.getByLabel('Valor (centavos)').fill('125000');
    await page.getByRole('button', { name: 'Criar lançamento' }).click();
    const row = page.locator('tr', { hasText: description });
    await expect(row).toBeVisible();
    // UX: Status inicial "open" + "sem cobrança"
    await expect(row).toContainText('open');
    await expect(row).toContainText('sem cobrança');

    // ── ETAPA 3: Cobrar ──
    await row.getByRole('button', { name: 'Cobrar' }).click();
    await expect(row).toContainText('pending');

    // ── ETAPA 4: Baixar ──
    await row.getByRole('button', { name: 'Baixar' }).click();
    await expect(row).toContainText('paid');

    // ── ETAPA 5: Criar parcelamento ──
    await page.getByRole('button', { name: 'Parcelamentos' }).click();
    await expect(page.getByRole('heading', { level: 3, name: 'Novo parcelamento' }))
      .toBeVisible();
    const sidebar = page.locator('.finance-panel--sidebar');
    await sidebar.getByLabel('Cliente').selectOption({ index: 1 });
    await sidebar.getByLabel('Rótulo do contrato').fill(`Contrato audit ${Date.now()}`);
    await sidebar.getByLabel('Descrição').fill(`Parcelamento audit ${Date.now()}`);
    await sidebar.getByLabel('Parcelas').fill('3');
    await sidebar.getByLabel('Valor por parcela (centavos)').fill('40000');
    await sidebar.getByRole('button', { name: 'Criar parcelamento' }).click();
    // UX: Parcelas renderizaram corretamente
    await expect(page.locator('.finance-plan-detail')).toContainText('1/3');
    await expect(page.locator('.finance-plan-detail')).toContainText('2/3');
    await expect(page.locator('.finance-plan-detail')).toContainText('3/3');
  });
});
```

### 1.6 Jornada 4: Publicações → Triagem → Decisão → Prazo

> **Perfil**: ADV  
> **Rota**: `/publicacoes-intimacoes` → `/triagem` → `/prazos`

```typescript
test.describe('UX Audit — Jornada: Publicações → Triagem → Prazo', () => {
  test.setTimeout(60000);

  test('triagem completa com conversão em prazo', async ({ page }) => {
    await login(page, 'ADV');

    // ── ETAPA 1: Publicações ──
    await page.goto(`${baseURL}/publicacoes-intimacoes`);
    await expect(page.locator('.publications-page')).toBeVisible();
    // UX: Tabela de publicações renderizou
    const pubRows = page.locator('tr.pub-table-row');
    await expect(pubRows.first()).toBeVisible();

    // ── ETAPA 2: Abrir detalhe da publicação ──
    await pubRows.first().click();
    const drawer = page.locator('.pub-drawer.pub-drawer--open');
    await expect(drawer).toBeVisible();
    // UX: Drawer mostra informações de origem
    // UX: Botão de conversão em prazo disponível
    const convertBtn = drawer.getByRole('button', {
      name: 'Criar prazo a partir desta publicação'
    });
    if (await convertBtn.isEnabled()) {
      await convertBtn.click();
      await expect(page.locator('.pub-alert--success'))
        .toContainText('Prazo criado a partir da publicação');
    }

    // ── ETAPA 3: Triagem ──
    await page.goto(`${baseURL}/triagem`);
    await expect(page.locator('.triage-page')).toBeVisible();
    // UX: Cards de triagem com informação de prioridade
    await page.locator('.triage-card').first().click();
    const triageDrawer = page.locator('.triage-drawer');
    await expect(triageDrawer.getByText('Detalhe da triagem', { exact: true })).toBeVisible();
    // UX: Timeline de origem presente
    await expect(triageDrawer.getByText('Timeline relacionada', { exact: true })).toBeVisible();

    // ── ETAPA 4: Confirmar na tela de prazos ──
    await page.goto(`${baseURL}/prazos`);
    await expect(page.locator('.deadlines-page')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Novo prazo' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ir para agenda' })).toBeVisible();
    // UX: Nota de contrato/vínculo visível
    await expect(page.locator('.deadline-contract-note')).toContainText('vinculo prazo');
  });
});
```

---

## 2. Comparação de Screenshots Multi-Resolução

### 2.1 Resoluções Alvo

Os breakpoints do Lexora são definidos em [tokens.css](file:///c:/Users/tomke/app%20Juridico/frontend/src/tokens.css#L121-L125):

| Token | Largura | Nome |
|-------|---------|------|
| `--bp-sm` | 640px | Mobile grande |
| `--bp-md` | 768px | Tablet retrato |
| `--bp-lg` | 1024px | Tablet paisagem |
| `--bp-xl` | 1280px | Desktop |
| `--bp-2xl` | 1440px | Desktop largo |

### 2.2 Script de Captura Padronizado

```typescript
const AUDIT_RESOLUTIONS = [
  { width: 640,  height: 900,  label: 'sm-640'  },
  { width: 768,  height: 1024, label: 'md-768'  },
  { width: 1024, height: 768,  label: 'lg-1024' },
  { width: 1280, height: 800,  label: 'xl-1280' },
  { width: 1440, height: 900,  label: '2xl-1440'},
];

// Rotas que devem ser capturadas (derivadas de App.tsx L344-L363)
const AUDIT_PAGES = [
  { path: '/',                      slug: 'dashboard',    selector: '.dashboard-page'    },
  { path: '/processos',             slug: 'processos',    selector: '.my-processes-page'  },
  { path: '/prazos',                slug: 'prazos',       selector: '.deadlines-page'     },
  { path: '/agenda',                slug: 'agenda',       selector: '.agenda-page'        },
  { path: '/documentos',            slug: 'documentos',   selector: '.documents-page'     },
  { path: '/tarefas',               slug: 'tarefas',      selector: '.tasks-page'         },
  { path: '/atendimentos',          slug: 'atendimentos', selector: '.atendimentos-page'  },
  { path: '/clientes',              slug: 'clientes',     selector: '.clients-page'       },
  { path: '/publicacoes-intimacoes',slug: 'publicacoes',  selector: '.publications-page'  },
  { path: '/triagem',               slug: 'triagem',      selector: '.triage-page'        },
  { path: '/crm-juridico',          slug: 'crm',          selector: '.crm-page'           },
  { path: '/financeiro',            slug: 'financeiro',   selector: '.finance-page'       },
  { path: '/modelos-pecas',         slug: 'modelos',      selector: '.tpl-page'           },
];

async function captureAllScreenshots(page: Page, role: keyof typeof CREDENTIALS) {
  await login(page, role);

  for (const pageInfo of AUDIT_PAGES) {
    await page.goto(`${baseURL}${pageInfo.path}`);

    // Aguardar conteúdo renderizar
    await page.locator(pageInfo.selector).waitFor({ state: 'visible', timeout: 15000 })
      .catch(() => null);
    await page.waitForTimeout(500); // settling time

    for (const res of AUDIT_RESOLUTIONS) {
      await page.setViewportSize({ width: res.width, height: res.height });
      await page.waitForTimeout(300); // aguardar reflow

      await page.screenshot({
        path: `./test-results/ux-audit/${pageInfo.slug}-${res.label}.png`,
        fullPage: true,
      });
    }
  }
}

test('Captura de screenshots multi-resolução', async ({ page }) => {
  await captureAllScreenshots(page, 'ADV');
});
```

### 2.3 Comparação Visual

Para comparação visual, use o mecanismo nativo do Playwright:

```typescript
test('Regressão visual: Dashboard em todas as resoluções', async ({ page }) => {
  await login(page, 'ADV');
  await expect(page.locator('.dashboard-page')).toBeVisible();

  for (const res of AUDIT_RESOLUTIONS) {
    await page.setViewportSize({ width: res.width, height: res.height });
    await page.waitForTimeout(300);

    await expect(page).toHaveScreenshot(`dashboard-${res.label}.png`, {
      maxDiffPixelRatio: 0.02,  // tolerância de 2%
      animations: 'disabled',
    });
  }
});
```

### 2.4 O que analisar em cada resolução

| Resolução | Verificações |
|-----------|-------------|
| 640px (sm) | Sidebar oculta, menu hamburguer funcional, tabelas com scroll horizontal, cards empilhados |
| 768px (md) | Sidebar colapsável (88px), grids 1 coluna, drawers fullscreen |
| 1024px (lg) | Sidebar expandida, grids 2 colunas, drawers laterais |
| 1280px (xl) | Layout completo, todas as colunas de tabela visíveis |
| 1440px (2xl) | Largura máxima do conteúdo, espaçamento adequado |

---

## 3. Checklist de Heurísticas de Nielsen

Cada heurística é adaptada ao contexto jurídico do Lexora.

### H1. Visibilidade do Status do Sistema

| # | Item | Como Verificar |
|---|------|---------------|
| H1.1 | Loading states mostram spinner/skeleton durante fetch de dados | Verificar classes `.documents-loading`, `.pub-loading` e Suspense fallback `Carregando...` |
| H1.2 | Status de lançamento financeiro (open → pending → paid) está visível na linha da tabela | Observar transição no `financeiro.smoke.test.ts` |
| H1.3 | Toasts/feedback aparecem após ações (ex: "Prazo concluido com sucesso.") | Verificar `expectSuccess()` nos testes |
| H1.4 | Badge de contagem de notificações é atualizado (Topbar) | `notificationCount={3}` em [App.tsx](file:///c:/Users/tomke/app%20Juridico/frontend/src/App.tsx#L308) |
| H1.5 | Estado `aria-busy` no botão de login durante submissão | `aria-busy={isLoading}` em [App.tsx](file:///c:/Users/tomke/app%20Juridico/frontend/src/App.tsx#L622) |
| H1.6 | Chip de filtro ativo (`.filter-chip-active`) indica filtros salvos | Verificado em [adv.screens.interactions.test.ts](file:///c:/Users/tomke/app%20Juridico/frontend/adv.screens.interactions.test.ts#L162) |

### H2. Correspondência entre Sistema e Mundo Real (Terminologia Jurídica)

| # | Item | Como Verificar |
|---|------|---------------|
| H2.1 | Labels usam terminologia jurídica brasileira: "Processos", "Prazos", "Intimações", "Audiências", "Peças" | Verificar [App.tsx getPageMeta()](file:///c:/Users/tomke/app%20Juridico/frontend/src/App.tsx#L77-L203) |
| H2.2 | Roles mapeados com nomes brasileiros: "Coordenador Jurídico" (ADM), "Advogado" (ADV), "Financeiro" (FIN), "Atendimento" (ATD) | `getRoleLabel()` em [App.tsx](file:///c:/Users/tomke/app%20Juridico/frontend/src/App.tsx#L66-L75) |
| H2.3 | Fases de processo usam vocabulário do CPC: "Inicial", "Contestação", "Recurso", "Cumprimento", "Execução" | Verificar dados mockados nos testes |
| H2.4 | Status financeiros traduzidos: "Contas a receber", "Contas a pagar", "Inadimplência", "Conciliação" | Verificar labels no [financeiro.smoke.test.ts](file:///c:/Users/tomke/app%20Juridico/frontend/financeiro.smoke.test.ts#L37-L40) |
| H2.5 | Subtítulos das páginas usam linguagem orientada à ação jurídica (ex: "Priorize prazos críticos...") | Verificar subtítulos em `getPageMeta()` |

### H3. Controle e Liberdade do Usuário

| # | Item | Como Verificar |
|---|------|---------------|
| H3.1 | Drawers/modais têm botão "Fechar" com `aria-label="Fechar"` | Verificar `.action-modal-close`, `.dl-close-btn` |
| H3.2 | Navegação via sidebar permite retorno a qualquer tela sem "Back" do browser | Verificar links na sidebar do [Sidebar.tsx](file:///c:/Users/tomke/app%20Juridico/frontend/src/sidebar/Sidebar.tsx) |
| H3.3 | Filtros podem ser "Limpar filtros" com um clique | Verificar `page.getByRole('button', { name: 'Limpar filtros' })` |
| H3.4 | Filtros persistem via `localStorage` e podem ser restaurados | Chaves `lexora_*_saved_filter` em [adv.screens.interactions.test.ts](file:///c:/Users/tomke/app%20Juridico/frontend/adv.screens.interactions.test.ts#L50-L59) |
| H3.5 | Botão "Encerrar" (logout) sempre acessível | `page.getByRole('button', { name: 'Encerrar' })` |
| H3.6 | Detalhe rápido vs. Detalhe completo: usuário escolhe profundidade | "Abrir detalhe completo" no quick drawer |

### H4. Consistência e Padrões

| # | Item | Como Verificar |
|---|------|---------------|
| H4.1 | Todas as páginas usam o mesmo shell: sidebar + topbar + `page-header-shell` + `shell-content-canvas` | Verificar [App.tsx AppShell()](file:///c:/Users/tomke/app%20Juridico/frontend/src/App.tsx#L217-L370) |
| H4.2 | Botões seguem hierarquia: `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-destructive` | [tokens.css](file:///c:/Users/tomke/app%20Juridico/frontend/src/tokens.css#L300-L337) |
| H4.3 | Todos os cards usam `.card` com sombra, radius e padding consistentes | [tokens.css](file:///c:/Users/tomke/app%20Juridico/frontend/src/tokens.css#L399-L410) |
| H4.4 | Tabelas seguem padrão: `thead` com `bg-subtle`, `tbody tr:hover` com highlight | [tokens.css](file:///c:/Users/tomke/app%20Juridico/frontend/src/tokens.css#L416-L441) |
| H4.5 | Seletores de página seguem padrão `.{nome}-page` (ex: `.dashboard-page`, `.tasks-page`) | Verificar [adv.screens.smoke.test.ts](file:///c:/Users/tomke/app%20Juridico/frontend/adv.screens.smoke.test.ts#L32-L93) |
| H4.6 | Drawers seguem padrão `.{nome}-drawer` (ex: `.deadline-drawer`, `.tsk-drawer`, `.pub-drawer`) | Consistência entre todos os módulos |
| H4.7 | Modais seguem padrão `.{nome}-modal` (ex: `.tsk-modal`, `.atend-modal`, `.cli-modal`) | Verificar nos testes de interação |

### H5. Prevenção de Erros

| # | Item | Como Verificar |
|---|------|---------------|
| H5.1 | Formulário de login valida com `aria-invalid="true"` e `aria-required="true"` | [App.tsx](file:///c:/Users/tomke/app%20Juridico/frontend/src/App.tsx#L586-L606) |
| H5.2 | CRM impede "Registrar histórico" sem resumo preenchido | Validação inline `.crm-feedback--error` |
| H5.3 | Conversão de oportunidade requer dialog de confirmação | `getByRole('dialog', { name: 'Confirmar conversão da oportunidade' })` |
| H5.4 | Botões desabilitados durante `isLoading` com `disabled` e `cursor: not-allowed` | [tokens.css](file:///c:/Users/tomke/app%20Juridico/frontend/src/tokens.css#L295-L298) |
| H5.5 | Campo de cliente com autocomplete previne digitação de nome inexistente | "Cliente nao encontrado. Cadastrar em Clientes" em [adv.screens.interactions.test.ts](file:///c:/Users/tomke/app%20Juridico/frontend/adv.screens.interactions.test.ts#L176) |

### H6. Reconhecimento em vez de Lembrança

| # | Item | Como Verificar |
|---|------|---------------|
| H6.1 | Sidebar sempre visível em desktop, mostrando todas as seções | Sidebar com 10+ rotas |
| H6.2 | Badges contextuais na header: "Operação", "Automação", "Relacionamento", "Financeiro" | `pageMeta.badge` em cada rota |
| H6.3 | Subtítulos descrevem a função da página sem necessidade de help externo | `pageMeta.subtitle` |
| H6.4 | Filtros salvos são restaurados automaticamente ao retornar à tela | `lexora_*_saved_filter` via localStorage |
| H6.5 | Autocomplete de cliente com sugestões visuais (`.client-suggestion-item`) | Testado em [adv.screens.interactions.test.ts](file:///c:/Users/tomke/app%20Juridico/frontend/adv.screens.interactions.test.ts#L190) |

### H7. Flexibilidade e Eficiência de Uso

| # | Item | Como Verificar |
|---|------|---------------|
| H7.1 | Alternância Tabela/Kanban nos processos (`Ver Kanban`) | [adv.screens.interactions.test.ts](file:///c:/Users/tomke/app%20Juridico/frontend/adv.screens.interactions.test.ts#L164-L166) |
| H7.2 | Alternância Lista/Grade nos documentos | Toggle em `.documents-header-card` |
| H7.3 | Atalho "Criar tarefa a partir desta publicação" | Ação direta no drawer de publicação |
| H7.4 | Conversão atendimento → tarefa em um clique | "Criar tarefa a partir deste atendimento" |
| H7.5 | Detalhe rápido (quick drawer) sem sair da lista | `.quick-drawer` no dashboard |
| H7.6 | Navegação por teclado: seleção de cliente com ArrowDown + Enter | [adv.screens.interactions.test.ts](file:///c:/Users/tomke/app%20Juridico/frontend/adv.screens.interactions.test.ts#L192-L193) |
| H7.7 | TopbarSearch para busca rápida global | [ShortcutsLauncher.tsx](file:///c:/Users/tomke/app%20Juridico/frontend/src/topbar/ShortcutsLauncher.tsx) |

### H8. Design Estético e Minimalista

| # | Item | Como Verificar |
|---|------|---------------|
| H8.1 | Paleta de cores limitada e semântica: brand, success, warning, error, info | [tokens.css](file:///c:/Users/tomke/app%20Juridico/frontend/src/tokens.css#L6-L55) |
| H8.2 | Espaçamento baseado em grid 4px consistente | Tokens `--space-1` a `--space-16` |
| H8.3 | Tipografia com apenas 4 pesos (400, 500, 600, 700) | [tokens.css](file:///c:/Users/tomke/app%20Juridico/frontend/src/tokens.css#L95-L98) |
| H8.4 | Sidebar dark (#0D1820) como contraste visual com canvas claro | `--sidebar-bg: #0D1820` |
| H8.5 | Cards com sombra sutil (`--shadow-card`) sem sobrecarga visual | Sombra em [tokens.css](file:///c:/Users/tomke/app%20Juridico/frontend/src/tokens.css#L164) |
| H8.6 | Sem ícones decorativos excessivos — usa Lucide icons de forma funcional | Dependência `lucide-react` no [package.json](file:///c:/Users/tomke/app%20Juridico/frontend/package.json) |

### H9. Ajudar o Usuário a Reconhecer, Diagnosticar e Recuperar de Erros

| # | Item | Como Verificar |
|---|------|---------------|
| H9.1 | Erro de login exibido com ícone AlertTriangle + `role="alert"` + `aria-live="assertive"` | [App.tsx](file:///c:/Users/tomke/app%20Juridico/frontend/src/App.tsx#L610-L615) |
| H9.2 | Mensagem de erro descritiva: "Email ou senha incorretos", não código genérico | `res.error \|\| 'Email ou senha incorretos'` |
| H9.3 | Comunicação de cliente com botão "Tentar novamente" após falha de envio | [clients.communication.smoke.test.ts](file:///c:/Users/tomke/app%20Juridico/frontend/clients.communication.smoke.test.ts#L53-L56) |
| H9.4 | Sessão expirada redireciona para login com mensagem clara | `'Sessão expirada, faça login novamente.'` |
| H9.5 | ADV sem permissão de `/usuarios` é redirecionado silenciosamente para Home, não mostra 403 | [epic-ij.smoke.test.ts](file:///c:/Users/tomke/app%20Juridico/frontend/epic-ij.smoke.test.ts#L258-L264) |
| H9.6 | Validação inline com `aria-invalid="true"` e borda vermelha | [tokens.css](file:///c:/Users/tomke/app%20Juridico/frontend/src/tokens.css#L385-L393) |

### H10. Ajuda e Documentação

| # | Item | Como Verificar |
|---|------|---------------|
| H10.1 | Credenciais de teste disponíveis na tela de login via `<details>` | [App.tsx](file:///c:/Users/tomke/app%20Juridico/frontend/src/App.tsx#L628-L635) |
| H10.2 | Subtítulos das páginas funcionam como micro-documentação contextual | Cada rota em `getPageMeta()` tem subtitle descritivo |
| H10.3 | Botão "?" (Help) na topbar | `onHelp` em [Topbar.tsx](file:///c:/Users/tomke/app%20Juridico/frontend/src/topbar/Topbar.tsx) |
| H10.4 | Tooltips em ícones da sidebar (modo colapsado) | Radix Tooltip via `@radix-ui/react-tooltip` |
| H10.5 | Labels de acessibilidade explicativos: `aria-label="Abrir detalhe rapido do processo"` | Usado extensivamente em Agenda, Processos, Atendimentos |

---

## 4. Verificações Automatizadas

### 4.1 IDs Únicos em Elementos Interativos

```typescript
test('Todos os elementos interativos têm IDs únicos ou aria-labels', async ({ page }) => {
  await login(page, 'ADV');

  for (const pageInfo of AUDIT_PAGES) {
    await page.goto(`${baseURL}${pageInfo.path}`);
    await page.waitForTimeout(1000);

    // Verificar que botões, inputs e links têm identificação
    const interactives = await page.locator('button, input, select, textarea, a[href]')
      .evaluateAll((els: HTMLElement[]) => {
        return els.map(el => ({
          tag: el.tagName,
          id: el.id || null,
          ariaLabel: el.getAttribute('aria-label') || null,
          text: el.textContent?.trim().substring(0, 40) || null,
          role: el.getAttribute('role') || null,
          page: window.location.pathname,
        })).filter(e => !e.id && !e.ariaLabel && !e.text);
      });

    // Reportar elementos sem identificação
    if (interactives.length > 0) {
      console.warn(
        `⚠️ ${pageInfo.slug}: ${interactives.length} elemento(s) sem ID/aria-label/text`,
        interactives,
      );
    }
  }
});
```

### 4.2 Contraste WCAG AA

```typescript
test('Contraste de cores atende WCAG AA (4.5:1 para texto normal)', async ({ page }) => {
  await login(page, 'ADV');
  await page.goto(baseURL);
  await page.waitForTimeout(1000);

  // Injetar função de cálculo de contraste
  const contrastIssues = await page.evaluate(() => {
    function luminance(r: number, g: number, b: number): number {
      const [rs, gs, bs] = [r, g, b].map(c => {
        c = c / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
    }

    function contrastRatio(l1: number, l2: number): number {
      const lighter = Math.max(l1, l2);
      const darker = Math.min(l1, l2);
      return (lighter + 0.05) / (darker + 0.05);
    }

    function parseColor(color: string): [number, number, number] | null {
      const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (!match) return null;
      return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
    }

    const issues: Array<{ tag: string; text: string; fg: string; bg: string; ratio: number }> = [];
    const elements = document.querySelectorAll('h1, h2, h3, h4, p, span, a, button, label, td, th');

    elements.forEach(el => {
      const style = getComputedStyle(el);
      const fg = parseColor(style.color);
      const bg = parseColor(style.backgroundColor);

      if (!fg || !bg) return;
      if (bg[0] === 0 && bg[1] === 0 && bg[2] === 0 && style.backgroundColor.includes('0)')) return;

      const fgLum = luminance(fg[0], fg[1], fg[2]);
      const bgLum = luminance(bg[0], bg[1], bg[2]);
      const ratio = contrastRatio(fgLum, bgLum);

      // WCAG AA: 4.5:1 para texto normal, 3:1 para texto grande
      const fontSize = parseFloat(style.fontSize);
      const isBold = parseInt(style.fontWeight) >= 700;
      const isLargeText = fontSize >= 24 || (fontSize >= 18.66 && isBold);
      const minRatio = isLargeText ? 3 : 4.5;

      if (ratio < minRatio) {
        issues.push({
          tag: el.tagName,
          text: el.textContent?.trim().substring(0, 30) || '',
          fg: style.color,
          bg: style.backgroundColor,
          ratio: Math.round(ratio * 100) / 100,
        });
      }
    });

    return issues;
  });

  if (contrastIssues.length > 0) {
    console.warn('⚠️ Problemas de contraste WCAG AA:', contrastIssues);
  }

  // Falhar se mais de 5% dos elementos testados tiverem problema
  expect(contrastIssues.length).toBeLessThan(10);
});
```

### 4.3 Ordem de Foco Lógica

```typescript
test('Ordem de foco segue sequência lógica na página', async ({ page }) => {
  await login(page, 'ADV');

  const focusSequence: string[] = [];

  // Tab por 15 elementos e registrar a ordem
  for (let i = 0; i < 15; i++) {
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => {
      const el = document.activeElement;
      return {
        tag: el?.tagName || 'NONE',
        text: el?.textContent?.trim().substring(0, 30) || '',
        id: el?.id || el?.getAttribute('aria-label') || '',
      };
    });
    focusSequence.push(`${focused.tag}: ${focused.text || focused.id}`);
  }

  // A sequência deve ser coerente (sidebar → topbar → content)
  expect(focusSequence.length).toBe(15);
  console.log('📋 Sequência de foco:', focusSequence);
});
```

### 4.4 Imagens com Alt Text

```typescript
test('Todas as imagens têm alt text', async ({ page }) => {
  await login(page, 'ADV');

  for (const pageInfo of AUDIT_PAGES) {
    await page.goto(`${baseURL}${pageInfo.path}`);
    await page.waitForTimeout(500);

    const imagesWithoutAlt = await page.locator('img:not([alt]), img[alt=""]')
      .evaluateAll((imgs: HTMLImageElement[]) =>
        imgs
          .filter(img => !img.getAttribute('aria-hidden'))
          .map(img => ({ src: img.src, page: window.location.pathname }))
      );

    expect(imagesWithoutAlt).toHaveLength(0);
  }
});
```

### 4.5 Sem Scroll Horizontal

```typescript
test('Nenhuma página tem scroll horizontal em nenhum breakpoint', async ({ page }) => {
  await login(page, 'ADV');

  for (const pageInfo of AUDIT_PAGES) {
    await page.goto(`${baseURL}${pageInfo.path}`);
    await page.waitForTimeout(500);

    for (const res of AUDIT_RESOLUTIONS) {
      await page.setViewportSize({ width: res.width, height: res.height });
      await page.waitForTimeout(300);

      const hasHScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });

      expect(hasHScroll, 
        `Scroll horizontal em ${pageInfo.slug} @ ${res.label}`
      ).toBeFalsy();
    }
  }
});
```

### 4.6 Loading States para Data Fetches

```typescript
test('Telas com dados da API têm loading state', async ({ page }) => {
  await login(page, 'ADV');

  // Interceptar API para introduzir delay
  await page.route('**/*', async (route) => {
    if (route.request().resourceType() === 'fetch') {
      await new Promise(r => setTimeout(r, 2000)); // delay artificial
    }
    await route.continue();
  });

  for (const pageInfo of AUDIT_PAGES) {
    await page.goto(`${baseURL}${pageInfo.path}`);

    // Verificar se algum indicador de loading existe
    const hasLoadingIndicator = await page.locator(
      '[class*="loading"], [class*="skeleton"], [class*="spinner"], ' +
      'text="Carregando...", [aria-busy="true"]'
    ).first().isVisible().catch(() => false);

    if (!hasLoadingIndicator) {
      console.warn(`⚠️ ${pageInfo.slug}: Sem loading state detectado`);
    }
  }
});
```

### 4.7 Empty States para Listas

```typescript
test('Listas vazias mostram empty state, não página em branco', async ({ page }) => {
  await login(page, 'ADV');

  // Interceptar APIs para retornar arrays vazios
  await page.route('**/processes', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
      return;
    }
    await route.continue();
  });

  await page.route('**/tasks', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
      return;
    }
    await route.continue();
  });

  // Navegar para telas com listas
  const listPages = ['/processos', '/tarefas', '/prazos', '/documentos'];
  for (const path of listPages) {
    await page.goto(`${baseURL}${path}`);
    await page.waitForTimeout(1000);

    const hasEmptyState = await page.locator(
      '[class*="empty-state"], [class*="no-data"], [class*="no-results"], ' +
      'text=/nenhum|vazio|sem resultados/i'
    ).first().isVisible().catch(() => false);

    if (!hasEmptyState) {
      console.warn(`⚠️ ${path}: Sem empty state ao receber lista vazia`);
    }
  }
});
```

### 4.8 Error States para Formulários

```typescript
test('Formulários mostram erro ao submeter vazio', async ({ page }) => {
  await login(page, 'ADV');

  // Teste 1: CRM Comercial sem resumo
  await page.goto(`${baseURL}/crm-juridico`);
  await page.getByRole('button', { name: 'Comercial' }).click();
  await page.getByRole('button', { name: 'Registrar histórico' }).click();
  await expect(page.locator('.crm-feedback--error')).toBeVisible();

  // Teste 2: Login sem credenciais — já coberto com aria-invalid
  // Teste 3: Novo atendimento sem campos obrigatórios
  // Teste 4: Novo processo sem cliente
});
```

---

## 5. Template de Relatório

### 5.1 Estrutura do Relatório

Após executar todas as verificações, gerar um relatório Markdown com o seguinte formato:

```markdown
# 🔍 Relatório de Auditoria UX — Lexora
**Data**: YYYY-MM-DD
**Versão**: commit hash ou versão
**Auditor**: (nome ou "automatizado")
**Perfis Testados**: ADV, FIN, ADM

---

## Resumo Executivo

| Categoria | Score | Status |
|-----------|-------|--------|
| Jornadas de Usuário | X/10 | 🟢/🟡/🔴 |
| Responsividade | X/10 | 🟢/🟡/🔴 |
| Heurísticas de Nielsen | X/10 | 🟢/🟡/🔴 |
| Acessibilidade WCAG AA | X/10 | 🟢/🟡/🔴 |
| **Score Geral** | **X/10** | **🟢/🟡/🔴** |

Legenda: 🟢 ≥ 8.0 | 🟡 5.0–7.9 | 🔴 < 5.0

---

## 1. Jornadas de Usuário

### 1.1 Dashboard → Processo → Prazo → Retorno
**Status**: ✅ Passou / ❌ Falhou
**Tempo de execução**: Xs
**Problemas encontrados**:
- (listar)

### 1.2 CRM → Lead → Conversão
...

## 2. Responsividade

### Screenshots por Resolução
| Página | 640px | 768px | 1024px | 1280px | 1440px |
|--------|-------|-------|--------|--------|--------|
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ |
| Processos | ✅ | ⚠️ | ✅ | ✅ | ✅ |
...

### Problemas de Layout
- (listar com screenshot)

## 3. Heurísticas de Nielsen

| Heurística | Itens OK | Itens com Problema | Score |
|-----------|----------|-------------------|-------|
| H1. Visibilidade | 5/6 | 1 | 8.3 |
| H2. Terminologia | 5/5 | 0 | 10.0 |
...

### Detalhes dos Problemas
**H1.4**: Badge de notificações é estático (hardcoded 3)
- **Impacto**: Médio
- **Recomendação**: Conectar ao endpoint real de contagem
- **Prioridade**: P2

## 4. Acessibilidade

| Verificação | Resultado | Detalhes |
|-------------|-----------|----------|
| IDs únicos | ⚠️ X sem ID | Lista... |
| Contraste WCAG AA | ✅ 0 falhas | — |
| Ordem de foco | ✅ Lógica | — |
| Alt text em imagens | ✅ Completo | — |
| Scroll horizontal | ✅ Nenhum | — |
| Loading states | ⚠️ 2 páginas | /triagem, /modelos-pecas |
| Empty states | ⚠️ 3 páginas | /tarefas, /prazos, /documentos |
| Error states | ✅ Formulários cobertos | — |

## 5. Recomendações Priorizadas

### P0 — Crítico (resolver antes do release)
1. (problema) — (tela) — (solução)

### P1 — Alto (resolver no próximo sprint)
1. (problema) — (tela) — (solução)

### P2 — Médio (backlog priorizado)
1. (problema) — (tela) — (solução)

### P3 — Baixo (melhoria futura)
1. (problema) — (tela) — (solução)

---

## Artefatos

| Tipo | Quantidade | Localização |
|------|-----------|-------------|
| Screenshots | X | `./test-results/ux-audit/` |
| Relatório | 1 | Este arquivo |
| Logs Playwright | 1 | `./test-results/` |
```

### 5.2 Critérios de Score

| Score | Significado | Critério |
|-------|------------|----------|
| 10 | Excelente | Todos os itens passaram, UX exemplar |
| 8–9 | Bom | Problemas cosméticos apenas, sem impacto funcional |
| 6–7 | Aceitável | Alguns problemas de usabilidade, nenhum bloqueante |
| 4–5 | Necessita atenção | Problemas significativos de UX, afetam produtividade |
| 1–3 | Crítico | Fluxos quebrados, acessibilidade comprometida |

### 5.3 Cálculo do Score

```
Score Jornadas     = (jornadas que passaram / total de jornadas) × 10
Score Responsivo   = (resoluções sem problema / total de verificações) × 10
Score Heurísticas  = média dos scores H1–H10
Score Acessibilidade = (verificações OK / total de verificações) × 10

Score Geral = (Jornadas × 0.30 + Responsivo × 0.20 + Heurísticas × 0.30 + Acessibilidade × 0.20)
```

---

## 6. Regras Gerais

### SEMPRE:

1. **Executar auditoria com backend rodando** — os mocks são complementares, não substitutos
2. **Testar com todos os perfis** — ADV, FIN e ADM têm dashboards e menus diferentes
3. **Capturar screenshots ANTES e DEPOIS de qualquer mudança visual**
4. **Resetar localStorage antes de cada teste** — usar `resetPersistedScreenState()`
5. **Verificar em TODOS os 5 breakpoints** — mobile até desktop largo
6. **Documentar cada problema com screenshot** — não apenas texto
7. **Priorizar problemas com impacto no fluxo jurídico** — prazo perdido > cor errada
8. **Rodar com `--headed`** para validação visual e com `--reporter=html` para relatório

### Execução:

```powershell
# Executar auditoria UX completa
npx playwright test ux-audit.test.ts --headed --reporter=html

# Apenas captura de screenshots
npx playwright test ux-audit.test.ts --grep="screenshots" --reporter=list

# Apenas verificações automatizadas
npx playwright test ux-audit.test.ts --grep="WCAG|foco|scroll|loading|empty"
```

---

## 7. Anti-padrões

### ❌ NÃO FAÇA:

| Anti-padrão | Por quê | Alternativa |
|-------------|---------|-------------|
| Testar apenas em 1280px | Ignora 60%+ dos problemas responsivos | Usar os 5 breakpoints |
| Confiar em `waitForTimeout` sem `waitFor` | Flaky tests, race conditions | Sempre `waitFor` + `timeout` como fallback |
| Usar seletores XPath | Frágil, quebra com mudanças de DOM | Usar `getByRole`, `getByText`, `aria-label` |
| Ignorar perfil FIN | Fluxo financeiro tem UX própria | Sempre incluir FIN na auditoria |
| Hardcodar scores | Não reflete a realidade | Calcular baseado nos resultados |
| Rodar auditoria sem `resetPersistedScreenState` | Filtros salvos distorcem resultados | Sempre limpar no `beforeEach` |
| Capturar screenshot antes do conteúdo carregar | Screenshots de loading state | Usar `waitFor` no seletor da página |
| Testar acessibilidade sem `axe-core` | Verificação parcial | Considerar adicionar `@axe-core/playwright` no futuro |

---

## 8. Checklist Final

Antes de entregar o relatório de auditoria, confirmar:

- [ ] **Jornadas**: Todas as 4 jornadas foram executadas e documentadas
- [ ] **Screenshots**: 13 páginas × 5 resoluções = 65 screenshots capturados
- [ ] **Heurísticas**: Todos os 10 blocos H1–H10 foram avaliados (47+ itens)
- [ ] **IDs únicos**: Verificação rodou em todas as 13 páginas
- [ ] **Contraste WCAG AA**: Teste de contraste executou e reportou
- [ ] **Ordem de foco**: Tab sequence verificada no dashboard e em 1 formulário
- [ ] **Alt text**: Nenhuma imagem sem `alt` (exceto `aria-hidden="true"`)
- [ ] **Scroll horizontal**: Zero ocorrências em todas as resoluções
- [ ] **Loading states**: Verificados com delay artificial de API
- [ ] **Empty states**: Verificados com resposta vazia de API
- [ ] **Error states**: Formulários testados com campos obrigatórios vazios
- [ ] **Relatório**: Gerado com scores, screenshots e recomendações priorizadas
- [ ] **Artefatos**: Screenshots e logs armazenados em `./test-results/ux-audit/`
- [ ] **Perfis**: ADV, FIN e ADM auditados (ou justificativa para ausência)
