import { Megaphone } from "lucide-react";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { CampaignEnrollmentFiltersBar } from "@/components/dashboard/campaign-enrollment-filters";
import { CampaignEnrollmentsTable } from "@/components/dashboard/campaign-enrollments-table";
import { CsvExportButton } from "@/components/dashboard/csv-export-button";
import { getCampaignEnrollments } from "@/lib/data-sources";
import type { CampaignEnrollmentFilters } from "@/lib/data-sources/types";

export const dynamic = "force-dynamic";

export default async function MetaAdsEnrollmentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const from = sp.from || undefined;
  const to = sp.to || undefined;
  const page = sp.page ? Number(sp.page) : 1;

  const filters: CampaignEnrollmentFilters = { source: "meta_ads", from, to };

  const [enrollmentsResult, exportResult] = await Promise.all([
    getCampaignEnrollments({ ...filters, page, pageSize: 20 }),
    getCampaignEnrollments({ ...filters, page: 1, pageSize: 5000 }),
  ]);

  const urlParams = new URLSearchParams(
    Object.entries(sp).filter(([, v]) => v !== undefined) as [string, string][]
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Meta Ads enrollments</h1>
        <p className="text-sm text-muted-foreground">
          New enrollments from leads that signed up through Meta Ads campaigns. Set a date range to see how
          many enrolled from a particular period.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <KpiCard
          label="Meta Ads enrollments"
          value={String(enrollmentsResult.total)}
          icon={Megaphone}
          hint={from || to ? "Matching selected date range" : "All time"}
        />
      </div>

      <div className="flex flex-col gap-3 rounded-lg border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-medium">Enrollments</h2>
          <div className="flex items-center gap-2">
            <CampaignEnrollmentFiltersBar />
            <CsvExportButton
              filename="coral-academy-meta-ads-enrollments.csv"
              rows={exportResult.rows.map((r) => ({
                learner_name: r.learnerName,
                parent_name: r.parentName,
                parent_email: r.parentEmail ?? "",
                campaign_name: r.campaignName ?? "",
                enrollment_date: r.enrollmentDate ?? "",
                enrollment_status: r.enrollmentStatus,
                campaign_signup_date: r.campaignSignupAt ?? "",
              }))}
            />
          </div>
        </div>
        <CampaignEnrollmentsTable result={enrollmentsResult} basePath="/meta-ads-enrollments" params={urlParams} />
      </div>
    </div>
  );
}
