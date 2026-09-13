import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import NewChallengeForm from "./new-challenge-form";

export default async function NewChallengePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/challenges/new");
  }

  const { data: quizzes } = await supabase
    .from("quizzes")
    .select("id, title")
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto max-w-sm px-6 py-16">
      <h1 className="text-2xl font-semibold">Challenge a friend</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        They need an ilmaQuest account already — pick a quiz, we&apos;ll notify them.
      </p>
      <NewChallengeForm quizzes={quizzes ?? []} />
    </main>
  );
}
