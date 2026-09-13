import { createClient } from "@/lib/supabase/server";
import { reviewActionSchema } from "@/lib/content/validation";
import { NextResponse } from "next/server";

const ACTION_TO_STATE: Record<string, string> = {
  approve: "approved",
  reject: "rejected",
  needs_edit: "needs_edit",
};

// Reviewer approves/rejects/requests edits on a PENDING_REVIEW question.
// Writes review_log FIRST — its RLS policy is where the two-person rule
// (docs/CONTENT_PROCESS.md §3) actually lives: a reviewer can't log a
// decision on a question they authored themselves. If that insert is
// rejected by RLS, we never touch the question's state at all.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const body = await request.json();
  const parsed = reviewActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }
  const { action, comment } = parsed.data;

  const { data: question } = await supabase
    .from("questions")
    .select("id, state")
    .eq("id", id)
    .single();

  if (!question) {
    return NextResponse.json({ error: "Question not found." }, { status: 404 });
  }
  if (question.state !== "pending_review") {
    return NextResponse.json(
      { error: "This question isn't awaiting review right now." },
      { status: 409 }
    );
  }

  const { error: logError } = await supabase.from("review_log").insert({
    question_id: id,
    reviewer_id: user.id,
    action,
    comment: comment || null,
  });

  if (logError) {
    // Most likely cause: the two-person rule — you authored this question.
    return NextResponse.json(
      {
        error:
          "Could not record this review. If you authored this question, you can't review it yourself — see docs/CONTENT_PROCESS.md §3.",
      },
      { status: 403 }
    );
  }

  const { error: updateError } = await supabase
    .from("questions")
    .update({ state: ACTION_TO_STATE[action], updated_at: new Date().toISOString() })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, newState: ACTION_TO_STATE[action] });
}
