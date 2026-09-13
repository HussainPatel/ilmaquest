import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ContributeForm from "./contribute-form";

const ALLOWED_ROLES = ["contributor", "reviewer", "senior_reviewer", "admin"];

export default async function ContributePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/contribute");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !ALLOWED_ROLES.includes(profile.role)) {
    return (
      <main className="mx-auto max-w-sm px-6 py-16 text-center">
        <h1 className="text-xl font-semibold">Contributor access required</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your account role is <strong>{profile?.role ?? "unknown"}</strong>. Ask an admin to grant
          you the <code>contributor</code> role to add questions — see docs/CONTENT_PROCESS.md §3.
        </p>
      </main>
    );
  }

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name")
    .eq("is_active", true)
    .order("name");

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-2xl font-semibold">Add a question</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Every question needs a real, checkable source — see docs/CONTENT_PROCESS.md §1. This
        saves as a draft and won&apos;t be visible to players until a reviewer approves and
        publishes it.
      </p>

      <ContributeForm categories={categories ?? []} />
    </main>
  );
}
