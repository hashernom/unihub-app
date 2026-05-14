import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

serve(async (_req: Request) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data, error } = await supabase
      .from("surveys")
      .update({ is_active: false })
      .is("end_date", "not", null)        // only surveys with an end_date
      .lt("end_date", new Date().toISOString())  // that has passed
      .eq("is_active", true)               // and are currently active
      .select("id, title");

    if (error) {
      console.error("Error deactivating surveys:", error);
      return new Response(JSON.stringify({ deactivated: 0, error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const count = data?.length ?? 0;
    console.log(`Deactivated ${count} expired surveys`);
    return new Response(JSON.stringify({ deactivated: count }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ deactivated: 0, error: "Internal error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
