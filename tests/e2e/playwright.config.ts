import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './src',
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: 'http://localhost:5173',
    viewport: { width: 1280, height: 720 },
    screenshot: 'only-on-failure',
    launchOptions: {
      args: ['--disable-web-security'],
    },
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    cwd: '../..',
    timeout: 15000,
  },
})
