"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { KeyRound, Play, PartyPopper, ChevronRight } from "lucide-react";
import { GeometricPattern } from "@/components/GeometricPattern";
import { AnswerTile } from "@/components/AnswerTile";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { Podium } from "@/components/Podium";
import { Confetti } from "@/components/Confetti";

type Player = { id: string; guest_name: string | null; score: number };
type Question = { id: string; question_text: string; choices: { id: string; text: string }[] };
type Session = {
  id: string;
  join_code: string;
  status: string;
  current_question_index: number;
  quizzes: { title: string; question_ids: string[] };
};

// Polls every 2s rather than using Supabase Realtime — simpler to reason
// about while the app is new; a documented future upgrade (docs/ARCHITECTURE.md).
const POLL_MS = 2000;

export default function HostRoom({ session: initialSession }: { session: Session }) {
  const supabase = createClient();
  const [status, setStatus] = useState(initialSession.status);
  const [questionIndex, setQuestionIndex] = useState(initialSession.current_question_index);
  const [players, setPlayers] = useState<Player[]>([]);
  const [question, setQuestion] = useState<Question | null>(null);
  const [busy, setBusy] = useState(false);

  const questionIds = initialSession.quizzes.question_ids;
  const totalQuestions = questionIds.length;

  const refresh = useCallback(async () => {
    const { data: sessionRow } = await supabase
      .from("game_sessions")
      .select("status, current_question_index")
      .eq("id", initialSession.id)
      .single();
    if (sessionRow) {
      setStatus(sessionRow.status);
      setQuestionIndex(sessionRow.current_question_index);
    }

    const { data: playerRows } = await supabase
      .from("game_players")
      .select("id, guest_name, score")
      .eq("session_id", initialSession.id)
      .order("score", { ascending: false });
    if (playerRows) setPlayers(playerRows as Player[]);
  }, [initialSession.id, supabase]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, POLL_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  useEffect(() => {
    if (status !== "active") {
      setQuestion(null);
      return;
    }
    const currentId = questionIds[questionIndex];
    if (!currentId) return;

    supabase
      .from("questions")
      .select("id, question_text, choices")
      .eq("id", currentId)
      .single()
      .then(({ data }) => setQuestion(data as Question | null));
  }, [status, questionIndex, questionIds, supabase]);

  async function advance() {
    setBusy(true);
    await fetch(`/api/sessions/${initialSession.id}/advance`, { method: "POST" });
    await refresh();
    setBusy(false);
  }

  return (
    <main className="mx-auto max-w-lg px-6 py-16">
      <h1 className="text-2xl font-bold">{initialSession.quizzes.title}</h1>

      {status === "lobby" && (
        <div className="relative mt-6 overflow-hidden rounded-2xl border border-border bg-card p-6 text-center">
          <GeometricPattern className="pointer-events-none absolute inset-0 h-full w-full text-primary opacity-[0.05]" />
          <div className="relative">
            <p className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
              <KeyRound size={14} />
              Join code
            </p>
            <p className="mt-1 text-5xl font-black tracking-widest text-primary">
              {initialSession.join_code}
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              {players.length} player{players.length === 1 ? "" : "s"} joined
            </p>
            {players.length > 0 && (
              <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                {players.map((p) => (
                  <PlayerAvatar key={p.id} name={p.guest_name ?? "Player"} size={28} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {status === "active" && question && (
        <div key={question.id} className="mt-6 animate-bounce-in rounded-2xl border border-border bg-card p-6">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Question {questionIndex + 1} of {totalQuestions}
          </p>
          <p className="mt-2 text-xl font-bold leading-snug">{question.question_text}</p>
          <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {question.choices.map((c, i) => (
              <AnswerTile key={c.id} index={i} text={c.text} readOnly />
            ))}
          </div>
        </div>
      )}

      {status === "finished" && (
        <div className="mt-6">
          <Confetti />
          <div className="flex flex-col items-center gap-1 text-center">
            <PartyPopper className="text-accent" size={28} />
            <p className="text-lg font-bold">Quiz finished!</p>
          </div>
          {players.length > 0 && (
            <div className="mt-6">
              <Podium
                players={players.map((p) => ({
                  id: p.id,
                  name: p.guest_name ?? "Player",
                  score: p.score,
                }))}
              />
            </div>
          )}
        </div>
      )}

      {status !== "finished" && (
        <button
          onClick={advance}
          disabled={busy}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 text-lg font-bold text-primary-foreground shadow-md transition hover:-translate-y-0.5 hover:bg-primary-hover hover:shadow-lg disabled:opacity-50"
        >
          {status === "lobby" ? (
            <>
              <Play size={20} />
              Start quiz
            </>
          ) : questionIndex + 1 >= totalQuestions ? (
            <>
              <PartyPopper size={20} />
              Finish quiz
            </>
          ) : (
            <>
              Next question
              <ChevronRight size={20} />
            </>
          )}
        </button>
      )}

      {status !== "finished" && (
        <div className="mt-8">
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Leaderboard
          </h2>
          <ol className="mt-3 space-y-2">
            {players.map((p, i) => (
              <li
                key={p.id}
                className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2 text-sm"
              >
                <span className="w-4 text-xs text-muted-foreground">{i + 1}</span>
                <PlayerAvatar name={p.guest_name ?? "Player"} size={24} />
                <span className="flex-1">{p.guest_name ?? "Player"}</span>
                <span className="font-semibold">{p.score}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </main>
  );
}
