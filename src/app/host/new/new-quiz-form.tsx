"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Category = { id: string; name: string };
type Question = {
  id: string;
  question_text: string;
  difficulty: number;
  category_id: string;
  categories: { name: string } | { name: string }[] | null;
};

function categoryName(q: Question) {
  const c = q.categories;
  if (!c) return "Uncategorized";
  return Array.isArray(c) ? (c[0]?.name ?? "Uncategorized") : c.name;
}

export default function NewQuizForm({
  categories,
  questions,
}: {
  categories: Category[];
  questions: Question[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [selected, setSelected] = useState<string[]>([]);
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [error, setError] = useState("");

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selected.length === 0) {
      setError("Pick at least one question.");
      return;
    }
    setStatus("saving");
    setError("");

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Sign in required.");
      setStatus("error");
      return;
    }

    // quizzes_insert_own RLS already scopes this to the caller, and the
    // validate_quiz_questions trigger rejects anything not published — no
    // API route needed, this is a plain RLS-gated write.
    const { data, error: insertError } = await supabase
      .from("quizzes")
      .insert({ title, category_id: categoryId, question_ids: selected, created_by: user.id })
      .select("id")
      .single();

    if (insertError || !data) {
      setError(insertError?.message ?? "Could not create the quiz.");
      setStatus("error");
      return;
    }

    router.push("/host");
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-5">
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Title
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="rounded-lg border border-border bg-card px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Category
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="rounded-lg border border-border bg-card px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      <div>
        <p className="text-sm font-medium">Questions ({selected.length} selected)</p>
        <div className="mt-2 flex max-h-80 flex-col gap-2 overflow-y-auto rounded-xl border border-border bg-card p-3">
          {questions.map((q) => (
            <label key={q.id} className="flex items-start gap-2 rounded-lg p-2 text-sm hover:bg-background">
              <input
                type="checkbox"
                checked={selected.includes(q.id)}
                onChange={() => toggle(q.id)}
                className="mt-0.5"
              />
              <span>
                <span className="block">{q.question_text}</span>
                <span className="text-xs text-muted-foreground">
                  {categoryName(q)} · difficulty {q.difficulty}
                </span>
              </span>
            </label>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <button
        type="submit"
        disabled={status === "saving"}
        className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary-hover disabled:opacity-50"
      >
        {status === "saving" ? "Creating…" : "Create quiz"}
      </button>
    </form>
  );
}
