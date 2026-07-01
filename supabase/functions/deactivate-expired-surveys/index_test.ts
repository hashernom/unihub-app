import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { handler, SupabaseClientLike } from "./index.ts";

function createMockSupabase(data: unknown[] | null, error?: Error) {
  return {
    from: () => ({
      update: () => ({
        is: () => ({
          lt: () => ({
            eq: () => ({
              select: async () => ({ data, error }),
            }),
          }),
        }),
      }),
    }),
  };
}

Deno.test("deactivates expired surveys", async () => {
  const res = await handler(new Request("http://localhost"), {
    supabase: createMockSupabase([{ id: "1", title: "Old survey" }], undefined),
  });
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.deactivated, 1);
});

Deno.test("returns zero when no expired surveys", async () => {
  const res = await handler(new Request("http://localhost"), {
    supabase: createMockSupabase([], undefined),
  });
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.deactivated, 0);
});

Deno.test("returns error when supabase update fails", async () => {
  const res = await handler(new Request("http://localhost"), {
    supabase: createMockSupabase(null, new Error("db down")),
  });
  assertEquals(res.status, 500);
  const body = await res.json();
  assertEquals(body.deactivated, 0);
  assertEquals(body.error, "db down");
});

Deno.test("returns internal error on unexpected exception", async () => {
  const brokenSupabase = {
    from: () => ({
      update: () => {
        throw new Error("boom");
      },
    }),
  };
  const res = await handler(new Request("http://localhost"), {
    supabase: brokenSupabase as unknown as SupabaseClientLike,
  });
  assertEquals(res.status, 500);
  const body = await res.json();
  assertEquals(body.deactivated, 0);
  assertEquals(body.error, "Internal error");
});
