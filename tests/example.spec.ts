import { test, expect } from '@playwright/test';

test('app loads and shows main elements', async ({ page }) => {
    // Disable help modal for tests
    await page.addInitScript(() => {
        window.localStorage.setItem('hasVisited', 'true');
    });
    await page.goto('/');

    // Check title
    await expect(page).toHaveTitle('Tables');

    // Check Gauges
    await expect(page.locator('#pressure-gauge-container')).toBeVisible();
    await expect(page.locator('#sac-gauge-container')).toBeVisible();
    await expect(page.locator('#volume-gauge-container')).toBeVisible();
    await expect(page.locator('#time-gauge-container')).toBeVisible();
    await expect(page.locator('#depth-gauge-container')).toBeVisible();

    // Check initial values
    await expect(page.locator('#pressure-display')).toHaveText('200');
    await expect(page.locator('#depth-display')).toHaveText('40');

    // Check footer contains expected text structure (gps, dtr, réserve)
    await expect(page.locator('#gps-display-1')).toContainText('gps');
    await expect(page.locator('#dive-details')).toContainText('dtr');
    await expect(page.locator('#dive-details')).toContainText('réserve');
});
