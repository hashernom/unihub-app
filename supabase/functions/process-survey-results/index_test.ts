import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { handler, SupabaseClientLike } from "./index.ts";

function createMockSupabase(options: {
  user?: { id: string } | null;
  role?: string;
  cache?: { results: unknown } | null;
  survey?: { title: string } | null;
  totalResponses?: number;
  totalStudents?: number;
  questions?: unknown[];
  answers?: unknown[];
}) {
  return {
    auth: {
      getUser: async () => ({
        data: { user: options.user ?? { id: "user-1" } },
        error: null,
      }),
    },
    from: (table: string) => ({
      select: (columns?: string, opts?: unknown) => ({
        eq: () => ({
          gte: () => ({
            maybeSingle: async () => ({
              data: table === "survey_results_cache" && columns === "results" ? options.cache ?? null : null,
              error: null,
            }),
          }),
          single: async () => ({
            data: table === "surveys" ? options.survey ?? null : null,
            error: null,
          }),
          order: async () => ({
            data: table === "survey_questions" ? (options.questions ?? null) : null,
            error: null,
          }),
        }),
        in: async () => ({
          data: table === "survey_answers" ? (options.answers ?? null) : null,
          error: null,
        }),
      }),
      upsert: async () => ({ error: null }),
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

Deno.test("returns cached results", async () => {
  const results = { survey_id: "s1", survey_title: "T", total_responses: 5, total_students: 10, questions: [] };
  const res = await handler(
    postRequest({ survey_id: "s1" }),
    { supabase: createMockSupabase({ cache: { results } }) as unknown as SupabaseClientLike },
  );
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.survey_id, "s1");
});

Deno.test("returns 404 when survey not found", async () => {
  const res = await handler(
    postRequest({ survey_id: "s1" }),
    { supabase: createMockSupabase({ survey: null }) as unknown as SupabaseClientLike },
  );
  assertEquals(res.status, 404);
});

Deno.test("computes and returns survey results", async () => {
  const res = await handler(
    postRequest({ survey_id: "s1" }),
    {
      supabase: createMockSupabase({
        survey: { title: "Feedback" },
        totalResponses: 2,
        totalStudents: 5,
        questions: [
          { id: "q1", question_text: "Rate", question_type: "rating", is_required: true, sort_order: 1 },
          { id: "q2", question_text: "Comment", question_type: "text", is_required: false, sort_order: 2 },
        ],
        answers: [
          { question_id: "q1", answer_text: null, answer_options: null, answer_rating: 4 },
          { question_id: "q1", answer_text: null, answer_options: null, answer_rating: 5 },
          { question_id: "q2", answer_text: "Great", answer_options: null, answer_rating: null },
        ],
      }) as unknown as SupabaseClientLike,
    },
  );
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.survey_title, "Feedback");
  assertEquals(body.total_responses, 2);
  assertEquals(body.total_students, 5);
  assertEquals(body.questions[0].average_rating, 4.5);
  assertEquals(body.questions[1].text_responses, ["Great"]);
});

Deno.test("returns 400 when survey_id is missing", async () => {
  const res = await handler(
    postRequest({}),
    { supabase: createMockSupabase({}) as unknown as SupabaseClientLike },
  );
  assertEquals(res.status, 400);
});
