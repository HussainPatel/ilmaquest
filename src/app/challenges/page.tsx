import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PlayerAvatar } from "@/components/PlayerAvatar";

export default async function ChallengesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/challenges");
  }

  // challenges_select_participant RLS already scopes this to challenges
  // the caller is part of, either as challenger or opponent.
  const { data: challenges } = await supabase
    .from("challenges")
    .select(
      "id, status, challenger_id, opponent_id, challenger_score, opponent_score, created_at, quizzes(title), challenger:users!challenges_challenger_id_fkey(display_name), opponent:users!challenges_opponent_id_fkey(display_name)"
    )
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto max-w-lg px-6 py-16">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Challenges</h1>
        <a
          href="/challenges/new"
          className="rounded-lg border border-border px-3.5 py-2 text-sm font-medium transition hover:bg-card"
        >
          + New
        </a>
      </div>

      <div className="mt-6 flex flex-col gap-2">
        {challenges?.length ? (
          challenges.map((c) => {
            const isChallenger = c.challenger_id === user.id;
            const myScore = isChallenger ? c.challenger_score : c.opponent_score;
            const theirScore = isChallenger ? c.opponent_score : c.challenger_score;
            const opponentName =
              (isChallenger
                ? (c.opponent as unknown as { display_name: string } | null)
                : (c.challenger as unknown as { display_name: string } | null)
              )?.display_name ?? "Player";
            const needsMyPlay = myScore === null && c.status !== "expired";

            return (
              <a
                key={c.id}
                href={`/challenges/${c.id}/play`}
                className="flex items-center justify-between rounded-xl border border-border bg-card p-4 transition hover:border-primary"
              >
                <div className="flex items-center gap-2.5">
                  <PlayerAvatar name={opponentName} size={28} />
                  <div>
                    <p className="text-sm font-medium">vs {opponentName}</p>
                    <p className="text-xs text-muted-foreground">
                      {(c.quizzes as unknown as { title: string } | null)?.title}
                    </p>
                  </div>
                </div>
                <div className="text-right text-xs">
                  {c.status === "completed" ? (
                    <p className="font-semibold">
                      {myScore} – {theirScore}
                    </p>
                  ) : needsMyPlay ? (
                    <span className="rounded-full bg-accent/15 px-2 py-0.5 font-medium text-accent">
                      Your turn
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Waiting on them</span>
                  )}
                </div>
              </a>
            );
          })
        ) : (
          <p className="text-sm text-muted-foreground">No challenges yet.</p>
        )}
      </div>
    </main>
  );
}
