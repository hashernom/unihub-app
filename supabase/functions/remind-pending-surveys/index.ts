import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const FCM_SERVER_KEY = Deno.env.get("FCM_SERVER_KEY") ?? "";

const FCM_ENDPOINT = "https://fcm.googleapis.com/fcm/send";

serve(async (_req: Request) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const { data: surveys } = await supabase
      .from("surveys")
      .select("id, title")
      .eq("is_active", true)
      .gte("end_date", now.toISOString())
      .lte("end_date", in24h.toISOString());

    if (!surveys || surveys.length === 0) {
      return new Response(JSON.stringify({ sent: 0, surveys: 0 }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const { data: allTokens } = await supabase
      .from("notification_tokens")
      .select("user_id, fcm_token")
      .eq("is_active", true);

    if (!allTokens || allTokens.length === 0) {
      return new Response(JSON.stringify({ sent: 0, surveys: surveys.length, skipped: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    let totalSent = 0;

    for (const survey of surveys) {
      const { data: responded } = await supabase
        .from("survey_responses")
        .select("user_id")
        .eq("survey_id", survey.id);

      const respondedIds = new Set(responded?.map(r => r.user_id) ?? []);

      const { data: reminded } = await supabase
        .from("survey_reminders")
        .select("user_id")
        .eq("survey_id", survey.id);

      const remindedIds = new Set(reminded?.map(r => r.user_id) ?? []);

      const pending = allTokens.filter(
        t => !respondedIds.has(t.user_id) && !remindedIds.has(t.user_id),
      );

      if (pending.length === 0) continue;

      const title = "Recordatorio de encuesta";
      const body = `La encuesta "${survey.title}" está por vencer. ¡Responde antes de que termine!`;

      let sent = 0;
      for (const p of pending) {
        try {
          const fcmRes = await fetch(FCM_ENDPOINT, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `key=${FCM_SERVER_KEY}`,
            },
            body: JSON.stringify({
              to: p.fcm_token,
              notification: { title, body },
              data: {
                survey_id: survey.id,
                type: "survey_reminder",
              },
            }),
          });

          if (fcmRes.ok) {
            sent++;
          } else if (fcmRes.status === 400 || fcmRes.status === 404) {
            await supabase
              .from("notification_tokens")
              .update({ is_active: false })
              .eq("fcm_token", p.fcm_token);
          }
        } catch {
          // Network error — skip this token
        }
      }

      if (sent > 0) {
        await supabase.from("survey_reminders").insert(
          pending.map(p => ({ survey_id: survey.id, user_id: p.user_id })),
        );
      }

      totalSent += sent;
    }

    return new Response(JSON.stringify({ sent: totalSent, surveys: surveys.length }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ sent: 0, error: "Internal error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
