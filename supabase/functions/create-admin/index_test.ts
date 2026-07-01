import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { CORS_HEADERS, handler, SupabaseClientLike } from "./index.ts";

function createMockSupabase(options: {
  user?: { id: string } | null;
  callerRole?: string;
  newUser?: { id: string } | null;
  createError?: Error;
  updateError?: Error;
}) {
  return {
    auth: {
      getUser: async () => ({
        data: { user: options.user ?? { id: "caller-1" } },
        error: null,
      }),
      admin: {
        createUser: async () => ({
          data: { user: options.newUser ?? { id: "new-user-1" } },
          error: options.createError ?? null,
        }),
      },
    },
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          single: async () => ({
            data: table === "profiles" ? { role: options.callerRole ?? "admin" } : null,
            error: null,
          }),
        }),
      }),
      update: () => ({
        eq: async () => ({ error: options.updateError ?? null }),
      }),
    }),
  };
}

function postRequest(body: unknown) {
  return new Request("http://localhost", {
    method: "POST",
    headers: { Authorization: "Bearer token" },
    body: JSON.stringify(body),
  });
}

Deno.test("returns 204 for OPTIONS", async () => {
  const res = await handler(new Request("http://localhost", { method: "OPTIONS" }));
  assertEquals(res.status, 204);
  assertEquals(res.headers.get("Access-Control-Allow-Origin"), "*");
});

Deno.test("returns 405 for non-POST", async () => {
  const res = await handler(new Request("http://localhost", { method: "GET" }));
  assertEquals(res.status, 405);
});

Deno.test("returns 401 without authorization", async () => {
  const res = await handler(
    new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({}),
    }),
  );
  assertEquals(res.status, 401);
});

Deno.test("returns 403 when caller is not admin", async () => {
  const res = await handler(
    postRequest({ email: "a@b.co", password: "12345678", full_name: "A" }),
    { supabase: createMockSupabase({ callerRole: "student" }) as unknown as SupabaseClientLike },
  );
  assertEquals(res.status, 403);
});

Deno.test("returns 400 for invalid payload", async () => {
  const res = await handler(
    postRequest({ email: "", password: "short", full_name: "" }),
    { supabase: createMockSupabase({}) as unknown as SupabaseClientLike },
  );
  assertEquals(res.status, 400);
});

Deno.test("creates admin successfully", async () => {
  const res = await handler(
    postRequest({ email: "admin@unihub.app", password: "12345678", full_name: "Admin" }),
    { supabase: createMockSupabase({}) as unknown as SupabaseClientLike },
  );
  assertEquals(res.status, 201);
  const body = await res.json();
  assertEquals(body.success, true);
  assertEquals(body.user_id, "new-user-1");
});

Deno.test("returns 500 when admin creation fails", async () => {
  const res = await handler(
    postRequest({ email: "admin@unihub.app", password: "12345678", full_name: "Admin" }),
    { supabase: createMockSupabase({ createError: new Error("email taken") }) as unknown as SupabaseClientLike },
  );
  assertEquals(res.status, 500);
  const body = await res.json();
  assertEquals(body.error, "email taken");
});

Deno.test("returns internal error on invalid JSON", async () => {
  const res = await handler(
    new Request("http://localhost", {
      method: "POST",
      headers: { Authorization: "Bearer token" },
      body: "not-json",
    }),
    { supabase: createMockSupabase({}) as unknown as SupabaseClientLike },
  );
  assertEquals(res.status, 500);
});
