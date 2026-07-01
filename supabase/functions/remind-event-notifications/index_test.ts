import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { handler, SupabaseClientLike } from "./index.ts";

function createMockSupabase(options: {
  events?: unknown[];
  users1h?: string[];
  users15m?: string[];
  tokens?: unknown[];
}) {
  return {
    from: (table: string) => ({
      select: () => ({
        eq: (...args: unknown[]) => {
          const base = {
            eq: (..._args: unknown[]) => base,
            gte: (..._args: unknown[]) => base,
            lt: (..._args: unknown[]) => base,
            in: (..._args: unknown[]) => base,
            then: (onfulfilled: (value: unknown) => unknown) => {
              let data: unknown = null;
              if (table === "events") data = options.events ?? [];
              else if (table === "user_notification_settings") {
                const setting = args[0];
                const ids = setting === "event_reminder_1h" ? options.users1h : options.users15m;
                data = (ids ?? []).map(user_id => ({ user_id }));
              } else if (table === "notification_tokens") data = options.tokens ?? [];
              return Promise.resolve({ data, error: null }).then(onfulfilled);
            },
          };
          return base;
        },
      }),
    }),
  };
}

function createMockFetch(ok = true) {
  return async () => new Response(ok ? "ok" : "err", { status: ok ? 200 : 500 });
}

Deno.test("returns summary when no events", async () => {
  const res = await handler(
    new Request("http://localhost"),
    { supabase: createMockSupabase({}) as unknown as SupabaseClientLike },
  );
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.sent, 0);
  assertEquals(body.notifications, 0);
});

Deno.test("sends reminders for upcoming events", async () => {
  const res = await handler(
    new Request("http://localhost"),
    {
      supabase: createMockSupabase({
        events: [{ id: "e1", title: "Class", start_time: "2026-01-01T11:00:00Z", classrooms: { name: "A1" } }],
        users1h: ["u1"],
        tokens: [{ fcm_token: "t1", user_id: "u1" }],
      }) as unknown as SupabaseClientLike,
      fetch: createMockFetch(true) as unknown as typeof fetch,
    },
  );
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.sent, 1);
  assertEquals(body.notifications, 1);
});

Deno.test("deduplicates 15-minute events already in 1-hour window", async () => {
  const res = await handler(
    new Request("http://localhost"),
    {
      supabase: createMockSupabase({
        events: [{ id: "e1", title: "Class", start_time: "2026-01-01T11:00:00Z", classrooms: { name: "A1" } }],
        users1h: ["u1"],
        users15m: ["u1"],
        tokens: [{ fcm_token: "t1", user_id: "u1" }],
      }) as unknown as SupabaseClientLike,
      fetch: createMockFetch(true) as unknown as typeof fetch,
    },
  );
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.notifications, 1);
});
