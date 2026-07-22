import { getDb } from "@/lib/db/client";
import type { CategoryPoint } from "./types";

export function getSignupsByReferralSource(): CategoryPoint[] {
  return getDb()
    .prepare(
      `SELECT referral_source AS label, COUNT(*) AS value
       FROM students
       GROUP BY referral_source
       ORDER BY value DESC`
    )
    .all() as CategoryPoint[];
}

/** % of signups per referral source that are non-trial (active/inactive = converted). */
export function getConversionRateByReferralSource(): CategoryPoint[] {
  const rows = getDb()
    .prepare(
      `SELECT
         referral_source AS label,
         ROUND(100.0 * SUM(CASE WHEN status != 'trial' THEN 1 ELSE 0 END) / COUNT(*), 1) AS value
       FROM students
       GROUP BY referral_source
       ORDER BY value DESC`
    )
    .all() as CategoryPoint[];
  return rows;
}

export interface RetentionPoint {
  label: string; // "1 month", "3 months", "6 months"
  retentionRate: number;
  cohortSize: number;
}

/**
 * Simple retention view: of students who signed up at least N months ago,
 * what % are still status = 'active' today.
 */
export function getRetentionCohorts(now: Date = new Date()): RetentionPoint[] {
  const db = getDb();
  const windows = [
    { label: "1 month", months: 1 },
    { label: "3 months", months: 3 },
    { label: "6 months", months: 6 },
  ];

  return windows.map(({ label, months }) => {
    const cutoff = new Date(now);
    cutoff.setUTCMonth(cutoff.getUTCMonth() - months);
    const cutoffIso = cutoff.toISOString();

    const row = db
      .prepare(
        `SELECT
           COUNT(*) AS cohortSize,
           SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS activeCount
         FROM students
         WHERE signup_date <= ?`
      )
      .get(cutoffIso) as { cohortSize: number; activeCount: number };

    const retentionRate =
      row.cohortSize === 0 ? 0 : Number(((row.activeCount / row.cohortSize) * 100).toFixed(1));

    return { label, retentionRate, cohortSize: row.cohortSize };
  });
}
