import "server-only";
import { getSupabase } from "@/lib/supabase/server-client";

// Mirrors a Stripe refund's state into the real Supabase preprod
// RefundRequests table, upserted on the unique payment_intent_id. Called
// from both directions of the sync: right after our own dashboard action
// creates a refund in Stripe, and from the Stripe webhook when the refund
// is confirmed (or fails) asynchronously.
//
// RefundRequests.status was originally a 3-value staff-approval workflow
// ('pending'|'approved'|'declined'); a migration widened the CHECK
// constraint to add 'refunded'/'failed' for this instant-refund flow, and
// added a UNIQUE constraint on payment_intent_id so this upsert (and the
// webhook's idempotency check) has a natural dedupe key.

export type RefundRequestStatus = "pending" | "refunded" | "failed";

interface UpsertRefundRequestParams {
  learnerId: string;
  paymentIntentId: string;
  amountRequested: number;
  status: RefundRequestStatus;
  amountApproved?: number | null;
  processedAt?: string | null;
  reason?: string | null;
}

export interface RefundRequestRow {
  id: string;
  learner_id: string;
  payment_intent_id: string;
  amount_requested: number;
  amount_approved: number | null;
  status: RefundRequestStatus;
  processed_at: string | null;
  created_at: string;
}

export async function findRefundByPaymentIntent(paymentIntentId: string): Promise<RefundRequestRow | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("RefundRequests")
    .select("*")
    .eq("payment_intent_id", paymentIntentId)
    .maybeSingle();
  if (error) throw error;
  return data as RefundRequestRow | null;
}

export async function upsertRefundRequest(params: UpsertRefundRequestParams): Promise<void> {
  const supabase = getSupabase();
  const existing = await findRefundByPaymentIntent(params.paymentIntentId);

  const row = {
    learner_id: params.learnerId,
    payment_intent_id: params.paymentIntentId,
    amount_requested: params.amountRequested,
    amount_approved: params.amountApproved ?? null,
    status: params.status,
    processed_at: params.processedAt ?? null,
    reason: params.reason ?? null,
  };

  if (existing) {
    const { error } = await supabase.from("RefundRequests").update(row).eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("RefundRequests").insert({
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      ...row,
    });
    if (error) throw error;
  }
}
