import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/server";
import { NextResponse } from "next/server";

// Creates a Stripe-hosted Customer Portal session so donors can update their
// card or cancel a recurring donation without us building that UI ourselves.
// Only ever uses the caller's OWN stripe_customer_id (looked up server-side
// from their own row), never a customer id passed by the client — see
// docs/MONETIZATION.md §4.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  let stripe;
  try {
    stripe = getStripe();
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 503 });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();

  if (!profile?.stripe_customer_id) {
    return NextResponse.json({ error: "No donation history found for your account." }, { status: 404 });
  }

  const origin = request.headers.get("origin") ?? "";

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${origin}/account`,
  });

  return NextResponse.json({ url: portalSession.url });
}
