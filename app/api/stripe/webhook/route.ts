import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe/server-client";
import { syncSubscriptionToSupabase } from "@/lib/stripe/sync-supabase";
import { resolveLearnerIdFromCustomerId } from "@/lib/stripe/payments";
import { findRefundByPaymentIntent, upsertRefundRequest } from "@/lib/stripe/refunds-supabase";
import type { StripePlanKey } from "@/lib/stripe/payments-types";

// Catches changes made directly in Stripe (not through our dashboard) and
// mirrors them into Supabase, closing the Stripe -> Supabase sync direction.
// Run locally with the Stripe CLI forwarding events here:
//   stripe listen --forward-to localhost:3000/api/stripe/webhook
// which prints a signing secret to put in .env.local as STRIPE_WEBHOOK_SECRET.

const SUBSCRIPTION_EVENTS = new Set([
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
]);

const REFUND_EVENTS = new Set(["refund.updated"]);

interface StripeConfig {
  plans: Record<StripePlanKey, { productId: string; priceId: string }>;
}

function inferPlanKeyFromPriceId(priceId: string | undefined): StripePlanKey | null {
  const configPath = path.join(process.cwd(), "data", "stripe-config.json");
  if (!fs.existsSync(configPath)) return null;
  const config: StripeConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  const entry = (Object.entries(config.plans) as [StripePlanKey, { priceId: string }][]).find(
    ([, p]) => p.priceId === priceId
  );
  return entry?.[0] ?? null;
}

export async function POST(req: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Missing STRIPE_WEBHOOK_SECRET" }, { status: 500 });
  }

  const stripe = getStripe();
  const signature = req.headers.get("stripe-signature");
  const body = await req.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature ?? "", webhookSecret);
  } catch (err) {
    return NextResponse.json(
      { error: `Invalid signature: ${err instanceof Error ? err.message : err}` },
      { status: 400 }
    );
  }

  if (SUBSCRIPTION_EVENTS.has(event.type)) {
    const subscription = event.data.object as Stripe.Subscription;
    const learnerId = subscription.metadata?.learner_id;
    if (!learnerId) {
      return NextResponse.json({ received: true, skipped: "no learner_id metadata" });
    }

    const planKey = inferPlanKeyFromPriceId(subscription.items.data[0]?.price?.id);
    await syncSubscriptionToSupabase(learnerId, subscription, planKey);

    return NextResponse.json({ received: true, learnerId, synced: true });
  }

  if (REFUND_EVENTS.has(event.type)) {
    return handleRefundUpdated(event.data.object as Stripe.Refund);
  }

  return NextResponse.json({ received: true, skipped: event.type });
}

// Confirms/syncs a refund created via our dashboard (lib/actions/stripe-refund-actions.ts)
// and also catches refunds issued directly in Stripe's own dashboard.
// Idempotent: if the RefundRequests row is already in a terminal state
// (refunded/failed) with processed_at set, skip re-processing — this uses
// the refund's own terminal state as the dedupe key rather than tracking
// raw Stripe event IDs in a separate table.
async function handleRefundUpdated(refund: Stripe.Refund) {
  const paymentIntentId = typeof refund.payment_intent === "string" ? refund.payment_intent : refund.payment_intent?.id;
  if (!paymentIntentId) {
    return NextResponse.json({ received: true, skipped: "refund has no payment_intent" });
  }

  const existing = await findRefundByPaymentIntent(paymentIntentId);
  if (existing && (existing.status === "refunded" || existing.status === "failed") && existing.processed_at) {
    return NextResponse.json({ received: true, skipped: "already processed" });
  }

  const stripe = getStripe();
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, { expand: ["customer"] });
  const customerId = typeof paymentIntent.customer === "string" ? paymentIntent.customer : paymentIntent.customer?.id;
  const learnerId = customerId ? resolveLearnerIdFromCustomerId(customerId) : null;
  if (!learnerId) {
    return NextResponse.json({ received: true, skipped: "could not resolve learner_id from customer" });
  }

  const status = refund.status === "succeeded" ? "refunded" : refund.status === "failed" ? "failed" : "pending";
  await upsertRefundRequest({
    learnerId,
    paymentIntentId,
    amountRequested: refund.amount,
    status,
    amountApproved: status === "refunded" ? refund.amount : null,
    processedAt: status === "refunded" || status === "failed" ? new Date().toISOString() : null,
  });

  return NextResponse.json({ received: true, learnerId, paymentIntentId, status, synced: true });
}
