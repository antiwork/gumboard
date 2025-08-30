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
      // Set test OAuth credentials to avoid client_id errors
      GOOGLE_CLIENT_ID: 'test-google-client-id',
      GITHUB_CLIENT_ID: 'test-github-client-id',
      GOOGLE_CLIENT_SECRET: 'test-google-secret',
      GITHUB_CLIENT_SECRET: 'test-github-secret',
      AUTH_SECRET: 'test-auth-secret-for-testing-only',
      EMAIL_FROM: 'test@example.com',
      AUTH_RESEND_KEY: 'test-resend-key',
      DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5432/gumboard_test',
    },
  },
});
