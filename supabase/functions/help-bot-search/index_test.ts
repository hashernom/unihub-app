import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { CORS_HEADERS, detectLanguage, handler, normalizeQuery, SupabaseClientLike, tsQueryTerms } from "./index.ts";

function createMockSupabase(options: {
  user?: { id: string } | null;
  categoryResults?: unknown[];
  searchResults?: unknown[];
  suggestionResults?: unknown[];
}) {
  return {
    auth: {
      getUser: async () => ({
        data: { user: options.user ?? { id: "user-1" } },
        error: null,
      }),
    },
    rpc: async (name: string) => ({
      data: name === "search_faq_trigram" ? (options.suggestionResults ?? options.searchResults ?? []) : (options.searchResults ?? []),
      error: null,
    }),
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            ilike: () => ({
              order: () => ({
                limit: async () => ({
                  data: table === "faq_entries" ? (options.categoryResults ?? null) : null,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      }),
      insert: async () => ({ error: null }),
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

Deno.test("returns 401 when not authenticated", async () => {
  const res = await handler(
    postRequest({ query: "help", user_id: "user-1" }),
    { supabase: createMockSupabase({ user: null }) as unknown as SupabaseClientLike },
  );
  assertEquals(res.status, 401);
});

Deno.test("returns 400 when query is missing", async () => {
  const res = await handler(
    postRequest({ user_id: "user-1" }),
    { supabase: createMockSupabase({}) as unknown as SupabaseClientLike },
  );
  assertEquals(res.status, 400);
});

Deno.test("returns 403 when requesting different user", async () => {
  const res = await handler(
    postRequest({ query: "help", user_id: "other" }),
    { supabase: createMockSupabase({}) as unknown as SupabaseClientLike },
  );
  assertEquals(res.status, 403);
});

Deno.test("returns search results from category match", async () => {
  const res = await handler(
    postRequest({ query: "Cuenta", user_id: "user-1" }),
    {
      supabase: createMockSupabase({
        categoryResults: [
          { id: "f1", question: "Q", answer: "A", category: "Cuenta", language: "es" },
        ],
      }) as unknown as SupabaseClientLike,
    },
  );
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.results.length, 1);
  assertEquals(body.is_resolved, true);
});

Deno.test("returns suggestions when not resolved", async () => {
  const res = await handler(
    postRequest({ query: "xyz", user_id: "user-1" }),
    {
      supabase: createMockSupabase({
        searchResults: [{ faq_id: "f1", question: "Q", answer: "A", category: "c", language: "es", relevance_score: 0.2 }],
        suggestionResults: [{ question: "Related" }],
      }) as unknown as SupabaseClientLike,
    },
  );
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.is_resolved, false);
  assertEquals(body.suggestions?.length, 1);
});

Deno.test("normalizeQuery lowercases and trims", () => {
  assertEquals(normalizeQuery("  Hello!!!  "), "hello");
});

Deno.test("detectLanguage prefers Spanish", () => {
  assertEquals(detectLanguage("cómo estás"), "es");
});

Deno.test("tsQueryTerms builds prefix query", () => {
  assertEquals(tsQueryTerms("hola mundo"), "hola:* | mundo:*");
});
