import { Trophy, Users } from "lucide-react";
import { GeometricPattern } from "@/components/GeometricPattern";

export default function Home() {
  return (
    <main className="relative overflow-hidden">
      <GeometricPattern className="pointer-events-none absolute inset-0 h-full w-full text-primary opacity-[0.06]" />
      <div className="relative mx-auto flex max-w-2xl flex-col items-center px-6 py-24 text-center">
        <span className="rounded-full bg-accent/15 px-3 py-1 text-xs font-medium text-accent">
          Bismillah — in early development
        </span>
        <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
          Islamic knowledge,
          <br />
          made into a <span className="text-primary">game</span>.
        </h1>
        <p className="mt-4 max-w-md text-muted-foreground">
          Host live quizzes on Quran, Seerah, Hadith, and Fiqh — every question sourced
          and reviewed before it ever reaches a player.
        </p>
        <div className="mt-8 flex gap-3">
          <a
            href="/login?next=/host"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 font-medium text-primary-foreground transition hover:bg-primary-hover"
          >
            <Trophy size={18} />
            Host a quiz
          </a>
          <a
            href="/join"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 font-medium transition hover:bg-card"
          >
            <Users size={18} />
            Join a game
          </a>
        </div>
      </div>
    </main>
  );
}
