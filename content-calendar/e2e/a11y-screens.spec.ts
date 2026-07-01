import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Full-browser WCAG A/AA scan of the high-traffic screens that render status
 * badges, callouts and the connection surfaces — so the theme-aware status
 * tokens (and the connection work) are verified for colour-contrast in a real
 * browser, not just structurally in jsdom.
 */
async function scan(page: Page, disableRules: string[] = []) {
  let builder = new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']);
  if (disableRules.length) builder = builder.disableRules(disableRules);
  const results = await builder.analyze();
  return results.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    nodes: v.nodes.map((n) => n.target.join(' ')),
  }));
}

async function open(page: Page, navLabel: string, headingName: string) {
  await page.getByRole('navigation', { name: 'Primary' }).getByRole('button', { name: navLabel }).click();
  await expect(page.getByRole('heading', { name: headingName, level: 1 })).toBeVisible();
  await page.waitForLoadState('networkidle');
}

test.describe('App screens — accessibility (axe, real browser)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  // NOTE: the Library / Pipeline board gets its own full WCAG A/AA scan in
  // e2e/a11y.spec.ts (nested-interactive on the cards is fixed, and the
  // evidence chips now use theme-aware status tokens for colour-contrast).

  test('Connections passes WCAG A/AA', async ({ page }) => {
    await open(page, 'Connections', 'Connections');
    expect(await scan(page)).toEqual([]);
  });

  test('Outbox passes WCAG A/AA', async ({ page }) => {
    await open(page, 'Outbox', 'Outbox');
    expect(await scan(page)).toEqual([]);
  });

  test('Analytics passes WCAG A/AA', async ({ page }) => {
    await open(page, 'Analytics', 'Analytics');
    expect(await scan(page)).toEqual([]);
  });

  test('Ideas passes WCAG A/AA', async ({ page }) => {
    await open(page, 'Generate Ideas', 'Generate Ideas');
    expect(await scan(page)).toEqual([]);
  });
});
