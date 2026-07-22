import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface ChartCardProps {
  title: string;
  filter?: ReactNode;
  children: ReactNode;
  isEmpty?: boolean;
  emptyMessage?: string;
}

export function ChartCard({
  title,
  filter,
  children,
  isEmpty,
  emptyMessage = "No data for this range yet.",
}: ChartCardProps) {
  return (
    <Card className="py-4">
      <CardHeader className="flex flex-row items-center justify-between gap-2 px-4">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {filter}
      </CardHeader>
      <CardContent className="px-4">
        {isEmpty ? (
          <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
            {emptyMessage}
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}

export function ChartCardSkeleton({ title }: { title: string }) {
  return (
    <Card className="py-4">
      <CardHeader className="px-4">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <Skeleton className="h-[240px] w-full" />
      </CardContent>
    </Card>
  );
}
