import { expect, type Page, test } from '@playwright/test';

const baseURL = 'http://localhost:5173';

async function loginAsAdvogado(page: Page) {
  await page.goto(baseURL);
  await page.fill('input[type="email"]', 'advogado@juridico.com');
  await page.fill('input[type="password"]', '123456');
  await page.click('button:has-text("Entrar")');

  const shell = page.locator('.shell-content-canvas');
  const authError = page.locator('#auth-error, .error-container');
  await Promise.race([
    shell.waitFor({ state: 'visible', timeout: 30000 }),
    authError.waitFor({ state: 'visible', timeout: 30000 }),
  ]);

  if (await authError.isVisible()) {
    throw new Error(`Falha no login ADV durante smoke CDE: ${(await authError.textContent())?.trim() ?? 'erro desconhecido'}`);
  }

  await expect(shell).toBeVisible();
  await expect(page.getByRole('button', { name: 'Encerrar' })).toBeVisible();
}

test.describe('Epic CDE - Smoke minimo', () => {
  test('converte uma publicacao elegivel em prazo ou reaproveita o vinculo já criado e expõe a tela de prazos', async ({ page }) => {
    await loginAsAdvogado(page);

    await page.goto(`${baseURL}/publicacoes-intimacoes`);
    await expect(page).toHaveURL(/\/publicacoes-intimacoes$/);
    await expect(page.locator('.publications-page')).toBeVisible();

    const rows = page.locator('tr.pub-table-row');
    const count = await rows.count();
    let converted = false;

    for (let index = 0; index < count; index += 1) {
      const row = rows.nth(index);
      await row.click();

      const drawer = page.locator('.pub-drawer.pub-drawer--open');
      await expect(drawer).toBeVisible();

      const convertButton = drawer.getByRole('button', { name: 'Criar prazo a partir desta publicação' });
      if (await convertButton.isEnabled()) {
        await convertButton.click();
        await expect(page.locator('.pub-alert--success')).toContainText('Prazo criado a partir da publicação e vinculado ao processo.');
        converted = true;
        break;
      }

      const derivedDeadline = drawer.getByText('Prazo derivado', { exact: true });
      if (await derivedDeadline.isVisible()) {
        converted = true;
        break;
      }

      await page.getByRole('button', { name: 'Fechar detalhe' }).click();
    }

    expect(count).toBeGreaterThan(0);

    await page.goto(`${baseURL}/prazos`);
    await expect(page).toHaveURL(/\/prazos$/);
    await expect(page.locator('.deadlines-page')).toBeVisible();
    await expect(page.locator('.deadline-contract-note')).toContainText('vinculo prazo');
    await expect(page.getByRole('button', { name: 'Novo prazo' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ir para agenda' })).toBeVisible();
  });
});
