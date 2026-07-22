import { Users, UserCheck, DollarSign, TrendingUp, TrendingDown } from "lucide-react";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { ChartCard } from "@/components/dashboard/chart-card";
import { TrendLineChart } from "@/components/dashboard/trend-line-chart";
import {
  getTotalStudents,
  getActiveStudentsCount,
  getMRR,
  getRevenueThisMonth,
  getChurnRate,
  getRevenueByMonth,
  getEnrollmentTrend,
} from "@/lib/data-sources";

export const dynamic = "force-dynamic";

const currencyFmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
const numberFmt = new Intl.NumberFormat("en-US");

export default async function OverviewPage() {
  const totalStudents = getTotalStudents();
  const activeStudents = getActiveStudentsCount();
  const mrr = getMRR();
  const revenueThisMonth = getRevenueThisMonth();
  const churnRate = getChurnRate();
  const revenueTrend = getRevenueByMonth(12);
  const enrollmentTrend = getEnrollmentTrend(12);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Overview</h1>
        <p className="text-sm text-muted-foreground">
          Snapshot of enrollment and revenue health across Coral Academy.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <KpiCard label="Total students" value={numberFmt.format(totalStudents)} icon={Users} />
        <KpiCard label="Active students" value={numberFmt.format(activeStudents)} icon={UserCheck} />
        <KpiCard label="MRR" value={currencyFmt.format(mrr)} icon={DollarSign} />
        <KpiCard label="Revenue this month" value={currencyFmt.format(revenueThisMonth)} icon={TrendingUp} />
        <KpiCard
          label="Churn rate"
          value={`${churnRate}%`}
          icon={TrendingDown}
          tone={churnRate > 15 ? "negative" : "neutral"}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Revenue trend (12 months)" isEmpty={revenueTrend.every((p) => p.value === 0)}>
          <TrendLineChart data={revenueTrend} valueFormat="currency" />
        </ChartCard>
        <ChartCard
          title="New enrollments (12 months)"
          isEmpty={enrollmentTrend.every((p) => p.value === 0)}
        >
          <TrendLineChart data={enrollmentTrend} valueFormat="number" />
        </ChartCard>
      </div>
    </div>
  );
}
