import { test, expect } from '@playwright/test';

test('app loads and shows main elements', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toHaveText('Tables');
});
