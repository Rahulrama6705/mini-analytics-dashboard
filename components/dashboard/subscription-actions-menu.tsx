"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  updateStripeSubscriptionPrice,
  scheduleStripeSubscriptionPause,
  resumeStripeSubscription,
  cancelStripeSubscription,
} from "@/lib/actions/stripe-subscription-actions";
import { STRIPE_PLAN_DISPLAY } from "@/lib/stripe/plans";
import type { StripePlanKey, StripeSubscriptionView } from "@/lib/stripe/payments-types";

const currencyFmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const dateTimeFmt = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" });

function fmtDateTime(v: string | null): string {
  return v ? dateTimeFmt.format(new Date(v)) : "—";
}

function inferPlanKey(weeklyPriceCents: number): StripePlanKey {
  return weeklyPriceCents >= STRIPE_PLAN_DISPLAY.coral_unlimited.weeklyPriceCents ? "coral_unlimited" : "coral_normal";
}

function toDateInputValue(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function ViewRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

export function SubscriptionActionsMenu({
  learnerId,
  subscription,
}: {
  learnerId: string;
  subscription: StripeSubscriptionView;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [updateOpen, setUpdateOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [pauseOpen, setPauseOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<StripePlanKey>(inferPlanKey(subscription.weeklyPriceCents));
  const [actionError, setActionError] = useState<string | null>(null);
  const [pauseFrom, setPauseFrom] = useState(() => toDateInputValue(new Date()));
  const [pauseTo, setPauseTo] = useState(() => toDateInputValue(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)));

  function run(action: () => Promise<void>) {
    setActionError(null);
    startTransition(async () => {
      try {
        await action();
        router.refresh();
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Something went wrong calling Stripe.");
      }
    });
  }

  const isCanceled = subscription.status === "canceled";
  const isPaused = subscription.isPaused;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7" disabled={isPending}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            disabled={isCanceled}
            onSelect={() => {
              setSelectedPlan(inferPlanKey(subscription.weeklyPriceCents));
              setUpdateOpen(true);
            }}
          >
            Update price
          </DropdownMenuItem>
          {isPaused ? (
            <DropdownMenuItem disabled={isCanceled} onSelect={() => run(() => resumeStripeSubscription(learnerId))}>
              Resume payment collection
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem disabled={isCanceled} onSelect={() => setPauseOpen(true)}>
              Pause payment collection
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setViewOpen(true)}>View subscription</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={isCanceled}
            variant="destructive"
            onSelect={() => setCancelOpen(true)}
          >
            Cancel subscription
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {actionError && (
        <p className="mt-1 text-right text-xs text-destructive">{actionError}</p>
      )}

      <Dialog open={updateOpen} onOpenChange={setUpdateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update price</DialogTitle>
            <DialogDescription>
              Switch this learner&apos;s plan in Stripe. This calls the real Stripe API and creates a prorated
              invoice, same as a real plan change.
            </DialogDescription>
          </DialogHeader>
          <Select value={selectedPlan} onValueChange={(v) => setSelectedPlan(v as StripePlanKey)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.entries(STRIPE_PLAN_DISPLAY) as [StripePlanKey, (typeof STRIPE_PLAN_DISPLAY)[StripePlanKey]][]).map(
                ([key, plan]) => (
                  <SelectItem key={key} value={key}>
                    {plan.name} — {currencyFmt.format(plan.weeklyPriceCents / 100)}/week
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpdateOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button
              disabled={isPending}
              onClick={() => {
                run(() => updateStripeSubscriptionPrice(learnerId, selectedPlan));
                setUpdateOpen(false);
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Subscription details</DialogTitle>
            <DialogDescription>Live snapshot from the real Stripe API.</DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border p-3">
            <ViewRow label="Learner ID" value={<code className="text-xs">{learnerId}</code>} />
            <ViewRow label="Stripe subscription" value={<code className="text-xs">{subscription.id}</code>} />
            <ViewRow label="Plan" value={subscription.planName} />
            <ViewRow label="Price" value={`${currencyFmt.format(subscription.weeklyPriceCents / 100)} / week`} />
            <ViewRow label="Status" value={subscription.status} />
            <ViewRow label="Active since" value={fmtDateTime(subscription.startedAt)} />
            <ViewRow label="Paused" value={isPaused ? `Yes, resumes ${fmtDateTime(subscription.pauseResumesAt)}` : "No"} />
            <ViewRow label="Canceled at" value={fmtDateTime(subscription.canceledAt)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={pauseOpen} onOpenChange={setPauseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pause this subscription</DialogTitle>
            <DialogDescription>
              Choose the pause window. If it starts today, Stripe pauses payment collection immediately and it&apos;s
              mirrored into Supabase. If it starts in the future, the window is recorded in Supabase now and applied
              to Stripe by a daily job on the start date. Resuming on the end date is handled the same way, by that
              same daily job — so it may take up to a day past the exact date to take effect.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pause-from">Pause from</Label>
              <Input
                id="pause-from"
                type="date"
                value={pauseFrom}
                min={toDateInputValue(new Date())}
                onChange={(e) => setPauseFrom(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pause-to">Resume on</Label>
              <Input
                id="pause-to"
                type="date"
                value={pauseTo}
                min={pauseFrom}
                onChange={(e) => setPauseTo(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPauseOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button
              disabled={isPending || pauseTo <= pauseFrom}
              onClick={() => {
                run(() => scheduleStripeSubscriptionPause(learnerId, pauseFrom, pauseTo));
                setPauseOpen(false);
              }}
            >
              Confirm pause
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              This calls the real Stripe API to cancel this learner&apos;s subscription effective now, and mirrors
              the change into Supabase.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Keep subscription</AlertDialogCancel>
            <AlertDialogAction disabled={isPending} onClick={() => run(() => cancelStripeSubscription(learnerId))}>
              Cancel now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
