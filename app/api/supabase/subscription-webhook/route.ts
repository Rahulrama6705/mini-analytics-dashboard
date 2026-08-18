import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/server-client";

// Catches changes made directly in Supabase's Subscriptions table (not
// through our dashboard) and mirrors them into Stripe, closing the
// Supabase -> Stripe sync direction. Wired up as a Supabase Database
// Webhook (Database > Webhooks in the Supabase dashboard) firing on
// INSERT/UPDATE of public.Subscriptions, pointed at this route with the
// shared secret below sent as a header.
//
// Only reacts to the fields we actually let the dashboard change
// (subscription_status, stripe_price_id) to avoid fighting with our own
// syncSubscriptionToSupabase writes, which already reflect Stripe's state.

interface SubscriptionRow {
  learner_id: string;
  stripe_subscription_id: string;
  subscription_status: string | null;
  stripe_price_id: string | null;
}

interface SupabaseWebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: SubscriptionRow | null;
  old_record: SubscriptionRow | null;
}

export async function POST(req: Request) {
  const expectedSecret = process.env.SUPABASE_WEBHOOK_SECRET;
  if (!expectedSecret) {
    return NextResponse.json({ error: "Missing SUPABASE_WEBHOOK_SECRET" }, { status: 500 });
  }
  if (req.headers.get("x-webhook-secret") !== expectedSecret) {
    return NextResponse.json({ error: "Invalid webhook secret" }, { status: 401 });
  }

  const payload = (await req.json()) as SupabaseWebhookPayload;
  if (payload.table !== "Subscriptions" || payload.type !== "UPDATE" || !payload.record) {
    return NextResponse.json({ received: true, skipped: true });
  }

  const { record, old_record } = payload;
  const subscriptionId = record.stripe_subscription_id;
  if (!subscriptionId) {
    return NextResponse.json({ received: true, skipped: "row has no stripe_subscription_id" });
  }

  const stripe = getStripe();
  const actions: string[] = [];

  const statusChanged = record.subscription_status !== old_record?.subscription_status;
  if (statusChanged && record.subscription_status === "paused") {
    await stripe.subscriptions.update(subscriptionId, {
      pause_collection: { behavior: "mark_uncollectible" },
    });
    actions.push("paused");
  } else if (statusChanged && record.subscription_status === "active") {
    await stripe.subscriptions.update(subscriptionId, { pause_collection: "" });
    actions.push("resumed");
  } else if (statusChanged && record.subscription_status === "canceled") {
    await stripe.subscriptions.cancel(subscriptionId);
    actions.push("canceled");
  }

  const priceChanged = record.stripe_price_id && record.stripe_price_id !== old_record?.stripe_price_id;
  if (priceChanged) {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const itemId = subscription.items.data[0].id;
    await stripe.subscriptions.update(subscriptionId, {
      items: [{ id: itemId, price: record.stripe_price_id! }],
      proration_behavior: "create_prorations",
    });
    actions.push("price_updated");
  }

  return NextResponse.json({ received: true, learnerId: record.learner_id, actions });
}
