import { createBrowserClient } from "@supabase/ssr";

// Browser-side client. Uses the anon key only — every query made through this
// client is subject to the RLS policies in supabase/migrations/. Safe to import
// from any client component.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
