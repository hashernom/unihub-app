import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { handler, SupabaseClientLike } from "./index.ts";

function createMockSupabase(tokens: unknown[] | null, error?: Error) {
  let updateCalls = 0;
  return {
    from: (table: string) => ({
      select: () => ({
        eq: async () => ({
          data: table === "notification_tokens" ? tokens ?? null : null,
          error: error ?? null,
        }),
      }),
      update: () => ({
        eq: async () => {
          updateCalls++;
          return { error: null };
        },
      }),
    }),
    getUpdateCalls: () => updateCalls,
  };
}

function createMockFetch(responses: Response[]) {
  let i = 0;
  return async () => responses[i++] ?? new Response("ok", { status: 200 });
}

function webhookRequest(record: unknown) {
  return new Request("http://localhost", {
    method: "POST",
    body: JSON.stringify({ type: "INSERT", table: "announcements", record, schema: "public" }),
  });
}

Deno.test("returns 400 for invalid payload", async () => {
  const res = await handler(new Request("http://localhost", { body: JSON.stringify({}) }));
  assertEquals(res.status, 400);
});

Deno.test("skips when no active tokens", async () => {
  const res = await handler(
    webhookRequest({ id: "a1", title: "T", body: "B", category: "c", is_pinned: false }),
    { supabase: createMockSupabase([]) as unknown as SupabaseClientLike },
  );
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.sent, 0);
  assertEquals(body.skipped, 0);
});

Deno.test("sends notifications and marks invalid tokens inactive", async () => {
  const mockSupabase = createMockSupabase([
    { fcm_token: "valid", user_id: "u1" },
    { fcm_token: "invalid", user_id: "u2" },
  ]);
  const mockFetch = createMockFetch([
    new Response("ok", { status: 200 }),
    new Response("not found", { status: 404 }),
  ]);

  const res = await handler(
    webhookRequest({ id: "a1", title: "T", body: "B", category: "c", is_pinned: false }),
    { supabase: mockSupabase as unknown as SupabaseClientLike, fetch: mockFetch as unknown as typeof fetch },
  );

  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.sent, 1);
  assertEquals(body.failed, 1);
  assertEquals(mockSupabase.getUpdateCalls(), 1);
});

Deno.test("returns 500 when token fetch fails", async () => {
  const res = await handler(
    webhookRequest({ id: "a1", title: "T", body: "B", category: "c", is_pinned: false }),
    { supabase: createMockSupabase(null, new Error("db error")) as unknown as SupabaseClientLike },
  );
  assertEquals(res.status, 500);
  const body = await res.json();
  assertEquals(body.error, "db error");
});

Deno.test("returns internal error on invalid JSON", async () => {
  const res = await handler(new Request("http://localhost", { body: "not-json" }));
  assertEquals(res.status, 500);
});
