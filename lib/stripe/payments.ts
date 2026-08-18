import "server-only";
import fs from "node:fs";
import path from "node:path";
import Stripe from "stripe";
import { getStripe } from "./server-client";
import { getSupabase } from "@/lib/supabase/server-client";
import type {
  StripePaymentsForLearner,
  StripeSubscriptionView,
  StripeTransactionView,
  RefundView,
} from "./payments-types";
import type { RefundRequestRow } from "./refunds-supabase";

// Real Stripe TEST MODE integration for the Payments tab. The learner_id ->
// {customerId, subscriptionId} mapping lives in data/stripe-mapping.json
// (written by scripts/seed-stripe-customers.ts) — a local file, not
// Supabase. Everything else here is a live read from the real Stripe API.

const MAPPING_PATH = path.join(process.cwd(), "data", "stripe-mapping.json");

interface StripeMapping {
  learners: Record<string, { customerId: string; subscriptionId: string; plan: string }>;
}

function loadMapping(): StripeMapping | null {
  if (!fs.existsSync(MAPPING_PATH)) return null;
  return JSON.parse(fs.readFileSync(MAPPING_PATH, "utf-8"));
}

export function getStripeMappingForLearner(
  learnerId: string
): { customerId: string; subscriptionId: string } | null {
  const mapping = loadMapping();
  const entry = mapping?.learners[learnerId];
  return entry ? { customerId: entry.customerId, subscriptionId: entry.subscriptionId } : null;
}

// Reverse of the above — used by the refund webhook, which only gets a
// Stripe customer ID off the PaymentIntent, not a learner_id.
let reverseMappingCache: Map<string, string> | null = null;
export function resolveLearnerIdFromCustomerId(customerId: string): string | null {
  if (!reverseMappingCache) {
    const mapping = loadMapping();
    reverseMappingCache = new Map();
    if (mapping) {
      for (const [learnerId, entry] of Object.entries(mapping.learners)) {
        reverseMappingCache.set(entry.customerId, learnerId);
      }
    }
  }
  return reverseMappingCache.get(customerId) ?? null;
}

function centsToDollars(cents: number): number {
  return Math.round((cents / 100) * 100) / 100;
}

export async function getStripePaymentsForLearner(learnerId: string): Promise<StripePaymentsForLearner> {
  const mapped = getStripeMappingForLearner(learnerId);
  if (!mapped) return { customerId: null, subscription: null, transactions: [] };

  const stripe = getStripe();

  const subscription = await stripe.subscriptions
    .retrieve(mapped.subscriptionId, { expand: ["items.data.price.product"] })
    .catch(() => null);

  let subscriptionView: StripeSubscriptionView | null = null;
  if (subscription) {
    const item = subscription.items.data[0];
    const price = item?.price;
    const product = price?.product;
    const productName = typeof product === "object" && product && "name" in product ? product.name : "Unknown plan";

    subscriptionView = {
      id: subscription.id,
      status: subscription.status,
      isPaused: subscription.pause_collection != null,
      pauseResumesAt: subscription.pause_collection?.resumes_at
        ? new Date(subscription.pause_collection.resumes_at * 1000).toISOString()
        : null,
      planName: productName,
      weeklyPriceCents: price?.unit_amount ?? 0,
      priceId: price?.id ?? null,
      startedAt: new Date(subscription.start_date * 1000).toISOString(),
      canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
      currentPeriodEnd: item?.current_period_end
        ? new Date(item.current_period_end * 1000).toISOString()
        : null,
    };
  }

  const invoices = await stripe.invoices.list({ customer: mapped.customerId, limit: 30 });

  // This Stripe API version's Invoice object carries no payment_intent,
  // charge, or usable `payments` link back to how it was actually paid
  // (confirmed by inspecting the raw API response — none of those fields
  // are present). Charges/PaymentIntents do carry the reverse link
  // (amount + timing), so paid invoices are matched to their charge by
  // amount + closest created timestamp, which is reliable for this app's
  // well-separated weekly billing cycles.
  const charges =
    invoices.data.some((inv) => inv.status === "paid")
      ? await stripe.charges.list({ customer: mapped.customerId, limit: 100 })
      : null;

  const transactions: StripeTransactionView[] = invoices.data.map((inv) => {
    const match = charges ? findMatchingCharge(charges.data, inv.amount_paid, inv.created) : null;
    return {
      id: inv.id ?? "",
      amountCents: inv.status === "paid" ? inv.amount_paid : inv.total,
      currency: inv.currency,
      status: inv.status ?? "draft",
      createdAt: new Date(inv.created * 1000).toISOString(),
      description: inv.billing_reason?.replaceAll("_", " ") ?? "invoice",
      paymentIntentId:
        typeof match?.payment_intent === "string" ? match.payment_intent : match?.payment_intent?.id ?? null,
      chargeId: match?.id ?? null,
      hostedInvoiceUrl: match?.receipt_url ?? inv.hosted_invoice_url ?? null,
      invoicePdf: inv.invoice_pdf ?? null,
      refund: null,
    };
  });
  transactions.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  await attachRefunds(transactions);

  return { customerId: mapped.customerId, subscription: subscriptionView, transactions };
}

function findMatchingCharge(
  charges: Stripe.Charge[],
  amount: number,
  invoiceCreated: number
): Stripe.Charge | null {
  const candidates = charges.filter((c) => c.status === "succeeded" && c.amount === amount);
  if (candidates.length === 0) return null;
  return candidates.reduce((closest, c) =>
    Math.abs(c.created - invoiceCreated) < Math.abs(closest.created - invoiceCreated) ? c : closest
  );
}

// Batched — bounded to this one learner's ≤30 transactions, not a
// full-table scan, so it's safe to use .in() here unlike the
// full-database aggregations in lib/data-sources/*.ts.
async function attachRefunds(transactions: StripeTransactionView[]): Promise<void> {
  const ids = transactions.map((t) => t.paymentIntentId).filter((id): id is string => id != null);
  if (ids.length === 0) return;

  const supabase = getSupabase();
  const { data, error } = await supabase.from("RefundRequests").select("*").in("payment_intent_id", ids);
  if (error) throw error;

  const byPaymentIntent = new Map((data as RefundRequestRow[]).map((r) => [r.payment_intent_id, r]));
  for (const t of transactions) {
    const row = t.paymentIntentId ? byPaymentIntent.get(t.paymentIntentId) : undefined;
    if (!row) continue;
    const refund: RefundView = {
      status: row.status === "refunded" ? "refunded" : row.status === "failed" ? "failed" : "pending",
      amountCents: row.amount_approved ?? row.amount_requested,
      currency: "usd",
      refundedAt: row.processed_at,
      receiptUrl: t.hostedInvoiceUrl,
    };
    t.refund = refund;
  }
}

export { centsToDollars };
