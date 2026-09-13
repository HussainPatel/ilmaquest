import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";

// Records one side's play-through of a challenge. Anti-cheat: correctness
// is computed server-side from questions.correct_choice_id, same principle
// as the live-quiz answer route. Writes go through the service client
// because challenges deliberately has no client UPDATE policy at all (see
// docs/DATA_MODEL.md) -- a player can never write their own or their
// opponent's score directly.
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

  const { answers } = await request.json();
  if (!Array.isArray(answers) || answers.length === 0) {
    return NextResponse.json({ error: "No answers submitted." }, { status: 400 });
  }

  const { data: challenge } = await supabase
    .from("challenges")
    .select("id, quiz_id, challenger_id, opponent_id, challenger_score, opponent_score, status")
    .eq("id", id)
    .single();

  if (!challenge) {
    return NextResponse.json({ error: "Challenge not found." }, { status: 404 });
  }

  const isChallenger = challenge.challenger_id === user.id;
  const isOpponent = challenge.opponent_id === user.id;
  if (!isChallenger && !isOpponent) {
    return NextResponse.json({ error: "You're not part of this challenge." }, { status: 403 });
  }
  if (challenge.status === "expired") {
    return NextResponse.json({ error: "This challenge has expired." }, { status: 409 });
  }
  if (
    (isChallenger && challenge.challenger_score !== null) ||
    (isOpponent && challenge.opponent_score !== null)
  ) {
    return NextResponse.json({ error: "You already played this challenge." }, { status: 409 });
  }

  const questionIds: string[] = answers.map((a: { questionId: string }) => a.questionId);
  const { data: questions } = await supabase
    .from("questions")
    .select("id, correct_choice_id")
    .in("id", questionIds);

  const correctById = new Map((questions ?? []).map((q) => [q.id, q.correct_choice_id]));
  const correctCount = answers.filter(
    (a: { questionId: string; choiceId: string }) => correctById.get(a.questionId) === a.choiceId
  ).length;
  const score = correctCount * 100;

  const service = createServiceClient();
  const update = isChallenger ? { challenger_score: score } : { opponent_score: score };
  const { error: updateError } = await service.from("challenges").update(update).eq("id", id);
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  const otherScoreAlreadySet = isChallenger
    ? challenge.opponent_score !== null
    : challenge.challenger_score !== null;
  const otherUserId = isChallenger ? challenge.opponent_id : challenge.challenger_id;

  if (otherScoreAlreadySet) {
    await service.from("challenges").update({ status: "completed" }).eq("id", id);
    await service.from("notifications").insert({
      user_id: otherUserId,
      type: "challenge_result",
      payload: {
        challengeId: id,
        yourScore: isChallenger ? challenge.opponent_score : challenge.challenger_score,
        opponentScore: score,
      },
    });
  } else {
    await service.from("notifications").insert({
      user_id: otherUserId,
      type: "challenge_received",
      payload: { challengeId: id },
    });
  }

  return NextResponse.json({ score, correctCount, total: answers.length });
}
