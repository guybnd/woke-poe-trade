// End-to-end tests: the overlay page in Chromium, talking to the fake app
// (main process + fake game). See README.md.
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'e2e',
  globalSetup: './e2e/global-setup.ts',
  timeout: 45_000,
  expect: { timeout: 8_000 },
  // One fake app per worker process; tests in a file share it.
  fullyParallel: false,
  // Locally, half the cores would each start a fake app and Chromium, which
  // stutters a game running alongside. WOKE_TEST_WORKERS overrides it.
  workers: process.env.CI ? 2 : (Number(process.env.WOKE_TEST_WORKERS) || 2),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [['list'], ['html', { open: 'never', outputFolder: 'report' }], ['github']]
    : [['list'], ['html', { open: 'never', outputFolder: 'report' }]],
  outputDir: 'test-results',
  use: {
    viewport: { width: 1920, height: 1080 },
    // Overlay mode: APT checks for Electron in the user agent.
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) awakened-poe-trade/0.0.0-test Chrome/140.0.0.0 Electron/40.0.0 Safari/537.36',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure'
  }
})
