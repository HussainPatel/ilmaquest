import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import SignOutButton from "./sign-out-button";
import ManageDonationButton from "./manage-donation-button";
import { getCurrency } from "@/lib/donations/currencies";

// Minimal authenticated page — proves the login flow actually works end to
// end (magic link -> session cookie -> RLS-scoped read of the caller's own
// public.users row). Will grow into a real account page later.
export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: donations } = await supabase
    .from("donations")
    .select("amount_cents, currency, interval, status, created_at")
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto max-w-sm px-6 py-16">
      <h1 className="text-2xl font-semibold">You&apos;re signed in</h1>

      <div className="mt-6 rounded-xl border border-border bg-card p-5">
        <dl className="space-y-4 text-sm">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Email
            </dt>
            <dd className="mt-0.5">{user.email}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Display name
            </dt>
            <dd className="mt-0.5">{profile?.display_name ?? "(not set)"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Role
            </dt>
            <dd className="mt-0.5">
              <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                {profile?.role ?? "(not set)"}
              </span>
            </dd>
          </div>
        </dl>
      </div>

      <div className="mt-8">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Donations
        </h2>
        {donations && donations.length > 0 ? (
          <>
            <ul className="mt-3 divide-y divide-border rounded-xl border border-border bg-card">
              {donations.map((d, i) => {
                const c = getCurrency(d.currency);
                return (
                  <li key={i} className="flex items-center justify-between px-4 py-3 text-sm">
                    <span>
                      {c?.symbol}
                      {(d.amount_cents / 100).toFixed(2)} {d.interval === "month" ? "/ month" : ""}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {d.status} · {new Date(d.created_at).toLocaleDateString()}
                    </span>
                  </li>
                );
              })}
            </ul>
            <div className="mt-3">
              <ManageDonationButton />
            </div>
          </>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            No donations yet.{" "}
            <a href="/support" className="text-primary hover:underline">
              Support ilmaQuest
            </a>
          </p>
        )}
      </div>

      <div className="mt-6">
        <SignOutButton />
      </div>
    </main>
  );
}
