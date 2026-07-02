import { test, expect } from '@playwright/test';
import { mockAuthenticatedSession } from './auth-helper';

const SUPABASE_REST = 'https://syhxhnisksggxhtbvggu.supabase.co/rest/v1';

const MOCK_EVENT = {
  id: 'event-1',
  title: 'Clase de prueba',
  description: null,
  event_type: 'class',
  classroom_id: 'room-1',
  classroom_name: 'Aula 101',
  professor_id: null,
  professor_name: null,
  start_time: '2026-12-01T10:00:00Z',
  end_time: '2026-12-01T12:00:00Z',
  recurring_rule: null,
  color: '#3B82F6',
  is_cancelled: false,
  created_by: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const MOCK_CLASSROOM = {
  id: 'room-1',
  name: 'Aula 101',
  building: 'Edificio A',
  capacity: 30,
  resources: null,
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
};

test.describe('Calendar flow', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedSession(page);

    await page.route(`${SUPABASE_REST}/events?**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([MOCK_EVENT]),
      });
    });

    await page.route(`${SUPABASE_REST}/classrooms?**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([MOCK_CLASSROOM]),
      });
    });
  });

  test('loads calendar with events and filters', async ({ page }) => {
    await page.goto('/tabs/calendar');
    await expect(page.locator('ion-title:has-text("Calendario")')).toBeVisible();
    await expect(page.locator('ion-segment-button[value="dayGridMonth"]')).toBeVisible();
    await expect(page.locator('ion-chip')).toHaveCount(6);
  });

  test('switches calendar view', async ({ page }) => {
    await page.goto('/tabs/calendar');
    await page.locator('ion-segment-button[value="timeGridWeek"]').click();
    await page.locator('ion-segment-button[value="timeGridDay"]').click();
    await page.locator('ion-segment-button[value="dayGridMonth"]').click();
    await expect(page.locator('ion-title:has-text("Calendario")')).toBeVisible();
  });
});
