import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Full-browser accessibility scan of the Draft Studio flow. Unlike the jsdom
 * jest-axe checks, this runs against real layout — so it also enforces
 * colour-contrast and focus-order rules across WCAG 2.0/2.1 A & AA.
 */
async function scan(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  // Map to a compact, readable shape so a failure names the rule + where.
  return results.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    nodes: v.nodes.map((n) => n.target.join(' ')),
  }));
}

test.describe('Draft Studio — accessibility (axe, real browser)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('navigation', { name: 'Primary' }).getByRole('button', { name: 'Draft Studio' }).click();
    await expect(page.getByLabel('Source title')).toBeVisible();
  });

  test('compose stage passes WCAG A/AA', async ({ page }) => {
    expect(await scan(page)).toEqual([]);
  });

  test('draft and review stages pass WCAG A/AA', async ({ page }) => {
    await page.getByLabel('Source title').fill('Street trees and urban heat');
    await page.getByLabel('Source material (abstract / notes)').fill('Tree cover was associated with cooler streets.');
    await page.getByRole('button', { name: /Generate draft/i }).click();
    await expect(page.getByTestId('studio-draft')).toBeVisible();
    expect(await scan(page)).toEqual([]);

    await page.getByRole('button', { name: /Run review/i }).click();
    await expect(page.getByTestId('review-status')).toBeVisible();
    expect(await scan(page)).toEqual([]);
  });
});

test.describe('Library / Pipeline board — accessibility (axe, real browser)', () => {
  test('passes WCAG A/AA', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('navigation', { name: 'Primary' }).getByRole('button', { name: 'Library' }).click();
    // The board renders post cards (stretched "Edit post" button + "Select post"
    // checkbox as siblings — no nested interactive controls) plus the evidence
    // chips, which now use theme-aware status tokens so they clear colour-contrast
    // in both palettes. Full WCAG A/AA scan, no rule scoping.
    await expect(page.getByRole('region', { name: 'Pipeline board' })).toBeVisible();
    expect(await scan(page)).toEqual([]);
  });
});
