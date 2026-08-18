import { getSupabase } from "@/lib/supabase/server-client";
import type { CampaignEnrollmentFilters, CampaignEnrollmentRow, PaginatedResult, RetentionPoint } from "./types";

/** % of learners with an active subscription, among parents who signed up at least N months ago. */
export async function getRetentionCohorts(): Promise<RetentionPoint[]> {
  const { data, error } = await getSupabase().rpc("dashboard_retention_cohorts");
  if (error) throw error;
  return (data as { label: string; cohort_size: number; retention_rate: number }[]).map((r) => ({
    label: r.label,
    cohortSize: Number(r.cohort_size),
    retentionRate: Number(r.retention_rate),
  }));
}

interface CampaignEnrollmentRpcRow {
  enrollment_id: string;
  learner_id: string;
  learner_name: string | null;
  parent_name: string | null;
  parent_email: string | null;
  enrollment_status: string;
  enrollment_date: string | null;
  campaign_source: string;
  campaign_signup_at: string | null;
  campaign_key: string | null;
  landing_variant: string | null;
  total_count: number;
}

/**
 * Enrollments attributed to leads that signed up through an ad campaign (defaults to Meta Ads).
 * Depends on the `dashboard_campaign_enrollments` Postgres function — when pointing this app at a
 * different Supabase project (e.g. moving from pre-prod to prod), that function must exist there too.
 */
export async function getCampaignEnrollments(
  filters: CampaignEnrollmentFilters = {}
): Promise<PaginatedResult<CampaignEnrollmentRow>> {
  const { source = "meta_ads", page = 1, pageSize = 20 } = filters;

  const { data, error } = await getSupabase().rpc("dashboard_campaign_enrollments", {
    source_filter: source,
    from_date: filters.from ?? null,
    to_date: filters.to ?? null,
    page_num: page,
    page_size: pageSize,
  });
  if (error) throw error;

  const rows = (data as CampaignEnrollmentRpcRow[]).map((r) => ({
    enrollmentId: r.enrollment_id,
    learnerId: r.learner_id,
    learnerName: r.learner_name ?? "(unnamed learner)",
    parentName: r.parent_name ?? "(unknown parent)",
    parentEmail: r.parent_email,
    enrollmentStatus: r.enrollment_status,
    enrollmentDate: r.enrollment_date,
    campaignSource: r.campaign_source,
    campaignSignupAt: r.campaign_signup_at,
    campaignName: r.campaign_key,
    landingVariant: r.landing_variant,
  }));
  const total = (data as CampaignEnrollmentRpcRow[])[0]?.total_count ?? 0;

  return { rows, total, page, pageSize };
}
