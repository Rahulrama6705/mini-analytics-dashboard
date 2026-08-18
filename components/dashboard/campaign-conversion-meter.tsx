import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function CampaignConversionMeter({ enrolled, notEnrolled }: { enrolled: number; notEnrolled: number }) {
  const total = enrolled + notEnrolled;
  const pct = total > 0 ? Math.round((enrolled / total) * 100) : 0;

  return (
    <Card className="gap-2 py-4">
      <CardHeader className="flex flex-row items-center justify-between px-4">
        <span className="text-sm font-medium text-muted-foreground">Lead-to-enrollment conversion</span>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 px-4">
        <div className="text-2xl font-semibold tracking-tight">{total > 0 ? `${pct}%` : "—"}</div>
        <div
          role="meter"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Percentage of Meta Ads leads who enrolled"
          className="h-2 w-full overflow-hidden rounded-full"
          style={{ backgroundColor: "color-mix(in oklch, var(--color-chart-3) 18%, transparent)" }}
        >
          <div
            className="h-full rounded-full transition-[width]"
            style={{ width: `${pct}%`, backgroundColor: "var(--color-chart-3)" }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {total > 0 ? `${enrolled} enrolled of ${total} total leads` : "No Meta Ads leads yet"}
        </p>
      </CardContent>
    </Card>
  );
}
