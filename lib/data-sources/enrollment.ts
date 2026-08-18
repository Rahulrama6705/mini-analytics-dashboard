import { getSupabase } from "@/lib/supabase/server-client";
import type { AtRiskLearnerRow, CategoryPoint, MonthlyPoint, PaginatedResult, StudentFilters, StudentRow } from "./types";

// See lib/data-sources/overview.ts for why these call Postgres functions
// instead of joining/aggregating in JS.

interface StudentRpcRow {
  learner_id: string;
  name: string | null;
  parent_name: string | null;
  email: string | null;
  signup_date: string | null;
  has_active_subscription_out: boolean;
  total_count: number;
}

/** Paginated learner roster for the ops table. */
export async function getStudents(filters: StudentFilters = {}): Promise<PaginatedResult<StudentRow>> {
  const { page = 1, pageSize = 20, sortBy = "signupDate", sortDir = "desc" } = filters;

  const { data, error } = await getSupabase().rpc("dashboard_students", {
    has_active_subscription: filters.hasActiveSubscription ?? null,
    from_date: filters.from ?? null,
    to_date: filters.to ?? null,
    sort_by: sortBy,
    sort_dir: sortDir,
    page_num: page,
    page_size: pageSize,
  });
  if (error) throw error;

  const rows = (data as StudentRpcRow[]).map((r) => ({
    learnerId: r.learner_id,
    name: r.name ?? "(unnamed learner)",
    email: r.email,
    signupDate: r.signup_date,
    hasActiveSubscription: r.has_active_subscription_out,
    parentName: r.parent_name ?? "(unknown parent)",
  }));
  const total = (data as StudentRpcRow[])[0]?.total_count ?? 0;

  return { rows, total, page, pageSize };
}

export async function getEnrollmentsByCourse(): Promise<CategoryPoint[]> {
  const { data, error } = await getSupabase().rpc("dashboard_enrollments_by_course", { result_limit: 15 });
  if (error) throw error;
  return (data as { label: string; value: number }[]).map((r) => ({ label: r.label, value: Number(r.value) }));
}

export async function getSignupsOverTime(months = 12): Promise<MonthlyPoint[]> {
  const { data, error } = await getSupabase().rpc("dashboard_signups_over_time", { months_back: months });
  if (error) throw error;
  return (data as { month: string; value: number }[]).map((r) => ({ month: r.month, value: Number(r.value) }));
}

export async function getTrialToPaidConversionRate(): Promise<number> {
  const { data, error } = await getSupabase().rpc("dashboard_trial_to_paid_rate");
  if (error) throw error;
  return Number(data);
}

export async function getLearnersAtRisk(inactivityDays = 14, limit = 50): Promise<AtRiskLearnerRow[]> {
  const { data, error } = await getSupabase().rpc("dashboard_learners_at_risk", {
    inactivity_days: inactivityDays,
    result_limit: limit,
  });
  if (error) throw error;
  return (
    data as {
      learner_id: string;
      learner_name: string | null;
      is_temporarily_inactive: boolean;
      last_active_at: string | null;
      days_inactive: number | null;
      active_enrollment_count: number;
    }[]
  ).map((r) => ({
    learnerId: r.learner_id,
    learnerName: r.learner_name ?? "(unnamed learner)",
    isTemporarilyInactive: r.is_temporarily_inactive,
    lastActiveAt: r.last_active_at,
    daysInactive: r.days_inactive,
    activeEnrollmentCount: Number(r.active_enrollment_count),
  }));
}
