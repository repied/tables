import { test, expect } from '@playwright/test';

test.describe('Gauge Sensitivity Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => {
            window.localStorage.setItem('hasVisited', 'true');
        });
        await page.goto('/');
        await expect(page.locator('#depth-display')).toBeVisible();
    });

    test('Interval gauge sensitivity is reduced', async ({ page }) => {
        const intervalDisplay = page.locator('#interval-display');
        const initialValueText = await intervalDisplay.innerText(); // format e.g. "3:00"

        // Convert hh:mm to minutes
        const [h, m] = initialValueText.split(':').map(Number);
        const initialMinutes = h * 60 + m;

        const gauge = page.locator('#interval-gauge-container');
        const box = await gauge.boundingBox();
        if (!box) throw new Error("Could not find interval gauge bounding box");

        const centerX = box.x + box.width / 2;
        const centerY = box.y + box.height / 2;

        // Simulate a vertical drag: 100 pixels up
        // Sensitivity 0.5 means 100 * 0.5 = 50 minutes increase
        await page.mouse.move(centerX, centerY);
        await page.mouse.down();
        await page.mouse.move(centerX, centerY - 100, { steps: 10 });
        await page.mouse.up();

        const finalValueText = await intervalDisplay.innerText();
        const [fh, fm] = finalValueText.split(':').map(Number);
        const finalMinutes = fh * 60 + fm;

        // Expect approximately 50 minutes change (allow for small rounding/steps)
        const diff = finalMinutes - initialMinutes;
        expect(diff).toBeGreaterThan(45);
        expect(diff).toBeLessThan(55);
    });

    test('Time gauge sensitivity is reduced', async ({ page }) => {
        const timeDisplay = page.locator('#time-display');
        const initialValueText = await timeDisplay.innerText();
        const [h, m] = initialValueText.split(':').map(Number);
        const initialMinutes = h * 60 + m;

        const gauge = page.locator('#time-gauge-container');
        const box = await gauge.boundingBox();
        if (!box) throw new Error("Could not find time gauge bounding box");

        const centerX = box.x + box.width / 2;
        const centerY = box.y + box.height / 2;

        // Sensitivity 0.2 means 100 * 0.2 = 20 minutes increase
        await page.mouse.move(centerX, centerY);
        await page.mouse.down();
        await page.mouse.move(centerX, centerY - 100, { steps: 10 });
        await page.mouse.up();

        const finalValueText = await timeDisplay.innerText();
        const [fh, fm] = finalValueText.split(':').map(Number);
        const finalMinutes = fh * 60 + fm;

        const diff = finalMinutes - initialMinutes;
        expect(diff).toBeGreaterThan(15);
        expect(diff).toBeLessThan(25);
    });

    test('Depth gauge sensitivity is reduced', async ({ page }) => {
        const depthDisplay = page.locator('#depth-display');
        const initialValue = parseFloat(await depthDisplay.innerText());

        const gauge = page.locator('#depth-gauge-container');
        const box = await gauge.boundingBox();
        if (!box) throw new Error("Could not find depth gauge bounding box");

        const centerX = box.x + box.width / 2;
        const centerY = box.y + box.height / 2;

        // Sensitivity 0.05 means 100 * 0.05 = 5 meters increase
        await page.mouse.move(centerX, centerY);
        await page.mouse.down();
        await page.mouse.move(centerX, centerY - 100, { steps: 10 });
        await page.mouse.up();

        const finalValue = parseFloat(await depthDisplay.innerText());
        const diff = finalValue - initialValue;
        expect(diff).toBeGreaterThan(4);
        expect(diff).toBeLessThan(6);
    });
});
