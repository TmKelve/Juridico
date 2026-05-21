import { expect, type Page, test } from '@playwright/test'

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173'

async function loginAsFinanceiro(page: Page) {
  await page.goto(baseURL)
  await page.fill('input[type="email"]', 'financeiro@juridico.com')
  await page.fill('input[type="password"]', '123456')
  await page.click('button:has-text("Entrar")')

  const shell = page.locator('.shell-content-canvas')
  const authError = page.locator('#auth-error, .error-container')
  await Promise.race([
    shell.waitFor({ state: 'visible', timeout: 30000 }),
    authError.waitFor({ state: 'visible', timeout: 30000 }),
  ])

  if (await authError.isVisible()) {
    throw new Error(`Falha no login FIN durante smoke: ${(await authError.textContent())?.trim() ?? 'erro desconhecido'}`)
  }

  await expect(shell).toBeVisible()
}

test('FIN consegue executar o fluxo criar lancamento, cobrar e baixar no Financeiro', async ({ page }) => {
  const description = `Smoke financeiro ${Date.now()}`

  await loginAsFinanceiro(page)

  await page.goto(`${baseURL}/financeiro`)

  await expect(page).toHaveURL(/\/financeiro$/)
  await expect(page.locator('.finance-page')).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: /operação financeira/i })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Contas a receber' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Contas a pagar' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Inadimplência' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Conciliação', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Criar lançamento' })).toBeVisible()

  await page.getByLabel('Descrição').fill(description)
  await page.getByLabel('Valor (centavos)').fill('125000')
  await page.getByRole('button', { name: 'Criar lançamento' }).click()

  const row = page.locator('tr', { hasText: description })
  await expect(row).toBeVisible()
  await expect(row).toContainText('open')
  await expect(row).toContainText('sem cobrança')

  await row.getByRole('button', { name: 'Cobrar' }).click()
  await expect(row).toContainText('pending')

  await row.getByRole('button', { name: 'Baixar' }).click()
  await expect(row).toContainText('paid')
})
