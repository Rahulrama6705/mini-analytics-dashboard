import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SubscriptionActionsMenu } from "@/components/dashboard/subscription-actions-menu";
import { RefundButton } from "@/components/dashboard/refund-button";
import { GOOD_CLASS, WARN_CLASS, BAD_CLASS, NEUTRAL_CLASS, INFO_CLASS } from "@/components/dashboard/status-badge";
import { CircleCheck } from "lucide-react";
import type { StripePaymentsForLearner } from "@/lib/stripe/payments-types";

const dateFmt = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });
const dateTimeFmt = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" });
const currencyFmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function fmtDate(v: string | null): string {
  return v ? dateFmt.format(new Date(v)) : "—";
}

function PlanRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function subscriptionStatusClass(status: string, isPaused: boolean): string {
  if (isPaused) return WARN_CLASS;
  if (status === "active" || status === "trialing") return GOOD_CLASS;
  if (status === "past_due" || status === "incomplete") return WARN_CLASS;
  if (status === "canceled" || status === "incomplete_expired" || status === "unpaid") return NEUTRAL_CLASS;
  return NEUTRAL_CLASS;
}

function invoiceStatusClass(status: string): string {
  if (status === "refunded") return INFO_CLASS;
  if (status === "paid") return GOOD_CLASS;
  if (status === "open" || status === "draft") return WARN_CLASS;
  if (status === "uncollectible") return BAD_CLASS;
  if (status === "void") return NEUTRAL_CLASS;
  return NEUTRAL_CLASS;
}

export function CustomerPaymentsView({
  learnerId,
  payments,
}: {
  learnerId: string;
  payments: StripePaymentsForLearner;
}) {
  const { customerId, subscription, transactions } = payments;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-2 rounded-lg border border-dashed border-emerald-500/40 bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-400">
        <CircleCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <p>
          Live Stripe test mode — this plan and transaction history is read directly from your Stripe test account
          and updates it in real time. Refunds are also mirrored into Supabase.
        </p>
      </div>

      <Card className="py-4">
        <CardHeader className="px-4">
          <CardTitle className="text-base">Plan</CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          {subscription ? (
            <div className="rounded-lg border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium">{subscription.planName}</span>
                <div className="flex items-center gap-2">
                  {subscription.isPaused && <Badge variant="secondary">paused</Badge>}
                  <Badge className={subscriptionStatusClass(subscription.status, subscription.isPaused)}>
                    {subscription.status.replaceAll("_", " ")}
                  </Badge>
                  <SubscriptionActionsMenu learnerId={learnerId} subscription={subscription} />
                </div>
              </div>
              <div className="mt-2 grid grid-cols-1 gap-x-8 sm:grid-cols-2">
                <div>
                  <PlanRow label="Price" value={`${currencyFmt.format(subscription.weeklyPriceCents / 100)} / week`} />
                  <PlanRow label="Active since" value={fmtDate(subscription.startedAt)} />
                  <PlanRow label="Current period ends" value={fmtDate(subscription.currentPeriodEnd)} />
                </div>
                <div>
                  <PlanRow
                    label="Paused"
                    value={subscription.isPaused ? `Yes, resumes ${fmtDate(subscription.pauseResumesAt)}` : "No"}
                  />
                  <PlanRow label="Canceled" value={fmtDate(subscription.canceledAt)} />
                  <PlanRow label="Stripe customer" value={<code className="text-xs">{customerId ?? "—"}</code>} />
                  <PlanRow label="Stripe subscription" value={<code className="text-xs">{subscription.id}</code>} />
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No Stripe test customer for this learner yet — run <code>npm run stripe:seed-customers</code>.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="py-4">
        <CardHeader className="px-4">
          <CardTitle className="text-base">Transaction history</CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No transactions on file.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>IDs</TableHead>
                    <TableHead>Refund</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((t) => {
                    const displayStatus = t.refund?.status === "refunded" ? "refunded" : t.status;
                    return (
                      <TableRow key={t.id}>
                        <TableCell className="tabular-nums text-muted-foreground">
                          {dateTimeFmt.format(new Date(t.createdAt))}
                        </TableCell>
                        <TableCell>{t.description}</TableCell>
                        <TableCell className="tabular-nums">{currencyFmt.format(t.amountCents / 100)}</TableCell>
                        <TableCell>
                          <Badge className={invoiceStatusClass(displayStatus)}>{displayStatus}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-0.5 text-[11px] leading-tight text-muted-foreground">
                            <span>
                              inv: <code>{t.id || "—"}</code>
                            </span>
                            <span>
                              charge: <code>{t.chargeId ?? "—"}</code>
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <RefundButton learnerId={learnerId} transaction={t} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
