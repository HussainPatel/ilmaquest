import { createClient } from "@/lib/supabase/server";
import { generateJoinCode } from "@/lib/gameplay/join-code";
import { NextResponse } from "next/server";

// Host creates a live session from a quiz. Runs as the authenticated user
// (not the service role) — RLS's sessions_insert_host policy already
// requires host_id = auth.uid(), so this is just a normal scoped insert.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in to host a quiz." }, { status: 401 });
  }

  const { quizId } = await request.json();
  if (!quizId) {
    return NextResponse.json({ error: "quizId is required." }, { status: 400 });
  }

  // Retry a couple of times in the extremely unlikely case of a join_code collision.
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await supabase
      .from("game_sessions")
      .insert({ quiz_id: quizId, host_id: user.id, join_code: generateJoinCode() })
      .select("id, join_code")
      .single();

    if (!error) {
      return NextResponse.json({ sessionId: data.id, joinCode: data.join_code });
    }
    if (error.code !== "23505") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  }

  return NextResponse.json(
    { error: "Could not generate a unique join code, please try again." },
    { status: 500 }
  );
}
