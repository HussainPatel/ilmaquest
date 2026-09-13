import { createClient } from "@/lib/supabase/server";

// Temporary connectivity check — not part of the product. Confirms the app
// can reach Supabase and that the `categories` RLS policy (public select)
// actually works. Safe to delete once we've verified it once.
export default async function DevCheckPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("categories").select("*");

  return (
    <main style={{ padding: 24, fontFamily: "monospace" }}>
      <h1>Supabase connectivity check</h1>
      {error ? (
        <>
          <p style={{ color: "red" }}>Error querying `categories`:</p>
          <pre>{JSON.stringify(error, null, 2)}</pre>
        </>
      ) : (
        <>
          <p style={{ color: "green" }}>
            Connected successfully. `categories` table returned {data?.length ?? 0} row(s)
            (0 is expected — we haven't seeded any yet).
          </p>
          <pre>{JSON.stringify(data, null, 2)}</pre>
        </>
      )}
    </main>
  );
}
