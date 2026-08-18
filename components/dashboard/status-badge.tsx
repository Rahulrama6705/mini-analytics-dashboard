// Shared status-color classes, applied to shadcn <Badge> elements across
// the dashboard (subscription/invoice status here, session status in
// daily-classes-view.tsx, at-risk status in at-risk-learners-table.tsx).
export const GOOD_CLASS =
  "border-transparent bg-[color-mix(in_oklch,var(--color-chart-3)_16%,transparent)] text-[var(--color-chart-3)]";
export const WARN_CLASS =
  "border-transparent bg-[color-mix(in_oklch,var(--color-chart-4)_18%,transparent)] text-[var(--color-chart-4)]";
export const BAD_CLASS =
  "border-transparent bg-[color-mix(in_oklch,var(--color-destructive)_14%,transparent)] text-destructive";
export const NEUTRAL_CLASS = "border-transparent bg-muted text-muted-foreground";
export const INFO_CLASS =
  "border-transparent bg-[color-mix(in_oklch,var(--color-chart-2)_16%,transparent)] text-[var(--color-chart-2)]";
