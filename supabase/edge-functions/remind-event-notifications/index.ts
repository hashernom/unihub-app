import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const FCM_SERVER_KEY = Deno.env.get("FCM_SERVER_KEY") ?? "";

const FCM_ENDPOINT = "https://fcm.googleapis.com/fcm/send";

interface NotificationSetting {
  user_id: string;
  event_reminder_1h: boolean;
  event_reminder_15m: boolean;
}

serve(async (_req: Request) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const now = new Date();

    const inOneHour = new Date(now.getTime() + 60 * 60 * 1000);
    const inFifteenMin = new Date(now.getTime() + 15 * 60 * 1000);

    const notifications: { title: string; body: string; userIds: string[] }[] = [];

    const oneHourEvents = await findEvents(supabase, now, inOneHour);
    for (const event of oneHourEvents) {
      const users = await getEnabledUsers(supabase, "event_reminder_1h");
      if (users.length > 0) {
        notifications.push({
          title: "Evento en 1 hora",
          body: `"${event.title}" — ${event.classroom_name ?? "Sin aula"} a las ${formatTime(event.start_time)}`,
          userIds: users,
        });
      }
    }

    const fifteenMinEvents = await findEvents(supabase, now, inFifteenMin);
    const fifteenMinIds = new Set(fifteenMinEvents.map((e) => e.id));
    const fifteenMinOnly = fifteenMinEvents.filter((e) => !fifteenMinIds.has(e.id));

    for (const event of fifteenMinOnly) {
      const users = await getEnabledUsers(supabase, "event_reminder_15m");
      if (users.length > 0) {
        notifications.push({
          title: "Evento en 15 minutos",
          body: `"${event.title}" — ${event.classroom_name ?? "Sin aula"} a las ${formatTime(event.start_time)}`,
          userIds: users,
        });
      }
    }

    let totalSent = 0;
    for (const n of notifications) {
      const sent = await sendFCM(supabase, n.userIds, n.title, n.body);
      totalSent += sent;
    }

    return new Response(JSON.stringify({
      sent: totalSent,
      notifications: notifications.length,
      oneHourEvents: oneHourEvents.length,
      fifteenMinEvents: fifteenMinOnly.length,
    }), {
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

async function findEvents(
  supabase: ReturnType<typeof createClient>,
  from: Date,
  to: Date,
): Promise<{ id: string; title: string; start_time: string; classroom_name: string | null }[]> {
  const { data, error } = await supabase
    .from("events")
    .select(`
      id, title, start_time,
      classrooms(name)
    `)
    .eq("is_cancelled", false)
    .gte("start_time", from.toISOString())
    .lt("start_time", to.toISOString());

  if (error) {
    console.error("Error fetching events:", error);
    return [];
  }

  return (data ?? []).map((e: Record<string, unknown>) => ({
    id: e["id"] as string,
    title: e["title"] as string,
    start_time: e["start_time"] as string,
    classroom_name: (e["classrooms"] as Record<string, unknown> | null)?.["name"] as string | null ?? null,
  }));
}

async function getEnabledUsers(
  supabase: ReturnType<typeof createClient>,
  setting: "event_reminder_1h" | "event_reminder_15m",
): Promise<string[]> {
  const { data } = await supabase
    .from("user_notification_settings")
    .select("user_id")
    .eq(setting, true);

  return (data ?? []).map((r: Record<string, unknown>) => r["user_id"] as string);
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", hour12: true });
}

async function sendFCM(
  supabase: ReturnType<typeof createClient>,
  userIds: string[],
  title: string,
  body: string,
): Promise<number> {
  if (!FCM_SERVER_KEY) {
    console.warn("FCM_SERVER_KEY not configured");
    return 0;
  }

  const { data: tokens } = await supabase
    .from("notification_tokens")
    .select("fcm_token, user_id")
    .eq("is_active", true)
    .in("user_id", userIds);

  if (!tokens || tokens.length === 0) return 0;

  let sent = 0;
  const seen = new Set<string>();

  for (const t of tokens as { fcm_token: string; user_id: string }[]) {
    if (seen.has(t.fcm_token)) continue;
    seen.add(t.fcm_token);

    try {
      const fcmRes = await fetch(FCM_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `key=${FCM_SERVER_KEY}`,
        },
        body: JSON.stringify({
          to: t.fcm_token,
          notification: { title, body },
          data: {
            type: "event_reminder",
          },
        }),
      });

      if (fcmRes.ok) {
        sent++;
      } else if (fcmRes.status === 400 || fcmRes.status === 404) {
        await supabase.from("notification_tokens")
          .update({ is_active: false })
          .eq("fcm_token", t.fcm_token);
      }
    } catch {
      // skip
    }
  }

  return sent;
}
