import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface AnnouncementPayload {
  id: string;
  title: string;
  body: string;
  category: string;
  is_pinned: boolean;
}

interface WebhookPayload {
  type: "INSERT";
  table: string;
  record: AnnouncementPayload;
  schema: "public";
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const FCM_SERVER_KEY = Deno.env.get("FCM_SERVER_KEY") ?? "";

const FCM_ENDPOINT = "https://fcm.googleapis.com/fcm/send";

serve(async (req: Request) => {
  try {
    const payload: WebhookPayload = await req.json();
    const { record } = payload;

    if (!record || !record.id) {
      return new Response("Invalid payload", { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch all active notification tokens
    const { data: tokens, error: tokenError } = await supabase
      .from("notification_tokens")
      .select("fcm_token, user_id")
      .eq("is_active", true);

    if (tokenError) {
      console.error("Error fetching tokens:", tokenError);
      return new Response(JSON.stringify({ sent: 0, failed: 0, error: tokenError.message }), { status: 500 });
    }

    if (!tokens || tokens.length === 0) {
      console.log("No active tokens found. Skipping notifications.");
      return new Response(JSON.stringify({ sent: 0, failed: 0, skipped: 0 }), { status: 200 });
    }

    const notificationTitle = record.title;
    const notificationBody = record.body.length > 100
      ? record.body.substring(0, 100) + "..."
      : record.body;

    let sent = 0;
    let failed = 0;

    // Send to each token individually
    for (const token of tokens) {
      try {
        const fcmResponse = await fetch(FCM_ENDPOINT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `key=${FCM_SERVER_KEY}`,
          },
          body: JSON.stringify({
            to: token.fcm_token,
            notification: {
              title: notificationTitle,
              body: notificationBody,
            },
            data: {
              announcement_id: record.id,
              category: record.category,
              type: "announcement",
            },
          }),
        });

        if (fcmResponse.ok) {
          sent++;
        } else {
          const errBody = await fcmResponse.text();
          console.error(`FCM failed for user ${token.user_id}:`, errBody);

          // If token is invalid, mark it as inactive
          if (fcmResponse.status === 400 || fcmResponse.status === 404) {
            await supabase
              .from("notification_tokens")
              .update({ is_active: false })
              .eq("fcm_token", token.fcm_token);
          }
          failed++;
        }
      } catch (err) {
        console.error(`Network error for user ${token.user_id}:`, err);
        failed++;
      }
    }

    console.log(`Notifications sent: ${sent}, failed: ${failed}`);
    return new Response(JSON.stringify({ sent, failed, skipped: tokens.length - sent - failed }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ sent: 0, failed: 0, error: "Internal error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
