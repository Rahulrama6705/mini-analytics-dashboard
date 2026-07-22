import { getDb } from "@/lib/db/client";
import type { CategoryPoint, ChurnedSubscription, Charge, MonthlyPoint, Refund } from "./types";

/** MRR bucketed by month, derived from succeeded recurring charges. */
export function getMRRTrend(months = 12, now: Date = new Date()): MonthlyPoint[] {
  const rows = getDb()
    .prepare(
      `SELECT strftime('%Y-%m', created_at) AS month, SUM(amount) AS total
       FROM charges
       WHERE status = 'succeeded' AND description LIKE '%monthly installment%'
       GROUP BY month
       ORDER BY month`
    )
    .all() as { month: string; total: number }[];

  const byMonth = new Map(rows.map((r) => [r.month, r.total]));
  const result: MonthlyPoint[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const key = d.toISOString().slice(0, 7);
    result.push({ month: key, value: byMonth.get(key) ?? 0 });
  }
  return result;
}

/** Succeeded revenue grouped by course (proxy for "plan"). */
export function getRevenueByCourse(): CategoryPoint[] {
  return getDb()
    .prepare(
      `SELECT c.name AS label, SUM(ch.amount) AS value
       FROM charges ch
       JOIN students s ON s.id = ch.customer_id
       JOIN courses c ON c.id = s.course_id
       WHERE ch.status = 'succeeded'
       GROUP BY c.id
       ORDER BY value DESC`
    )
    .all() as CategoryPoint[];
}

export function getFailedPayments(limit = 50): Charge[] {
  return getDb()
    .prepare(
      `SELECT ch.id, ch.customer_id, s.name AS customer_name, ch.amount, ch.currency,
              ch.status, ch.created_at, ch.description
       FROM charges ch
       JOIN students s ON s.id = ch.customer_id
       WHERE ch.status = 'failed'
       ORDER BY ch.created_at DESC
       LIMIT ?`
    )
    .all(limit) as Charge[];
}

export function getRefunds(limit = 50): Refund[] {
  return getDb()
    .prepare(
      `SELECT r.id, r.charge_id, s.name AS customer_name, r.amount, r.reason, r.created_at
       FROM refunds r
       JOIN charges ch ON ch.id = r.charge_id
       JOIN students s ON s.id = ch.customer_id
       ORDER BY r.created_at DESC
       LIMIT ?`
    )
    .all(limit) as Refund[];
}

export function getChurnedSubscriptions(limit = 50): ChurnedSubscription[] {
  return getDb()
    .prepare(
      `SELECT sub.id, s.name AS customer_name, sub.plan, sub.status,
              sub.current_period_end, sub.mrr_amount
       FROM subscriptions sub
       JOIN students s ON s.id = sub.customer_id
       WHERE sub.status = 'canceled'
       ORDER BY sub.current_period_end DESC
       LIMIT ?`
    )
    .all(limit) as ChurnedSubscription[];
}
