import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import NewQuizForm from "./new-quiz-form";

export default async function NewQuizPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/host/new");
  }

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name")
    .eq("is_active", true)
    .order("name");

  // questions_select_published RLS policy makes these visible to anyone —
  // no role check needed to build a quiz, only to author new questions.
  const { data: questions } = await supabase
    .from("questions")
    .select("id, question_text, difficulty, category_id, categories(name)")
    .eq("state", "published")
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-2xl font-semibold">Create a quiz</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Pick from published questions — only reviewed, sourced content can go into a quiz.
      </p>

      {questions?.length ? (
        <NewQuizForm categories={categories ?? []} questions={questions} />
      ) : (
        <p className="mt-6 text-sm text-muted-foreground">
          No published questions yet — approve and publish some in{" "}
          <a href="/review" className="text-primary underline-offset-2 hover:underline">
            the review queue
          </a>{" "}
          first.
        </p>
      )}
    </main>
  );
}
