import { KpiCardSkeleton } from "@/components/dashboard/kpi-card";
import { ChartCardSkeleton } from "@/components/dashboard/chart-card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <KpiCardSkeleton />
        <KpiCardSkeleton />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCardSkeleton title="Loading..." />
        <ChartCardSkeleton title="Loading..." />
      </div>
      <Skeleton className="h-72 w-full" />
    </div>
  );
}
