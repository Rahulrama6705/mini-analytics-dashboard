import { getDb } from "@/lib/db/client";
import type { MonthlyPoint } from "./types";

// Real swap-in note: each function below becomes a Supabase query
// (students/enrollments) or Stripe API call (charges/subscriptions),
// aggregated the same way. Signatures stay the same.

export function getTotalStudents(): number {
  const row = getDb().prepare(`SELECT COUNT(*) AS c FROM students`).get() as { c: number };
  return row.c;
}

export function getActiveStudentsCount(): number {
  const row = getDb()
    .prepare(`SELECT COUNT(*) AS c FROM students WHERE status = 'active'`)
    .get() as { c: number };
  return row.c;
}

/** Sum of mrr_amount across currently-active subscriptions. */
export function getMRR(): number {
  const row = getDb()
    .prepare(`SELECT COALESCE(SUM(mrr_amount), 0) AS total FROM subscriptions WHERE status = 'active'`)
    .get() as { total: number };
  return row.total;
}

/** Total succeeded charge amount for the current calendar month. */
export function getRevenueThisMonth(now: Date = new Date()): number {
  const monthKey = now.toISOString().slice(0, 7); // "2026-07"
  const row = getDb()
    .prepare(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM charges
       WHERE status = 'succeeded' AND strftime('%Y-%m', created_at) = ?`
    )
    .get(monthKey) as { total: number };
  return row.total;
}

/**
 * Churn rate = canceled subscriptions / all subscriptions that were ever
 * billed (active + past_due + canceled). A simple point-in-time measure
 * suited to mock data; the real Stripe swap would likely use a rolling
 * cohort calculation instead.
 */
export function getChurnRate(): number {
  const row = getDb()
    .prepare(
      `SELECT
         SUM(CASE WHEN status = 'canceled' THEN 1 ELSE 0 END) AS churned,
         COUNT(*) AS total
       FROM subscriptions`
    )
    .get() as { churned: number; total: number };
  if (row.total === 0) return 0;
  return Number(((row.churned / row.total) * 100).toFixed(1));
}

/** Succeeded revenue bucketed by month for the trailing N months. */
export function getRevenueByMonth(months = 12, now: Date = new Date()): MonthlyPoint[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT strftime('%Y-%m', created_at) AS month, SUM(amount) AS total
       FROM charges
       WHERE status = 'succeeded'
       GROUP BY month
       ORDER BY month`
    )
    .all() as { month: string; total: number }[];
  return fillMonths(rows, months, now);
}

/** New enrollment counts bucketed by month for the trailing N months. */
export function getEnrollmentTrend(months = 12, now: Date = new Date()): MonthlyPoint[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT strftime('%Y-%m', enrolled_at) AS month, COUNT(*) AS total
       FROM enrollments
       GROUP BY month
       ORDER BY month`
    )
    .all() as { month: string; total: number }[];
  return fillMonths(rows, months, now);
}

/** Fills in any months with no rows as 0 and clips to the trailing window. */
function fillMonths(
  rows: { month: string; total: number }[],
  months: number,
  now: Date
): MonthlyPoint[] {
  const byMonth = new Map(rows.map((r) => [r.month, r.total]));
  const result: MonthlyPoint[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const key = d.toISOString().slice(0, 7);
    result.push({ month: key, value: byMonth.get(key) ?? 0 });
  }
  return result;
}
