import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './src',
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: 'http://localhost:5175',
    viewport: { width: 1280, height: 720 },
    screenshot: 'only-on-failure',
    launchOptions: {
      executablePath: '/usr/bin/chromium',
      args: ['--disable-web-security', '--no-sandbox'],
    },
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5175',
    reuseExistingServer: true,
    cwd: '../..',
    timeout: 60000,
  },
})
