import { defineConfig, devices } from '@playwright/test';

const localChrome = process.env.MOODMIX_BROWSER === 'chrome' ? { channel: 'chrome' } : {};

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.js',
  timeout: 45000,
  fullyParallel: true,
  workers: 2,
  use: { baseURL: 'http://127.0.0.1:4173', trace: 'retain-on-failure', ...localChrome },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } }
  ],
  webServer: { command: 'npm run start', url: 'http://127.0.0.1:4173', reuseExistingServer: !process.env.CI }
});
