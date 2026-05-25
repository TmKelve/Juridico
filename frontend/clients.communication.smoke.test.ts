import { expect, type Page, test } from '@playwright/test'

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173'
const advogadoEmail = 'advogado@juridico.com'
const defaultPassword = '123456'

async function loginAsAdvogado(page: Page) {
  await page.goto(baseURL)
  await page.fill('input[type="email"]', advogadoEmail)
  await page.fill('input[type="password"]', defaultPassword)
  await page.click('button:has-text("Entrar")')

  const shell = page.locator('.shell-content-canvas')
  const authError = page.locator('#auth-error, .error-container')
  await Promise.race([
    shell.waitFor({ state: 'visible', timeout: 30000 }),
    authError.waitFor({ state: 'visible', timeout: 30000 }),
  ])

  if (await authError.isVisible()) {
    throw new Error(`Falha no login ADV durante smoke de clientes/comunicação: ${(await authError.textContent())?.trim() ?? 'erro desconhecido'}`)
  }

  await expect(shell).toBeVisible()
}

test('ADV consegue abrir cliente, acessar comunicação e acionar retry quando houver falha', async ({ page }) => {
  await loginAsAdvogado(page)

  await page.goto(`${baseURL}/clientes`)
  await expect(page).toHaveURL(/\/clientes$/)
  await expect(page.locator('.clients-page')).toBeVisible()

  const firstRow = page.locator('tbody tr').first()
  await expect(firstRow).toBeVisible()
  await firstRow.click()

  const detailPanel = page.locator('.cli-detail-panel')
  await expect(detailPanel).toBeVisible()

  await detailPanel.getByRole('tab', { name: 'Comunicação' }).click()
  await expect(page.locator('.client-comm-panel')).toBeVisible()
  await expect(page.getByRole('heading', { level: 5, name: /Enviar comunicação/i })).toBeVisible()
  await expect(page.getByRole('heading', { level: 5, name: /Histórico/i })).toBeVisible()
  await expect(page.getByRole('heading', { level: 5, name: /Consentimento de canal/i })).toBeVisible()

  const historyItems = page.locator('.client-comm-history-item')
  const hasHistory = await historyItems.count()
  if (hasHistory > 0) {
    await expect(historyItems.first()).toBeVisible()
  }

  const retryButton = page.getByRole('button', { name: 'Tentar novamente' }).first()
  if (await retryButton.isVisible().catch(() => false)) {
    await retryButton.click()
    await expect(page.locator('.client-comm-feedback')).toBeVisible()
  }
})
