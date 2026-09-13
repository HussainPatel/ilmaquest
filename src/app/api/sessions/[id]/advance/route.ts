import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Host-only: moves the session from lobby -> active (question 0), or
// advances to the next question, or finishes the quiz. Runs as the
// authenticated user — RLS's sessions_update_host policy already scopes
// this to the actual host, and we double-check explicitly for a clear error.
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

  const { data: session, error: sessionError } = await supabase
    .from("game_sessions")
    .select("id, host_id, status, current_question_index, quizzes(question_ids)")
    .eq("id", id)
    .single();

  if (sessionError || !session) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }
  if (session.host_id !== user.id) {
    return NextResponse.json({ error: "Only the host can advance this quiz." }, { status: 403 });
  }

  const totalQuestions = (session.quizzes as unknown as { question_ids: string[] }).question_ids.length;
  const now = new Date().toISOString();

  let update: Record<string, unknown>;
  if (session.status === "lobby") {
    update = { status: "active", current_question_index: 0, started_at: now, question_started_at: now };
  } else if (session.status === "active") {
    const nextIndex = session.current_question_index + 1;
    update =
      nextIndex >= totalQuestions
        ? { status: "finished", ended_at: now }
        : { current_question_index: nextIndex, question_started_at: now };
  } else {
    return NextResponse.json({ error: "This game has already finished." }, { status: 409 });
  }

  const { error: updateError } = await supabase.from("game_sessions").update(update).eq("id", id);
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
