"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Direct RLS-gated write, no API route needed — flags_insert_anyone allows
// anyone (including guests) to report a question. Two reports auto-pull it
// from rotation (see the handle_new_flag trigger), before any human reviews it.
export default function ReportIssue({ questionId }: { questionId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function submit() {
    if (!reason.trim()) return;
    setStatus("sending");
    const supabase = createClient();
    const { error } = await supabase
      .from("flags")
      .insert({ question_id: questionId, reason: reason.trim() });
    setStatus(error ? "error" : "sent");
  }

  if (status === "sent") {
    return <p className="mt-3 text-xs text-muted-foreground">Thanks — this has been reported.</p>;
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-3 text-xs text-muted-foreground underline-offset-2 hover:underline"
      >
        ⚠️ Report an issue with this question
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-lg border border-border bg-card p-3">
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="What's wrong with this question?"
        rows={2}
        className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs outline-none focus:border-primary"
      />
      <div className="mt-2 flex gap-2">
        <button
          onClick={submit}
          disabled={status === "sending" || !reason.trim()}
          className="rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50"
        >
          {status === "sending" ? "Sending…" : "Submit report"}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="rounded-md border border-border px-2.5 py-1 text-xs font-medium"
        >
          Cancel
        </button>
      </div>
      {status === "error" && <p className="mt-1 text-xs text-danger">Could not submit — try again.</p>}
    </div>
  );
}
