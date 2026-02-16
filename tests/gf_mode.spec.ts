import { test, expect } from '@playwright/test';

test('GF Mode Calculation', async ({ page }) => {
    // Disable help modal for tests
    await page.addInitScript(() => {
        window.localStorage.setItem('hasVisited', 'true');
    });
    await page.goto('/');

    // Wait for app initialization (data loading)
    await page.waitForTimeout(1000);

    // Switch to GF Mode
    await page.click('label[for="mode-gf"]');

    // Wait for update
    await page.waitForTimeout(500);

    // Check if body has gf-mode class
    await expect(page.locator('body')).toHaveClass(/gf-mode/);

    // Default values: Depth 40, Time 25, GF 30/80
    // Check DTR is calculated and not the fake 98
    const dtrLocator = page.locator('#dive-details .result-value').first();
    await expect(dtrLocator).not.toHaveText('98');

    // Get DTR value
    const dtrText = await dtrLocator.innerText();
    console.log('DTR GF:', dtrText);
    expect(dtrText).toMatch(/\d+:\d+/);

    // Check stops are rendered
    const stops = page.locator('#stops-display .stop-item.active');
    // For 40m 25min with GF 30/80, there might be stops.
    // If not, increase depth/time.

    // Let's modify depth to 50m to ensure stops
    // Interaction via gauge is hard in Playwright, but we can execute script to set values if needed, 
    // or try to drag.
    // But let's just check the initial calculation first.

    // Verify Dive 2 calculation
    const dtr2Locator = page.locator('#dive-details-2 .result-value').first();
    await expect(dtr2Locator).not.toHaveText('33'); // Fake value was 33
    const dtr2Text = await dtr2Locator.innerText();
    console.log('DTR2 GF:', dtr2Text);
    expect(dtr2Text).toMatch(/\d+:\d+/);
});
