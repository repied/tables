import { test, expect } from '@playwright/test';

test('debug console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  await page.addInitScript(() => {
    window.localStorage.setItem('hasVisited', 'true');
  });
  await page.goto('/');
  await page.waitForTimeout(1000);

  console.log('All errors:', JSON.stringify(errors, null, 2));
});
