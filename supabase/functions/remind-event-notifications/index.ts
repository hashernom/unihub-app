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

interface QueryBuilderLike {
  eq: (column: string, value: unknown) => QueryBuilderLike;
  gte: (column: string, value: string) => QueryBuilderLike;
  lt: (column: string, value: string) => QueryBuilderLike;
  in: (column: string, values: unknown[]) => QueryBuilderLike;
}

export interface SupabaseClientLike {
  from: (table: string) => {
    select: (columns: string) => QueryBuilderLike;
    update: (values: unknown) => {
      eq: (column: string, value: unknown) => Promise<{ data?: unknown; error?: Error | null }>;
    };
  };
}

export async function handler(
  _req: Request,
  deps?: { supabase?: SupabaseClientLike; fetch?: typeof fetch },
): Promise<Response> {
  try {
    const supabase = deps?.supabase ?? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) as unknown as SupabaseClientLike;
    const fetchFn = deps?.fetch ?? fetch;

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
    const oneHourIds = new Set(oneHourEvents.map((e) => e.id));
    const fifteenMinOnly = fifteenMinEvents.filter((e) => !oneHourIds.has(e.id));

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
      const sent = await sendFCM(supabase, n.userIds, n.title, n.body, fetchFn);
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
}

serve(handler);

export async function findEvents(
  supabase: SupabaseClientLike,
  from: Date,
  to: Date,
): Promise<{ id: string; title: string; start_time: string; classroom_name: string | null }[]> {
  const { data, error } = await (supabase
    .from("events")
    .select(`
      id, title, start_time,
      classrooms(name)
    `)
    .eq("is_cancelled", false)
    .gte("start_time", from.toISOString())
    .lt("start_time", to.toISOString()) as unknown as Promise<{ data: unknown[] | null; error?: Error | null }>);

  if (error) {
    console.error("Error fetching events:", error);
    return [];
  }

  return (data ?? []).map((e: unknown) => ({
    id: (e as Record<string, unknown>)["id"] as string,
    title: (e as Record<string, unknown>)["title"] as string,
    start_time: (e as Record<string, unknown>)["start_time"] as string,
    classroom_name: ((e as Record<string, unknown>)["classrooms"] as Record<string, unknown> | null)?.["name"] as string | null ?? null,
  }));
}

export async function getEnabledUsers(
  supabase: SupabaseClientLike,
  setting: "event_reminder_1h" | "event_reminder_15m",
): Promise<string[]> {
  const { data } = await (supabase
    .from("user_notification_settings")
    .select("user_id")
    .eq(setting, true) as unknown as Promise<{ data: unknown[] | null; error?: Error | null }>);

  return (data ?? []).map((r: unknown) => (r as Record<string, unknown>)["user_id"] as string);
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", hour12: true });
}

export async function sendFCM(
  supabase: SupabaseClientLike,
  userIds: string[],
  title: string,
  body: string,
  fetchFn?: typeof fetch,
): Promise<number> {
  if (!FCM_SERVER_KEY) {
    console.warn("FCM_SERVER_KEY not configured");
    return 0;
  }

  const { data: tokens } = await (supabase
    .from("notification_tokens")
    .select("fcm_token, user_id")
    .eq("is_active", true)
    .in("user_id", userIds) as unknown as Promise<{ data: unknown[] | null; error?: Error | null }>);

  if (!tokens || tokens.length === 0) return 0;

  let sent = 0;
  const seen = new Set<string>();

  for (const t of tokens as { fcm_token: string; user_id: string }[]) {
    if (seen.has(t.fcm_token)) continue;
    seen.add(t.fcm_token);

    try {
      const fcmRes = await (fetchFn ?? fetch)(FCM_ENDPOINT, {
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
        await supabase
          .from("notification_tokens")
          .update({ is_active: false })
          .eq("fcm_token", t.fcm_token);
      }
    } catch {
      // skip
    }
  }

  return sent;
}
