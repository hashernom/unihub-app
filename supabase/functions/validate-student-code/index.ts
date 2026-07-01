import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

interface ValidationRequest {
  student_code: string;
}

export interface ValidationResponse {
  valid: boolean;
  error?: "INVALID_FORMAT" | "ALREADY_EXISTS" | "BLACKLISTED" | "INTERNAL_ERROR";
  message?: string;
}

// Supports both the documented U######## format and the 11-digit numeric
// prefix used by the institutional email (e.g. 01240371032).
export const CODE_REGEX = /^[Uu]?\d{8,11}$/;

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface SupabaseClientLike {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        maybeSingle: () => Promise<{ data: { id: string } | null }>;
      };
    };
  };
}

export async function handler(
  req: Request,
  deps?: { supabase?: SupabaseClientLike },
): Promise<Response> {
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
    const { student_code } = (await req.json()) as ValidationRequest;

    // AC3: Format validation
    if (!student_code || !CODE_REGEX.test(student_code)) {
      const res: ValidationResponse = { valid: false, error: "INVALID_FORMAT", message: "Formato de código inválido" };
      return new Response(JSON.stringify(res), { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
    }

    const supabase = deps?.supabase ?? createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // AC4: Check blacklist
    const { data: blacklisted } = await supabase
      .from("student_code_blacklist")
      .select("id")
      .eq("student_code", student_code)
      .maybeSingle();

    if (blacklisted) {
      const res: ValidationResponse = { valid: false, error: "BLACKLISTED", message: "Este código estudiantil ha sido desactivado." };
      return new Response(JSON.stringify(res), { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
    }

    // AC1: Check uniqueness in profiles
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("student_code", student_code)
      .maybeSingle();

    if (existing) {
      const res: ValidationResponse = { valid: false, error: "ALREADY_EXISTS", message: "Este código ya está registrado." };
      return new Response(JSON.stringify(res), { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
    }

    // All checks passed
    const res: ValidationResponse = { valid: true };
    return new Response(JSON.stringify(res), { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
  } catch {
    return new Response(JSON.stringify({ valid: false, error: "INTERNAL_ERROR", message: "Error interno del servidor" }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
}

serve(handler);
