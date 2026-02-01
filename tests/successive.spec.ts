import { test, expect } from '@playwright/test';

test('Successive dive calculation flow', async ({ page }) => {
    // Go to app
    await page.goto('/');

    // Wait for data load (console log "Gauges initialized")
    await page.waitForFunction(() => window.dataManager && window.dataManager.getMN90() && Object.keys(window.dataManager.getMN90()).length > 0);

    // 1. Enable Successive Mode
    // Directly toggle via JS to avoid layout/visibility issues with custom checkbox
    await page.$eval('#successive-mode-toggle', el => {
        el.checked = true;
        el.dispatchEvent(new Event('change'));
    });

    // 2. The app now automatically uses the group from Dive 1 (Default 40m/25min -> Group J)
    // and defaults Dive 2 depth to 20m.
    // We verify the calculation based on these defaults.
    // Group J, Interval 60 -> N2 1.11
    // Depth 20m -> Table Majoration for 1.11, 20m -> 37 min.

    // 3. Interval is controlled via gauge now. Default is 60 min.
    // We can assume 60 min is set.

    // Wait for update
    await page.waitForTimeout(500);

    const majText = await page.locator('#majoration-display').innerText();
    console.log("Majoration displayed:", majText);

    expect(majText).toContain('+37 min');

    // Verify calculation helper works for other values
    const calculation = await page.evaluate(() => {
        return window.dataManager.calculateSuccessive('H', 60, 20);
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
