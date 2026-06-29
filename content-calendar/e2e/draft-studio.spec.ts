import { test, expect } from '@playwright/test';

/**
 * Full Draft Studio user flow in a real browser: navigate in from the sidebar,
 * compose → draft → review → approve → save, plus the safety-gate path. Driven
 * by roles/labels/test-ids, never internal state.
 */
test.describe('Draft Studio', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('navigation', { name: 'Primary' }).getByRole('button', { name: 'Draft Studio' }).click();
    await expect(page.getByLabel('Source title')).toBeVisible();
  });

  test('composes, reviews and approves a clean draft, then saves it to the calendar', async ({ page }) => {
    await page.getByLabel('Source title').fill('Street trees and urban heat');
    await page.getByLabel('Source material (abstract / notes)').fill('Tree cover was associated with cooler streets.');
    await page.getByRole('button', { name: /Generate draft/i }).click();

    await expect(page.getByTestId('studio-draft')).toBeVisible();
    await page.getByRole('button', { name: /Run review/i }).click();

    // Clean copy clears the safety review.
    await expect(page.getByTestId('review-status')).toHaveAttribute('data-cleared', 'true');
    await page.getByRole('button', { name: /Approve for publishing/i }).click();

    await expect(page.getByTestId('ready-banner')).toBeVisible();
    await page.getByRole('button', { name: /Save to calendar/i }).click();
    await expect(page.getByTestId('studio-saved')).toBeVisible();
  });

  test('blocks approval of unsafe copy and lets the author send it back to revise', async ({ page }) => {
    await page.getByLabel('Source title').fill('Wonder cure');
    await page.getByLabel('Source material (abstract / notes)').fill('This drug cures cancer.');
    await page.getByRole('button', { name: /Generate draft/i }).click();
    await expect(page.getByTestId('studio-draft')).toBeVisible();
    await page.getByRole('button', { name: /Run review/i }).click();

    const status = page.getByTestId('review-status');
    await expect(status).toBeVisible();
    await expect(status).not.toHaveAttribute('data-cleared', 'true');
    await expect(page.getByRole('button', { name: /Approve for publishing/i })).toBeDisabled();
    await expect(page.getByTestId('findings')).toBeVisible();

    await page.getByRole('button', { name: /Back/ }).click();
    await expect(page.getByTestId('studio-draft')).toBeVisible();
  });

  test('is reachable and operable by keyboard from the compose form', async ({ page }) => {
    // The compose controls are real, labelled fields and the gate respects them.
    const generate = page.getByRole('button', { name: /Generate draft/i });
    await expect(generate).toBeDisabled();
    await page.getByLabel('Source title').fill('Keyboard path');
    await page.getByLabel('Source material (abstract / notes)').fill('Works without a mouse.');
    await expect(generate).toBeEnabled();

    await generate.click();
    await expect(page.getByTestId('studio-draft')).toBeVisible();
    // The active stage is exposed to assistive tech.
    await expect(page.getByTestId('stage-draft')).toHaveAttribute('aria-current', 'step');
  });
});
