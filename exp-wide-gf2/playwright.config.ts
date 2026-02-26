import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: 'tests',
    timeout: 30 * 1000,
    expect: { timeout: 5000 },
    reporter: [['list'], ['html', { open: 'never' }]],
    use: {
        headless: true,
        baseURL: 'http://127.0.0.1:5500',
        viewport: { width: 1280, height: 720 },
    },
    webServer: {
        command: 'npm run dev',
        port: 5500,
        reuseExistingServer: true,
        timeout: 120 * 1000,
    },
});
