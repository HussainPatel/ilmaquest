import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";

// Guest join flow — no account required (docs/SECURITY.md §1). Uses the
// service-role client because game_players deliberately has no client
// INSERT policy (docs/DATA_MODEL.md) — this route is the only sanctioned
// way to join a session.
export async function POST(request: Request) {
  const { joinCode, guestName } = await request.json();

  if (!joinCode || typeof guestName !== "string" || !guestName.trim()) {
    return NextResponse.json({ error: "Join code and name are required." }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: session, error: sessionError } = await supabase
    .from("game_sessions")
    .select("id, status")
    .eq("join_code", joinCode.toUpperCase().trim())
    .single();

  if (sessionError || !session) {
    return NextResponse.json({ error: "No game found with that code." }, { status: 404 });
  }
  if (session.status !== "lobby") {
    return NextResponse.json({ error: "This game has already started or ended." }, { status: 409 });
  }

  const { data: player, error: playerError } = await supabase
    .from("game_players")
    .insert({ session_id: session.id, guest_name: guestName.trim().slice(0, 40) })
    .select("id")
    .single();

  if (playerError || !player) {
    return NextResponse.json({ error: playerError?.message ?? "Could not join." }, { status: 400 });
  }

  return NextResponse.json({ sessionId: session.id, playerId: player.id });
}
