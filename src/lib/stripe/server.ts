import Stripe from "stripe";

// Lazily constructed so the app doesn't crash at import/build time before a
// real Stripe account exists — see docs/MONETIZATION.md §6. Only throws once
// an actual donation route tries to use it without STRIPE_SECRET_KEY set.
let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  if (stripeClient) return stripeClient;

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set. Donations are not configured yet — see docs/MONETIZATION.md §6."
    );
  }

  stripeClient = new Stripe(key);
  return stripeClient;
}
