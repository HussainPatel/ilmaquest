"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewChallengeForm({ quizzes }: { quizzes: { id: string; title: string }[] }) {
  const router = useRouter();
  const [quizId, setQuizId] = useState(quizzes[0]?.id ?? "");
  const [opponentEmail, setOpponentEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "creating" | "error">("idle");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("creating");
    setError("");

    const res = await fetch("/api/challenges", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quizId, opponentEmail }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Could not create the challenge.");
      setStatus("error");
      return;
    }

    router.push(`/challenges/${data.challengeId}/play`);
  }

  if (quizzes.length === 0) {
    return (
      <p className="mt-6 text-sm text-muted-foreground">
        No quizzes yet — create one at <a href="/host/new" className="text-primary underline-offset-2 hover:underline">/host/new</a> first.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Quiz
        <select
          value={quizId}
          onChange={(e) => setQuizId(e.target.value)}
          className="rounded-lg border border-border bg-card px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        >
          {quizzes.map((q) => (
            <option key={q.id} value={q.id}>
              {q.title}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Opponent&apos;s email
        <input
          type="email"
          required
          value={opponentEmail}
          onChange={(e) => setOpponentEmail(e.target.value)}
          placeholder="friend@example.com"
          className="rounded-lg border border-border bg-card px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </label>
      <button
        type="submit"
        disabled={status === "creating"}
        className="mt-1 rounded-lg bg-primary px-3.5 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary-hover disabled:opacity-50"
      >
        {status === "creating" ? "Creating…" : "Create & play your side"}
      </button>
      {status === "error" && <p className="text-sm text-danger">{error}</p>}
    </form>
  );
}
