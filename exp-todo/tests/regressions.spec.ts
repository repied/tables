import { test, expect } from '@playwright/test';

test.describe('Regression Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => {
            window.localStorage.setItem('hasVisited', 'true');
        });
        await page.goto('/');
        await page.waitForTimeout(500);
    });

    test('Gauge click opens value dropdown', async ({ page }) => {
        // Click on depth gauge
        await page.click('#depth-gauge-container');
        
        // Check for dropdown overlay
        const overlay = page.locator('.gauge-dropdown-overlay');
        await expect(overlay).toBeVisible();
        
        // Check for items
        const items = overlay.locator('.gauge-dropdown-item');
        await expect(items.first()).toBeVisible();
        
        // Close it
        await page.keyboard.press('Escape');
        await expect(overlay).not.toBeVisible();
    });

    test('Pressure box click opens gas breakdown modal', async ({ page }) => {
        // Ensure we have a calculated dive (default 40m 15min should work)
        
        // Locate the reserve box (it's dynamically created in renderDiveDetails)
        const reserveBox = page.locator('.reserve-box').first();
        await expect(reserveBox).toBeVisible();
        
        // Click it
        await reserveBox.click();
        
        // Check for modal
        const modal = page.locator('#gas-modal');
        await expect(modal).toBeVisible();
        
        // Check content
        await expect(page.locator('#gas-breakdown-list')).not.toBeEmpty();
    });

    test('Language switch updates UI', async ({ page }) => {
        // Default is 'fr' (implied by test setup usually, or we check text)
        const depthLabel = page.locator('#depth-gauge-container').getAttribute('aria-label');
        // Actually checking text content of a static element is better
        // The gauge labels are set via aria-label in setupGaugeInteraction, but also static text if any?
        // Let's check the footer link "Source" or "Aide"
        
        const helpLink = page.locator('#help-link');
        await expect(helpLink).toHaveText('Aide');
        
        // Toggle language
        await page.click('.lang-selector .slider');
        
        // Expect change to "Help"
        await expect(helpLink).toHaveText('Help');
    });
});
