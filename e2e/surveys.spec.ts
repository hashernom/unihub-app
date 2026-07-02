import { test, expect } from '@playwright/test';
import { mockAuthenticatedSession } from './auth-helper';

const SUPABASE_REST = 'https://syhxhnisksggxhtbvggu.supabase.co/rest/v1';

const MOCK_SURVEY = {
  id: 'survey-1',
  title: 'Encuesta de bienvenida',
  description: 'Cuéntanos tu opinión',
  is_active: true,
  start_date: null,
  end_date: null,
  allow_multiple_responses: false,
  created_by: 'admin-1',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const MOCK_QUESTIONS = [
  {
    id: 'q-1',
    survey_id: 'survey-1',
    question_text: '¿Cómo te sentís?',
    question_type: 'text',
    options: null,
    is_required: true,
    sort_order: 1,
  },
];

test.describe('Surveys flow', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedSession(page);

    await page.route(`${SUPABASE_REST}/**`, async (route) => {
      const url = route.request().url();
      const method = route.request().method();
      const accept = route.request().headers()['accept'] ?? '';
      const wantsObject = accept.includes('vnd.pgrst.object+json');
      let body: unknown = [];
      if (url.includes('/surveys?') && !url.includes('/survey_questions') && !url.includes('/survey_responses')) {
        body = wantsObject ? MOCK_SURVEY : [MOCK_SURVEY];
      } else if (url.includes('/survey_questions?')) {
        body = MOCK_QUESTIONS;
      } else if (url.includes('/survey_responses?') && method === 'POST') {
        body = { id: 'response-1', survey_id: 'survey-1', user_id: 'user-1' };
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(body),
      });
    });
  });

  test('lists active surveys', async ({ page }) => {
    await page.goto('/tabs/surveys');
    await expect(page.locator('text=Encuesta de bienvenida')).toBeVisible();
  });

  test('opens a survey response page', async ({ page }) => {
    await page.goto('/tabs/surveys');
    await page.locator('ion-card.survey-card').click();
    await page.waitForURL(/.*survey-1/);
    await expect(page.locator('text=¿Cómo te sentís?')).toBeVisible();
    await expect(page.locator('text=Enviar encuesta')).toBeVisible();
  });
});
