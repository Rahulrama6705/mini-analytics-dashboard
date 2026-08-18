import { Pencil } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Read-only field row with a visibly disabled edit affordance. Editing is
 * intentionally not wired up yet — see README for why (risk of desyncing
 * from Stripe / the real backend that owns this data).
 */
export function FieldRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="flex items-center gap-2 font-medium">
        {value}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              disabled
              aria-label={`Edit ${label} (coming soon)`}
              className="cursor-not-allowed text-muted-foreground/40"
            >
              <Pencil className="h-3 w-3" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Editing coming soon</TooltipContent>
        </Tooltip>
      </span>
    </div>
  );
}
