import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role client — BYPASSES ROW-LEVEL SECURITY ENTIRELY.
 *
 * Use this ONLY inside trusted server-side code (Route Handlers, Server
 * Actions) for the specific operations docs/DATA_MODEL.md and
 * docs/ARCHITECTURE.md deliberately gave no client RLS policy for:
 *   - writing game_players.score / game_answers (server computes correctness)
 *   - writing challenges.*_score
 *   - inserting system-generated notifications
 *   - admin role changes on public.users
 *
 * NEVER import this file into a Client Component, NEVER send this client (or
 * the key it uses) to the browser or the Chrome extension, and NEVER use it
 * as a shortcut to skip writing a proper RLS policy elsewhere — see
 * docs/SECURITY.md §4.
 */
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
