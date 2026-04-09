import { defineConfig, devices } from '@playwright/test'

/**
 * Main Playwright config for KayScope E2E tests.
 * Requires the app to be running: `pnpm dev` or `pnpm start`
 *
 * Test users must exist in the database before running:
 *   - E2E_OWNER_EMAIL / E2E_OWNER_PASSWORD  — workspace owner account
 *   - E2E_MEMBER_EMAIL / E2E_MEMBER_PASSWORD — invitee account (used to test invite flow)
 *
 * Set these in .env.local or export them in your shell before running.
 */
export default defineConfig({
  testDir: 'tests/e2e',
  // Exclude auto-generated builder tests from this config
  testIgnore: '**/generated/**',
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report/e2e' }],
  ],

  use: {
    baseURL: process.env.NEXTAUTH_URL ?? 'http://localhost:3000',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },

  projects: [
    // Auth setup runs first and stores session state to disk
    {
      name: 'auth-setup',
      testMatch: '**/auth.setup.ts',
    },
    // All other tests depend on the owner session
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/owner.json',
      },
      dependencies: ['auth-setup'],
    },
  ],
})
