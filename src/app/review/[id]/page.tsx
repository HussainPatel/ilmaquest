import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import ReviewActions from "./review-actions";
import PublishButton from "./publish-button";
import FlagResolutionActions from "./flag-resolution-actions";

const ALLOWED_ROLES = ["reviewer", "senior_reviewer", "admin"];

export default async function ReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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
    redirect("/review");
  }

  const { data: question } = await supabase
    .from("questions")
    .select(
      "id, question_text, choices, correct_choice_id, explanation_text, difficulty, state, is_ai_drafted, created_by, source_id, categories(name)"
    )
    .eq("id", id)
    .single();

  if (!question) {
    notFound();
  }

  const { data: source } = await supabase
    .from("sources")
    .select("*")
    .eq("id", question.source_id)
    .single();

  const isOwnSubmission = question.created_by === user.id;

  const { data: flags } =
    question.state === "flagged"
      ? await supabase
          .from("flags")
          .select("id, reason, created_at, resolved_at")
          .eq("question_id", id)
          .order("created_at", { ascending: true })
      : { data: null };

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {(question.categories as unknown as { name: string } | null)?.name ?? "Uncategorized"} ·
        difficulty {question.difficulty} · state: {question.state}
      </p>
      <h1 className="mt-2 text-xl font-semibold">{question.question_text}</h1>

      <div className="mt-4 rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold">Source</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div>
            <dt className="text-xs uppercase text-muted-foreground">Type</dt>
            <dd>{source?.type}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-muted-foreground">Reference</dt>
            <dd>{source?.external_ref}</dd>
          </div>
          {source?.text_translation && (
            <div>
              <dt className="text-xs uppercase text-muted-foreground">Translation</dt>
              <dd>
                {source.text_translation}{" "}
                <span className="text-muted-foreground">— {source.translator}</span>
              </dd>
            </div>
          )}
          {source?.grading && (
            <div>
              <dt className="text-xs uppercase text-muted-foreground">Grading</dt>
              <dd className="capitalize">{source.grading}</dd>
            </div>
          )}
          {source?.madhab && (
            <div>
              <dt className="text-xs uppercase text-muted-foreground">Madhab</dt>
              <dd className="capitalize">{source.madhab}</dd>
            </div>
          )}
          {source?.citation_text && (
            <div>
              <dt className="text-xs uppercase text-muted-foreground">Citation</dt>
              <dd>{source.citation_text}</dd>
            </div>
          )}
        </dl>
      </div>

      <div className="mt-4 rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold">Choices</h2>
        <ul className="mt-3 space-y-1.5 text-sm">
          {(question.choices as { id: string; text: string }[]).map((c) => (
            <li
              key={c.id}
              className={c.id === question.correct_choice_id ? "font-medium text-primary" : ""}
            >
              {c.text}
              {c.id === question.correct_choice_id && " ✓ correct"}
            </li>
          ))}
        </ul>
        <h2 className="mt-4 text-sm font-semibold">Explanation</h2>
        <p className="mt-1 text-sm text-muted-foreground">{question.explanation_text}</p>
      </div>

      {question.state === "flagged" && (
        <div className="mt-4 rounded-xl border border-danger/30 bg-danger/5 p-5">
          <h2 className="text-sm font-semibold text-danger">
            Reported ({flags?.filter((f) => !f.resolved_at).length ?? 0} open)
          </h2>
          <ul className="mt-2 space-y-1.5 text-sm">
            {flags?.map((f) => (
              <li key={f.id} className={f.resolved_at ? "text-muted-foreground line-through" : ""}>
                {f.reason}
              </li>
            ))}
          </ul>
          <FlagResolutionActions questionId={question.id} isOwnSubmission={isOwnSubmission} />
        </div>
      )}

      {question.state === "pending_review" && (
        <ReviewActions
          questionId={question.id}
          isOwnSubmission={isOwnSubmission}
          sourceType={source?.type ?? ""}
          isAiDrafted={question.is_ai_drafted}
        />
      )}

      {question.state === "approved" && !isOwnSubmission && (
        <PublishButton questionId={question.id} />
      )}
      {question.state === "approved" && isOwnSubmission && (
        <p className="mt-6 text-sm text-muted-foreground">
          Approved and waiting to be published.
        </p>
      )}
    </main>
  );
}
