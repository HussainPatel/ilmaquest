import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import HostRoom from "./host-room";

export default async function HostSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: session } = await supabase
    .from("game_sessions")
    .select(
      "id, host_id, join_code, status, current_question_index, quiz_id, quizzes(title, question_ids)"
    )
    .eq("id", sessionId)
    .single();

  if (!session) {
    notFound();
  }
  if (session.host_id !== user.id) {
    redirect("/host");
  }

  // Supabase's JS client can't statically know a quiz_id -> quizzes FK is
  // to-one without generated DB types (see docs/BEST_PRACTICES.md follow-up),
  // so it types the embed as an array. It's a single object at runtime.
  const quizzes = Array.isArray(session.quizzes) ? session.quizzes[0] : session.quizzes;

  return <HostRoom session={{ ...session, quizzes }} />;
}
