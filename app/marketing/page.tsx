import { ChartCard } from "@/components/dashboard/chart-card";
import { RetentionBars } from "@/components/dashboard/retention-bars";
import { getRetentionCohorts } from "@/lib/data-sources";

export const dynamic = "force-dynamic";

export default async function MarketingPage() {
  const retentionCohorts = await getRetentionCohorts();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Marketing</h1>
        <p className="text-sm text-muted-foreground">How long signed-up families stick around.</p>
      </div>

      <ChartCard title="Retention" isEmpty={retentionCohorts.length === 0}>
        <RetentionBars data={retentionCohorts} />
      </ChartCard>
    </div>
  );
}
