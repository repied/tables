import { test, expect } from '@playwright/test';

declare global {
    interface Window {
        dataManager: any;
    }
}

test('Successive dive calculation flow', async ({ page }) => {
    // Disable help modal for tests
    await page.addInitScript(() => {
        window.localStorage.setItem('hasVisited', 'true');
    });
    // Go to app
    await page.goto('/');

    // Wait for data load (console log "Gauges initialized")
    await page.waitForFunction(() => window.dataManager && window.dataManager.getMN90() && Object.keys(window.dataManager.getMN90()).length > 0);

    // 1. Successive Mode is now default.
    // The app automatically uses the group from Dive 1 (Default 40m/15min -> Group G)
    // and defaults Dive 2 depth to 40m, Interval 3h.
    // We verify the calculation based on these defaults.
    // Group G, Interval 3h -> N2 0.91
    // Depth 40m -> Table Majoration for 0.91, 40m -> 7 min.

    // 3. Interval is controlled via gauge now. Default is 180 min (3h).
    // We can assume 180 min is set.

    // Wait for update
    await page.waitForTimeout(500);

    const majText = await page.locator('#majoration-display').innerText();
    console.log("Majoration displayed:", majText);

    expect(majText).toContain('+7 min');

    // Verify calculation helper works for other values
    const calculation = await page.evaluate(() => {
        return window.Planning.calculateSuccessive('H', 60, 20);
    });

    console.log("Calculation result for H, 60min, 20m:", calculation);
    expect(calculation.majoration).toBe(32);
    expect(calculation.n2).toBeCloseTo(1.05);
});

test('Typical dive data load', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.dataManager && window.dataManager.getMN90() && Object.keys(window.dataManager.getMN90()).length > 0);

    // Check if MN90 data is loaded correctly
    const dataCount = await page.evaluate(() => {
        return Object.keys(window.dataManager.getMN90()).length;
    });

    expect(dataCount).toBeGreaterThan(0);
});
