import { getSupabase } from "@/lib/supabase/server-client";
import type { MonthlyPoint, TodaysSessionRow, QuickStats, RecentActivityItem } from "./types";

// These KPIs and trends are computed by Postgres functions (see the
// `dashboard_*` migration) rather than joined/aggregated here in JS.
// At this data scale (thousands of learners, tens of thousands of
// payment records), pulling full tables into the app and building
// client-side `.in()` ID-list filters blows past PostgREST's request
// size limits — the aggregation has to happen in SQL.

interface OverviewStatsRow {
  total_students: number;
  active_students: number;
  mrr: string;
  revenue_this_month: string;
  churn_rate: string;
}

export interface OverviewStats {
  totalStudents: number;
  activeStudents: number;
  mrr: number;
  revenueThisMonth: number;
  churnRate: number;
}

export async function getOverviewStats(): Promise<OverviewStats> {
  const { data, error } = await getSupabase().rpc("dashboard_overview_stats");
  if (error) throw error;
  const row = (data as OverviewStatsRow[])[0];
  return {
    totalStudents: Number(row.total_students),
    activeStudents: Number(row.active_students),
    mrr: Number(row.mrr),
    revenueThisMonth: Number(row.revenue_this_month),
    churnRate: Number(row.churn_rate),
  };
}

export async function getRevenueByMonth(months = 12): Promise<MonthlyPoint[]> {
  const { data, error } = await getSupabase().rpc("dashboard_revenue_by_month", { months_back: months });
  if (error) throw error;
  return (data as { month: string; value: number }[]).map((r) => ({ month: r.month, value: Number(r.value) }));
}

export async function getEnrollmentTrend(months = 12): Promise<MonthlyPoint[]> {
  const { data, error } = await getSupabase().rpc("dashboard_enrollment_trend", { months_back: months });
  if (error) throw error;
  return (data as { month: string; value: number }[]).map((r) => ({ month: r.month, value: Number(r.value) }));
}

export async function getTodaysSessions(): Promise<TodaysSessionRow[]> {
  const { data, error } = await getSupabase().rpc("dashboard_todays_sessions");
  if (error) throw error;
  return (
    data as {
      session_id: string;
      class_id: string;
      class_title: string | null;
      class_category: string | null;
      teacher_name: string | null;
      start_timestamp: string;
      end_timestamp: string;
      status: TodaysSessionRow["status"];
      learner_count: number;
      learners: { learner_id: string; learner_name: string | null }[];
    }[]
  ).map((r) => ({
    sessionId: r.session_id,
    classId: r.class_id,
    classTitle: r.class_title ?? "(unnamed class)",
    classCategory: r.class_category ?? "General",
    teacherName: r.teacher_name ?? "(unassigned teacher)",
    startTimestamp: r.start_timestamp,
    endTimestamp: r.end_timestamp,
    status: r.status,
    learnerCount: Number(r.learner_count),
    learners: r.learners.map((l) => ({ learnerId: l.learner_id, learnerName: l.learner_name ?? "(unnamed learner)" })),
  }));
}

export async function getQuickStats(): Promise<QuickStats> {
  const { data, error } = await getSupabase().rpc("dashboard_quick_stats");
  if (error) throw error;
  const row = (
    data as {
      today_revenue: number;
      active_subscriptions: number;
      learners_enrolled_today: number;
      failed_payments_count: number;
    }[]
  )[0];
  return {
    todayRevenue: Number(row.today_revenue),
    activeSubscriptions: Number(row.active_subscriptions),
    learnersEnrolledToday: Number(row.learners_enrolled_today),
    failedPaymentsCount: Number(row.failed_payments_count),
  };
}

export async function getRecentActivity(limit = 20): Promise<RecentActivityItem[]> {
  const { data, error } = await getSupabase().rpc("dashboard_recent_activity", { result_limit: limit });
  if (error) throw error;
  return (
    data as {
      activity_type: RecentActivityItem["activityType"];
      occurred_at: string;
      title: string | null;
      subtitle: string | null;
      amount: number | null;
    }[]
  ).map((r) => ({
    activityType: r.activity_type,
    occurredAt: r.occurred_at,
    title: r.title ?? "(unknown)",
    subtitle: r.subtitle ?? "",
    amount: r.amount != null ? Number(r.amount) : null,
  }));
}
