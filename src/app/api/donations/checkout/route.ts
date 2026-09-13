import { createClient } from "@/lib/supabase/server";
import { createCheckoutSchema } from "@/lib/donations/validation";
import { getStripe } from "@/lib/stripe/server";
import { NextResponse } from "next/server";

// Creates a Stripe Checkout Session for a donation (one-time or recurring).
// This route only ever returns a redirect URL — the actual donation record
// is written by the webhook handler once Stripe confirms payment, never here
// (see docs/MONETIZATION.md §2, step 5-6: the client-side redirect back from
// Checkout is cosmetic and cannot be trusted as proof of payment).
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createCheckoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }
  const { amountCents, currency, interval } = parsed.data;

  let stripe;
  try {
    stripe = getStripe();
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 503 });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("stripe_customer_id, display_name")
    .eq("id", user.id)
    .single();

  let customerId = profile?.stripe_customer_id ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: profile?.display_name,
      metadata: { user_id: user.id },
    });
    customerId = customer.id;

    const { error: updateError } = await supabase
      .from("users")
      .update({ stripe_customer_id: customerId })
      .eq("id", user.id);
    if (updateError) {
      return NextResponse.json({ error: "Could not link your account to Stripe." }, { status: 500 });
    }
  }

  const origin = request.headers.get("origin") ?? "";

  const session = await stripe.checkout.sessions.create({
    mode: interval === "month" ? "subscription" : "payment",
    customer: customerId,
    client_reference_id: user.id,
    line_items: [
      {
        price_data: {
          currency,
          unit_amount: amountCents,
          product_data: { name: "Donation to ilmaQuest" },
          ...(interval === "month" ? { recurring: { interval: "month" as const } } : {}),
        },
        quantity: 1,
      },
    ],
    success_url: `${origin}/account?donation=success`,
    cancel_url: `${origin}/account?donation=cancelled`,
  });

  if (!session.url) {
    return NextResponse.json({ error: "Could not create checkout session." }, { status: 500 });
  }

  return NextResponse.json({ url: session.url });
}
