import { GraduationCap, TrendingUp } from "lucide-react";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { ChartCard } from "@/components/dashboard/chart-card";
import { TrendLineChart } from "@/components/dashboard/trend-line-chart";
import { CategoryBarChart } from "@/components/dashboard/category-bar-chart";
import { StudentFiltersBar } from "@/components/dashboard/student-filters";
import { StudentsTable } from "@/components/dashboard/students-table";
import { CsvExportButton } from "@/components/dashboard/csv-export-button";
import {
  getStudents,
  getEnrollmentsByCourse,
  getSignupsOverTime,
  getTrialToPaidConversionRate,
  getCourseOptions,
  getReferralSourceOptions,
} from "@/lib/data-sources";
import type { StudentSortField, SortDirection } from "@/lib/data-sources/types";

export const dynamic = "force-dynamic";

const SORT_FIELDS: StudentSortField[] = ["name", "signup_date", "status"];

export default async function EnrollmentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const status = (sp.status as "active" | "inactive" | "trial" | undefined) || undefined;
  const courseId = sp.courseId || undefined;
  const referralSource = sp.referralSource || undefined;
  const from = sp.from || undefined;
  const to = sp.to || undefined;
  const page = sp.page ? Number(sp.page) : 1;
  const sortBy: StudentSortField = SORT_FIELDS.includes(sp.sortBy as StudentSortField)
    ? (sp.sortBy as StudentSortField)
    : "signup_date";
  const sortDir: SortDirection = sp.sortDir === "asc" ? "asc" : "desc";

  const filters = { status, courseId, referralSource, from, to, sortBy, sortDir };

  const studentsResult = getStudents({ ...filters, page, pageSize: 20 });
  const exportResult = getStudents({ ...filters, page: 1, pageSize: 5000 });
  const enrollmentsByCourse = getEnrollmentsByCourse();
  const signupsOverTime = getSignupsOverTime(12);
  const conversionRate = getTrialToPaidConversionRate();
  const courses = getCourseOptions();
  const referralSources = getReferralSourceOptions();

  const urlParams = new URLSearchParams(
    Object.entries(sp).filter(([, v]) => v !== undefined) as [string, string][]
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Enrollment</h1>
        <p className="text-sm text-muted-foreground">
          Roster, signups, and course enrollment trends for the ops team.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <KpiCard label="Trial-to-paid conversion" value={`${conversionRate}%`} icon={TrendingUp} />
        <KpiCard
          label="Students shown"
          value={String(studentsResult.total)}
          icon={GraduationCap}
          hint="Matching current filters"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard
          title="Enrollments by course"
          isEmpty={enrollmentsByCourse.length === 0}
        >
          <CategoryBarChart data={enrollmentsByCourse} layout="horizontal" />
        </ChartCard>
        <ChartCard title="Signups over time (12 months)" isEmpty={signupsOverTime.every((p) => p.value === 0)}>
          <TrendLineChart data={signupsOverTime} valueFormat="number" />
        </ChartCard>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-medium">Student roster</h2>
          <div className="flex items-center gap-2">
            <StudentFiltersBar courses={courses} referralSources={referralSources} />
            <CsvExportButton
              filename="coral-academy-students.csv"
              rows={exportResult.rows.map((r) => ({
                name: r.name,
                email: r.email,
                course: r.course_name,
                signup_date: r.signup_date,
                status: r.status,
                referral_source: r.referral_source,
              }))}
            />
          </div>
        </div>
        <StudentsTable
          result={studentsResult}
          basePath="/enrollment"
          params={urlParams}
          sortBy={sortBy}
          sortDir={sortDir}
        />
      </div>
    </div>
  );
}
