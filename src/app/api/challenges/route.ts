import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";

// Creates an async challenge (docs/ARCHITECTURE.md "Chrome extension
// design"): the challenger picks a quiz and an opponent by email, then
// separately plays it via /api/challenges/[id]/play. Looking up the
// opponent by email needs the service client -- there's deliberately no
// RLS policy letting one user search another's email, to avoid turning
// this into an account-enumeration endpoint; only the exact match result
// (an id) ever comes back to the client, and only as a generic error if
// there's no match.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { quizId, opponentEmail } = await request.json();
  if (!quizId || !opponentEmail) {
    return NextResponse.json({ error: "Quiz and opponent email are required." }, { status: 400 });
  }

  const service = createServiceClient();
  const { data: opponent } = await service
    .from("users")
    .select("id")
    .eq("email", opponentEmail.trim().toLowerCase())
    .maybeSingle();

  if (!opponent) {
    return NextResponse.json(
      { error: "No ilmaQuest account found for that email." },
      { status: 404 }
    );
  }
  if (opponent.id === user.id) {
    return NextResponse.json({ error: "You can't challenge yourself." }, { status: 400 });
  }

  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();

  const { data: challenge, error } = await supabase
    .from("challenges")
    .insert({
      quiz_id: quizId,
      challenger_id: user.id,
      opponent_id: opponent.id,
      status: "pending",
      expires_at: expiresAt,
    })
    .select("id")
    .single();

  if (error || !challenge) {
    return NextResponse.json({ error: error?.message ?? "Could not create challenge." }, { status: 400 });
  }

  return NextResponse.json({ challengeId: challenge.id });
}
