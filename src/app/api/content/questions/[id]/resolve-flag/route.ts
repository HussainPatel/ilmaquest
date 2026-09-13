import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({ action: z.enum(["republish", "needs_edit", "retire"]) });

const ACTION_TO_STATE: Record<string, string> = {
  republish: "published",
  needs_edit: "needs_edit",
  retire: "retired",
};
const ACTION_TO_LOG: Record<string, string> = {
  republish: "publish",
  needs_edit: "needs_edit",
  retire: "retire",
};

// Closes the loop on docs/CONTENT_PROCESS.md §6: a question auto-pulled by
// 2+ flags (handle_new_flag trigger) needed a way for staff to actually act
// on it. Resolving is logged through review_log (same two-person-rule
// protected insert as ordinary reviews) so there's one consistent audit
// trail, and the flag reasons are folded into that log comment so the
// author sees them via the review_log_select_own_question policy they
// already have — no new RLS surface needed for flags-to-author visibility.
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

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }
  const { action } = parsed.data;

  const { data: question } = await supabase
    .from("questions")
    .select("id, state")
    .eq("id", id)
    .single();

  if (!question) {
    return NextResponse.json({ error: "Question not found." }, { status: 404 });
  }
  if (question.state !== "flagged") {
    return NextResponse.json({ error: "This question isn't flagged." }, { status: 409 });
  }

  const { data: openFlags } = await supabase
    .from("flags")
    .select("id, reason")
    .eq("question_id", id)
    .is("resolved_at", null);

  const summary = openFlags?.length
    ? `Resolved ${openFlags.length} report(s): ${openFlags.map((f) => f.reason).join(" | ")}`
    : "Resolved flags (none found — may have been resolved already).";

  const { error: logError } = await supabase.from("review_log").insert({
    question_id: id,
    reviewer_id: user.id,
    action: ACTION_TO_LOG[action],
    comment: summary,
  });
  if (logError) {
    return NextResponse.json(
      {
        error:
          "Could not record this decision. If you authored this question, you can't resolve its flags yourself — see docs/CONTENT_PROCESS.md §3.",
      },
      { status: 403 }
    );
  }

  if (openFlags?.length) {
    await supabase
      .from("flags")
      .update({ resolved_by: user.id, resolved_at: new Date().toISOString() })
      .eq("question_id", id)
      .is("resolved_at", null);
  }

  const { error: updateError } = await supabase
    .from("questions")
    .update({ state: ACTION_TO_STATE[action], updated_at: new Date().toISOString() })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
