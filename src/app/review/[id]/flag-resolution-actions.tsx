"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function FlagResolutionActions({
  questionId,
  isOwnSubmission,
}: {
  questionId: string;
  isOwnSubmission: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function act(action: "republish" | "needs_edit" | "retire") {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/content/questions/${questionId}/resolve-flag`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      setBusy(false);
      return;
    }
    router.push("/review");
    router.refresh();
  }

  if (isOwnSubmission) {
    return (
      <p className="mt-3 text-sm text-muted-foreground">
        You authored this question, so you can&apos;t resolve its flags yourself — the two-person
        rule in docs/CONTENT_PROCESS.md §3.
      </p>
    );
  }

  return (
    <div className="mt-4 flex flex-wrap gap-3">
      <button
        onClick={() => act("republish")}
        disabled={busy}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary-hover disabled:opacity-40"
      >
        Dismiss & republish
      </button>
      <button
        onClick={() => act("needs_edit")}
        disabled={busy}
        className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition hover:bg-background disabled:opacity-40"
      >
        Send back for edits
      </button>
      <button
        onClick={() => act("retire")}
        disabled={busy}
        className="rounded-lg border border-danger/40 px-4 py-2 text-sm font-medium text-danger transition hover:bg-danger/10 disabled:opacity-40"
      >
        Retire
      </button>
      {error && <p className="w-full text-sm text-danger">{error}</p>}
    </div>
  );
}
