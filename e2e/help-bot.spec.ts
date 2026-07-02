import { test, expect } from '@playwright/test';
import { mockAuthenticatedSession } from './auth-helper';

const SUPABASE_FUNCTIONS = 'https://syhxhnisksggxhtbvggu.supabase.co/functions/v1';

async function fillIonInput(page: import('playwright').Page, selector: string, value: string): Promise<void> {
  await page.evaluate(([sel, val]) => {
    const host = document.querySelector(sel) as HTMLElement & { shadowRoot?: ShadowRoot };
    const input = (host?.shadowRoot?.querySelector('input') ?? host?.querySelector('input')) as HTMLInputElement | null;
    if (input) {
      input.focus();
      input.value = val;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('ionInput', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      input.blur();
    }
  }, [selector, value] as [string, string]);
}

test.describe('Help bot flow', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedSession(page);

    await page.route(`${SUPABASE_FUNCTIONS}/help-bot-search`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          query: 'cómo cambio mi contraseña',
          language: 'es',
          results: [
            {
              faq_id: 'faq-1',
              question: '¿Cómo cambio mi contraseña?',
              answer: 'Ve a Perfil > Seguridad y selecciona "Cambiar contraseña".',
              category: 'Cuenta',
              language: 'es',
              relevance_score: 0.95,
            },
          ],
          is_resolved: true,
          suggestions: [],
        }),
      });
    });
  });

  test('loads help page and shows welcome message', async ({ page }) => {
    await page.goto('/tabs/help');
    await expect(page.locator('text=Asistente UniHub')).toBeVisible();
    await expect(page.locator('text=¿En qué puedo ayudarte?')).toBeVisible();
  });

  test('shows quick reply chips', async ({ page }) => {
    await page.goto('/tabs/help');
    await expect(page.locator('text=Temas rápidos')).toBeVisible();
    await expect(page.locator('.quick-reply-chip')).toHaveCount(5);
  });
});
