import { Megaphone, UserX } from "lucide-react";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { CampaignConversionMeter } from "@/components/dashboard/campaign-conversion-meter";
import { CampaignEnrollmentFiltersBar } from "@/components/dashboard/campaign-enrollment-filters";
import { CampaignEnrollmentsTable } from "@/components/dashboard/campaign-enrollments-table";
import { CampaignLeadsTable } from "@/components/dashboard/campaign-leads-table";
import { CampaignViewTabs } from "@/components/dashboard/campaign-view-tabs";
import { CsvExportButton } from "@/components/dashboard/csv-export-button";
import { getCampaignEnrollments, getCampaignLeadsWithoutEnrollment } from "@/lib/data-sources";
import type { CampaignEnrollmentFilters, CampaignLeadFilters } from "@/lib/data-sources/types";

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
  const view = sp.view === "leads" ? "leads" : "enrolled";

  const enrollmentFilters: CampaignEnrollmentFilters = { source: "meta_ads", from, to };
  const leadFilters: CampaignLeadFilters = { source: "meta_ads", from, to };

  const [enrollmentsResult, leadsResult, enrollmentsExport, leadsExport] = await Promise.all([
    getCampaignEnrollments({ ...enrollmentFilters, page: view === "enrolled" ? page : 1, pageSize: 20 }),
    getCampaignLeadsWithoutEnrollment({ ...leadFilters, page: view === "leads" ? page : 1, pageSize: 20 }),
    getCampaignEnrollments({ ...enrollmentFilters, page: 1, pageSize: 5000 }),
    getCampaignLeadsWithoutEnrollment({ ...leadFilters, page: 1, pageSize: 5000 }),
  ]);

  const urlParams = new URLSearchParams(
    Object.entries(sp).filter(([, v]) => v !== undefined) as [string, string][]
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Meta Ads enrollments</h1>
        <p className="text-sm text-muted-foreground">
          Leads that signed up through Meta Ads campaigns, split by whether they went on to enroll a
          learner. Set a date range to see either group for a particular period.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          label="Clicked ad & enrolled"
          value={String(enrollmentsResult.total)}
          icon={Megaphone}
          hint={from || to ? "Matching selected date range" : "All time"}
        />
        <KpiCard
          label="Clicked ad, not enrolled"
          value={String(leadsResult.total)}
          icon={UserX}
          hint={from || to ? "Matching selected date range" : "All time"}
        />
        <CampaignConversionMeter enrolled={enrollmentsResult.total} notEnrolled={leadsResult.total} />
      </div>

      <div className="flex flex-col gap-3 rounded-lg border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CampaignViewTabs enrolledCount={enrollmentsResult.total} leadsCount={leadsResult.total} />
          <div className="flex items-center gap-2">
            <CampaignEnrollmentFiltersBar />
            {view === "enrolled" ? (
              <CsvExportButton
                filename="coral-academy-meta-ads-enrollments.csv"
                rows={enrollmentsExport.rows.map((r) => ({
                  learner_name: r.learnerName,
                  parent_name: r.parentName,
                  parent_email: r.parentEmail ?? "",
                  campaign_name: r.campaignName ?? "",
                  enrollment_date: r.enrollmentDate ?? "",
                  enrollment_status: r.enrollmentStatus,
                  campaign_signup_date: r.campaignSignupAt ?? "",
                }))}
              />
            ) : (
              <CsvExportButton
                filename="coral-academy-meta-ads-unenrolled-leads.csv"
                rows={leadsExport.rows.map((r) => ({
                  parent_name: r.parentName,
                  parent_email: r.parentEmail ?? "",
                  campaign_name: r.campaignName ?? "",
                  campaign_signup_date: r.campaignSignupAt ?? "",
                }))}
              />
            )}
          </div>
        </div>
        {view === "enrolled" ? (
          <CampaignEnrollmentsTable result={enrollmentsResult} basePath="/meta-ads-enrollments" params={urlParams} />
        ) : (
          <CampaignLeadsTable result={leadsResult} basePath="/meta-ads-enrollments" params={urlParams} />
        )}
      </div>
    </div>
  );
}
