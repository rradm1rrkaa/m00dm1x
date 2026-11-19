import { defineConfig, devices } from '@playwright/test';

const localChrome = process.env.MOODMIX_BROWSER === 'chrome' ? { channel: 'chrome' } : {};
const port = process.env.MOODMIX_E2E_PORT || '4176';
const baseURL = 'http://127.0.0.1:' + port;

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.js',
  timeout: 45000,
  fullyParallel: true,
  workers: 2,
  use: { baseURL, trace: 'retain-on-failure', ...localChrome },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } }
  ],
  webServer: { command: 'npm run start', url: baseURL, env: { MOODMIX_PORT: port }, reuseExistingServer: false }
});
