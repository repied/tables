import { test, expect } from '@playwright/test';

test('check for console errors and interaction', async ({ page }) => {
    // Listen for console errors
    const errors = [];
    page.on('console', msg => {
        if (msg.type() === 'error') {
            errors.push(msg.text());
            console.log(`Console Error: ${msg.text()}`);
        }
    });

    page.on('pageerror', exception => {
        errors.push(exception.message);
        console.log(`Page Error: ${exception.message}`);
    });

    await page.goto('/');

    // Wait a bit
    await page.waitForTimeout(1000);

    // Check if we have errors
    expect(errors.length).toBe(0);

    // Try to interact with the time gauge
    const timeGauge = page.locator('#time-gauge-container');
    const timeDisplay = page.locator('#time-display');
    const initialTime = await timeDisplay.innerText();

    // Drag up
    const box = await timeGauge.boundingBox();
    if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 - 50); // Move up
        await page.mouse.up();
    }

    const newTime = await timeDisplay.innerText();
    console.log(`Time changed from ${initialTime} to ${newTime}`);
    expect(initialTime).not.toBe(newTime);
});
