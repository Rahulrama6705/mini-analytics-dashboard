"use server";

import { revalidatePath } from "next/cache";
import { getStripe } from "@/lib/stripe/server-client";
import { getStripeMappingForLearner } from "@/lib/stripe/payments";
import { syncSubscriptionToSupabase, scheduleSupabasePauseWindow } from "@/lib/stripe/sync-supabase";
import { loadStripeConfig, inferPlanKeyFromPriceId } from "@/lib/stripe/infer-plan";
import type { StripePlanKey } from "@/lib/stripe/payments-types";

// These call the REAL Stripe test-mode API — every action here actually
// changes the subscription in Stripe, not a local mock file. Each action
// also mirrors the resulting state into the real Supabase preprod
// Subscriptions table, so the dashboard, Stripe, and Supabase all agree.

function requireMapping(learnerId: string) {
  const mapped = getStripeMappingForLearner(learnerId);
  if (!mapped) {
    throw new Error("This learner has no Stripe test customer yet — run `npm run stripe:seed-customers`.");
  }
  return mapped;
}

async function syncAfterChange(learnerId: string, subscriptionId: string, pauseEndDateOverride?: string | null) {
  const stripe = getStripe();
  const config = loadStripeConfig();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["items.data.price"],
  });
  const planKey = inferPlanKeyFromPriceId(subscription.items.data[0]?.price?.id, config);
  await syncSubscriptionToSupabase(learnerId, subscription, planKey, pauseEndDateOverride);
}

export async function updateStripeSubscriptionPrice(learnerId: string, plan: StripePlanKey) {
  const stripe = getStripe();
  const { subscriptionId } = requireMapping(learnerId);
  const config = loadStripeConfig();
  const newPriceId = config.plans[plan].priceId;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const itemId = subscription.items.data[0].id;

  await stripe.subscriptions.update(subscriptionId, {
    items: [{ id: itemId, price: newPriceId }],
    proration_behavior: "create_prorations",
  });

  await syncAfterChange(learnerId, subscriptionId);
  revalidatePath("/customers");
}

export async function pauseStripeSubscription(learnerId: string) {
  const stripe = getStripe();
  const { subscriptionId } = requireMapping(learnerId);

  await stripe.subscriptions.update(subscriptionId, {
    pause_collection: { behavior: "mark_uncollectible" },
  });

  await syncAfterChange(learnerId, subscriptionId);
  revalidatePath("/customers");
}

// Pauses over a chosen date window. Stripe has no native "start pausing on
// a future date" API, and its pause_collection.resumes_at is unreliable in
// practice — it's silently dropped (no error, pause_collection just comes
// back null) whenever resumes_at falls inside the subscription's current
// billing period. So both edges of the window are handled by us, not
// Stripe:
//   - if the window starts today (or earlier), pause is applied to Stripe
//     right now with no resumes_at — the chosen end date is tracked only
//     in Supabase (pause_end_date).
//   - if the window starts in the future, nothing touches Stripe yet — the
//     window is recorded in Supabase and picked up by the daily cron
//     (app/api/cron/apply-scheduled-pauses) on the day it starts.
// The same cron also lifts the pause when pause_end_date arrives, so
// resuming isn't delegated to Stripe either.
export async function scheduleStripeSubscriptionPause(learnerId: string, fromDate: string, toDate: string) {
  const from = new Date(fromDate);
  const to = new Date(toDate);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    throw new Error("Invalid pause dates.");
  }
  if (to <= from) {
    throw new Error("Resume date must be after the pause start date.");
  }

  const { subscriptionId } = requireMapping(learnerId);
  const startsToday = from.getTime() <= Date.now();

  if (startsToday) {
    const stripe = getStripe();
    await stripe.subscriptions.update(subscriptionId, {
      pause_collection: { behavior: "mark_uncollectible" },
    });
    await syncAfterChange(learnerId, subscriptionId, to.toISOString());
  } else {
    await scheduleSupabasePauseWindow(learnerId, subscriptionId, from.toISOString(), to.toISOString());
  }

  revalidatePath("/customers");
}

export async function resumeStripeSubscription(learnerId: string) {
  const stripe = getStripe();
  const { subscriptionId } = requireMapping(learnerId);

  await stripe.subscriptions.update(subscriptionId, {
    pause_collection: "",
  });

  await syncAfterChange(learnerId, subscriptionId);
  revalidatePath("/customers");
}

export async function cancelStripeSubscription(learnerId: string) {
  const stripe = getStripe();
  const { subscriptionId } = requireMapping(learnerId);

  await stripe.subscriptions.cancel(subscriptionId);

  await syncAfterChange(learnerId, subscriptionId);
  revalidatePath("/customers");
}
