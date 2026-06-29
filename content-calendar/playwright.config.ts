import { defineConfig, devices } from '@playwright/test';

/**
 * Browser end-to-end tests live in ./e2e and run against a real dev server.
 * Vitest (tests/**) is unaffected — different runner, different folder.
 *
 * VITE_API_URL is forced empty so the app uses the deterministic local engine
 * (no backend required), making the full flow reproducible offline and in CI.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { VITE_API_URL: '' },
  },
});
