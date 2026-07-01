import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const PUBLIC_ROUTES = ['/login', '/register'];

// Ionic defaults emit known a11y warnings that require framework-level changes:
// - meta-viewport: Ionic starter sets user-scalable=no
// - aria-allowed-attr: ion-select currently renders aria-required on a button
for (const route of PUBLIC_ROUTES) {
  test(`a11y scan on ${route}`, async ({ page }) => {
    await page.goto(route);
    await page.waitForLoadState('networkidle');
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .disableRules(['meta-viewport', 'aria-allowed-attr'])
      .analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });
}
