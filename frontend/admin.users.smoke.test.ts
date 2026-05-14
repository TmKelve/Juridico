import { expect, test } from '@playwright/test';

const baseURL = 'http://localhost:5173';

test('ADM consegue abrir a tela de usuários e fazer logout', async ({ page }) => {
  await page.goto(baseURL);
  await page.fill('input[type="email"]', 'admin@juridico.com');
  await page.fill('input[type="password"]', '123456');
  await page.click('button:has-text("Entrar")');

  await expect(page.locator('.page-header-shell h1')).toContainText('Meu Dia', { timeout: 10000 });
  await page.goto(`${baseURL}/usuarios`);

  await expect(page.locator('.page-header-shell h1')).toContainText('Usuários');
  await expect(page.getByRole('heading', { level: 2, name: 'Usuários' })).toBeVisible();
  await expect(page.locator('tbody tr')).toHaveCount(3);
  await expect(page.getByRole('cell', { name: 'admin@juridico.com' })).toBeVisible();

  await page.getByRole('button', { name: 'Encerrar' }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'Faça seu login' })).toBeVisible();
});
