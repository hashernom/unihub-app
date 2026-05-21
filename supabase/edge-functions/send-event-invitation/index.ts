import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") ?? "noreply@unihub.app";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body: { event_id: string; recipient_emails?: string[] } = await req.json();
    if (!body.event_id) {
      return new Response(JSON.stringify({ error: "event_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: event, error: evtError } = await supabase
      .from("events")
      .select(`
        id, title, description, event_type, start_time, end_time,
        recurring_rule, color, classroom_id,
        classrooms(name, building),
        profiles!events_professor_id_fkey(full_name)
      `)
      .eq("id", body.event_id)
      .single();

    if (evtError || !event) {
      return new Response(JSON.stringify({ error: "Event not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const e = event as Record<string, unknown>;
    const classroom = e["classrooms"] as Record<string, unknown> | null;
    const professor = e["profiles"] as Record<string, unknown> | null;

    let recipients = body.recipient_emails;

    if (!recipients || recipients.length === 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .limit(100);

      if (!profiles || profiles.length === 0) {
        return new Response(JSON.stringify({ sent: 0, message: "No recipients" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const userIds = profiles.map((p: Record<string, unknown>) => p["id"]);
      const { data: users } = await supabase.auth.admin.listUsers();

      recipients = users?.users
        ?.filter((u) => userIds.includes(u.id))
        .map((u) => u.email ?? "")
        .filter(Boolean) ?? [];
    }

    if (!recipients || recipients.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: "No valid recipients" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const eventTitle = e["title"] as string;
    const startTime = new Date(e["start_time"] as string);
    const endTime = new Date(e["end_time"] as string);
    const classroomName = classroom?.["name"] as string ?? "Sin aula";
    const building = classroom?.["building"] as string ?? "";
    const professorName = professor?.["full_name"] as string ?? null;
    const description = (e["description"] as string) ?? "";
    const eventType = (e["event_type"] as string) ?? "other";
    const isRecurring = !!e["recurring_rule"];

    const icsContent = generateICS({
      uid: e["id"] as string,
      title: eventTitle,
      description,
      startTime,
      endTime,
      location: classroomName + (building ? ` - ${building}` : ""),
      organizer: professorName ?? "UniHub",
      isRecurring,
    });

    const dateStr = startTime.toLocaleDateString("es-CO", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
    const timeStr = `${startTime.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })} - ${endTime.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}`;

    const htmlBody = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1E3A5F; padding: 24px; border-radius: 8px 8px 0 0;">
          <h1 style="color: #D4A843; margin: 0; font-size: 20px;">📅 Invitación a Evento</h1>
        </div>
        <div style="padding: 24px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
          <h2 style="color: #1E3A5F;">${eventTitle}</h2>
          ${description ? `<p style="color: #666; line-height: 1.5;">${description}</p>` : ""}
          <table style="width: 100%; margin: 16px 0;">
            <tr><td style="padding: 8px 0; color: #888;">📅 Fecha</td><td style="padding: 8px 0;"><strong>${dateStr}</strong></td></tr>
            <tr><td style="padding: 8px 0; color: #888;">⏰ Hora</td><td style="padding: 8px 0;"><strong>${timeStr}</strong></td></tr>
            <tr><td style="padding: 8px 0; color: #888;">🏫 Aula</td><td style="padding: 8px 0;"><strong>${classroomName}${building ? ` (${building})` : ""}</strong></td></tr>
            ${professorName ? `<tr><td style="padding: 8px 0; color: #888;">👨‍🏫 Profesor</td><td style="padding: 8px 0;"><strong>${professorName}</strong></td></tr>` : ""}
            <tr><td style="padding: 8px 0; color: #888;">🏷️ Tipo</td><td style="padding: 8px 0;"><strong>${getTypeLabel(eventType)}</strong></td></tr>
            ${isRecurring ? `<tr><td style="padding: 8px 0; color: #888;">🔄</td><td style="padding: 8px 0;"><strong>Evento recurrente</strong></td></tr>` : ""}
          </table>
          <p style="color: #888; font-size: 14px;">Adjunto encontrarás un archivo ICS para agregar este evento a tu calendario.</p>
          <p style="color: #aaa; font-size: 12px; margin-top: 24px;">UniHub — Plataforma Académica</p>
        </div>
      </div>
    `;

    let sent = 0;
    if (RESEND_API_KEY) {
      for (const email of recipients) {
        try {
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${RESEND_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: FROM_EMAIL,
              to: [email],
              subject: `📅 Invitación: ${eventTitle}`,
              html: htmlBody,
              attachments: [{
                filename: `evento-${e["id"]}.ics`,
                content: btoa(icsContent),
              }],
            }),
          });

          if (res.ok) sent++;
          else {
            const errBody = await res.text();
            console.error(`Failed to send to ${email}:`, errBody);
          }
        } catch {
          // skip individual failures
        }
      }
    } else {
      console.warn("RESEND_API_KEY not configured — using Supabase auth email fallback");
      for (const email of recipients) {
        try {
          const { error } = await supabase.auth.admin.sendRawEmail({
            email,
            subject: `📅 Invitación: ${eventTitle}`,
            htmlBody,
          });
          if (!error) sent++;
        } catch {
          // skip
        }
      }
    }

    return new Response(JSON.stringify({
      sent,
      total: recipients.length,
      event_id: body.event_id,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: "Internal error", sent: 0 }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function generateICS(params: {
  uid: string;
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  location: string;
  organizer: string;
  isRecurring: boolean;
}): string {
  const fmt = (d: Date) =>
    d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

  const now = new Date();
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//UniHub//Event//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${params.uid}@unihub.app`,
    `DTSTAMP:${fmt(now)}`,
    `DTSTART:${fmt(params.startTime)}`,
    `DTEND:${fmt(params.endTime)}`,
    `SUMMARY:${params.title}`,
    `DESCRIPTION:${params.description.replace(/\n/g, "\\n")}`,
    `LOCATION:${params.location}`,
    `ORGANIZER;CN=${params.organizer}:noreply@unihub.app`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return lines.join("\r\n");
}

function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    class: "Clase", exam: "Examen", meeting: "Reunión",
    workshop: "Taller", other: "Otro",
  };
  return labels[type] ?? type;
}
