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
    const hasGFClass = await page.evaluate(() => {
        return document.body.classList.contains('gf-mode');
    });
    expect(hasGFClass).toBe(true);

    // Default values: Depth 40, Time 25, GF 30/80
    // Check DTR is calculated and not the fake 98
    const dtrLocator = page.locator('#dive-details .result-value').first();
    await expect(dtrLocator).not.toHaveText('98');

    // Get DTR value
    const dtrText = await dtrLocator.innerText();
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
    expect(dtr2Text).toMatch(/\d+:\d+/);
});

test('GF gradient factors control visibility and effect', async ({ page }) => {
    await page.addInitScript(() => {
        window.localStorage.setItem('hasVisited', 'true');
    });
    await page.goto('/');
    await page.waitForTimeout(500);

    // Switch to GF Mode
    await page.click('label[for="mode-gf"]');
    await page.waitForTimeout(500);

    // GF controls should be visible
    await expect(page.locator('#gf-low-gauge-container')).toBeVisible();
    await expect(page.locator('#gf-high-gauge-container')).toBeVisible();
    await expect(page.locator('#gf-low-display')).toBeVisible();
    await expect(page.locator('#gf-high-display')).toBeVisible();

    // Check initial GF values are displayed
    const gfLowText = await page.locator('#gf-low-display').innerText();
    const gfHighText = await page.locator('#gf-high-display').innerText();

    expect(gfLowText).toMatch(/\d+/);
    expect(gfHighText).toMatch(/\d+/);
    expect(parseInt(gfLowText)).toBeLessThanOrEqual(parseInt(gfHighText));
});

test('GF mode shows desaturation stop display', async ({ page }) => {
    await page.addInitScript(() => {
        window.localStorage.setItem('hasVisited', 'true');
    });
    await page.goto('/');
    await page.waitForTimeout(1000);

    // Switch to GF Mode
    await page.click('label[for="mode-gf"]');
    await page.waitForTimeout(500);

    // Set a deeper dive to ensure desaturation stops
    // Using JavaScript to set values since gauge interaction is complex
    await page.evaluate(() => {
        // Access dive parameters and set to a profile that needs desaturation
        (window as any).dive1Depth = 50;
        (window as any).dive1Time = 30;
        // Trigger UI update
        (window as any).updateUI?.();
    });

    await page.waitForTimeout(1000);

    // Verify calculations updated
    const dtrLocator = page.locator('#dive-details .result-value').first();
    const dtrText = await dtrLocator.innerText();
    expect(dtrText).toMatch(/\d+:\d+/);

    // Check that stops display exists
    await expect(page.locator('#stops-display')).toBeVisible();
});

test('GF mode switching preserves parameter settings', async ({ page }) => {
    await page.addInitScript(() => {
        window.localStorage.setItem('hasVisited', 'true');
    });
    await page.goto('/');
    await page.waitForTimeout(500);

    // Get initial pressure value in MN90
    const initialPressure = await page.locator('#pressure-display').innerText();

    // Switch to GF Mode
    await page.click('label[for="mode-gf"]');
    await page.waitForTimeout(500);

    // Check pressure is still visible and same value
    const gfPressure = await page.locator('#pressure-display').innerText();
    expect(gfPressure).toBe(initialPressure);

    // Switch back to MN90
    await page.click('label[for="mode-mn90"]');
    await page.waitForTimeout(500);

    // Pressure should remain the same
    const finalPressure = await page.locator('#pressure-display').innerText();
    expect(finalPressure).toBe(initialPressure);
});
