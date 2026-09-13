"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PublishButton({ questionId }: { questionId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleClick() {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/content/questions/${questionId}/publish`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Could not publish.");
      setBusy(false);
      return;
    }
    router.refresh();
  }

  return (
    <div className="mt-6">
      <button
        onClick={handleClick}
        disabled={busy}
        className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary-hover disabled:opacity-50"
      >
        {busy ? "Publishing…" : "Publish"}
      </button>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
