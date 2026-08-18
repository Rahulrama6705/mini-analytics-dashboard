import type { RetentionPoint } from "@/lib/data-sources/types";

export function RetentionBars({ data }: { data: RetentionPoint[] }) {
  return (
    <div className="flex flex-col gap-4">
      {data.map((point) => (
        <div key={point.label} className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-medium">Active after {point.label}</span>
            <span className="text-muted-foreground">
              {point.retentionRate}%{" "}
              <span className="text-xs">(n={point.cohortSize})</span>
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-[var(--color-chart-1)]"
              style={{ width: `${Math.min(100, point.retentionRate)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
