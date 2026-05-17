import { expect, type Page, test } from '@playwright/test';

const baseURL = 'http://localhost:5173';
const advogadoEmail = 'advogado@juridico.com';
const defaultPassword = '123456';

async function loginAsAdvogado(page: Page) {
  await page.goto(baseURL);
  await page.fill('input[type="email"]', advogadoEmail);
  await page.fill('input[type="password"]', defaultPassword);
  await page.click('button:has-text("Entrar")');

  const shell = page.locator('.shell-content-canvas');
  const authError = page.locator('#auth-error, .error-container');
  await Promise.race([
    shell.waitFor({ state: 'visible', timeout: 30000 }),
    authError.waitFor({ state: 'visible', timeout: 30000 }),
  ]);

  if (await authError.isVisible()) {
    throw new Error(`Falha no login ADV durante smoke: ${(await authError.textContent())?.trim() ?? 'erro desconhecido'}`);
  }

  await expect(shell).toBeVisible();
  await expect(page.getByRole('button', { name: 'Encerrar' })).toBeVisible();
}

test.describe('ADV - Smoke das telas operacionais', () => {
  test('deve navegar pelas telas principais do advogado', async ({ page }) => {
    await loginAsAdvogado(page);

    const screens = [
      {
        path: '/',
        shellTitle: 'Meu Dia',
        contentHeading: '',
      },
      {
        path: '/processos',
        shellTitle: 'Meus Processos',
        contentHeading: 'Meus Processos',
      },
      {
        path: '/prazos',
        shellTitle: 'Prazos',
        contentHeading: 'Prazos',
      },
      {
        path: '/agenda',
        shellTitle: 'Agenda',
        contentHeading: 'Agenda',
      },
      {
        path: '/documentos',
        shellTitle: 'Documentos',
        contentHeading: 'Documentos',
      },
      {
        path: '/atendimentos',
        shellTitle: 'Atendimentos',
        contentHeading: 'Atendimentos',
      },
      {
        path: '/clientes',
        shellTitle: 'Clientes',
        contentHeading: 'Clientes',
      },
      {
        path: '/publicacoes-intimacoes',
        shellTitle: 'Publicações e Intimações',
        contentHeading: 'Publicações e Intimações',
      },
      {
        path: '/modelos-pecas',
        shellTitle: 'Modelos de Peças',
        contentHeading: 'Modelos de Peças',
      },
      {
        path: '/tarefas',
        shellTitle: 'Tarefas',
        contentHeading: 'Tarefas',
      },
    ];

    for (const screen of screens) {
      await page.goto(`${baseURL}${screen.path}`);
      await expect(page).toHaveURL(new RegExp(`${screen.path === '/' ? '/$' : `${screen.path}$`}`));
      await expect(page.locator('.page-header-shell h1')).toBeVisible();
      if (screen.path === '/') {
        await expect(page.locator('.dashboard-page')).toBeVisible();
      } else if (screen.path === '/processos') {
        await expect(page.locator('.my-processes-page')).toBeVisible();
      } else {
        await expect(page.getByRole('heading', { level: 2, name: screen.contentHeading })).toBeVisible();
      }
      await expect(page.locator('.shell-content-canvas')).toBeVisible();
    }
  });

  test('deve abrir o detalhe de um processo a partir de rota direta', async ({ page }) => {
    await loginAsAdvogado(page);

    await page.goto(`${baseURL}/processos/1`);

    await expect(page.locator('.page-header-shell h1')).toContainText('Detalhe do Processo');
    await expect(page.getByRole('heading', { level: 2, name: /Processo #/ })).toBeVisible();
    await expect(page.locator('.process-detail-page')).toBeVisible();
  });
});
