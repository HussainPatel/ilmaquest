"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Mirrors the reviewer checklist in docs/CONTENT_PROCESS.md §4. This is a
// UI-only gate (the database doesn't know about it) — it exists so a
// reviewer can't click Approve on autopilot without actually confirming
// each item, not as a security control (RLS + the two-person rule are that).
function buildChecklist(sourceType: string, isAiDrafted: boolean) {
  const items = [
    "Source reference is present and resolves to real, checkable content.",
    "The explanation matches what the source actually says — no embellishment.",
    "Difficulty/age-tier is appropriate for this category.",
    "No depiction or imagined description of the Prophet ﷺ or other prohibited imagery.",
  ];
  if (sourceType === "quran") items.unshift("Translation edition/translator is attributed.");
  if (sourceType === "hadith") items.unshift("Grading is sahih or hasan.");
  if (sourceType === "fiqh")
    items.unshift("Madhab is tagged, and no single school's view is presented as universal.");
  if (isAiDrafted)
    items.push("AI-drafted: I have independently verified the source text myself.");
  return items;
}

export default function ReviewActions({
  questionId,
  isOwnSubmission,
  sourceType,
  isAiDrafted,
}: {
  questionId: string;
  isOwnSubmission: boolean;
  sourceType: string;
  isAiDrafted: boolean;
}) {
  const router = useRouter();
  const checklist = buildChecklist(sourceType, isAiDrafted);
  const [checked, setChecked] = useState<boolean[]>(checklist.map(() => false));
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const allChecked = checked.every(Boolean);

  async function act(action: "approve" | "reject" | "needs_edit") {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/content/questions/${questionId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, comment }),
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
      <p className="mt-6 rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
        You submitted this question, so you can&apos;t review it yourself — the two-person rule
        in docs/CONTENT_PROCESS.md §3. Another reviewer needs to take this one.
      </p>
    );
  }

  return (
    <div className="mt-6 rounded-xl border border-border bg-card p-5">
      <h2 className="text-sm font-semibold">Reviewer checklist</h2>
      <ul className="mt-3 flex flex-col gap-2">
        {checklist.map((item, i) => (
          <li key={item} className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={checked[i]}
              onChange={(e) =>
                setChecked((prev) => prev.map((c, idx) => (idx === i ? e.target.checked : c)))
              }
              className="mt-0.5"
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>

      <label className="mt-4 flex flex-col gap-1.5 text-sm font-medium">
        Comment (required for reject / needs edit)
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={2}
          className="rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </label>

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          onClick={() => act("approve")}
          disabled={!allChecked || busy}
          className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary-hover disabled:opacity-40"
        >
          Approve
        </button>
        <button
          onClick={() => act("needs_edit")}
          disabled={busy}
          className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium transition hover:bg-background disabled:opacity-40"
        >
          Needs edit
        </button>
        <button
          onClick={() => act("reject")}
          disabled={busy}
          className="rounded-lg border border-danger/40 px-4 py-2.5 text-sm font-medium text-danger transition hover:bg-danger/10 disabled:opacity-40"
        >
          Reject
        </button>
      </div>
      {!allChecked && (
        <p className="mt-2 text-xs text-muted-foreground">
          Check every item above to enable Approve.
        </p>
      )}
    </div>
  );
}
