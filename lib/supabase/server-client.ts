import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Server-only: uses the service_role key to read across all users' data,
// bypassing Row Level Security. This is what makes an internal ops
// dashboard possible (RLS scopes normal clients to their own rows) but
// means this client must never be imported into client components or
// have its key exposed via a NEXT_PUBLIC_* variable.
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Set them in .env.local (see .env.example)."
    );
  }
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}
