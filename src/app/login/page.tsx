"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Mail, Send } from "lucide-react";

// MVP adult auth: email magic link only (see docs/ARCHITECTURE.md). No password
// to manage, no reset flow to build — Supabase emails a one-time login link.
export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const next = useSearchParams().get("next") ?? "/account";
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrorMessage("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });

    if (error) {
      setStatus("error");
      setErrorMessage(error.message);
    } else {
      setStatus("sent");
    }
  }

  if (status === "sent") {
    return (
      <main className="mx-auto flex max-w-sm flex-col items-center px-6 py-16 text-center">
        <div className="rounded-full bg-primary/10 p-3 text-primary">
          <Mail size={28} />
        </div>
        <h1 className="mt-4 text-xl font-semibold">Check your email</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We sent a sign-in link to <strong className="text-foreground">{email}</strong>.
          Open it on this device to finish signing in.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-sm flex-col px-6 py-16">
      <h1 className="text-2xl font-semibold">Sign in to ilmaQuest</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        We&apos;ll email you a one-time link — no password needed.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Email address
          <input
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-border bg-card px-3.5 py-2.5 text-base font-normal text-card-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </label>
        <button
          type="submit"
          disabled={status === "sending"}
          className="mt-1 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-3.5 py-2.5 font-medium text-primary-foreground transition hover:bg-primary-hover disabled:opacity-50"
        >
          <Send size={16} />
          {status === "sending" ? "Sending…" : "Send sign-in link"}
        </button>
        {status === "error" && (
          <p className="text-sm text-danger">{errorMessage}</p>
        )}
      </form>

      <p className="mt-8 border-t border-border pt-6 text-sm text-muted-foreground">
        Hosting or playing as a guest? You don&apos;t need an account —{" "}
        <a href="/join" className="font-medium text-primary underline-offset-2 hover:underline">
          join a game with a code
        </a>{" "}
        instead.
      </p>
    </main>
  );
}
