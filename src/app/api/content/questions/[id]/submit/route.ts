import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Moves a DRAFT (or NEEDS_EDIT) question the contributor owns into
// PENDING_REVIEW. RLS's questions_update_own_draft policy already restricts
// this to the question's own author and only from draft/needs_edit states.
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

  const { data, error } = await supabase
    .from("questions")
    .update({ state: "pending_review", updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Could not submit — is this your draft?" },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true });
}
