import { defineConfig, devices } from '@playwright/test';

const isCi = Boolean(process.env.CI);

export default defineConfig({
  testDir: './tests/e2e',
  // The project may live on a synchronized/network Windows volume. A single
  // worker avoids nine browser contexts competing to write traces and videos
  // to that slow filesystem while keeping the suite deterministic.
  fullyParallel: false,
  forbidOnly: isCi,
  retries: isCi ? 2 : 0,
  workers: 1,
  reporter: isCi
    ? [
        ['list'],
        ['html', { open: 'never', outputFolder: 'playwright-report' }],
      ]
    : [['list']],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
    video: isCi ? 'retain-on-failure' : 'off',
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 1000 },
      },
    },
  ],
  webServer: {
    command: 'pnpm run dev --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !isCi,
    timeout: 120_000,
  },
});
