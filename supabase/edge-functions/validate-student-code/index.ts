import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

interface ValidationRequest {
  student_code: string;
}

interface ValidationResponse {
  valid: boolean;
  error?: "INVALID_FORMAT" | "ALREADY_EXISTS" | "BLACKLISTED";
  message?: string;
}

const CODE_REGEX = /^U\d{8}$/;

serve(async (req: Request) => {
  try {
    const { student_code } = (await req.json()) as ValidationRequest;

    // AC3: Format validation
    if (!CODE_REGEX.test(student_code)) {
      const res: ValidationResponse = { valid: false, error: "INVALID_FORMAT", message: "Formato de código inválido" };
      return new Response(JSON.stringify(res), { headers: { "Content-Type": "application/json" } });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // AC4: Check blacklist
    const { data: blacklisted } = await supabase
      .from("student_code_blacklist")
      .select("id")
      .eq("student_code", student_code)
      .maybeSingle();

    if (blacklisted) {
      const res: ValidationResponse = { valid: false, error: "BLACKLISTED", message: "Este codigo estudiantil ha sido desactivado." };
      return new Response(JSON.stringify(res), { headers: { "Content-Type": "application/json" } });
    }

    // AC1: Check uniqueness in profiles
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("student_code", student_code)
      .maybeSingle();

    if (existing) {
      const res: ValidationResponse = { valid: false, error: "ALREADY_EXISTS", message: "Este codigo ya esta registrado." };
      return new Response(JSON.stringify(res), { headers: { "Content-Type": "application/json" } });
    }

    // All checks passed
    const res: ValidationResponse = { valid: true };
    return new Response(JSON.stringify(res), { headers: { "Content-Type": "application/json" } });
  } catch {
    return new Response(JSON.stringify({ valid: false, error: "INTERNAL_ERROR", message: "Error interno del servidor" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

