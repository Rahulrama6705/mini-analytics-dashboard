"use server";

import { revalidatePath } from "next/cache";
import { getStripe } from "@/lib/stripe/server-client";
import { getStripeMappingForLearner } from "@/lib/stripe/payments";
import { upsertRefundRequest } from "@/lib/stripe/refunds-supabase";

// Calls the REAL Stripe test-mode API — refunds.create actually refunds
// the charge, not a local mock. Mirrors the result into the real Supabase
// preprod RefundRequests table immediately (best-effort; the webhook is
// the source of truth for the final state in case the refund resolves
// asynchronously or is issued directly in Stripe's own dashboard).

function requireMapping(learnerId: string) {
  const mapped = getStripeMappingForLearner(learnerId);
  if (!mapped) {
    throw new Error("This learner has no Stripe test customer yet — run `npm run stripe:seed-customers`.");
  }
  return mapped;
}

export async function refundStripePayment(learnerId: string, paymentIntentId: string) {
  requireMapping(learnerId);
  const stripe = getStripe();

  const refund = await stripe.refunds.create({ payment_intent: paymentIntentId });

  await upsertRefundRequest({
    learnerId,
    paymentIntentId,
    amountRequested: refund.amount,
    status: refund.status === "succeeded" ? "refunded" : refund.status === "failed" ? "failed" : "pending",
    amountApproved: refund.status === "succeeded" ? refund.amount : null,
    processedAt: refund.status === "succeeded" ? new Date().toISOString() : null,
  });

  revalidatePath("/customers");
}
