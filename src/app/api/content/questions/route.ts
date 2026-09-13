import { createClient } from "@/lib/supabase/server";
import { createQuestionSchema } from "@/lib/content/validation";
import { NextResponse } from "next/server";

// Contributor creates a source + a DRAFT question from it. Uses the
// authenticated user's own client (not service role) — RLS's
// sources_insert_staff / questions_insert_contributor policies already
// require created_by = auth.uid() and a contributor+ role, so this route
// leans on the database as the real authority, matching CONTENT_PROCESS.md.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createQuestionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }
  const { source, question } = parsed.data;

  const { data: sourceRow, error: sourceError } = await supabase
    .from("sources")
    .insert({
      type: source.type,
      external_ref: source.externalRef,
      text_translation: source.textTranslation || null,
      translator: source.translator || null,
      grading: source.grading || null,
      madhab: source.madhab || null,
      citation_text: source.citationText || null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (sourceError || !sourceRow) {
    return NextResponse.json(
      { error: sourceError?.message ?? "Could not save the source." },
      { status: 400 }
    );
  }

  const { data: questionRow, error: questionError } = await supabase
    .from("questions")
    .insert({
      source_id: sourceRow.id,
      category_id: question.categoryId,
      question_text: question.questionText,
      choices: question.choices,
      correct_choice_id: question.correctChoiceId,
      explanation_text: question.explanationText,
      difficulty: question.difficulty,
      state: "draft",
      created_by: user.id,
    })
    .select("id")
    .single();

  if (questionError || !questionRow) {
    return NextResponse.json(
      { error: questionError?.message ?? "Could not save the question." },
      { status: 400 }
    );
  }

  return NextResponse.json({ questionId: questionRow.id });
}
