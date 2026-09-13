"use client";

import { useState } from "react";
import { AnswerTile } from "@/components/AnswerTile";

type Question = { id: string; question_text: string; choices: { id: string; text: string }[] };
type Result = { score: number; correctCount: number; total: number };

export default function ChallengePlayForm({
  challengeId,
  questions,
}: {
  challengeId: string;
  questions: Question[];
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  const allAnswered = questions.every((q) => answers[q.id]);

  async function handleSubmit() {
    setStatus("submitting");
    setError("");

    const res = await fetch(`/api/challenges/${challengeId}/play`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        answers: questions.map((q) => ({ questionId: q.id, choiceId: answers[q.id] })),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      setStatus("error");
      return;
    }
    setResult(data);
  }

  if (result) {
    return (
      <div className="mt-10 text-center">
        <p className="text-3xl font-bold">{result.score}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {result.correctCount} of {result.total} correct
        </p>
        <a href="/challenges" className="mt-6 inline-block text-sm text-primary underline-offset-2 hover:underline">
          Back to challenges
        </a>
      </div>
    );
  }

  return (
    <div className="mt-6 flex flex-col gap-8">
      {questions.map((q, qIndex) => (
        <div key={q.id}>
          <p className="font-semibold">
            {qIndex + 1}. {q.question_text}
          </p>
          <div className="mt-3 flex flex-col gap-2">
            {q.choices.map((c, i) => (
              <AnswerTile
                key={c.id}
                index={i}
                text={c.text}
                isChosen={answers[q.id] === c.id}
                onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: c.id }))}
              />
            ))}
          </div>
        </div>
      ))}

      {error && <p className="text-sm text-danger">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={!allAnswered || status === "submitting"}
        className="rounded-lg bg-primary px-4 py-3 font-semibold text-primary-foreground transition hover:bg-primary-hover disabled:opacity-40"
      >
        {status === "submitting" ? "Submitting…" : "Submit answers"}
      </button>
    </div>
  );
}
