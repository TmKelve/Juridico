import { expect, type Page, test } from '@playwright/test';

const baseURL = 'http://localhost:5173';
const advogadoEmail = 'advogado@juridico.com';
const defaultPassword = '123456';
const mockedAdvHome = {
  profile: 'ADV',
  home: {
    menu: ['processos', 'tarefas', 'atendimentos', 'clientes'],
    cards: ['queue', 'agenda', 'deadlines'],
  },
};

const mockedProcesses = [
  {
    id: 301,
    title: 'Execucao fiscal cliente Farol',
    client: 'Cliente Farol',
    phase: 'Cumprimento',
    status: 'ativo',
    ownerId: 2,
    owner: { id: 2, email: advogadoEmail, role: 'ADV' },
  },
];

const mockedTasks = [
  {
    id: 9001,
    title: 'Retornar cliente Farol',
    description: 'Confirmar documentos finais do atendimento.',
    processId: 301,
    processLabel: '#301',
    processTitle: 'Execucao fiscal cliente Farol',
    clientId: 77,
    client: 'Cliente Farol',
    origin: 'atendimento',
    dueDate: '2026-05-26',
    status: 'pendente',
    priority: 'alta',
    owner: 'advogado',
    createdBy: 'advogado',
    notes: 'Criada a partir de atendimento.',
    linkedToDeadline: false,
    linkedToPublication: false,
    linkedToDocument: false,
    immediateAction: true,
  },
];

const mockedAttendances = [
  {
    id: 7001,
    processId: 301,
    processLabel: '#301',
    processTitle: 'Execucao fiscal cliente Farol',
    clientId: 77,
    client: 'Cliente Farol',
    canal: 'telefone',
    tipo: 'acompanhamento',
    assunto: 'Status de documento pendente',
    resumo: 'Cliente aguardando retorno.',
    observacoes: 'Priorizar retorno ate o fim do dia.',
    status: 'aguardando_cliente',
    priority: 'alta',
    responsavel: 'advogado',
    area: 'Civel',
    dataHora: '2026-05-25T10:30:00.000Z',
    proximoPasso: 'Retornar com checklist final.',
    retornoAgendado: null,
    critico: true,
    actorEmail: advogadoEmail,
  },
];

async function loginAsAdvogado(page: Page) {
  await page.goto(baseURL);

  const shell = page.locator('.shell-content-canvas');
  const authError = page.locator('#auth-error, .error-container');

  await Promise.race([
    shell.waitFor({ state: 'visible', timeout: 30000 }),
    authError.waitFor({ state: 'visible', timeout: 30000 }),
  ]);

  if (await authError.isVisible().catch(() => false)) {
    throw new Error(`Falha no login ADV durante smoke IJ: ${(await authError.textContent())?.trim() ?? 'erro desconhecido'}`);
  }

  await expect(shell).toBeVisible();
}

async function installEpicIjMocks(page: Page) {
  await page.route('**/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: { id: 2, email: advogadoEmail, role: 'ADV' },
      }),
    });
  });

  await page.route('**/home', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockedAdvHome),
    });
  });

  await page.route('**/auth/login', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: { id: 2, email: advogadoEmail, role: 'ADV' },
      }),
    });
  });

  await page.route('**/auth/logout', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true }),
    });
  });

  await page.route('**/processes', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }

    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockedProcesses) });
  });

  await page.route('**/tasks', async (route) => {
    const method = route.request().method();
    if (method === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockedTasks) });
      return;
    }
    if (method === 'POST') {
      const body = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          ...mockedTasks[0],
          id: 9002,
          title: body.title,
          description: body.description || '',
          dueDate: body.dueDate || '2026-05-26',
          priority: body.priority || 'media',
          status: body.status || 'pendente',
          owner: body.owner || 'advogado',
          client: body.client || 'Cliente Farol',
          immediateAction: body.immediateAction || false,
        }),
      });
      return;
    }

    await route.continue();
  });

  await page.route('**/tasks/*', async (route) => {
    if (route.request().method() !== 'PUT') {
      await route.continue();
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ...mockedTasks[0],
        status: 'concluida',
      }),
    });
  });

  await page.route('**/attendances', async (route) => {
    const method = route.request().method();
    if (method === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockedAttendances) });
      return;
    }
    if (method === 'POST') {
      const body = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          ...mockedAttendances[0],
          id: 7002,
          client: body.client || 'Cliente Farol',
          assunto: body.assunto || 'Novo atendimento',
          canal: body.canal || 'interno',
          status: body.status || 'aberto',
          resumo: body.resumo || '',
          observacoes: body.observacoes || '',
          proximoPasso: body.proximoPasso || '',
          dataHora: body.dataHora || '2026-05-25T11:30:00.000Z',
        }),
      });
      return;
    }

    await route.continue();
  });
}

test.describe('Epic IJ - smoke operacional minimo', () => {
  test.beforeEach(async ({ page }) => {
    await installEpicIjMocks(page);
  });

  test('ADV executa fluxo minimo de tarefa', async ({ page }) => {
    await loginAsAdvogado(page);
    await page.goto(`${baseURL}/tarefas`);

    await expect(page.locator('.tasks-page')).toBeVisible();
    await page.getByRole('button', { name: 'Criar nova tarefa' }).click();
    await expect(page.locator('.tsk-modal')).toBeVisible();
    await page.fill('#task-title', 'Contato de retorno epic IJ');
    await page.fill('#task-client', 'Cliente Farol');
    await page.getByRole('button', { name: 'Criar tarefa' }).click();
    await expect(page.getByText('Nova tarefa criada.', { exact: true })).toBeVisible();

    await page.locator('.tsk-table tbody tr[role="button"]').first().click();
    await expect(page.locator('.tsk-drawer')).toBeVisible();
    await page.getByRole('button', { name: 'Marcar como concluída' }).click();
    await expect(page.getByText('Tarefa concluída.', { exact: true })).toBeVisible();
  });

  test('ADV registra atendimento e usa a conversao visual atual para tarefa', async ({ page }) => {
    await loginAsAdvogado(page);
    await page.goto(`${baseURL}/atendimentos`);

    await expect(page.locator('.atendimentos-page')).toBeVisible();
    await page.getByRole('button', { name: 'Registrar novo atendimento' }).click();
    await expect(page.locator('.atend-modal')).toBeVisible();
    await page.fill('#form-client', 'Cliente Farol');
    await page.selectOption('#form-canal', 'telefone');
    await page.fill('#form-assunto', 'Pendencia de retorno epic IJ');
    await page.getByRole('button', { name: 'Registrar Atendimento' }).click();
    await expect(page.getByText('Atendimento registrado com sucesso.', { exact: true })).toBeVisible();

    await page.getByRole('row', { name: /Cliente Farol/ }).first().click();
    await expect(page.locator('.atend-drawer')).toBeVisible();
    await page.getByRole('button', { name: 'Criar tarefa a partir deste atendimento' }).click();
    await expect(page.getByText(/Atendimento convertido em tarefa pela rota convencional\.|Tarefa criada pelo fluxo legado\./)).toBeVisible();
  });

  test('ADV continua bloqueado ao tentar abrir usuarios sem permissao administrativa', async ({ page }) => {
    await loginAsAdvogado(page);
    await page.goto(`${baseURL}/usuarios`);

    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('.page-header-shell h1')).toContainText('Meu Dia');
    await expect(page.getByRole('heading', { level: 2, name: 'Usuários' })).toHaveCount(0);
  });
});
