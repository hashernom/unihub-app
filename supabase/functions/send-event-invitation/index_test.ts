import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { CORS_HEADERS, generateICS, getTypeLabel, handler, SupabaseClientLike } from "./index.ts";

function createMockSupabase(options: {
  event?: unknown;
  profiles?: unknown[];
  users?: { id: string; email?: string }[];
}) {
  return {
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          single: async () => ({
            data: table === "events" ? options.event ?? null : null,
            error: null,
          }),
        }),
        limit: async () => ({
          data: table === "profiles" ? (options.profiles ?? null) : null,
          error: null,
        }),
      }),
    }),
    auth: {
      admin: {
        listUsers: async () => ({
          data: { users: options.users ?? [] },
          error: null,
        }),
        sendRawEmail: async () => ({ error: null }),
      },
    },
  };
}

function createMockFetch(ok = true) {
  return async () => new Response(ok ? JSON.stringify({ id: "email-1" }) : "err", { status: ok ? 200 : 500 });
}

function postRequest(body: unknown) {
  return new Request("http://localhost", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

Deno.test("returns 200 for OPTIONS", async () => {
  const res = await handler(new Request("http://localhost", { method: "OPTIONS" }));
  assertEquals(res.status, 200);
  assertEquals(res.headers.get("Access-Control-Allow-Origin"), "*");
});

Deno.test("returns 400 when event_id is missing", async () => {
  const res = await handler(postRequest({}), { supabase: createMockSupabase({}) as unknown as SupabaseClientLike });
  assertEquals(res.status, 400);
});

Deno.test("returns 404 when event not found", async () => {
  const res = await handler(
    postRequest({ event_id: "e1" }),
    { supabase: createMockSupabase({ event: null }) as unknown as SupabaseClientLike },
  );
  assertEquals(res.status, 404);
});

Deno.test("sends invitations via provided emails", async () => {
  const res = await handler(
    postRequest({ event_id: "e1", recipient_emails: ["a@b.co"] }),
    {
      supabase: createMockSupabase({
        event: {
          id: "e1",
          title: "Class",
          description: "Desc",
          event_type: "class",
          start_time: "2026-01-01T10:00:00Z",
          end_time: "2026-01-01T11:00:00Z",
          recurring_rule: null,
          classrooms: { name: "A1", building: "B1" },
          profiles: { full_name: "Prof" },
        },
      }) as unknown as SupabaseClientLike,
      fetch: createMockFetch(true) as unknown as typeof fetch,
    },
  );
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.sent, 1);
  assertEquals(body.total, 1);
});

Deno.test("returns no recipients when profile list is empty", async () => {
  const res = await handler(
    postRequest({ event_id: "e1" }),
    {
      supabase: createMockSupabase({
        event: {
          id: "e1",
          title: "Class",
          description: "",
          event_type: "other",
          start_time: "2026-01-01T10:00:00Z",
          end_time: "2026-01-01T11:00:00Z",
          recurring_rule: null,
          classrooms: null,
          profiles: null,
        },
        profiles: [],
      }) as unknown as SupabaseClientLike,
    },
  );
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.sent, 0);
});

Deno.test("generateICS produces VCALENDAR block", () => {
  const ics = generateICS({
    uid: "e1",
    title: "Class",
    description: "Desc",
    startTime: new Date("2026-01-01T10:00:00Z"),
    endTime: new Date("2026-01-01T11:00:00Z"),
    location: "A1",
    organizer: "Prof",
    isRecurring: false,
  });
  assertEquals(ics.includes("BEGIN:VCALENDAR"), true);
  assertEquals(ics.includes("SUMMARY:Class"), true);
});

Deno.test("getTypeLabel maps known types", () => {
  assertEquals(getTypeLabel("class"), "Clase");
  assertEquals(getTypeLabel("unknown"), "unknown");
});
