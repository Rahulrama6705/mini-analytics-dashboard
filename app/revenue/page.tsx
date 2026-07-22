import { DollarSign, TrendingUp } from "lucide-react";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { ChartCard } from "@/components/dashboard/chart-card";
import { TrendLineChart } from "@/components/dashboard/trend-line-chart";
import { CategoryBarChart } from "@/components/dashboard/category-bar-chart";
import { RevenueTables } from "@/components/dashboard/revenue-tables";
import {
  getMRR,
  getRevenueThisMonth,
  getMRRTrend,
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
  const mrr = getMRR();
  const revenueThisMonth = getRevenueThisMonth();
  const mrrTrend = getMRRTrend(12);
  const revenueByCourse = getRevenueByCourse();
  const failedPayments = getFailedPayments();
  const refunds = getRefunds();
  const churnedSubscriptions = getChurnedSubscriptions();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Revenue</h1>
        <p className="text-sm text-muted-foreground">
          MRR, revenue mix, and billing exceptions for finance.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <KpiCard label="Current MRR" value={currencyFmt.format(mrr)} icon={DollarSign} />
        <KpiCard label="Revenue this month" value={currencyFmt.format(revenueThisMonth)} icon={TrendingUp} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="MRR trend (12 months)" isEmpty={mrrTrend.every((p) => p.value === 0)}>
          <TrendLineChart data={mrrTrend} valueFormat="currency" />
        </ChartCard>
        <ChartCard title="Revenue by course" isEmpty={revenueByCourse.length === 0}>
          <CategoryBarChart data={revenueByCourse} valueFormat="currency" layout="horizontal" />
        </ChartCard>
      </div>

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
