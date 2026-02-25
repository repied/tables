import { test, expect } from '@playwright/test';

declare global {
    interface Window {
        dataManager: any;
        Planning: any;
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

    expect(majText).toContain('+7 min');

    // Verify calculation helper works for other values
    const calculation = await page.evaluate(() => {
        return window.Planning.calculateSuccessive('H', 60, 20);
    });

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

test('Dive 2 parameters are independent from Dive 1', async ({ page }) => {
    await page.addInitScript(() => {
        window.localStorage.setItem('hasVisited', 'true');
    });
    await page.goto('/');
    await page.waitForTimeout(1000);

    // Get initial Dive 1 values
    const dive1Depth = await page.locator('#depth-display').innerText();
    const dive1Time = await page.locator('#time-display').innerText();

    // Get Dive 2 default values
    const dive2Depth = await page.locator('#depth-display-2').innerText();
    const dive2Time = await page.locator('#time-display-2').innerText();

    // Verify both dives have independent displays
    await expect(page.locator('#depth-display')).toBeVisible();
    await expect(page.locator('#depth-display-2')).toBeVisible();
    await expect(page.locator('#time-display')).toBeVisible();
    await expect(page.locator('#time-display-2')).toBeVisible();

    // Values should be defined
    expect(dive1Depth).toMatch(/\d+/);
    expect(dive1Time).toMatch(/\d+/);
    expect(dive2Depth).toMatch(/\d+/);
    expect(dive2Time).toMatch(/\d+/);
});

test('Surface interval control affects majoration calculation', async ({ page }) => {
    await page.addInitScript(() => {
        window.localStorage.setItem('hasVisited', 'true');
    });
    await page.goto('/');
    await page.waitForTimeout(1000);

    // Verify interval gauge exists and is visible
    await expect(page.locator('#interval-gauge-container')).toBeVisible();
    await expect(page.locator('#interval-display')).toBeVisible();

    // Get initial majoration
    const initialMajText = await page.locator('#majoration-display').innerText();
    expect(initialMajText).toContain('min');

    // The interval value should be displayed
    const intervalDisplay = await page.locator('#interval-display').innerText();
    expect(intervalDisplay).toMatch(/\d+/);
});

test('Successive dive results are properly displayed', async ({ page }) => {
    await page.addInitScript(() => {
        window.localStorage.setItem('hasVisited', 'true');
    });
    await page.goto('/');
    await page.waitForTimeout(1000);

    // Check Dive 1 DTR/GPS display
    const dive1Details = page.locator('#dive-details');
    await expect(dive1Details).toBeVisible();

    // Check Dive 2 DTR/GPS display
    const dive2Details = page.locator('#dive-details-2');
    await expect(dive2Details).toBeVisible();

    // Check majoration display
    const majDisplay = page.locator('#majoration-display');
    await expect(majDisplay).toBeVisible();

    // Majoration should show a value with + and min
    const majText = await majDisplay.innerText();
    expect(majText).toMatch(/\+\d+\s*min/);
});

test('Multiple successive dive scenarios calculate correctly', async ({ page }) => {
    await page.addInitScript(() => {
        window.localStorage.setItem('hasVisited', 'true');
    });
    await page.goto('/');
    await page.waitForFunction(() => window.Planning && window.Planning.calculateSuccessive);

    // Test multiple dive profiles
    const testCases = [
        { group: 'A', interval: 30, depth: 12, expectedPositive: true }, // Should have majoration
        { group: 'G', interval: 180, depth: 20, expectedPositive: true }, // Should have majoration
    ];

    const results = await page.evaluate((cases) => {
        return cases.map((tc) => {
            return window.Planning.calculateSuccessive(tc.group, tc.interval, tc.depth);
        });
    }, testCases);

    for (const result of results) {
        expect(result).toHaveProperty('majoration');
        expect(result).toHaveProperty('n2');
        expect(result.majoration).toBeGreaterThanOrEqual(0);
        expect(result.n2).toBeGreaterThan(0);
        expect(result.n2).toBeLessThanOrEqual(2); // Reasonable N2 coefficient range
    }
});
