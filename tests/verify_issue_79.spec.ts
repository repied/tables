
import { test, expect } from '@playwright/test';

test('Issue 79: GF successive penalty UI and logic', async ({ page }) => {
    await page.addInitScript(() => {
        window.localStorage.setItem('hasVisited', 'true');
    });
    await page.goto('/');

    // Switch to GF mode
    await page.click('label[for="mode-gf"]');

    // Check if penalty selector is visible
    const penaltyContainer = page.locator('#successive-penalty-container');
    await expect(penaltyContainer).toBeVisible();

    // Check default is C60
    const c60Radio = page.locator('#penalty-c60');
    await expect(c60Radio).toBeChecked();

    // Change to C120
    await page.click('label[for="penalty-c120"]');
    await expect(page.locator('#penalty-c120')).toBeChecked();

    // Give some time for state to persist to localStorage (triggerUpdate uses requestAnimationFrame)
    await page.waitForTimeout(500);

    // Verify it survives reload (persistence)
    await page.reload();
    // We need to wait for gauges to init and data to load
    await page.waitForFunction(() => {
        const el = document.getElementById('penalty-c120');
        return el && (el as HTMLInputElement).checked;
    }, { timeout: 5000 });

    // Check URL sharing
    await page.click('#share-link');
    const shareInput = page.locator('#share-link-input');
    const url = await shareInput.inputValue();
    expect(url).toContain('p=');

    // Close modal
    await page.keyboard.press('Escape');

    // Load from URL to verify sharing logic
    // We'll just construct a URL or use the one we got
    await page.goto(url);
    await page.waitForTimeout(1000);
    // Should still be in GF mode and have C120 checked
    await expect(page.locator('#penalty-c120')).toBeChecked();

    // Switch to MN90 and check it's hidden
    await page.click('label[for="mode-mn90"]');
    await expect(penaltyContainer).not.toBeVisible();
});
