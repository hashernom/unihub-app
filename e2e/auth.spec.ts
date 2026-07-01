import { test, expect } from '@playwright/test';

test.describe('Authentication flow', () => {
  test('login page loads and shows form', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveTitle(/UniHub/);
    await expect(page.locator('ion-input[name="email"]')).toBeVisible();
    await expect(page.locator('ion-input[name="password"]')).toBeVisible();
    await expect(page.locator('ion-button[type="submit"]')).toBeVisible();
  });

  test('shows error on invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.locator('ion-input[name="email"] input').fill('invalid@mail.udes.edu.co');
    await page.locator('ion-input[name="password"] input').fill('wrongpassword');
    await page.locator('ion-button[type="submit"]').click();
    await expect(page.locator('text=Credenciales inválidas')).toBeVisible();
  });

  test('navigates to register page', async ({ page }) => {
    await page.goto('/login');
    await page.locator('text=Regístrate').click();
    await expect(page).toHaveURL(/.*register/);
  });
});
