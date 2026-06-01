import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright config centralizado do Lexora.
 * Centraliza: baseURL, timeouts, retries, reporters, browsers e diretórios.
 *
 * Docs: https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // ── Descoberta de testes ────────────────────────────────────────────────────
  testDir: '.',
  testMatch: ['**/*.smoke.test.ts', '**/*.interactions.test.ts', '**/*.interactive.test.ts'],

  // ── Execução ────────────────────────────────────────────────────────────────
  fullyParallel: false,   // Testes de E2E dependem de estado compartilhado (DB)
  workers: 1,             // Um worker para evitar race conditions no banco de CI
  retries: process.env.CI ? 1 : 0,  // 1 retry em CI para flakiness de rede

  // ── Timeouts ────────────────────────────────────────────────────────────────
  timeout: 30_000,          // 30s por teste
  expect: { timeout: 5_000 }, // 5s para asserções

  // ── Base URL ────────────────────────────────────────────────────────────────
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
  },

  // ── Reporters ───────────────────────────────────────────────────────────────
  reporter: process.env.CI
    ? [['github'], ['html', { outputFolder: 'playwright-report', open: 'never' }]]
    : [['list'], ['html', { outputFolder: 'playwright-report', open: 'on-failure' }]],

  // ── Diretórios de output ────────────────────────────────────────────────────
  outputDir: 'test-results',

  // ── Browsers ────────────────────────────────────────────────────────────────
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
