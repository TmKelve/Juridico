import { expect, type Page, test } from '@playwright/test';

const baseURL = 'http://localhost:5173';

async function loginAsAdmin(page: Page) {
  await page.goto(baseURL);
  await page.fill('input[type="email"]', 'admin@juridico.com');
  await page.fill('input[type="password"]', '123456');
  await page.click('button:has-text("Entrar")');

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
  await loginAsAdmin(page);
  await expect(page).toHaveURL(/\/$/);
  await page.goto(`${baseURL}/usuarios`);

  await expect(page).toHaveURL(/\/usuarios$/);
  await expect(page.locator('.page-header-shell h1')).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Usuários' })).toBeVisible();
  await expect(page.locator('.shell-content-canvas')).toBeVisible();
  await expect(page.locator('tbody tr')).toHaveCount(3);
  await expect(page.getByRole('cell', { name: 'admin@juridico.com' })).toBeVisible();

  await page.getByRole('button', { name: 'Encerrar' }).click();
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await expect(page.locator('input[type="password"]')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();
});
