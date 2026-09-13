"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Reuses the same submit endpoint the contribute form uses — it already
// accepts draft or needs_edit -> pending_review (see questions_update_own_draft
// RLS policy). Note: this resubmits the content as-is; in-place editing of a
// needs_edit question's text/choices isn't built yet (tracked in ROADMAP.md).
export default function ResubmitButton({ questionId }: { questionId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleClick() {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/content/questions/${questionId}/submit`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Could not submit.");
      setBusy(false);
      return;
    }
    router.refresh();
  }

  return (
    <div className="mt-3">
      <button
        onClick={handleClick}
        disabled={busy}
        className="rounded-lg bg-primary px-3.5 py-1.5 text-xs font-medium text-primary-foreground transition hover:bg-primary-hover disabled:opacity-50"
      >
        {busy ? "Submitting…" : "Submit for review"}
      </button>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}
