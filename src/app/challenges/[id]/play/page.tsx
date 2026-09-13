import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import ChallengePlayForm from "./challenge-play-form";

export default async function ChallengePlayPage({
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
    redirect(`/login?next=/challenges/${id}/play`);
  }

  const { data: challenge } = await supabase
    .from("challenges")
    .select("id, quiz_id, challenger_id, opponent_id, challenger_score, opponent_score, status")
    .eq("id", id)
    .single();

  if (!challenge) {
    notFound();
  }

  const isChallenger = challenge.challenger_id === user.id;
  const isOpponent = challenge.opponent_id === user.id;
  if (!isChallenger && !isOpponent) {
    redirect("/challenges");
  }

  const myScore = isChallenger ? challenge.challenger_score : challenge.opponent_score;
  const theirScore = isChallenger ? challenge.opponent_score : challenge.challenger_score;

  if (myScore !== null) {
    return (
      <main className="mx-auto max-w-sm px-6 py-16 text-center">
        <h1 className="text-xl font-semibold">
          {theirScore === null ? "Already played — waiting on them" : "Challenge complete"}
        </h1>
        <p className="mt-4 text-3xl font-bold">
          {myScore}
          {theirScore !== null && <span className="text-muted-foreground"> – {theirScore}</span>}
        </p>
        {theirScore !== null && (
          <p className="mt-2 text-sm text-muted-foreground">
            {myScore > theirScore ? "You won! 🎉" : myScore < theirScore ? "They won this one." : "It's a tie!"}
          </p>
        )}
        <a href="/challenges" className="mt-6 inline-block text-sm text-primary underline-offset-2 hover:underline">
          Back to challenges
        </a>
      </main>
    );
  }

  const { data: quiz } = await supabase
    .from("quizzes")
    .select("title, question_ids")
    .eq("id", challenge.quiz_id)
    .single();

  if (!quiz) {
    notFound();
  }

  const { data: questions } = await supabase
    .from("questions")
    .select("id, question_text, choices")
    .in("id", quiz.question_ids);

  // Preserve the quiz's intended order rather than whatever order the `in`
  // filter happens to return.
  const ordered = (quiz.question_ids as string[])
    .map((qid) => questions?.find((q) => q.id === qid))
    .filter((q): q is NonNullable<typeof q> => Boolean(q));

  return (
    <main className="mx-auto max-w-sm px-6 py-16">
      <h1 className="text-2xl font-semibold">{quiz.title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">Answer all {ordered.length} questions, then submit.</p>
      <ChallengePlayForm challengeId={id} questions={ordered} />
    </main>
  );
}
