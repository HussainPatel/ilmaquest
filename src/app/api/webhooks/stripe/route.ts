import { createServiceClient } from "@/lib/supabase/service";
import { getStripe } from "@/lib/stripe/server";
import { NextResponse } from "next/server";
import type Stripe from "stripe";

// The only place a `donations` row is ever written — see
// docs/MONETIZATION.md §2 and §4. Signature verification is mandatory: without
// it, anyone could POST a fake "payment succeeded" event and get a donation
// record (and, if that ever gates a benefit, a benefit) for free.
export async function POST(request: Request) {
  let stripe;
  try {
    stripe = getStripe();
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 503 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "STRIPE_WEBHOOK_SECRET is not set." }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe-Signature header." }, { status: 400 });
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    return NextResponse.json({ error: `Invalid signature: ${(err as Error).message}` }, { status: 400 });
  }

  const supabase = createServiceClient();

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.client_reference_id;

    if (!userId) {
      return NextResponse.json({ error: "Missing client_reference_id on session." }, { status: 400 });
    }

    const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 1 });
    const item = lineItems.data[0];

    const { error } = await supabase.from("donations").upsert(
      {
        user_id: userId,
        stripe_customer_id: typeof session.customer === "string" ? session.customer : session.customer?.id ?? "",
        stripe_session_id: session.id,
        stripe_subscription_id: typeof session.subscription === "string" ? session.subscription : null,
        amount_cents: item?.amount_total ?? session.amount_total ?? 0,
        currency: session.currency ?? "usd",
        interval: session.mode === "subscription" ? "month" : "one_time",
        status: session.payment_status === "paid" ? "succeeded" : "pending",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "stripe_session_id" }
    );

    if (error) {
      return NextResponse.json({ error: `Failed to record donation: ${error.message}` }, { status: 500 });
    }
  }

  if (event.type === "invoice.paid") {
    // Recurring donation renewal — record it as its own donations row, keyed
    // on the invoice's own checkout-session-equivalent id so retried webhook
    // deliveries stay idempotent.
    const invoice = event.data.object as Stripe.Invoice;
    const subscriptionId =
      typeof invoice.parent?.subscription_details?.subscription === "string"
        ? invoice.parent.subscription_details.subscription
        : invoice.parent?.subscription_details?.subscription?.id;
    const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;

    if (subscriptionId && customerId && invoice.status === "paid") {
      const { data: existing } = await supabase
        .from("users")
        .select("id")
        .eq("stripe_customer_id", customerId)
        .single();

      if (existing) {
        await supabase.from("donations").upsert(
          {
            user_id: existing.id,
            stripe_customer_id: customerId,
            stripe_session_id: `invoice_${invoice.id}`,
            stripe_subscription_id: subscriptionId,
            amount_cents: invoice.amount_paid,
            currency: invoice.currency,
            interval: "month",
            status: "succeeded",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "stripe_session_id" }
        );
      }
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    await supabase
      .from("donations")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("stripe_subscription_id", subscription.id);
  }

  return NextResponse.json({ received: true });
}
