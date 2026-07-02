import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockAuthenticatedSession } from './auth-helper';

const PUBLIC_ROUTES = ['/login', '/register', '/forgot-password'];
const PROTECTED_ROUTES = ['/tabs/dashboard', '/tabs/calendar', '/tabs/help', '/tabs/surveys', '/profile'];
const ALL_ROUTES = [...PUBLIC_ROUTES, ...PROTECTED_ROUTES];

for (const route of ALL_ROUTES) {
  test(`a11y scan on ${route}`, async ({ page }) => {
    if (PROTECTED_ROUTES.includes(route)) {
      await mockAuthenticatedSession(page);
    }
    await page.goto(route);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });
}
