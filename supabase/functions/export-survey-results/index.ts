import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

function escapeCsv(val: string): string {
  if (val.includes('"') || val.includes(",") || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

function answerDisplay(a: {
  answer_text: string | null;
  answer_options: string[] | null;
  answer_rating: number | null;
}): string {
  if (a.answer_rating !== null) return String(a.answer_rating);
  if (a.answer_options !== null && a.answer_options.length > 0) return a.answer_options.join("; ");
  return a.answer_text ?? "";
}

serve(async (req: Request) => {
  try {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const authHeader = req.headers.get("Authorization")?.replace("Bearer ", "") ?? "";
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader);
    if (authError || !user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || profile.role !== "admin") {
      return new Response("Forbidden", { status: 403 });
    }

    const { survey_id } = await req.json();
    if (!survey_id) {
      return new Response("survey_id is required", { status: 400 });
    }

    const { data: questions } = await supabase
      .from("survey_questions")
      .select("id, question_text")
      .eq("survey_id", survey_id)
      .order("sort_order", { ascending: true });

    if (!questions || questions.length === 0) {
      return new Response(JSON.stringify({ error: "Sin datos para exportar" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { data: responses, error: respError } = await supabase
      .from("survey_responses")
      .select(`
        id,
        survey_answers (
          question_id,
          answer_text,
          answer_options,
          answer_rating
        )
      `)
      .eq("survey_id", survey_id)
      .order("id", { ascending: true });

    if (respError) {
      return new Response(JSON.stringify({ error: respError.message }), { status: 500 });
    }

    if (!responses || responses.length === 0) {
      return new Response(JSON.stringify({ error: "Sin datos para exportar" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const questionIds = questions.map(q => q.id);

    const headerRow = questions.map(q => escapeCsv(q.question_text)).join(",");
    const dataRows = responses.map(r => {
      const answers = r.survey_answers ?? [];
      const answerMap = new Map<string, typeof answers[0]>();
      for (const a of answers) {
        answerMap.set(a.question_id, a);
      }
      return questionIds.map(qId => escapeCsv(answerDisplay(answerMap.get(qId) ?? { answer_text: null, answer_options: null, answer_rating: null }))).join(",");
    });

    const csv = [headerRow, ...dataRows].join("\n");

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="encuesta-${survey_id}.csv"`,
      },
    });
  } catch (err) {
    console.error("Export error:", err);
    return new Response("Internal error", { status: 500 });
  }
});
