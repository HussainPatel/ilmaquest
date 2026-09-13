"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";

// Guest join flow — no account required (docs/SECURITY.md §1): just a join
// code and a display name.
export default function JoinPage() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState("");
  const [guestName, setGuestName] = useState("");
  const [status, setStatus] = useState<"idle" | "joining" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("joining");
    setErrorMessage("");

    const res = await fetch("/api/sessions/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ joinCode, guestName }),
    });
    const data = await res.json();

    if (!res.ok) {
      setStatus("error");
      setErrorMessage(data.error ?? "Something went wrong.");
      return;
    }

    router.push(`/play/${data.sessionId}?player=${data.playerId}`);
  }

  return (
    <main className="mx-auto flex max-w-sm flex-col px-6 py-16">
      <h1 className="text-2xl font-semibold">Join a game</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        No account needed — just a code and your name.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Join code
          <input
            required
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="ABC123"
            maxLength={6}
            className="rounded-lg border border-border bg-card px-3.5 py-2.5 text-base font-normal uppercase tracking-widest text-card-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Your name
          <input
            required
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            placeholder="Your name"
            maxLength={40}
            className="rounded-lg border border-border bg-card px-3.5 py-2.5 text-base font-normal text-card-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </label>
        <button
          type="submit"
          disabled={status === "joining"}
          className="mt-1 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-3.5 py-2.5 font-medium text-primary-foreground transition hover:bg-primary-hover disabled:opacity-50"
        >
          <LogIn size={16} />
          {status === "joining" ? "Joining…" : "Join game"}
        </button>
        {status === "error" && <p className="text-sm text-danger">{errorMessage}</p>}
      </form>
    </main>
  );
}
