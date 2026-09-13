import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";

// Anti-cheat core (docs/ARCHITECTURE.md): the client sends only its choice
// and timing, never a correctness claim. This route independently computes
// is_correct from questions.correct_choice_id and is the only place
// game_answers/game_players.score get written (both have no client policy).
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { playerId, questionId, choiceId, answerMs } = await request.json();

  if (!playerId || !questionId || !choiceId || typeof answerMs !== "number") {
    return NextResponse.json({ error: "Missing or invalid fields." }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: session } = await supabase
    .from("game_sessions")
    .select("id, status")
    .eq("id", id)
    .single();

  if (!session || session.status !== "active") {
    return NextResponse.json({ error: "This game isn't active right now." }, { status: 409 });
  }

  const { data: player } = await supabase
    .from("game_players")
    .select("id, session_id, score")
    .eq("id", playerId)
    .single();

  if (!player || player.session_id !== id) {
    return NextResponse.json({ error: "Player not found in this session." }, { status: 404 });
  }

  const { data: existingAnswer } = await supabase
    .from("game_answers")
    .select("id")
    .eq("player_id", playerId)
    .eq("question_id", questionId)
    .maybeSingle();

  if (existingAnswer) {
    return NextResponse.json({ error: "You already answered this question." }, { status: 409 });
  }

  const { data: question } = await supabase
    .from("questions")
    .select("correct_choice_id")
    .eq("id", questionId)
    .single();

  if (!question) {
    return NextResponse.json({ error: "Question not found." }, { status: 404 });
  }

  const isCorrect = choiceId === question.correct_choice_id;

  const { error: answerError } = await supabase.from("game_answers").insert({
    session_id: id,
    player_id: playerId,
    question_id: questionId,
    choice_id: choiceId,
    is_correct: isCorrect,
    answer_ms: answerMs,
  });

  if (answerError) {
    return NextResponse.json({ error: answerError.message }, { status: 400 });
  }

  if (isCorrect) {
    await supabase
      .from("game_players")
      .update({ score: player.score + 100 })
      .eq("id", playerId);
  }

  return NextResponse.json({ isCorrect, correctChoiceId: question.correct_choice_id });
}
