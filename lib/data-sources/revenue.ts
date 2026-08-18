import { getSupabase } from "@/lib/supabase/server-client";
import type { CategoryPoint, ChurnedSubscriptionRow, FailedPayment, MonthlyPoint, RefundRow } from "./types";

// See lib/data-sources/overview.ts for why these call Postgres functions
// instead of joining/aggregating in JS.

export async function getMRRTrend(months = 12): Promise<MonthlyPoint[]> {
  const { data, error } = await getSupabase().rpc("dashboard_mrr_trend", { months_back: months });
  if (error) throw error;
  return (data as { month: string; value: number }[]).map((r) => ({ month: r.month, value: Number(r.value) }));
}

/** Revenue by course reflects one-off CoursePurchases only — subscriptions aren't tied to a single class. */
export async function getRevenueByCourse(): Promise<CategoryPoint[]> {
  const { data, error } = await getSupabase().rpc("dashboard_revenue_by_course", { result_limit: 15 });
  if (error) throw error;
  return (data as { label: string; value: number }[]).map((r) => ({ label: r.label, value: Number(r.value) }));
}

export async function getFailedPayments(limit = 50): Promise<FailedPayment[]> {
  const { data, error } = await getSupabase().rpc("dashboard_failed_payments", { result_limit: limit });
  if (error) throw error;
  return (data as { id: string; learner_name: string | null; created_at: string; failure_reason: string | null }[]).map(
    (r) => ({
      id: r.id,
      learnerName: r.learner_name ?? "(unknown learner)",
      createdAt: r.created_at,
      failureReason: r.failure_reason,
    })
  );
}

/** Combines legacy CoursePurchases.refunded_at rows with real Stripe refunds mirrored into RefundRequests. */
export async function getRefunds(limit = 50): Promise<RefundRow[]> {
  const { data, error } = await getSupabase().rpc("dashboard_refunds", { result_limit: limit });
  if (error) throw error;
  return (
    data as {
      purchase_id: string;
      parent_name: string | null;
      amount: number;
      currency: string;
      refunded_at: string;
      course_name: string | null;
      source: "course_purchase" | "stripe_refund";
    }[]
  ).map((r) => ({
    purchaseId: r.purchase_id,
    parentName: r.parent_name ?? "(unknown parent)",
    amount: Number(r.amount),
    currency: r.currency ?? "usd",
    refundedAt: r.refunded_at,
    courseName: r.course_name ?? (r.source === "stripe_refund" ? "Stripe subscription payment" : "(unknown class)"),
    source: r.source,
  }));
}

export async function getChurnedSubscriptions(limit = 50): Promise<ChurnedSubscriptionRow[]> {
  const { data, error } = await getSupabase().rpc("dashboard_churned_subscriptions", { result_limit: limit });
  if (error) throw error;
  return (
    data as {
      id: string;
      learner_name: string | null;
      subscription_type: string | null;
      canceled_at: string | null;
      subscribed_at: string | null;
    }[]
  ).map((r) => ({
    id: r.id,
    learnerName: r.learner_name ?? "(unknown learner)",
    subscriptionType: r.subscription_type ?? "unknown",
    canceledAt: r.canceled_at,
    subscribedAt: r.subscribed_at,
  }));
}
