import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    env: {
      EMAIL_FROM: process.env.EMAIL_FROM || 'test@example.com',
      DATABASE_URL: process.env.DATABASE_URL,
      AUTH_SECRET: process.env.AUTH_SECRET || 'test-secret-key-for-development-only',
      AUTH_RESEND_KEY: process.env.AUTH_RESEND_KEY || 'test-key',
      GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID || 'dummy-client-id',
      GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET || 'dummy-client-secret',
      AUTH_URL: process.env.AUTH_URL || 'http://localhost:3000',
    },
  },
});
