import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { CORS_HEADERS, handler, SupabaseClientLike } from "./index.ts";

function createMockSupabase(
  classrooms: Record<string, unknown>[] | null,
  conflicts: Record<string, unknown>[] | null,
  user: { id: string } | null = { id: "user-1" },
) {
  return {
    auth: {
      getUser: async () => ({ data: { user }, error: null }),
    },
    from: () => ({
      select: () => ({
        eq: (...args: unknown[]) => {
          const chainable = {
            eq: (..._args: unknown[]) => chainable,
            in: (..._args: unknown[]) => chainable,
            neq: (..._args: unknown[]) => chainable,
            lt: (..._args: unknown[]) => chainable,
            gt: (..._args: unknown[]) => chainable,
            contains: (..._args: unknown[]) => chainable,
            then: (onfulfilled: (value: unknown) => unknown) =>
              Promise.resolve(args[0] === "classroom_id" || args[0] === "is_active" ? classrooms : conflicts).then(onfulfilled),
          };
          return chainable;
        },
        in: (...args: unknown[]) => ({
          neq: (..._args: unknown[]) => ({
            then: (onfulfilled: (value: unknown) => unknown) =>
              Promise.resolve(conflicts).then(onfulfilled),
          }),
          then: (onfulfilled: (value: unknown) => unknown) =>
            Promise.resolve(args[0] === "classroom_id" ? classrooms : conflicts).then(onfulfilled),
        }),
        lt: (...args: unknown[]) => ({
          gt: (..._args: unknown[]) => ({
            in: (..._args: unknown[]) => ({
              neq: (..._args: unknown[]) => ({
                then: (onfulfilled: (value: unknown) => unknown) =>
                  Promise.resolve(conflicts).then(onfulfilled),
              }),
              then: (onfulfilled: (value: unknown) => unknown) =>
                Promise.resolve(conflicts).then(onfulfilled),
            }),
            then: (onfulfilled: (value: unknown) => unknown) =>
              Promise.resolve(args[0] === "classroom_id" ? classrooms : conflicts).then(onfulfilled),
          }),
        }),
      }),
    }),
  };
}

Deno.test("returns 204 for OPTIONS", async () => {
  const res = await handler(new Request("http://localhost", { method: "OPTIONS" }));
  assertEquals(res.status, 204);
  assertEquals(res.headers.get("Access-Control-Allow-Origin"), "*");
});

Deno.test("returns 401 when user is not authenticated", async () => {
  const supabase = createMockSupabase([], [], null);
  supabase.auth.getUser = async () => ({ data: { user: null }, error: null });
  const res = await handler(
    new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ start_time: "2026-01-01T10:00:00Z", end_time: "2026-01-01T11:00:00Z" }),
    }),
    { supabase: supabase as unknown as SupabaseClientLike },
  );
  assertEquals(res.status, 401);
});

Deno.test("returns 400 when times are missing", async () => {
  const res = await handler(
    new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({}),
    }),
    { supabase: createMockSupabase([], []) as unknown as SupabaseClientLike },
  );
  assertEquals(res.status, 400);
});

Deno.test("returns available classrooms for general query", async () => {
  const res = await handler(
    new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ start_time: "2026-01-01T10:00:00Z", end_time: "2026-01-01T11:00:00Z" }),
    }),
    {
      supabase: createMockSupabase(
        [
          { id: "c1", name: "A1", building: "B1", capacity: 30, resources: ["projector"] },
          { id: "c2", name: "A2", building: "B1", capacity: 20, resources: [] },
        ],
        [{ id: "e1", classroom_id: "c1", title: "Conflicting", start_time: "", end_time: "", event_type: "class", classrooms: { name: "A1" } }],
      ) as unknown as SupabaseClientLike,
    },
  );
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.available_classrooms.length, 1);
  assertEquals(body.available_classrooms[0].id, "c2");
  assertEquals(body.total, 1);
});

Deno.test("returns specific classroom availability", async () => {
  const res = await handler(
    new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ classroom_id: "c1", start_time: "2026-01-01T10:00:00Z", end_time: "2026-01-01T11:00:00Z" }),
    }),
    {
      supabase: createMockSupabase(
        [{ id: "c1", name: "A1", building: "B1", capacity: 30, resources: [] }],
        [],
      ) as unknown as SupabaseClientLike,
    },
  );
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.available, true);
});

Deno.test("returns internal error on invalid JSON", async () => {
  const res = await handler(
    new Request("http://localhost", {
      method: "POST",
      body: "not-json",
    }),
  );
  assertEquals(res.status, 500);
});
