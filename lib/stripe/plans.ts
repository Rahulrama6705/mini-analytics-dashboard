import type { StripePlanKey } from "./payments-types";

// Display-only plan info for the client (name/price). The real Stripe
// price IDs used server-side live in data/stripe-config.json, looked up
// by these same keys inside the Server Actions.
export const STRIPE_PLAN_DISPLAY: Record<StripePlanKey, { name: string; weeklyPriceCents: number }> = {
  coral_unlimited: { name: "Coral Unlimited", weeklyPriceCents: 4000 },
  coral_normal: { name: "Coral Normal", weeklyPriceCents: 2000 },
};
