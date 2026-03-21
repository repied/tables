import { test, expect } from '@playwright/test';

test('debug console errors with URL', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text() + ' | location: ' + msg.location().url);
    }
  });

  page.on('requestfailed', (request) => {
    errors.push('REQUEST FAILED: ' + request.url() + ' - ' + request.failure()?.errorText);
  });

  await page.addInitScript(() => {
    window.localStorage.setItem('hasVisited', 'true');
  });
  await page.goto('/');
  await page.waitForTimeout(1000);

  console.log('All errors:', JSON.stringify(errors, null, 2));
});
