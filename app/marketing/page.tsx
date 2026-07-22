import { ChartCard } from "@/components/dashboard/chart-card";
import { CategoryBarChart } from "@/components/dashboard/category-bar-chart";
import { RetentionBars } from "@/components/dashboard/retention-bars";
import {
  getSignupsByReferralSource,
  getConversionRateByReferralSource,
  getRetentionCohorts,
} from "@/lib/data-sources";

export const dynamic = "force-dynamic";

export default async function MarketingPage() {
  const signupsBySource = getSignupsByReferralSource();
  const conversionBySource = getConversionRateByReferralSource();
  const retentionCohorts = getRetentionCohorts();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Marketing</h1>
        <p className="text-sm text-muted-foreground">
          Where signups come from, how well they convert, and how long they stick around.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Signups by referral source" isEmpty={signupsBySource.length === 0}>
          <CategoryBarChart data={signupsBySource} layout="horizontal" />
        </ChartCard>
        <ChartCard title="Conversion rate by referral source" isEmpty={conversionBySource.length === 0}>
          <CategoryBarChart data={conversionBySource} valueFormat="percent" layout="horizontal" />
        </ChartCard>
      </div>

      <ChartCard title="Retention" isEmpty={retentionCohorts.length === 0}>
        <RetentionBars data={retentionCohorts} />
      </ChartCard>
    </div>
  );
}
