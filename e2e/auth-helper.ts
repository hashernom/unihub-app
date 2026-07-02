import type { Page } from '@playwright/test';

const SUPABASE_URL = 'https://syhxhnisksggxhtbvggu.supabase.co';

const ACCESS_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTEiLCJlbWFpbCI6InRlc3RAdGVzdC5jb20iLCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImV4cCI6MjA5NDAwMDgwNCwiaWF0IjoxNzc4NDI0ODA0fQ.fake-signature';

const SESSION = {
  access_token: ACCESS_TOKEN,
  refresh_token: 'fake-refresh-token',
  expires_at: 2094000804,
  token_type: 'bearer',
  user: {
    id: 'user-1',
    email: 'test@test.com',
    role: 'authenticated',
  },
};

const PROFILE = {
  id: 'user-1',
  student_code: 'U20231001',
  full_name: 'Test Student',
  role: 'student',
  avatar_url: null,
  carrera: 'Ingeniería',
  semestre: '5',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const STORAGE_KEY = 'sb-syhxhnisksggxhtbvggu-auth-token';

/**
 * Mocks Supabase auth/session and REST responses so protected pages can be
 * rendered in E2E tests without a real backend.
 */
export async function mockAuthenticatedSession(page: Page): Promise<void> {
  await page.addInitScript(
    ([key, token, user]: [string, string, Record<string, unknown>]) => {
      const session = {
        access_token: token,
        refresh_token: 'fake-refresh-token',
        expires_at: 2094000804,
        expires_in: 3600,
        token_type: 'bearer',
        user,
      };
      localStorage.setItem(key, JSON.stringify(session));
    },
    [STORAGE_KEY, ACCESS_TOKEN, SESSION.user] as [string, string, Record<string, unknown>],
  );

  await page.route(`${SUPABASE_URL}/auth/v1/session`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { session: SESSION }, error: null }),
    });
  });

  await page.route(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: { session: SESSION, user: SESSION.user },
        error: null,
      }),
    });
  });

  await page.route(`${SUPABASE_URL}/auth/v1/user`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { user: SESSION.user }, error: null }),
    });
  });

  await page.route(`${SUPABASE_URL}/rest/v1/profiles?**`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([PROFILE]),
    });
  });

  await page.route(`${SUPABASE_URL}/rest/v1/**`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });
}
