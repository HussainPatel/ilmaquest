import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import HostButton from "./host-button";

export default async function HostPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/host");
  }

  const { data: quizzes } = await supabase
    .from("quizzes")
    .select("id, title")
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto max-w-lg px-6 py-16">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Host a quiz</h1>
          <p className="mt-1 text-sm text-muted-foreground">Pick a quiz to start a live session.</p>
        </div>
        <a
          href="/host/new"
          className="rounded-lg border border-border px-3.5 py-2 text-sm font-medium transition hover:bg-card"
        >
          + New quiz
        </a>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        {quizzes?.length ? (
          quizzes.map((q) => (
            <div
              key={q.id}
              className="flex items-center justify-between rounded-xl border border-border bg-card p-4"
            >
              <span className="font-medium">{q.title}</span>
              <HostButton quizId={q.id} />
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">
            No quizzes yet — create one from published questions.
          </p>
        )}
      </div>
    </main>
  );
}
