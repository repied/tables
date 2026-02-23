import { test, expect } from '@playwright/test';

test('help modal persists through reload on first visit', async ({ page }) => {
  // Clear localStorage to simulate first visit
  await page.evaluate(() => localStorage.clear());
  await page.goto('http://localhost:5500');
  await page.reload();

  // Verify modal is visible
  await expect(page.locator('#help-modal')).toBeVisible();

  // Simulate a reload (like a Service Worker might trigger)
  await page.reload();

  // Verify modal is STILL visible because it hasn't been closed yet
  await expect(page.locator('#help-modal')).toBeVisible();

  // Close the modal (clicking the overlay)
  await page.click('#help-modal');

  // Verify modal is hidden
  await expect(page.locator('#help-modal')).not.toBeVisible();

  // Reload again
  await page.reload();

  // Verify modal remains hidden after closing and reloading
  await expect(page.locator('#help-modal')).not.toBeVisible();
});
