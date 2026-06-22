import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

interface HelpSearchRequest {
  query: string;
  user_id: string;
  max_results?: number;
  language?: string;
}

interface FaqMatch {
  faq_id: string;
  question: string;
  answer: string;
  category: string;
  language: string;
  relevance_score: number;
}

interface HelpSearchResponse {
  query: string;
  language: string;
  results: FaqMatch[];
  is_resolved: boolean;
  suggestions?: string[];
  fallback_language?: string;
}

const DEFAULT_MAX_RESULTS = 5;
const RESOLVED_THRESHOLD = 0.3;
const TRIGRAM_FALLBACK_THRESHOLD = 0.1;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ENGLISH_STOPWORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "could", "should",
  "how", "what", "when", "where", "why", "who", "which", "this", "that",
  "my", "your", "his", "her", "its", "our", "their",
]);

const SPANISH_STOPWORDS = new Set([
  "el", "la", "los", "las", "un", "una", "unos", "unas", "es", "son", "está",
  "están", "fue", "fueron", "ser", "ha", "han", "había", "hace", "hizo",
  "cómo", "qué", "cuándo", "dónde", "por", "qué", "quién", "cuál", "este", "esta",
  "mi", "tu", "su", "nuestro", "vuestra",
]);

function normalizeQuery(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-záéíóúüñ0-9\s]/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function removeAccents(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function detectLanguage(raw: string): string {
  const q = raw.toLowerCase();
  const words = q.split(/\s+/).filter((w) => w.length > 0);

  let englishScore = 0;
  let spanishScore = 0;

  for (const word of words) {
    if (ENGLISH_STOPWORDS.has(word)) englishScore++;
    if (SPANISH_STOPWORDS.has(word)) spanishScore++;
  }

  // Spanish-specific diacritics / characters give strong signal
  if (/[áéíóúüñ]/.test(q)) spanishScore += 2;

  if (englishScore > spanishScore) return "en";
  return "es";
}

function tsQueryTerms(query: string): string {
  const words = query.split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0) return "";
  return words.map((w) => `${w}:*`).join(" | ");
}

async function searchFaq(
  client: ReturnType<typeof createClient>,
  queryText: string,
  language: string,
  maxResults: number,
): Promise<Record<string, unknown>[]> {
  const tsQuery = tsQueryTerms(queryText);
  let rows: Record<string, unknown>[] = [];

  if (tsQuery.length > 0) {
    try {
      const { data: ftsResults, error: ftsError } = await client.rpc("search_faq_fts", {
        query_text: tsQuery,
        result_limit: maxResults,
        query_language: language,
      });

      if (ftsError) {
        console.error("FTS search error:", ftsError);
      } else {
        rows = (ftsResults as unknown as Record<string, unknown>[]) ?? [];
      }
    } catch (ftsErr) {
      console.error("FTS search threw:", ftsErr);
    }
  }

  if (rows.length === 0) {
    try {
      const { data: triResults, error: triError } = await client.rpc("search_faq_trigram", {
        query_text: queryText,
        result_limit: maxResults,
        query_language: language,
      });

      if (triError) {
        console.error("Trigram search error:", triError);
      } else {
        rows = (triResults as unknown as Record<string, unknown>[]) ?? [];
      }
    } catch (triErr) {
      console.error("Trigram search threw:", triErr);
    }
  }

  return rows;
}

function mapRows(rows: Record<string, unknown>[]): FaqMatch[] {
  return rows
    .filter((r) => Number(r.relevance_score) >= TRIGRAM_FALLBACK_THRESHOLD)
    .map((r) => ({
      faq_id: String(r.faq_id),
      question: String(r.question),
      answer: String(r.answer),
      category: String(r.category ?? ""),
      language: String(r.language ?? "es"),
      relevance_score: Math.min(1, Math.max(0, Number(r.relevance_score))),
    }));
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization")?.replace("Bearer ", "") ?? "";
    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const { data: { user }, error: authError } = await anonClient.auth.getUser(authHeader);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as HelpSearchRequest;
    const rawQuery = body.query ?? "";
    const requestedUserId = body.user_id;
    const maxResults = Math.max(1, Math.min(20, body.max_results ?? DEFAULT_MAX_RESULTS));

    if (!rawQuery || rawQuery.trim().length === 0) {
      return new Response(JSON.stringify({ error: "query is required" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;
    if (requestedUserId && requestedUserId !== userId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const query = normalizeQuery(rawQuery);
    const detectedLanguage = body.language ?? detectLanguage(rawQuery);
    const fallbackLanguage = detectedLanguage === "es" ? "en" : "es";

    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Exact category match (e.g. user taps a quick-reply chip like "Cuenta")
    let matches: FaqMatch[] = [];
    let usedLanguage = detectedLanguage;

    const { data: categoryResults, error: categoryError } = await serviceClient
      .from("faq_entries")
      .select("id, question, answer, category, language")
      .eq("is_active", true)
      .eq("language", detectedLanguage)
      .ilike("category", removeAccents(query))
      .order("sort_order", { ascending: true })
      .limit(maxResults);

    if (!categoryError && categoryResults && categoryResults.length > 0) {
      matches = (categoryResults as unknown as Record<string, unknown>[]).map((r) => ({
        faq_id: String(r.id),
        question: String(r.question),
        answer: String(r.answer),
        category: String(r.category),
        language: String(r.language),
        relevance_score: 1,
      }));
    }

    // 2. Full-text / trigram search if no category match
    if (matches.length === 0) {
      let rows = await searchFaq(serviceClient, query, detectedLanguage, maxResults);

      if (rows.length === 0) {
        rows = await searchFaq(serviceClient, query, fallbackLanguage, maxResults);
        usedLanguage = rows.length > 0 ? fallbackLanguage : detectedLanguage;
      }

      matches = mapRows(rows);
    }

    // 3. Determine resolution and suggestions
    const bestScore = matches.length > 0 ? Math.max(...matches.map((m) => m.relevance_score)) : 0;
    const isResolved = bestScore >= RESOLVED_THRESHOLD;

    let suggestions: string[] | undefined;
    if (!isResolved) {
      const { data: suggestionResults } = await serviceClient.rpc("search_faq_trigram", {
        query_text: query,
        result_limit: 3,
        query_language: usedLanguage,
      });
      const suggestionRows = (suggestionResults as unknown as Record<string, unknown>[]) ?? [];
      suggestions = suggestionRows
        .slice(0, 3)
        .map((r) => String(r.question));
    }

    // 4. Log the query
    const matchedFaqId = isResolved && matches.length > 0 ? matches[0].faq_id : null;
    const { error: logError } = await serviceClient
      .from("help_queries")
      .insert({
        user_id: userId,
        query_text: rawQuery,
        matched_faq_id: matchedFaqId,
        resolved: isResolved,
      });

    if (logError) {
      console.error("Failed to log help query:", logError);
    }

    const response: HelpSearchResponse = {
      query: rawQuery,
      language: detectedLanguage,
      results: matches.slice(0, maxResults),
      is_resolved: isResolved,
      suggestions,
      fallback_language: usedLanguage !== detectedLanguage ? usedLanguage : undefined,
    };

    return new Response(JSON.stringify(response), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Unexpected error in help-bot-search:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
