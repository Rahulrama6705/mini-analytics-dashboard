import { UserPlus, CreditCard, Undo2 } from "lucide-react";
import type { RecentActivityItem } from "@/lib/data-sources/types";

const dateTimeFmt = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" });
const currencyFmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

const ICONS = { enrollment: UserPlus, payment: CreditCard, refund: Undo2 } as const;

export function RecentActivityFeed({ items }: { items: RecentActivityItem[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No recent activity.</p>;
  }

  return (
    <ul className="flex flex-col divide-y">
      {items.map((item, i) => {
        const Icon = ICONS[item.activityType];
        return (
          <li key={i} className="flex items-center gap-3 py-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
              <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{item.title}</p>
              <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p>
            </div>
            <div className="shrink-0 text-right">
              {item.amount != null && (
                <p className="text-sm tabular-nums font-medium">{currencyFmt.format(item.amount)}</p>
              )}
              <p className="text-xs text-muted-foreground">{dateTimeFmt.format(new Date(item.occurredAt))}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
