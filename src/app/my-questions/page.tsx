import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ResubmitButton from "./resubmit-button";

const STATE_LABEL: Record<string, string> = {
  draft: "Draft",
  pending_review: "Pending review",
  needs_edit: "Needs edit",
  rejected: "Rejected",
  approved: "Approved — awaiting publish",
  published: "Published",
  flagged: "Flagged",
  retired: "Retired",
};

export default async function MyQuestionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/my-questions");
  }

  const { data: questions } = await supabase
    .from("questions")
    .select("id, question_text, state, updated_at, categories(name)")
    .eq("created_by", user.id)
    .order("updated_at", { ascending: false });

  const questionIds = questions?.map((q) => q.id) ?? [];
  const { data: logs } = questionIds.length
    ? await supabase
        .from("review_log")
        .select("question_id, action, comment, created_at")
        .in("question_id", questionIds)
        .order("created_at", { ascending: false })
    : { data: [] };

  const latestCommentByQuestion = new Map<string, { action: string; comment: string | null }>();
  for (const log of logs ?? []) {
    if (!latestCommentByQuestion.has(log.question_id)) {
      latestCommentByQuestion.set(log.question_id, { action: log.action, comment: log.comment });
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">My submissions</h1>
        <a
          href="/contribute"
          className="rounded-lg border border-border px-3.5 py-2 text-sm font-medium transition hover:bg-card"
        >
          + New question
        </a>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        {questions?.length ? (
          questions.map((q) => {
            const category = q.categories as unknown as { name: string } | null;
            const log = latestCommentByQuestion.get(q.id);
            return (
              <div key={q.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {category?.name ?? "Uncategorized"}
                    </p>
                    <p className="mt-1 text-sm">{q.question_text}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      q.state === "published"
                        ? "bg-primary/10 text-primary"
                        : q.state === "rejected" || q.state === "flagged"
                          ? "bg-danger/10 text-danger"
                          : "bg-accent/15 text-accent"
                    }`}
                  >
                    {STATE_LABEL[q.state] ?? q.state}
                  </span>
                </div>

                {log?.comment && (q.state === "needs_edit" || q.state === "rejected") && (
                  <p className="mt-2 rounded-lg bg-background p-2.5 text-xs text-muted-foreground">
                    Reviewer comment: {log.comment}
                  </p>
                )}

                {(q.state === "draft" || q.state === "needs_edit") && (
                  <div className="mt-3 flex gap-2">
                    <a
                      href={`/my-questions/${q.id}/edit`}
                      className="rounded-lg border border-border px-3.5 py-1.5 text-xs font-medium transition hover:bg-background"
                    >
                      Edit
                    </a>
                    {q.state === "draft" && <ResubmitButton questionId={q.id} />}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <p className="text-sm text-muted-foreground">
            You haven&apos;t submitted any questions yet.
          </p>
        )}
      </div>
    </main>
  );
}
