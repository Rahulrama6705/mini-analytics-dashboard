import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface KpiCardProps {
  label: string;
  value: string;
  icon?: LucideIcon;
  hint?: string;
  tone?: "neutral" | "positive" | "negative";
}

export function KpiCard({ label, value, icon: Icon, hint, tone = "neutral" }: KpiCardProps) {
  return (
    <Card className="gap-2 py-4">
      <CardHeader className="flex flex-row items-center justify-between px-4">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent className="px-4">
        <div className="text-2xl font-semibold tabular-nums tracking-tight">{value}</div>
        {hint && (
          <p
            className={cn(
              "mt-1 text-xs",
              tone === "positive" && "text-[var(--color-chart-3)]",
              tone === "negative" && "text-destructive",
              tone === "neutral" && "text-muted-foreground"
            )}
          >
            {hint}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function KpiCardSkeleton() {
  return (
    <Card className="gap-2 py-4">
      <CardHeader className="px-4">
        <Skeleton className="h-4 w-24" />
      </CardHeader>
      <CardContent className="px-4">
        <Skeleton className="h-7 w-20" />
      </CardContent>
    </Card>
  );
}
