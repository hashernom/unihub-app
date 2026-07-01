import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { escapeCsv, handler, SupabaseClientLike } from "./index.ts";

function createMockSupabase(options: {
  user?: { id: string } | null;
  role?: string;
  questions?: unknown[];
  responses?: unknown[];
  respError?: Error;
}) {
  return {
    auth: {
      getUser: async () => ({
        data: { user: options.user ?? { id: "user-1" } },
        error: null,
      }),
    },
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          order: async () => ({
            data: table === "survey_questions" ? (options.questions ?? null) : table === "survey_responses" ? (options.responses ?? null) : null,
            error: table === "survey_responses" ? (options.respError ?? null) : null,
          }),
          maybeSingle: async () => ({
            data: table === "profiles" ? { role: options.role ?? "admin" } : null,
            error: null,
          }),
        }),
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

Deno.test("returns 405 for non-POST", async () => {
  const res = await handler(new Request("http://localhost", { method: "GET" }));
  assertEquals(res.status, 405);
});

Deno.test("returns 401 when not authenticated", async () => {
  const res = await handler(
    postRequest({ survey_id: "s1" }),
    { supabase: createMockSupabase({ user: null }) as unknown as SupabaseClientLike },
  );
  assertEquals(res.status, 401);
});

Deno.test("returns 403 when not admin", async () => {
  const res = await handler(
    postRequest({ survey_id: "s1" }),
    { supabase: createMockSupabase({ role: "student" }) as unknown as SupabaseClientLike },
  );
  assertEquals(res.status, 403);
});

Deno.test("returns 400 when survey_id is missing", async () => {
  const res = await handler(
    postRequest({}),
    { supabase: createMockSupabase({}) as unknown as SupabaseClientLike },
  );
  assertEquals(res.status, 400);
});

Deno.test("returns JSON error when no questions", async () => {
  const res = await handler(
    postRequest({ survey_id: "s1" }),
    { supabase: createMockSupabase({ questions: [] }) as unknown as SupabaseClientLike },
  );
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.error, "Sin datos para exportar");
});

Deno.test("returns CSV for valid survey", async () => {
  const res = await handler(
    postRequest({ survey_id: "s1" }),
    {
      supabase: createMockSupabase({
        questions: [{ id: "q1", question_text: "How are you?" }],
        responses: [
          {
            id: "r1",
            survey_answers: [{ question_id: "q1", answer_text: "Good", answer_options: null, answer_rating: null }],
          },
        ],
      }) as unknown as SupabaseClientLike,
    },
  );
  assertEquals(res.status, 200);
  assertEquals(res.headers.get("Content-Type"), "text/csv; charset=utf-8");
  const text = await res.text();
  assertEquals(text, "How are you?\nGood");
});

Deno.test("escapeCsv wraps values with commas", () => {
  assertEquals(escapeCsv("a,b"), '"a,b"');
  assertEquals(escapeCsv('a"b'), '"a""b"');
});
