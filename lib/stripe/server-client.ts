import "server-only";
import Stripe from "stripe";

// Server-only Stripe client, test mode. STRIPE_SECRET_KEY must start with
// sk_test_ — this app should never be pointed at a live-mode key.
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

let client: Stripe | null = null;

export function getStripe(): Stripe {
  if (!STRIPE_SECRET_KEY) {
    throw new Error("Missing STRIPE_SECRET_KEY. Set it in .env.local (see .env.example).");
  }
  if (!STRIPE_SECRET_KEY.startsWith("sk_test_")) {
    throw new Error("STRIPE_SECRET_KEY must be a test-mode key (sk_test_...) — refusing to use a live key.");
  }
  if (!client) {
    client = new Stripe(STRIPE_SECRET_KEY);
  }
  return client;
}
