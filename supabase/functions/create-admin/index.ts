import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface CreateAdminRequest {
  email: string;
  password: string;
  full_name: string;
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export interface SupabaseClientLike {
  auth: {
    getUser: (token: string) => Promise<{ data: { user: { id: string } } | { user: null }; error?: Error | null }>;
    admin: {
      createUser: (opts: unknown) => Promise<{ data: { user: { id: string } | null }; error?: Error | null }>;
    };
  };
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        single: () => Promise<{ data: { role: string } | null; error?: Error | null }>;
      };
    };
    update: (values: unknown) => {
      eq: (column: string, value: string) => Promise<{ data?: unknown; error?: Error | null }>;
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
    const authHeader = req.headers.get("Authorization")?.replace("Bearer ", "") ?? "";
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const injectedClient = deps?.supabase;
    const anonClient = injectedClient ?? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) as unknown as SupabaseClientLike;
    const { data: { user }, error: authError } = await anonClient.auth.getUser(authHeader);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const serviceClient = injectedClient ?? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) as unknown as SupabaseClientLike;

    // Only existing admins can create new admins
    const { data: callerProfile, error: callerError } = await serviceClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (callerError || callerProfile?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Forbidden: admin access required" }), {
        status: 403,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as CreateAdminRequest;
    const email = body.email?.trim().toLowerCase();
    const password = body.password;
    const fullName = body.full_name?.trim();

    if (!email || !password || password.length < 8 || !fullName) {
      return new Response(
        JSON.stringify({ error: "email, password (min 8 chars) and full_name are required" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    // Create user via admin API (bypasses the public signup flow)
    const { data: newUser, error: createError } = await serviceClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, role: "admin" },
    });

    if (createError) {
      console.error("create-admin: failed to create user", createError);
      return new Response(
        JSON.stringify({ error: createError.message ?? "Failed to create admin user" }),
        { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    if (!newUser.user) {
      return new Response(JSON.stringify({ error: "User creation returned no user" }), {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // Trigger handle_new_user created the profile as 'student'.
    // Force role to 'admin' so it matches the intended admin registration.
    const { error: profileError } = await serviceClient
      .from("profiles")
      .update({ role: "admin", full_name: fullName })
      .eq("id", newUser.user.id);

    if (profileError) {
      console.error("create-admin: failed to update profile", profileError);
      return new Response(JSON.stringify({ error: "User created but profile update failed" }), {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, user_id: newUser.user.id }), {
      status: 201,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("create-admin: unexpected error", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
}

serve(handler);
