import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  timeout: 45_000,
  fullyParallel: true,
  workers: 3,
  reporter: 'list',
  use: { baseURL: 'http://localhost:48321', channel: 'chrome', headless: true, screenshot: 'only-on-failure' },
  webServer: { command: 'npm run preview -- --port 48321', url: 'http://localhost:48321', reuseExistingServer: false },
});
