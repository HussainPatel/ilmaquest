import { createClient } from "@/lib/supabase/server";
import { createQuestionSchema } from "@/lib/content/validation";
import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = createQuestionSchema.extend({ resubmit: z.boolean() });

// Edits a question's own source + content while it's still draft/needs_edit,
// and either leaves it as a draft or resubmits it. Closes the gap flagged
// in ROADMAP.md: previously a needs_edit question could only be resubmitted
// unchanged. Both the questions and sources RLS UPDATE policies already
// restrict this to the caller's own, still-unpublished content — see
// 20260823030100_sources_editable_while_unpublished.sql.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const body = await request.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }
  const { source, question, resubmit } = parsed.data;

  const { data: existing } = await supabase
    .from("questions")
    .select("id, source_id, state, created_by")
    .eq("id", id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Question not found." }, { status: 404 });
  }
  if (existing.created_by !== user.id || !["draft", "needs_edit"].includes(existing.state)) {
    return NextResponse.json(
      { error: "You can only edit your own draft or needs-edit questions." },
      { status: 403 }
    );
  }

  const { error: sourceError } = await supabase
    .from("sources")
    .update({
      type: source.type,
      external_ref: source.externalRef,
      text_translation: source.textTranslation || null,
      translator: source.translator || null,
      grading: source.grading || null,
      madhab: source.madhab || null,
      citation_text: source.citationText || null,
    })
    .eq("id", existing.source_id);

  if (sourceError) {
    return NextResponse.json({ error: sourceError.message }, { status: 400 });
  }

  // The questions_update_own_draft RLS policy's WITH CHECK only allows the
  // resulting state to be 'draft' or 'pending_review' — a needs_edit row
  // being edited must move to one of those, it can't stay 'needs_edit'.
  const newState = resubmit ? "pending_review" : "draft";

  const { error: questionError } = await supabase
    .from("questions")
    .update({
      category_id: question.categoryId,
      question_text: question.questionText,
      choices: question.choices,
      correct_choice_id: question.correctChoiceId,
      explanation_text: question.explanationText,
      difficulty: question.difficulty,
      state: newState,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (questionError) {
    return NextResponse.json({ error: questionError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
