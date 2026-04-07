import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';

const chromiumExecutable = path.join(
  process.env.LOCALAPPDATA ?? '',
  'ms-playwright',
  'chromium-1217',
  'chrome-win64',
  'chrome.exe',
);

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: true,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'corepack pnpm dev:e2e',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          executablePath: chromiumExecutable,
        },
      },
    },
  ],
});
