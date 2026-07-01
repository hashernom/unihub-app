import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

interface QueryBuilderLike {
  eq: (column: string, value: string) => QueryBuilderLike;
  gte: (column: string, value: string) => QueryBuilderLike;
  single: () => Promise<{ data: unknown | null; error?: Error | null }>;
  maybeSingle: () => Promise<{ data: unknown | null; error?: Error | null }>;
  in: (column: string, values: string[]) => Promise<{ data: unknown[] | null; error?: Error | null }>;
  order: (column: string, opts?: unknown) => QueryBuilderLike;
}

export interface SupabaseClientLike {
  auth: {
    getUser: (token: string) => Promise<{ data: { user: { id: string } } | { user: null }; error?: Error | null }>;
  };
  from: (table: string) => {
    select: (columns: string, opts?: unknown) => {
      eq: (column: string, value: string) => QueryBuilderLike;
      in: (column: string, values: string[]) => Promise<{ data: unknown[] | null; error?: Error | null }>;
    };
    upsert: (values: unknown, opts?: unknown) => Promise<{ data?: unknown; error?: Error | null }>;
  };
}

interface QuestionResult {
  question_id: string;
  question_text: string;
  question_type: string;
  is_required: boolean;
  sort_order: number;
  option_counts?: Record<string, number>;
  average_rating?: number;
  rating_distribution?: Record<string, number>;
  text_responses?: string[];
}

interface SurveyResults {
  survey_id: string;
  survey_title: string;
  total_responses: number;
  total_students: number;
  questions: QuestionResult[];
}

export async function handler(
  req: Request,
  deps?: { supabase?: SupabaseClientLike },
): Promise<Response> {
  try {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const authHeader = req.headers.get("Authorization")?.replace("Bearer ", "") ?? "";
    const supabase = deps?.supabase ?? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) as unknown as SupabaseClientLike;

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || (profile as { role: string }).role !== "admin") {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { survey_id } = await req.json();
    if (!survey_id) {
      return new Response(JSON.stringify({ error: "survey_id is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const now = new Date().toISOString();

    const { data: cache } = await supabase
      .from("survey_results_cache")
      .select("results")
      .eq("survey_id", survey_id)
      .gte("expires_at", now)
      .maybeSingle();

    if (cache) {
      return new Response(JSON.stringify((cache as { results: SurveyResults }).results), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const { data: survey } = await supabase
      .from("surveys")
      .select("title")
      .eq("id", survey_id)
      .single();

    if (!survey) {
      return new Response(JSON.stringify({ error: "Survey not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { count: totalResponses } = await (supabase
      .from("survey_responses")
      .select("*", { count: "exact", head: true }) as unknown as Promise<{ count: number }>);

    const { count: totalStudents } = await (supabase
      .from("profiles")
      .select("*", { count: "exact", head: true }) as unknown as Promise<{ count: number }>);

    const { data: questions } = await (supabase
      .from("survey_questions")
      .select("id, question_text, question_type, is_required, sort_order")
      .eq("survey_id", survey_id)
      .order("sort_order", { ascending: true }) as unknown as Promise<{ data: unknown[] | null; error?: Error | null }>);

    const questionIds = (questions ?? []).map((q: unknown) => (q as { id: string }).id);
    let answers: {
      question_id: string;
      answer_text: string | null;
      answer_options: string[] | null;
      answer_rating: number | null;
    }[] = [];

    if (questionIds.length > 0) {
      const { data: ans } = await supabase
        .from("survey_answers")
        .select(`
          question_id,
          answer_text,
          answer_options,
          answer_rating
        `)
        .in("question_id", questionIds);
      answers = (ans ?? []) as typeof answers;
    }

    const answersByQuestion: Record<string, typeof answers> = {};
    for (const a of answers ?? []) {
      if (!answersByQuestion[a.question_id]) answersByQuestion[a.question_id] = [];
      answersByQuestion[a.question_id].push(a);
    }

    const questionResults: QuestionResult[] = ((questions ?? []) as { id: string; question_text: string; question_type: string; is_required: boolean; sort_order: number }[]).map(q => {
      const base: QuestionResult = {
        question_id: q.id,
        question_text: q.question_text,
        question_type: q.question_type,
        is_required: q.is_required,
        sort_order: q.sort_order,
      };

      const qAnswers = answersByQuestion[q.id] ?? [];

      if (q.question_type === "single_choice" || q.question_type === "multiple_choice") {
        const optionCounts: Record<string, number> = {};
        for (const a of qAnswers) {
          const values = a.answer_options ?? (a.answer_text ? [a.answer_text] : []);
          for (const v of values) {
            optionCounts[v] = (optionCounts[v] ?? 0) + 1;
          }
        }
        base.option_counts = optionCounts;
      } else if (q.question_type === "rating") {
        const ratings = qAnswers.map(a => a.answer_rating).filter((r): r is number => r !== null);
        const sum = ratings.reduce((acc, r) => acc + r, 0);
        base.average_rating = ratings.length > 0 ? Math.round((sum / ratings.length) * 10) / 10 : 0;
        const dist: Record<string, number> = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
        for (const r of ratings) {
          dist[String(r)] = (dist[String(r)] ?? 0) + 1;
        }
        base.rating_distribution = dist;
      } else if (q.question_type === "text") {
        base.text_responses = qAnswers
          .map(a => a.answer_text)
          .filter((t): t is string => t !== null && t.trim().length > 0);
      }

      return base;
    });

    const results: SurveyResults = {
      survey_id,
      survey_title: (survey as { title: string }).title,
      total_responses: totalResponses ?? 0,
      total_students: totalStudents ?? 0,
      questions: questionResults,
    };

    await supabase
      .from("survey_results_cache")
      .upsert({
        survey_id,
        results,
        generated_at: now,
        expires_at: new Date(Date.now() + 3600000).toISOString(),
      }, { onConflict: "survey_id" });

    return new Response(JSON.stringify(results), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

serve(handler);
