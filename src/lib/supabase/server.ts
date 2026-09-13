import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Server Component / Route Handler client. Reads the caller's session from
// cookies, so queries still run as that user and are subject to RLS — this is
// NOT a privilege-escalation path, just the server-rendered equivalent of client.ts.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component that can't set cookies (no active
            // response) — safe to ignore as long as middleware.ts is refreshing
            // the session on every request.
          }
        },
      },
    }
  );
}
