import { test, expect } from '@playwright/test';

test('help modal persists through reload on first visit', async ({ page }) => {
  // Navigate to the page first to avoid SecurityError on about:blank
  await page.goto('/');
  // Clear localStorage to simulate first visit
  await page.waitForTimeout(400);
  await page.evaluate(() => localStorage.clear());
  await page.reload();



  // Verify modal is visible
  await expect(page.locator('#help-modal')).toBeVisible();

  // Simulate a reload (like a Service Worker might trigger)
  await page.reload();

  // Verify modal is STILL visible because it hasn't been closed yet
  await expect(page.locator('#help-modal')).toBeVisible();

  // Close the modal (clicking the overlay)
  // We click at a specific position (5, 5) to ensure we hit the overlay and not the modal content
  await page.click('#help-modal', { position: { x: 5, y: 5 } });

  // Verify modal is hidden
  await expect(page.locator('#help-modal')).not.toBeVisible();

  // Reload again
  await page.reload();

  // Verify modal remains hidden after closing and reloading
  await expect(page.locator('#help-modal')).not.toBeVisible();
});
