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

    // 2. Set Previous Group to H (from 20m 40min dive)
    await page.selectOption('#prev-group-select', 'H');

    // 3. Set Interval to 60 min
    const intervalInput = page.locator('#interval-input');
    await intervalInput.fill('60');
    // Trigger input event if needed
    await intervalInput.dispatchEvent('input');

    // 4. Set Current Depth to 20m
    // We can simulate drag or set variable directly if exposed, but UI test prefers interaction.
    // However, dragging gauges is flaky.
    // Let's rely on the fact that default might be different, so we must set it.
    // Or we can use page.evaluate to set state variables if they were exposed?
    // They are not exposed on window.
    // But we can drag.
    // Or we can test the calculation logic unit-wise via evaluate.

    // Let's check the displayed Majoration.
    // Logic: Group H, Interval 60 -> N2 1.05.
    // Table 3: N2 1.05 -> Next row 1.07.
    // Default Depth is 40m.
    // Row 1.07, Depth 40 (Index 11) -> Value 15.

    // Wait for update
    await page.waitForTimeout(500);

    const majText = await page.locator('#majoration-display').innerText();
    console.log("Majoration displayed:", majText);

    expect(majText).toContain('+15 min');

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
