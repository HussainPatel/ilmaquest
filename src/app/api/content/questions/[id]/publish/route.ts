import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Moves an APPROVED question to PUBLISHED — a deliberate separate step from
// approval (docs/CONTENT_PROCESS.md §2) so a batch of approved content can be
// published together, e.g. ahead of a category launch.
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

  const { data: question } = await supabase
    .from("questions")
    .select("id, state")
    .eq("id", id)
    .single();

  if (!question) {
    return NextResponse.json({ error: "Question not found." }, { status: 404 });
  }
  if (question.state !== "approved") {
    return NextResponse.json({ error: "Only approved questions can be published." }, { status: 409 });
  }

  const { error: logError } = await supabase.from("review_log").insert({
    question_id: id,
    reviewer_id: user.id,
    action: "publish",
  });
  if (logError) {
    return NextResponse.json({ error: logError.message }, { status: 403 });
  }

  const { error: updateError } = await supabase
    .from("questions")
    .update({ state: "published", updated_at: new Date().toISOString() })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
