import { test, expect } from '@playwright/test';

test.describe('Dive Planner - Comprehensive Lean Planning Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => {
            window.localStorage.setItem('hasVisited', 'true');
        });
        await page.goto('/');
        await page.waitForTimeout(800);
    });

    test.describe('MN90 Single Dive Planning', () => {
        test('default values load correctly', async ({ page }) => {
            await expect(page.locator('#pressure-display')).toHaveText('200');
            await expect(page.locator('#o2-display')).toHaveText('21');
            const depth = await page.locator('#depth-display').innerText();
            expect(depth).toMatch(/\d+/);
        });

        test('displays decompression stops', async ({ page }) => {
            const stops = page.locator('#stops-display .stop-item');
            const count = await stops.count();
            expect(count).toBeGreaterThan(0);
        });

        test('shows DTR calculation', async ({ page }) => {
            const dtrValue = await page.locator('#dive-details .result-value').first().innerText();
            expect(dtrValue).toMatch(/\d+:\d+/);
        });

        test('displays reserve pressure safely', async ({ page }) => {
            const details = await page.locator('#dive-details').innerText();
            expect(details).toBeTruthy();
            expect(details.length).toBeGreaterThan(10);
        });
    });

    test.describe('GF Mode Bühlmann Planning', () => {
        test('switches to GF mode', async ({ page }) => {
            await page.click('label[for="mode-gf"]');
            await page.waitForTimeout(400);
            const isGF = await page.evaluate(() => 
                document.body.classList.contains('gf-mode')
            );
            expect(isGF).toBe(true);
        });

        test('GF controls visible and valid in GF mode', async ({ page }) => {
            await page.click('label[for="mode-gf"]');
            await page.waitForTimeout(400);
            await expect(page.locator('#gf-low-gauge-container')).toBeVisible();
            await expect(page.locator('#gf-high-gauge-container')).toBeVisible();
            
            const gfLowDisplay = page.locator('#gf-low-display');
            const gfHighDisplay = page.locator('#gf-high-display');
            
            await expect(gfLowDisplay).toContainText(/\d+/);
            await expect(gfHighDisplay).toContainText(/\d+/);
        });

        test('calculates with Bühlmann algorithm', async ({ page }) => {
            await page.click('label[for="mode-gf"]');
            await page.waitForTimeout(400);
            const dtr = await page.locator('#dive-details .result-value').first().innerText();
            expect(dtr).toMatch(/\d+:\d+/);
        });
    });

    test.describe('Successive Dives', () => {
        test('shows both dive sections', async ({ page }) => {
            await expect(page.locator('#time-display')).toBeVisible();
            await expect(page.locator('#time-display-2')).toBeVisible();
            await expect(page.locator('#interval-gauge-container')).toBeVisible();
        });

        test('calculates majoration for dive 2', async ({ page }) => {
            const maj = page.locator('#majoration-display');
            await expect(maj).toBeVisible();
        });

        test('shows GPS group', async ({ page }) => {
            const gps = page.locator('.gps-badge');
            await expect(gps).toBeVisible();
        });
    });

    test.describe('Gas Safety', () => {
        test('displays tank parameters', async ({ page }) => {
            await expect(page.locator('#pressure-gauge-container')).toBeVisible();
            await expect(page.locator('#sac-gauge-container')).toBeVisible();
            await expect(page.locator('#volume-gauge-container')).toBeVisible();
            await expect(page.locator('#o2-gauge-container')).toBeVisible();
        });

        test('shows dive details with metrics', async ({ page }) => {
            const details = await page.locator('#dive-details').innerText();
            expect(details).toBeTruthy();
            expect(details.length).toBeGreaterThan(5);
        });
    });

    test.describe('Mode Toggle', () => {
        test('toggles modes without errors', async ({ page }) => {
            const errors: string[] = [];
            page.on('console', msg => {
                if (msg.type() === 'error') {
                    errors.push(msg.text());
                }
            });
            
            await page.click('label[for="mode-gf"]');
            await page.waitForTimeout(300);
            await page.click('label[for="mode-mn90"]');
            await page.waitForTimeout(300);
            
            const critical = errors.filter(e =>
                !e.includes('favicon') &&
                !e.includes('manifest') &&
                !e.includes('gtag')
            );
            expect(critical.length).toBe(0);
        });

        test('recalculates on mode switch', async ({ page }) => {
            const initial = await page.locator('#dive-details .result-value').first().innerText();
            
            await page.click('label[for="mode-gf"]');
            await page.waitForTimeout(500);
            
            const gf = await page.locator('#dive-details .result-value').first().innerText();
            expect(gf).toMatch(/\d+:\d+/);
            
            await page.click('label[for="mode-mn90"]');
            await page.waitForTimeout(300);
            
            const final = await page.locator('#dive-details .result-value').first().innerText();
            expect(final).toBe(initial);
        });
    });

    test.describe('UI Layout', () => {
        test('renders all gauge containers', async ({ page }) => {
            const gauges = [
                '#pressure-gauge-container',
                '#sac-gauge-container',
                '#volume-gauge-container',
                '#o2-gauge-container',
                '#time-gauge-container',
                '#depth-gauge-container',
            ];
            
            for (const gauge of gauges) {
                await expect(page.locator(gauge)).toBeVisible();
            }
        });

        test('mobile responsive layout', async ({ page }) => {
            await page.setViewportSize({ width: 375, height: 667 });
            await page.waitForTimeout(300);
            
            await expect(page.locator('#pressure-gauge-container')).toBeVisible();
            await expect(page.locator('#time-gauge-container')).toBeVisible();
            
            await page.setViewportSize({ width: 1280, height: 720 });
        });

        test('main app containers visible', async ({ page }) => {
            await expect(page.locator('.app-container')).toBeVisible();
            await expect(page.locator('.results-container')).toBeVisible();
            await expect(page.locator('.actions-container')).toBeVisible();
        });
    });
});
