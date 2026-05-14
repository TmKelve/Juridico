import { expect, type Page, test } from '@playwright/test';

const baseURL = 'http://localhost:5173';
const advogadoEmail = 'advogado@juridico.com';
const defaultPassword = '123456';

const mockedProcesses = [
  {
    id: 101,
    title: 'Acao Trabalhista Cliente Atlas',
    client: 'Cliente Atlas',
    phase: 'Inicial',
    status: 'ativo',
    ownerId: 2,
    owner: { id: 2, email: advogadoEmail, role: 'ADV' },
  },
  {
    id: 102,
    title: 'Revisional Contratual Cliente Nexo',
    client: 'Cliente Nexo',
    phase: 'Contestacao',
    status: 'ativo',
    ownerId: 2,
    owner: { id: 2, email: advogadoEmail, role: 'ADV' },
  },
  {
    id: 103,
    title: 'Execucao Fiscal Cliente Prisma',
    client: 'Cliente Prisma',
    phase: 'Recurso',
    status: 'pausado',
    ownerId: 2,
    owner: { id: 2, email: advogadoEmail, role: 'ADV' },
  },
];

async function loginAsAdvogado(page: Page) {
  await page.goto(baseURL);
  await page.fill('input[type="email"]', advogadoEmail);
  await page.fill('input[type="password"]', defaultPassword);
  await page.click('button:has-text("Entrar")');
  await page.waitForURL('**/', { timeout: 10000 });
  await expect(page.locator('.page-header-shell h1')).toContainText('Meu Dia');
}

async function expectSuccess(page: Page, text: string) {
  await expect(page.getByText(text, { exact: true })).toBeVisible();
}

async function resetPersistedScreenState(page: Page) {
  await page.addInitScript(() => {
    localStorage.removeItem('lexora_documents_saved_filter');
    localStorage.removeItem('lexora_cli_filter');
    localStorage.removeItem('lexora_pub_filter');
    localStorage.removeItem('lexora_processes_saved_filter');
    localStorage.removeItem('lexora_adv_saved_filter');
    localStorage.removeItem('lexora_deadlines_saved_filter');
    localStorage.removeItem('lexora_agenda_saved_filter');
  });
}

async function closeDashboardQuickDrawer(page: Page) {
  await page.locator('.quick-drawer-head').getByRole('button', { name: 'Fechar', exact: true }).click();
  await expect(page.locator('.quick-drawer')).toBeHidden();
}

async function navigateFromSidebar(page: Page, linkName: string, headingText: string) {
  await page.getByRole('link', { name: linkName, exact: true }).click();
  await expect(page.locator('.page-header-shell h1')).toContainText(headingText);
}

async function mockAdvProcessFixtures(page: Page) {
  await page.route('**/processes', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockedProcesses),
    });
  });

  await page.route('**/processes/*', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }

    const id = Number(route.request().url().split('/').pop());
    const process = mockedProcesses.find((item) => item.id === id) ?? mockedProcesses[0];

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(process),
    });
  });
}

test.describe('ADV - Fluxos internos críticos', () => {
  test.setTimeout(60000);

  test.beforeEach(async ({ page }) => {
    await resetPersistedScreenState(page);
    await mockAdvProcessFixtures(page);
    await loginAsAdvogado(page);
  });

  test('home, processos, detalhe, prazos e agenda', async ({ page }) => {
    await page.locator('.queue-filters').getByRole('button', { name: 'Hoje', exact: true }).click();
    await page.locator('.queue-row').first().click();
    await expect(page.locator('.quick-drawer')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Registrar andamento' })).toBeVisible();
    await closeDashboardQuickDrawer(page);

    await navigateFromSidebar(page, 'Meus Processos', 'Meus Processos');
  await page.getByRole('button', { name: 'Limpar filtros' }).click();
    await page.getByRole('button', { name: /Salvar filtro/i }).click();
    await expectSuccess(page, 'Filtro salvo.');
  await expect(page.locator('[aria-label^="Abrir detalhe rapido do processo"]').first()).toBeVisible({ timeout: 15000 });
    await page.locator('[aria-label^="Abrir detalhe rapido do processo"]').first().click();
    await expect(page.getByText('Detalhe rapido', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Abrir detalhe completo' }).click();

    await expect(page).toHaveURL(/\/processos\/\d+$/);
    await expect(page.locator('.process-detail-page')).toBeVisible();
    await page.getByRole('button', { name: 'Documentos' }).click();
    await expect(page.getByRole('button', { name: 'Documentos' })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Atendimento' }).click();
    await expect(page.getByRole('button', { name: 'Atendimento' })).toHaveAttribute('aria-pressed', 'true');

    await navigateFromSidebar(page, 'Prazos', 'Prazos');
    await page.locator('[aria-label^="Abrir detalhe do prazo"]').first().click();
    await expect(page.locator('.deadline-drawer')).toBeVisible();
    await page.getByRole('button', { name: 'Concluir prazo' }).click();
    await expectSuccess(page, 'Prazo concluido com sucesso.');

    await navigateFromSidebar(page, 'Agenda', 'Agenda');
    await page.getByRole('tab', { name: 'Lista' }).click();
    await page.locator('.agenda-list-row .btn-ghost').first().click();
    await expect(page.locator('.agenda-drawer')).toBeVisible();
    await page.getByRole('button', { name: 'Remarcar evento' }).click();
    await expectSuccess(page, 'Evento remarcado para o proximo dia.');
  });

  test('meus processos restaura filtro salvo e alterna visualizacao', async ({ page }) => {
    await navigateFromSidebar(page, 'Meus Processos', 'Meus Processos');

    await page.fill('#filter-query', 'Atlas');
    await page.selectOption('#filter-priority', 'alta');
    await page.getByRole('button', { name: 'Salvar filtro' }).click();
    await expectSuccess(page, 'Filtro salvo.');

    await navigateFromSidebar(page, 'Home', 'Meu Dia');
    await navigateFromSidebar(page, 'Meus Processos', 'Meus Processos');
    await expect(page.locator('.page-header-shell h1')).toContainText('Meus Processos');
    await expect(page.locator('#filter-query')).toHaveValue('Atlas');
    await expect(page.locator('#filter-priority')).toHaveValue('alta');
    await expect(page.locator('.filter-chip-active')).toBeVisible();

    await page.getByRole('button', { name: /Ver Kanban|Tabela \/ Kanban/i }).first().click();
    await expect(page.locator('.my-processes-kanban')).toBeVisible();
    await expect(page.locator('.kanban-column')).toHaveCount(7);
  });

  test('novo processo exibe atalho para cadastrar cliente inexistente', async ({ page }) => {
    await navigateFromSidebar(page, 'Meus Processos', 'Meus Processos');

    await page.getByRole('button', { name: 'Novo Processo' }).click();
    await expect(page.locator('.my-processes-form')).toBeVisible();

    await page.fill('#process-client', 'Cliente Inexistente QA');
    const shortcut = page.getByRole('button', { name: 'Cliente nao encontrado. Cadastrar em Clientes' });
    await expect(shortcut).toBeVisible();

    await shortcut.click();
    await expect(page.locator('.page-header-shell h1')).toContainText('Clientes');
  });

  test('novo processo permite selecionar cliente com teclado', async ({ page }) => {
    await navigateFromSidebar(page, 'Meus Processos', 'Meus Processos');

    await page.getByRole('button', { name: 'Novo Processo' }).click();
    await expect(page.locator('.my-processes-form')).toBeVisible();

    await page.fill('#process-client', 'Cliente');
    await expect(page.locator('.client-suggestion-item').first()).toBeVisible();

    await page.press('#process-client', 'ArrowDown');
    await page.press('#process-client', 'Enter');

    await expect(page.locator('#process-client')).toHaveValue('Cliente Atlas');
  });

  test('documentos e tarefas', async ({ page }) => {
    await navigateFromSidebar(page, 'Documentos', 'Documentos');
    await expect(page.locator('.documents-loading')).toBeHidden({ timeout: 15000 });
    await page.locator('.documents-header-card .btn-primary').click();
    await expectSuccess(page, 'Upload iniciado. Documento em processamento.');
    const listToggle = page.getByRole('button', { name: /Lista \/ Grade|Grade \/ Lista/ });
    if (await page.locator('.documents-table tbody tr').count() === 0) {
      await listToggle.click();
    }
    await expect(page.locator('.documents-table tbody tr').first()).toBeVisible();
    await page.locator('[aria-label^="Abrir detalhe rapido do documento"]').first().click();
    await expect(page.locator('.documents-drawer')).toBeVisible();
    await page.getByRole('button', { name: 'Validar' }).nth(0).click();
    await expectSuccess(page, 'Documento validado.');

    await navigateFromSidebar(page, 'Tarefas', 'Tarefas');
    await page.getByRole('button', { name: 'Criar nova tarefa' }).click();
    await expect(page.locator('.tsk-modal')).toBeVisible();
    await page.fill('#task-title', 'Contato prioritário com cliente estratégico');
    await page.getByRole('button', { name: 'Criar tarefa' }).click();
    await expectSuccess(page, 'Nova tarefa criada.');
    await page.locator('.tsk-table tbody tr[role="button"]').first().click();
    await expect(page.locator('.tsk-drawer')).toBeVisible();
    await page.getByRole('button', { name: 'Concluir' }).click();
    await expectSuccess(page, 'Tarefa concluída.');
  });

  test('atendimentos e clientes', async ({ page }) => {
    await navigateFromSidebar(page, 'Atendimentos', 'Atendimentos');
    await page.getByRole('button', { name: 'Registrar novo atendimento' }).click();
    await expect(page.locator('.atend-modal')).toBeVisible();
    await page.fill('#form-client', 'Cliente fluxo interno');
    await page.selectOption('#form-canal', 'telefone');
    await page.fill('#form-assunto', 'Retorno sobre documentação pendente');
    await page.getByRole('button', { name: 'Registrar Atendimento' }).click();
    await expectSuccess(page, 'Atendimento registrado com sucesso.');
    await expect(page.locator('.atend-table tbody tr').first()).toBeVisible();
    await page.locator('.atend-table tbody tr').first().click();
    await expect(page.locator('.atend-drawer')).toBeVisible();
    await page.getByRole('button', { name: 'Marcar este atendimento como resolvido' }).click();
    await expectSuccess(page, 'Atendimento marcado como resolvido.');
    await page.getByRole('button', { name: 'Fechar detalhe' }).click();
    await expect(page.locator('.atend-drawer')).toBeHidden();

    await navigateFromSidebar(page, 'Clientes', 'Clientes');
    await page.getByRole('button', { name: 'Modo lista' }).click();
    await page.getByRole('button', { name: 'Cadastrar novo cliente' }).click();
    await expect(page.locator('.cli-modal')).toBeVisible();
    await page.fill('#form-nome', 'Cliente Smoke ADV');
    await page.selectOption('#form-tipo', 'PF');
    await page.getByRole('button', { name: 'Cadastrar Cliente' }).click();
    await expectSuccess(page, 'Cliente cadastrado com sucesso.');
    await expect(page.locator('.cli-table tbody tr').nth(1)).toBeVisible();
    await page.getByRole('row', { name: /Cliente Smoke ADV/ }).click();
    await expect(page.locator('[aria-label^="Detalhe do cliente:"]')).toBeVisible();
  });

  test('publicações e modelos de peças', async ({ page }) => {
    await navigateFromSidebar(page, 'Publicações', 'Publicações e Intimações');
    await page.getByRole('button', { name: 'Lista', exact: true }).click();
    await expect(page.locator('.pub-loading')).toBeHidden({ timeout: 15000 });
    await expect(page.locator('.pub-table tbody tr').first()).toBeVisible();
    await page.locator('.pub-table tbody tr').first().click();
    await expect(page.locator('.pub-drawer')).toBeVisible();
    await page.getByRole('button', { name: 'Criar tarefa a partir desta publicação' }).click();
    await expectSuccess(page, 'Tarefa criada a partir da publicação.');

    await navigateFromSidebar(page, 'Modelos', 'Modelos de Peças');
    await page.getByRole('button', { name: 'Gerar nova peça a partir de modelo' }).click();
    await expect(page.locator('.tpl-modal')).toBeVisible();
    await page.getByRole('button', { name: 'Fechar fluxo' }).click();
    await expect(page.locator('.tpl-table tbody tr[role="button"]').first()).toBeVisible();
    await page.locator('.tpl-table tbody tr[role="button"]').first().click();
    await expect(page.locator('.tpl-drawer')).toBeVisible();
    await page.getByRole('button', { name: 'Duplicar' }).click();
    await expectSuccess(page, 'Modelo duplicado.');
  });
});