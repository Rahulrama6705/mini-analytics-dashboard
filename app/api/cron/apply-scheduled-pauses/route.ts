import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/server-client";
import { getSupabase } from "@/lib/supabase/server-client";
import { syncSubscriptionToSupabase } from "@/lib/stripe/sync-supabase";
import { loadStripeConfig, inferPlanKeyFromPriceId } from "@/lib/stripe/infer-plan";

// Runs on a daily schedule (see vercel.json) to apply and lift the
// date-windowed pauses scheduled from the dashboard
// (scheduleStripeSubscriptionPause). Stripe's pause_collection has no
// native "start on a future date" support, and its resumes_at field is
// unreliable (silently dropped when it falls inside the current billing
// period), so this cron is the sole authority for both edges of the
// window — Supabase's pause_start_date/pause_end_date are the source of
// truth, not anything on the Stripe subscription itself.

interface SubscriptionRow {
  id: string;
  learner_id: string;
  stripe_subscription_id: string;
  pause_end_date: string | null;
  subscription_status: string | null;
}

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabase();
  const stripe = getStripe();
  const config = loadStripeConfig();
  const nowIso = new Date().toISOString();

  async function resyncRow(row: { learner_id: string; stripe_subscription_id: string }, pauseEndDateOverride?: string | null) {
    const subscription = await stripe.subscriptions.retrieve(row.stripe_subscription_id, {
      expand: ["items.data.price"],
    });
    const planKey = inferPlanKeyFromPriceId(subscription.items.data[0]?.price?.id, config);
    await syncSubscriptionToSupabase(row.learner_id, subscription, planKey, pauseEndDateOverride);
  }

  // 1. Apply pauses whose start date has arrived.
  const { data: due, error: dueError } = await supabase
    .from("Subscriptions")
    .select("id, learner_id, stripe_subscription_id, pause_end_date, subscription_status")
    .lte("pause_start_date", nowIso)
    .not("pause_start_date", "is", null)
    .not("subscription_status", "in", '("paused","canceled")');
  if (dueError) throw dueError;

  const applied: string[] = [];
  const failed: { learnerId: string; step: string; error: string }[] = [];

  for (const row of (due ?? []) as SubscriptionRow[]) {
    try {
      await stripe.subscriptions.update(row.stripe_subscription_id, {
        pause_collection: { behavior: "mark_uncollectible" },
      });
      await resyncRow(row, row.pause_end_date);
      applied.push(row.learner_id);
    } catch (err) {
      failed.push({ learnerId: row.learner_id, step: "apply", error: err instanceof Error ? err.message : String(err) });
    }
  }

  // 2. Lift pauses whose end date has arrived.
  const { data: expired, error: expiredError } = await supabase
    .from("Subscriptions")
    .select("id, learner_id, stripe_subscription_id, pause_end_date, subscription_status")
    .lte("pause_end_date", nowIso)
    .not("pause_end_date", "is", null)
    .eq("subscription_status", "paused");
  if (expiredError) throw expiredError;

  const lifted: string[] = [];

  for (const row of (expired ?? []) as SubscriptionRow[]) {
    try {
      await stripe.subscriptions.update(row.stripe_subscription_id, { pause_collection: "" });
      await resyncRow(row);
      lifted.push(row.learner_id);
    } catch (err) {
      failed.push({ learnerId: row.learner_id, step: "lift", error: err instanceof Error ? err.message : String(err) });
    }
  }

  return NextResponse.json({ checkedDue: (due ?? []).length, applied, checkedExpired: (expired ?? []).length, lifted, failed });
}
