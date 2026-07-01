# Refactor Supabase Edge Functions for Testability

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or execute inline. Each function is an independent task.

**Goal:** Convert every Edge Function in `supabase/functions/` so it exports a `handler(req: Request, deps?)` function and has a matching `index_test.ts` using the `validate-student-code` pattern.

**Architecture:** Keep the existing `serve(handler)` entry point, extract the request logic into an exported async `handler`, inject optional dependencies through a second `deps` argument, and export pure helpers/constants. Add Deno tests that cover OPTIONS, non-POST 405, invalid JSON, and main happy/error paths using a minimal mock Supabase client.

**Tech Stack:** Deno, Supabase Edge Functions, `https://deno.land/std@0.224.0/http/server.ts`, `https://deno.land/std@0.224.0/assert/mod.ts`, `@supabase/supabase-js@2`.

---

## Reference Pattern

`supabase/functions/validate-student-code/index.ts` and `supabase/functions/validate-student-code/index_test.ts` are the canonical examples. Follow them exactly:

- Export `handler` as an async function: `export async function handler(req: Request, deps?: { supabase?: SupabaseClientLike }): Promise<Response>`.
- Keep `serve(handler);` at the bottom of `index.ts`.
- Export `CORS_HEADERS` and any pure constants/helpers.
- Define `SupabaseClientLike` minimally, matching the chain patterns used by the function.
- Preserve existing behavior: status codes, response shapes, error handling, CORS.
- Add `index_test.ts` per function using `Deno.test` and `assertEquals`.
- Each test file must cover: OPTIONS 204, non-POST 405, invalid JSON 500, and representative happy/error paths.

## Common `SupabaseClientLike` Interface

For functions that use `.from().select().eq().maybeSingle()` and `.from().select().eq().single()`:

```ts
interface SupabaseClientLike {
  from: (table: string) => {
    select: (columns: string, opts?: unknown) => {
      eq: (column: string, value: unknown) => {
        maybeSingle: () => Promise<{ data: unknown | null; error?: Error | null }>;
        single: () => Promise<{ data: unknown | null; error?: Error | null }>;
        in: (column: string, values: unknown[]) => SupabaseQueryLike;
        neq: (column: string, value: unknown) => SupabaseQueryLike;
        lt: (column: string, value: unknown) => SupabaseQueryLike;
        gt: (column: string, value: unknown) => SupabaseQueryLike;
        gte: (column: string, value: unknown) => SupabaseQueryLike;
        lte: (column: string, value: unknown) => SupabaseQueryLike;
        is: (column: string, value: unknown, negation?: string) => SupabaseQueryLike;
        contains: (column: string, value: unknown) => SupabaseQueryLike;
        ilike: (column: string, value: unknown) => SupabaseQueryLike;
        order: (column: string, opts?: unknown) => SupabaseQueryLike;
        limit: (n: number) => SupabaseQueryLike;
        update: (values: unknown) => {
          eq: (column: string, value: unknown) => Promise<{ data?: unknown; error?: Error | null }>;
          in: (column: string, values: unknown[]) => Promise<{ data?: unknown; error?: Error | null }>;
        };
        insert: (values: unknown) => Promise<{ data?: unknown; error?: Error | null }>;
        upsert: (values: unknown, opts?: unknown) => Promise<{ data?: unknown; error?: Error | null }>;
      };
    };
  };
  auth: {
    getUser: (token?: string) => Promise<{ data: { user: { id: string } } | { user: null }; error?: Error | null }>;
    admin: {
      createUser: (opts: unknown) => Promise<{ data: { user: { id: string } | null }; error?: Error | null }>;
      listUsers: () => Promise<{ data?: { users: { id: string; email?: string }[] } | null; error?: Error | null }>;
      sendRawEmail: (opts: unknown) => Promise<{ error?: Error | null }>;
    };
  };
  rpc: (name: string, args?: unknown) => Promise<{ data: unknown; error?: Error | null }>;
}
```

The exact shape should be trimmed to what each function actually calls. Add `fetch`-like injection only for functions that call external HTTP APIs (FCM, Resend).

## Function-Specific Notes

1. **check-classroom-availability**
   - Uses auth token from `Authorization` header.
   - Builds dynamic `.from("classrooms")` query with `.contains`, `.eq`, `.in`, `.lt`, `.gt`, `.neq`.
   - Response shape differs for `classroom_id` vs general query.
   - Inject `supabase` via `deps`. Mock auth with `getUser` returning a user.

2. **create-admin**
   - Uses two clients: anon client for `auth.getUser` and service role client for admin operations.
   - Calls `serviceClient.auth.admin.createUser` and `serviceClient.from("profiles").update(...).eq(...)`.
   - Inject both clients via `deps` if possible, or mock the service client and let anon client be created internally with env fallback.
   - Because the anon client is created with env keys, mocking is simpler if the handler accepts `deps: { supabase?: SupabaseClientLike }` where `supabase` replaces the service client, and the auth check uses a fixed mock user via env. Alternatively, accept both `anonClient` and `serviceClient` in deps.

3. **deactivate-expired-surveys**
   - No auth, no CORS. Simple service-role update query with `.is("end_date", "not", null).lt(...).eq(...).select(...)`.
   - Easiest to test; just inject `supabase`.

4. **export-survey-results**
   - No CORS. Auth + admin role check. CSV generation helpers `escapeCsv` and `answerDisplay` are pure and should be exported.
   - Query uses `.from("survey_questions").select(...).eq(...).order(...)`, `.from("survey_responses").select(...).eq(...).order(...)`.
   - Mock returns questions, responses, and profile role.

5. **help-bot-search**
   - Largest function. Has many pure helpers: `normalizeQuery`, `removeAccents`, `detectLanguage`, `tsQueryTerms`, `searchFaq`, `mapRows`.
   - Calls `.rpc("search_faq_fts")`, `.rpc("search_faq_trigram")`, and `.from("faq_entries").select(...).eq(...).eq(...).ilike(...).order(...).limit(...)`.
   - Calls `.from("help_queries").insert(...)`.
   - Inject `supabase` and optionally `fetch` (not used externally).
   - Tests can cover validation errors, unauthorized, category match, and search fallback.

6. **notify-on-announcement**
   - Trigger function, no CORS. Parses webhook payload.
   - Calls external `fetch` to FCM endpoint. Inject `fetch` via `deps` to avoid real network calls.
   - Queries `.from("notification_tokens").select(...).eq(...)` and updates invalid tokens.
   - Mock `fetch` returning ok/400/404 responses.

7. **process-survey-results**
   - Auth + admin role check. Uses cache check, count queries with `{ count: "exact", head: true }`, and `upsert`.
   - Pure aggregation logic can be left inside handler; tests focus on cache hit, survey not found, and full aggregation.
   - Inject `supabase`.

8. **remind-event-notifications**
   - Cron-style, no auth. Calls external `fetch` to FCM. Inject `fetch`.
   - Helper functions `findEvents`, `getEnabledUsers`, `formatTime`, `sendFCM` should be exported for direct testing where practical, but tests can also call `handler` with mocked `supabase` and `fetch`.
   - Because `FCM_SERVER_KEY` is read from env, tests can set `Deno.env.set` before calling or accept `deps.fcmServerKey`.

9. **remind-pending-surveys**
   - Cron-style. Calls external `fetch` to FCM. Inject `fetch`.
   - Queries multiple tables and inserts reminders.
   - Tests cover no surveys, no tokens, and successful reminder send.

10. **send-event-invitation**
    - Auth-less but CORS. Calls Resend API `fetch` and Supabase auth admin `listUsers` / `sendRawEmail`.
    - Pure helpers `generateICS` and `getTypeLabel` should be exported.
    - Inject both `supabase` and `fetch`.
    - Tests cover missing event_id, event not found, no recipients, and successful send.

## Verification

- No Deno installation required; do not run tests.
- Verify each `index.ts` still ends with `serve(handler);`.
- Verify each `index_test.ts` imports from `./index.ts`.
- Do a TypeScript syntax sanity check by scanning for obvious issues (no missing imports, consistent `CORS_HEADERS` naming, exported `handler`).

## Constraints

- Do not change response shapes or status codes unless the refactor strictly requires it.
- Do not install Deno.
- Do not run git commit/push.
