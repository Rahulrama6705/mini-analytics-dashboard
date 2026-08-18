"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { refundStripePayment } from "@/lib/actions/stripe-refund-actions";
import type { StripeTransactionView } from "@/lib/stripe/payments-types";

const currencyFmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const dateTimeFmt = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" });

function fmtDateTime(v: string | null): string {
  return v ? dateTimeFmt.format(new Date(v)) : "—";
}

function FieldRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

export function RefundButton({ learnerId, transaction }: { learnerId: string; transaction: StripeTransactionView }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  function runRefund() {
    setActionError(null);
    startTransition(async () => {
      try {
        await refundStripePayment(learnerId, transaction.paymentIntentId!);
        router.refresh();
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Something went wrong calling Stripe.");
      }
    });
  }

  if (transaction.refund) {
    const refund = transaction.refund;
    return (
      <>
        <Button variant="outline" size="sm" onClick={() => setReceiptOpen(true)}>
          View Receipt
        </Button>
        <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Refund receipt</DialogTitle>
              <DialogDescription>Live snapshot from the real Stripe API and Supabase.</DialogDescription>
            </DialogHeader>
            <div className="rounded-lg border p-3">
              <FieldRow
                label="Status"
                value={
                  <Badge variant={refund.status === "refunded" ? "secondary" : "outline"}>{refund.status}</Badge>
                }
              />
              <FieldRow label="Refund amount" value={currencyFmt.format(refund.amountCents / 100)} />
              <FieldRow label="Refunded at" value={fmtDateTime(refund.refundedAt)} />
              <FieldRow
                label="Receipt"
                value={
                  refund.receiptUrl ? (
                    <a
                      href={refund.receiptUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary underline underline-offset-2"
                    >
                      Open receipt
                    </a>
                  ) : (
                    "—"
                  )
                }
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setReceiptOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  if (transaction.status !== "paid" || !transaction.paymentIntentId) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  return (
    <>
      <Button variant="outline" size="sm" disabled={isPending} onClick={() => setConfirmOpen(true)}>
        Refund Payment
      </Button>
      {actionError && <p className="mt-1 text-xs text-destructive">{actionError}</p>}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Refund this payment?</AlertDialogTitle>
            <AlertDialogDescription>
              This calls the real Stripe API to refund {currencyFmt.format(transaction.amountCents / 100)} for this
              transaction, and mirrors the refund into Supabase.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Keep payment</AlertDialogCancel>
            <AlertDialogAction disabled={isPending} onClick={runRefund}>
              Refund now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
