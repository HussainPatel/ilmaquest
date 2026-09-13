import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

const ALLOWED_ROLES = ["reviewer", "senior_reviewer", "admin"];

export default async function ReviewQueuePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/review");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !ALLOWED_ROLES.includes(profile.role)) {
    return (
      <main className="mx-auto max-w-sm px-6 py-16 text-center">
        <h1 className="text-xl font-semibold">Reviewer access required</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your account role is <strong>{profile?.role ?? "unknown"}</strong>. Ask an admin to grant
          you the <code>reviewer</code> role.
        </p>
      </main>
    );
  }

  const { data: pending } = await supabase
    .from("questions")
    .select("id, question_text, difficulty, created_by, created_at, category_id, categories(name)")
    .eq("state", "pending_review")
    .order("created_at", { ascending: true });

  const { data: approved } = await supabase
    .from("questions")
    .select("id, question_text, created_by, categories(name)")
    .eq("state", "approved")
    .order("created_at", { ascending: true });

  const { data: flagged } = await supabase
    .from("questions")
    .select("id, question_text, created_by, categories(name)")
    .eq("state", "flagged")
    .order("updated_at", { ascending: true });

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-2xl font-semibold">Review queue</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        You can&apos;t review a question you authored yourself — see docs/CONTENT_PROCESS.md §3.
      </p>

      {flagged?.length ? (
        <section className="mt-8">
          <h2 className="flex items-center gap-1.5 text-sm font-medium uppercase tracking-wide text-danger">
            ⚠️ Flagged, pulled from rotation ({flagged.length})
          </h2>
          <div className="mt-3 flex flex-col gap-2">
            {flagged.map((q) => (
              <Link
                key={q.id}
                href={`/review/${q.id}`}
                className="block rounded-xl border border-danger/30 bg-danger/5 p-4 transition hover:border-danger"
              >
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {(q.categories as unknown as { name: string } | null)?.name ?? "Uncategorized"}
                </p>
                <p className="mt-1 text-sm">{q.question_text}</p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-8">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Pending review ({pending?.length ?? 0})
        </h2>
        <div className="mt-3 flex flex-col gap-2">
          {pending?.length ? (
            pending.map((q) => (
              <Link
                key={q.id}
                href={`/review/${q.id}`}
                className="block rounded-xl border border-border bg-card p-4 transition hover:border-primary"
              >
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {(q.categories as unknown as { name: string } | null)?.name ?? "Uncategorized"} · difficulty {q.difficulty}
                </p>
                <p className="mt-1 text-sm">{q.question_text}</p>
              </Link>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Nothing waiting on review.</p>
          )}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Approved, awaiting publish ({approved?.length ?? 0})
        </h2>
        <div className="mt-3 flex flex-col gap-2">
          {approved?.length ? (
            approved.map((q) => (
              <Link
                key={q.id}
                href={`/review/${q.id}`}
                className="block rounded-xl border border-border bg-card p-4 transition hover:border-primary"
              >
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {(q.categories as unknown as { name: string } | null)?.name ?? "Uncategorized"}
                </p>
                <p className="mt-1 text-sm">{q.question_text}</p>
              </Link>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Nothing approved yet.</p>
          )}
        </div>
      </section>
    </main>
  );
}
