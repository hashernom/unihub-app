import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { CORS_HEADERS, handler } from "./index.ts";

function createMockSupabase(blacklisted: boolean, existing: boolean) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: blacklisted ? { id: "blacklist-1" } : existing ? { id: "profile-1" } : null,
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

Deno.test("returns 405 for non-POST", async () => {
  const res = await handler(new Request("http://localhost", { method: "GET" }));
  assertEquals(res.status, 405);
});

Deno.test("rejects invalid format", async () => {
  const res = await handler(
    new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ student_code: "bad" }),
    }),
  );
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.valid, false);
  assertEquals(body.error, "INVALID_FORMAT");
});

Deno.test("rejects blacklisted code", async () => {
  const res = await handler(
    new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ student_code: "U20231001" }),
    }),
    { supabase: createMockSupabase(true, false) },
  );
  const body = await res.json();
  assertEquals(body.valid, false);
  assertEquals(body.error, "BLACKLISTED");
});

Deno.test("rejects existing code", async () => {
  const res = await handler(
    new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ student_code: "U20231001" }),
    }),
    { supabase: createMockSupabase(false, true) },
  );
  const body = await res.json();
  assertEquals(body.valid, false);
  assertEquals(body.error, "ALREADY_EXISTS");
});

Deno.test("accepts new valid code", async () => {
  const res = await handler(
    new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ student_code: "U20231001" }),
    }),
    { supabase: createMockSupabase(false, false) },
  );
  const body = await res.json();
  assertEquals(body.valid, true);
});

Deno.test("returns internal error on invalid JSON", async () => {
  const res = await handler(
    new Request("http://localhost", {
      method: "POST",
      body: "not-json",
    }),
  );
  assertEquals(res.status, 500);
  const body = await res.json();
  assertEquals(body.error, "INTERNAL_ERROR");
});
