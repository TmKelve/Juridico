import { expect, test } from '@playwright/test';

const baseURL = 'http://localhost:5173';

test.describe('Foundation auth/company/session smoke', () => {
  test('mantem login visivel quando sessao nao autenticada e bloqueia rota protegida', async ({ page }) => {
    await page.route('**/me', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'AUTH_INVALID_CREDENTIALS' }),
      });
    });

    await page.goto(baseURL);
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();

    await page.goto(`${baseURL}/usuarios`);
    await expect(page).toHaveURL(/\/usuarios$/);
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('.shell-content-canvas')).toHaveCount(0);
  });
});
