import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface QueryResult {
  data: Record<string, unknown>[] | null;
  error?: Error | null;
}

interface QueryBuilderLike {
  eq: (column: string, value: unknown) => QueryBuilderLike;
  in: (column: string, values: unknown[]) => QueryBuilderLike;
  neq: (column: string, value: unknown) => QueryBuilderLike;
  lt: (column: string, value: string) => QueryBuilderLike;
  gt: (column: string, value: string) => QueryBuilderLike;
  contains: (column: string, value: unknown) => QueryBuilderLike;
}

export interface SupabaseClientLike {
  auth: {
    getUser: (token: string) => Promise<{ data: { user: { id: string } } | { user: null }; error?: Error | null }>;
  };
  from: (table: string) => {
    select: (columns: string) => QueryBuilderLike;
  };
}

export async function handler(
  req: Request,
  deps?: { supabase?: SupabaseClientLike },
): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");

    const supabase = deps?.supabase ?? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    }) as unknown as SupabaseClientLike;

    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const body: {
      classroom_id?: string;
      start_time: string;
      end_time: string;
      resources?: string[];
      exclude_event_id?: string;
    } = await req.json();

    if (!body.start_time || !body.end_time) {
      return new Response(JSON.stringify({ error: "start_time and end_time are required" }), {
        status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // Build classroom query
    let classroomQuery = supabase
      .from("classrooms")
      .select("*")
      .eq("is_active", true);

    if (body.classroom_id) {
      classroomQuery = classroomQuery.eq("id", body.classroom_id);
    }

    if (body.resources && body.resources.length > 0) {
      classroomQuery = classroomQuery.contains("resources", body.resources);
    }

    const { data: classrooms, error: clsError } = await (classroomQuery as unknown as Promise<QueryResult>);
    if (clsError) throw clsError;
    if (!classrooms || classrooms.length === 0) {
      return new Response(JSON.stringify({
        available_classrooms: [],
        message: body.classroom_id
          ? { available: false, reason: "Aula no encontrada o inactiva" }
          : "No hay aulas disponibles",
      }), { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
    }

    // Find conflicting events
    let eventQuery = supabase
      .from("events")
      .select("id, title, start_time, end_time, classroom_id, event_type, classrooms!inner(name)")
      .eq("is_cancelled", false)
      .lt("start_time", body.end_time)
      .gt("end_time", body.start_time);

    const classroomIds = classrooms.map((c: Record<string, unknown>) => c["id"]);
    eventQuery = eventQuery.in("classroom_id", classroomIds);

    if (body.exclude_event_id) {
      eventQuery = eventQuery.neq("id", body.exclude_event_id);
    }

    const { data: conflicts, error: evtError } = await (eventQuery as unknown as Promise<QueryResult>);
    if (evtError) throw evtError;

    const busyClassroomIds = new Set((conflicts ?? []).map((e: Record<string, unknown>) => e["classroom_id"]));

    const availableClassrooms = classrooms
      .filter((c: Record<string, unknown>) => !busyClassroomIds.has(c["id"]))
      .map((c: Record<string, unknown>) => ({
        id: c["id"],
        name: c["name"],
        building: c["building"],
        capacity: c["capacity"],
        resources: c["resources"],
      }));

    // If specific classroom was requested
    if (body.classroom_id) {
      const classroom = classrooms[0] as Record<string, unknown>;
      const isAvailable = !busyClassroomIds.has(classroom["id"]);
      const eventConflicts = (conflicts ?? []).filter(
        (e: Record<string, unknown>) => e["classroom_id"] === body.classroom_id,
      );

      return new Response(JSON.stringify({
        available: isAvailable,
        classroom: {
          id: classroom["id"],
          name: classroom["name"],
          building: classroom["building"],
          capacity: classroom["capacity"],
          resources: classroom["resources"],
        },
        conflicts: isAvailable ? [] : eventConflicts.map((e: Record<string, unknown>) => ({
          id: e["id"],
          title: e["title"],
          start_time: e["start_time"],
          end_time: e["end_time"],
          event_type: e["event_type"],
          classroom_name: (e["classrooms"] as Record<string, unknown>)?.["name"] ?? null,
        })),
        available_classrooms: isAvailable
          ? [{ id: classroom["id"], name: classroom["name"] }]
          : [],
      }), { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
    }

    // Return all available
    return new Response(JSON.stringify({
      available_classrooms: availableClassrooms,
      total: availableClassrooms.length,
      range: { start_time: body.start_time, end_time: body.end_time },
    }), { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
}

serve(handler);
