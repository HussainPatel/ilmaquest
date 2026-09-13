import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import EditQuestionForm from "./edit-question-form";

export default async function EditQuestionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/my-questions/${id}/edit`);
  }

  const { data: question } = await supabase
    .from("questions")
    .select("id, source_id, category_id, question_text, choices, correct_choice_id, explanation_text, difficulty, state, created_by")
    .eq("id", id)
    .single();

  if (!question) {
    notFound();
  }
  if (question.created_by !== user.id || !["draft", "needs_edit"].includes(question.state)) {
    redirect("/my-questions");
  }

  const { data: source } = await supabase
    .from("sources")
    .select("*")
    .eq("id", question.source_id)
    .single();

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name")
    .eq("is_active", true)
    .order("name");

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-2xl font-semibold">Edit question</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Currently: <strong>{question.state === "needs_edit" ? "needs edit" : "draft"}</strong>
      </p>

      <EditQuestionForm
        questionId={question.id}
        categories={categories ?? []}
        initialSource={source}
        initialQuestion={question}
      />
    </main>
  );
}
