import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DonateForm from "./donate-form";

// Logged-in only — see docs/MONETIZATION.md §1: this route (and the nav link
// pointing to it) must never be reachable by an anonymous guest, since guest
// play with no account is the kid-access model in docs/SECURITY.md §1.
export default async function SupportPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/support");
  }

  const isRegisteredNonprofit = process.env.ORG_IS_REGISTERED_NONPROFIT === "true";

  return (
    <main className="mx-auto max-w-sm px-6 py-16">
      <h1 className="text-2xl font-semibold">Support ilmaQuest</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {isRegisteredNonprofit
          ? "Your contribution is tax-deductible where applicable — a receipt will be emailed to you."
          : "Your contribution helps cover hosting and content-review costs. ilmaQuest is not currently a registered charity, so this isn't a tax-deductible donation."}
      </p>

      <DonateForm />
    </main>
  );
}
