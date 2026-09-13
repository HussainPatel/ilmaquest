"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export default function ConnectExtension() {
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  async function generate() {
    setBusy(true);
    setError("");
    const res = await fetch("/api/extension/connect", { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Could not generate a code.");
      setBusy(false);
      return;
    }
    setToken(data.token);
    setBusy(false);
  }

  async function copy() {
    if (!token) return;
    await navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!token) {
    return (
      <div className="mt-6">
        <button
          onClick={generate}
          disabled={busy}
          className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary-hover disabled:opacity-50"
        >
          {busy ? "Generating…" : "Generate connection code"}
        </button>
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      </div>
    );
  }

  return (
    <div className="mt-6">
      <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-3">
        <code className="flex-1 truncate text-xs">{token}</code>
        <button
          onClick={copy}
          className="shrink-0 rounded-md border border-border p-1.5 transition hover:bg-background"
          aria-label="Copy"
        >
          {copied ? <Check size={14} className="text-primary" /> : <Copy size={14} />}
        </button>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        This code won&apos;t be shown again. Open the ilmaQuest extension popup, paste it in, and
        click Connect. Treat it like a password — anyone with this code can act as your account
        from the extension.
      </p>
    </div>
  );
}
