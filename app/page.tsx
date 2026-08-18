import { Users, UserCheck, DollarSign, TrendingUp, TrendingDown, Wallet, AlertTriangle } from "lucide-react";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { ChartCard } from "@/components/dashboard/chart-card";
import { TrendLineChart } from "@/components/dashboard/trend-line-chart";
import { CategoryBarChart } from "@/components/dashboard/category-bar-chart";
import { RecentActivityFeed } from "@/components/dashboard/recent-activity-feed";
import {
  getOverviewStats,
  getEnrollmentTrend,
  getEnrollmentsByCourse,
  getQuickStats,
  getRecentActivity,
} from "@/lib/data-sources";

export const dynamic = "force-dynamic";

const currencyFmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
const numberFmt = new Intl.NumberFormat("en-US");

export default async function OverviewPage() {
  const [stats, enrollmentTrend, topClasses, quickStats, recentActivity] = await Promise.all([
    getOverviewStats(),
    getEnrollmentTrend(12),
    getEnrollmentsByCourse(),
    getQuickStats(),
    getRecentActivity(10),
  ]);
  const top5Classes = topClasses.slice(0, 5);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Overview</h1>
        <p className="text-sm text-muted-foreground">
          Snapshot of enrollment and revenue health across Coral Academy.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <KpiCard label="Total students" value={numberFmt.format(stats.totalStudents)} icon={Users} />
        <KpiCard label="Active students" value={numberFmt.format(stats.activeStudents)} icon={UserCheck} />
        <KpiCard label="Monthly Recurring Revenue (MRR)" value={currencyFmt.format(stats.mrr)} icon={DollarSign} />
        <KpiCard label="Revenue this month" value={currencyFmt.format(stats.revenueThisMonth)} icon={TrendingUp} />
        <KpiCard
          label="Churn rate"
          value={`${stats.churnRate}%`}
          icon={TrendingDown}
          tone={stats.churnRate > 15 ? "negative" : "neutral"}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="New enrollments (12 months)" isEmpty={enrollmentTrend.every((p) => p.value === 0)}>
          <TrendLineChart data={enrollmentTrend} valueFormat="number" />
        </ChartCard>
        <ChartCard title="Top classes" isEmpty={top5Classes.length === 0}>
          <CategoryBarChart data={top5Classes} layout="horizontal" />
        </ChartCard>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Today</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiCard label="Revenue today" value={currencyFmt.format(quickStats.todayRevenue)} icon={Wallet} />
          <KpiCard label="Active subscriptions" value={numberFmt.format(quickStats.activeSubscriptions)} icon={Users} />
          <KpiCard
            label="Learners enrolled today"
            value={numberFmt.format(quickStats.learnersEnrolledToday)}
            icon={UserCheck}
          />
          <KpiCard
            label="Failed payments (7d)"
            value={numberFmt.format(quickStats.failedPaymentsCount)}
            icon={AlertTriangle}
            tone={quickStats.failedPaymentsCount > 0 ? "negative" : "neutral"}
          />
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <h2 className="mb-1 text-sm font-medium">Recent activity</h2>
        <RecentActivityFeed items={recentActivity} />
      </div>
    </div>
  );
}
