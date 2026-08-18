import "server-only";
import type Stripe from "stripe";
import { getSupabase } from "@/lib/supabase/server-client";
import type { StripePlanKey } from "./payments-types";

// Mirrors a Stripe subscription's state into the real Supabase preprod
// Subscriptions table, upserted on the stripe_subscription_id unique key.
// Called from both directions of the sync: right after our own dashboard
// actions write to Stripe, and from the Stripe webhook when a change is
// made directly in Stripe (outside our dashboard).
export async function syncSubscriptionToSupabase(
  learnerId: string,
  subscription: Stripe.Subscription,
  planKey: StripePlanKey | null,
  // Stripe's own pause_collection.resumes_at is unreliable here (silently
  // ignored when it falls inside the current billing period — see
  // scheduleStripeSubscriptionPause), so we track our own chosen end date
  // for the daily cron to act on instead of trusting resumes_at.
  pauseEndDateOverride?: string | null
) {
  const supabase = getSupabase();
  const item = subscription.items.data[0];
  const price = item?.price;

  const toIso = (unixSeconds: number | null | undefined) =>
    unixSeconds ? new Date(unixSeconds * 1000).toISOString() : null;

  const row = {
    stripe_subscription_id: subscription.id,
    learner_id: learnerId,
    subscription_status: subscription.pause_collection ? "paused" : subscription.status,
    type: "weekly",
    stripe_product_id: typeof price?.product === "string" ? price.product : (price?.product?.id ?? null),
    stripe_price_id: price?.id ?? null,
    subscribed_at: toIso(subscription.start_date),
    canceled_at: toIso(subscription.canceled_at),
    paused_at: subscription.pause_collection ? new Date().toISOString() : null,
    resume_on: toIso(subscription.pause_collection?.resumes_at),
    // Once a pause is actually live in Stripe (or lifted), the scheduled
    // window collapses into these same two fields — see
    // scheduleSupabasePauseWindow for the "not yet applied" state.
    pause_start_date: subscription.pause_collection ? new Date().toISOString() : null,
    pause_end_date: subscription.pause_collection
      ? (pauseEndDateOverride !== undefined ? pauseEndDateOverride : toIso(subscription.pause_collection?.resumes_at))
      : null,
    updated_at: new Date().toISOString(),
    ...(planKey ? { subscription_type: planKey } : {}),
  };

  const { data: existing } = await supabase
    .from("Subscriptions")
    .select("id")
    .eq("stripe_subscription_id", subscription.id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from("Subscriptions").update(row).eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("Subscriptions").insert({
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      ...row,
    });
    if (error) throw error;
  }
}

// Records a future-dated pause request without touching Stripe yet — Stripe
// has no native "start pausing on a future date" API, so the window is
// held here until the daily cron (app/api/cron/apply-scheduled-pauses)
// applies it on the day pause_start_date arrives. Lifting the pause is
// still handled natively by Stripe's own pause_collection.resumes_at, which
// flows back here via the Stripe webhook once it fires.
export async function scheduleSupabasePauseWindow(
  learnerId: string,
  stripeSubscriptionId: string,
  pauseStartDate: string,
  pauseEndDate: string
) {
  const supabase = getSupabase();
  const { data: existing } = await supabase
    .from("Subscriptions")
    .select("id")
    .eq("stripe_subscription_id", stripeSubscriptionId)
    .maybeSingle();

  const row = {
    stripe_subscription_id: stripeSubscriptionId,
    learner_id: learnerId,
    pause_start_date: pauseStartDate,
    pause_end_date: pauseEndDate,
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    const { error } = await supabase.from("Subscriptions").update(row).eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("Subscriptions").insert({
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      subscription_status: "active",
      ...row,
    });
    if (error) throw error;
  }
}
