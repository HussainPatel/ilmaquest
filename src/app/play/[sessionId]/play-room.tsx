"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ReportIssue from "./report-issue";
import { AnswerTile } from "@/components/AnswerTile";
import { Podium } from "@/components/Podium";
import { Confetti } from "@/components/Confetti";

type Question = { id: string; question_text: string; choices: { id: string; text: string }[] };
type Feedback = { isCorrect: boolean; correctChoiceId: string };
type LeaderboardPlayer = { id: string; name: string; score: number };

const POLL_MS = 2000;

export default function PlayRoom({ sessionId }: { sessionId: string }) {
  const supabase = createClient();
  const playerId = useSearchParams().get("player");

  const [status, setStatus] = useState<string>("lobby");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [question, setQuestion] = useState<Question | null>(null);
  const [score, setScore] = useState(0);
  const [answeredQuestionId, setAnsweredQuestionId] = useState<string | null>(null);
  const [chosenChoiceId, setChosenChoiceId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardPlayer[]>([]);
  const questionShownAt = useRef<number>(Date.now());

  const refresh = useCallback(async () => {
    const { data: sessionRow } = await supabase
      .from("game_sessions")
      .select("status, current_question_index")
      .eq("id", sessionId)
      .single();
    if (sessionRow) {
      setStatus(sessionRow.status);
      setQuestionIndex(sessionRow.current_question_index);
    }

    if (playerId) {
      const { data: playerRow } = await supabase
        .from("game_players")
        .select("score")
        .eq("id", playerId)
        .single();
      if (playerRow) setScore(playerRow.score);
    }
  }, [sessionId, playerId, supabase]);

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
    let cancelled = false;

    (async () => {
      const { data: sessionRow } = await supabase
        .from("game_sessions")
        .select("quizzes(question_ids)")
        .eq("id", sessionId)
        .single();
      const ids = (sessionRow?.quizzes as unknown as { question_ids: string[] } | null)
        ?.question_ids;
      const currentId = ids?.[questionIndex];
      if (!currentId) return;

      const { data } = await supabase
        .from("questions")
        .select("id, question_text, choices")
        .eq("id", currentId)
        .single();

      if (!cancelled && data) {
        setQuestion(data as Question);
        setFeedback(null);
        setAnsweredQuestionId(null);
        setChosenChoiceId(null);
        questionShownAt.current = Date.now();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [status, questionIndex, sessionId, supabase]);

  useEffect(() => {
    if (status !== "finished") return;
    supabase
      .from("game_players")
      .select("id, guest_name, score")
      .eq("session_id", sessionId)
      .order("score", { ascending: false })
      .then(({ data }) => {
        if (data) {
          setLeaderboard(
            data.map((p) => ({ id: p.id, name: p.guest_name ?? "Player", score: p.score }))
          );
        }
      });
  }, [status, sessionId, supabase]);

  async function submitAnswer(choiceId: string) {
    if (!question || !playerId || answeredQuestionId === question.id) return;
    setAnsweredQuestionId(question.id);
    setChosenChoiceId(choiceId);

    const answerMs = Date.now() - questionShownAt.current;
    const res = await fetch(`/api/sessions/${sessionId}/answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId, questionId: question.id, choiceId, answerMs }),
    });
    const data = await res.json();
    if (res.ok) {
      setFeedback(data);
      await refresh();
    }
  }

  if (!playerId) {
    return (
      <main className="mx-auto max-w-sm px-6 py-16 text-center">
        <p className="text-sm text-danger">
          Missing player info — please join again from the join page.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-sm px-6 py-16">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Score</span>
        <span className="font-semibold text-foreground">{score}</span>
      </div>

      {status === "lobby" && (
        <div className="mt-10 text-center">
          <div className="mx-auto h-10 w-10 animate-pulse rounded-full bg-primary/20" />
          <p className="mt-4 text-sm text-muted-foreground">
            Waiting for the host to start the quiz…
          </p>
        </div>
      )}

      {status === "active" && question && (
        <div key={question.id} className="mt-6 animate-bounce-in">
          <p className="text-xl font-bold leading-snug">{question.question_text}</p>
          <div className="mt-5 flex flex-col gap-3">
            {question.choices.map((c, i) => {
              const answered = answeredQuestionId === question.id;
              return (
                <AnswerTile
                  key={c.id}
                  index={i}
                  text={c.text}
                  disabled={answered}
                  isChosen={chosenChoiceId === c.id}
                  isCorrect={feedback ? c.id === feedback.correctChoiceId : null}
                  onClick={() => submitAnswer(c.id)}
                />
              );
            })}
          </div>
          {feedback && (
            <p
              className={`mt-4 text-center text-sm font-semibold ${
                feedback.isCorrect ? "text-primary" : "text-danger"
              }`}
            >
              {feedback.isCorrect ? "Correct! +100 🎉" : "Not quite — waiting for the next question…"}
            </p>
          )}
          <div className="text-center">
            <ReportIssue questionId={question.id} />
          </div>
        </div>
      )}

      {status === "finished" && (
        <div className="mt-10">
          <Confetti />
          <p className="text-center text-lg font-bold">Quiz finished! 🎉</p>
          <p className="mt-1 text-center text-sm text-muted-foreground">
            Your final score: <span className="font-semibold text-foreground">{score}</span>
          </p>
          {leaderboard.length > 0 && (
            <div className="mt-8">
              <Podium players={leaderboard} />
            </div>
          )}
        </div>
      )}
    </main>
  );
}
