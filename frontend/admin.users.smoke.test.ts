import { expect, type Page, test } from '@playwright/test';

const baseURL = 'http://localhost:5173';
const adminEmail = 'admin@juridico.com';
const mockedAdminHome = {
  profile: 'ADM',
  home: {
    menu: ['usuarios', 'processos', 'tarefas'],
    cards: ['queue', 'finance'],
  },
};

async function installAdminMocks(page: Page) {
  await page.route('**/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: { id: 1, email: adminEmail, role: 'ADM' },
      }),
    });
  });

  await page.route('**/home', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockedAdminHome),
    });
  });

  await page.route('**/auth/login', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: { id: 1, email: adminEmail, role: 'ADM' },
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

  await page.route('**/users', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 1, email: 'admin@juridico.com', role: 'ADM' },
        { id: 2, email: 'advogado@juridico.com', role: 'ADV' },
        { id: 3, email: 'financeiro@juridico.com', role: 'FIN' },
      ]),
    });
  });
}

async function loginAsAdmin(page: Page) {
  await page.goto(baseURL);

  const shell = page.locator('.shell-content-canvas');
  const authError = page.locator('#auth-error, .error-container');

  await Promise.race([
    shell.waitFor({ state: 'visible', timeout: 30000 }),
    authError.waitFor({ state: 'visible', timeout: 30000 }),
  ]);

  if (await authError.isVisible()) {
    throw new Error(`Falha no login ADM durante smoke: ${(await authError.textContent())?.trim() ?? 'erro desconhecido'}`);
  }

  await expect(shell).toBeVisible();
  await expect(page.getByRole('button', { name: 'Encerrar' })).toBeVisible();
}

test('ADM consegue abrir a tela de usuários e fazer logout', async ({ page }) => {
  await installAdminMocks(page);
  await loginAsAdmin(page);
  await expect(page).toHaveURL(/\/$/);
  await page.goto(`${baseURL}/usuarios`);

  await expect(page).toHaveURL(/\/usuarios$/);
  await expect(page.locator('.page-header-shell h1')).toBeVisible();
  await expect(page.locator('.shell-content-canvas')).toBeVisible();
  await expect(page.locator('tbody tr')).toHaveCount(3);
  await expect(page.getByRole('cell', { name: 'admin@juridico.com' })).toBeVisible();

  await page.getByRole('button', { name: 'Encerrar' }).click();
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await expect(page.locator('input[type="password"]')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();
});
