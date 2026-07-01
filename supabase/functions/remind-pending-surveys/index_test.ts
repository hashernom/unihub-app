import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { handler, SupabaseClientLike } from "./index.ts";

function createMockSupabase(options: {
  surveys?: unknown[];
  tokens?: unknown[];
  responded?: unknown[];
  reminded?: unknown[];
  insertCalls?: { count: number };
}) {
  return {
    from: (table: string) => ({
      select: () => ({
        eq: (...args: unknown[]) => {
          const base = {
            eq: (..._args: unknown[]) => base,
            gte: (..._args: unknown[]) => base,
            lte: (..._args: unknown[]) => base,
            then: (onfulfilled: (value: unknown) => unknown) => {
              let data: unknown = null;
              if (table === "surveys") data = options.surveys ?? null;
              else if (table === "notification_tokens") data = options.tokens ?? null;
              else if (table === "survey_responses") data = options.responded ?? null;
              else if (table === "survey_reminders") {
                const column = args[0];
                data = column === "survey_id" ? (options.reminded ?? null) : null;
              }
              return Promise.resolve({ data, error: null }).then(onfulfilled);
            },
          };
          return base;
        },
      }),
      update: () => ({
        eq: async () => ({ error: null }),
      }),
      insert: async () => {
        if (options.insertCalls) options.insertCalls.count++;
        return { error: null };
      },
    }),
  };
}

function createMockFetch(ok = true) {
  return async () => new Response(ok ? "ok" : "err", { status: ok ? 200 : 500 });
}

Deno.test("returns zero when no surveys", async () => {
  const res = await handler(
    new Request("http://localhost"),
    { supabase: createMockSupabase({}) as unknown as SupabaseClientLike },
  );
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.sent, 0);
  assertEquals(body.surveys, 0);
});

Deno.test("skips when no tokens", async () => {
  const res = await handler(
    new Request("http://localhost"),
    {
      supabase: createMockSupabase({ surveys: [{ id: "s1", title: "T" }] }) as unknown as SupabaseClientLike,
    },
  );
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.sent, 0);
  assertEquals(body.skipped, true);
});

Deno.test("sends reminders to pending users", async () => {
  const insertCalls = { count: 0 };
  const res = await handler(
    new Request("http://localhost"),
    {
      supabase: createMockSupabase({
        surveys: [{ id: "s1", title: "T" }],
        tokens: [{ user_id: "u1", fcm_token: "t1" }],
        responded: [],
        reminded: [],
        insertCalls,
      }) as unknown as SupabaseClientLike,
      fetch: createMockFetch(true) as unknown as typeof fetch,
    },
  );
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.sent, 1);
  assertEquals(insertCalls.count, 1);
});

Deno.test("does not remind users who already responded", async () => {
  const insertCalls = { count: 0 };
  const res = await handler(
    new Request("http://localhost"),
    {
      supabase: createMockSupabase({
        surveys: [{ id: "s1", title: "T" }],
        tokens: [{ user_id: "u1", fcm_token: "t1" }],
        responded: [{ user_id: "u1" }],
        reminded: [],
        insertCalls,
      }) as unknown as SupabaseClientLike,
      fetch: createMockFetch(true) as unknown as typeof fetch,
    },
  );
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.sent, 0);
  assertEquals(insertCalls.count, 0);
});
