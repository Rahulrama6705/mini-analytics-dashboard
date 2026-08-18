import { DollarSign, TrendingUp } from "lucide-react";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { ChartCard } from "@/components/dashboard/chart-card";
import { TrendLineChart } from "@/components/dashboard/trend-line-chart";
import { CategoryBarChart } from "@/components/dashboard/category-bar-chart";
import { RevenueTables } from "@/components/dashboard/revenue-tables";
import {
  getOverviewStats,
  getMRRTrend,
  getRevenueByMonth,
  getRevenueByCourse,
  getFailedPayments,
  getRefunds,
  getChurnedSubscriptions,
} from "@/lib/data-sources";

export const dynamic = "force-dynamic";

const currencyFmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export default async function RevenuePage() {
  const [stats, mrrTrend, revenueTrend, revenueByCourse, failedPayments, refunds, churnedSubscriptions] =
    await Promise.all([
      getOverviewStats(),
      getMRRTrend(12),
      getRevenueByMonth(12),
      getRevenueByCourse(),
      getFailedPayments(),
      getRefunds(),
      getChurnedSubscriptions(),
    ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Revenue</h1>
        <p className="text-sm text-muted-foreground">
          MRR, revenue mix, and billing exceptions for finance.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <KpiCard
          label="Current Monthly Recurring Revenue (MRR)"
          value={currencyFmt.format(stats.mrr)}
          icon={DollarSign}
        />
        <KpiCard label="Revenue this month" value={currencyFmt.format(stats.revenueThisMonth)} icon={TrendingUp} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="MRR trend (12 months)" isEmpty={mrrTrend.every((p) => p.value === 0)}>
          <TrendLineChart data={mrrTrend} valueFormat="currency" />
        </ChartCard>
        <ChartCard title="Revenue trend (12 months)" isEmpty={revenueTrend.every((p) => p.value === 0)}>
          <TrendLineChart data={revenueTrend} valueFormat="currency" />
        </ChartCard>
      </div>

      <ChartCard title="Revenue by course" isEmpty={revenueByCourse.length === 0}>
        <CategoryBarChart data={revenueByCourse} valueFormat="currency" layout="horizontal" />
      </ChartCard>

      <div className="flex flex-col gap-3 rounded-lg border bg-card p-4">
        <h2 className="text-sm font-medium">Billing exceptions</h2>
        <RevenueTables
          failedPayments={failedPayments}
          refunds={refunds}
          churnedSubscriptions={churnedSubscriptions}
        />
      </div>
    </div>
  );
}
