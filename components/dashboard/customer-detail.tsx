import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FieldRow } from "@/components/dashboard/field-row";
import { SessionHistoryTable } from "@/components/dashboard/session-history-table";
import type { CustomerDetail } from "@/lib/data-sources/types";

const dateFmt = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });
const dateTimeFmt = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" });
const currencyFmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function fmtDate(v: string | null): string {
  return v ? dateFmt.format(new Date(v)) : "—";
}

const ACTIVE_STATUSES = new Set(["active", "active_payment_failure", "active_waiting_for_payment"]);
const CANCELED_STATUSES = new Set(["canceled", "canceled_waiting_for_expiration"]);

function statusBadgeClass(status: string): string {
  if (ACTIVE_STATUSES.has(status)) {
    return "border-transparent bg-[color-mix(in_oklch,var(--color-chart-3)_16%,transparent)] text-[var(--color-chart-3)]";
  }
  if (CANCELED_STATUSES.has(status)) {
    return "border-transparent bg-muted text-muted-foreground";
  }
  return "border-transparent bg-[color-mix(in_oklch,var(--color-chart-4)_18%,transparent)] text-[var(--color-chart-4)]";
}

export function CustomerDetailView({ customer }: { customer: CustomerDetail }) {
  return (
    <div className="flex flex-col gap-4">
      <Card className="py-4">
        <CardHeader className="px-4">
          <CardTitle className="text-base">{customer.learnerName}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-x-8 px-4 sm:grid-cols-2">
          <div>
            <FieldRow label="Date of birth" value={fmtDate(customer.dob)} />
            <FieldRow label="Learner ID" value={<code className="text-xs">{customer.learnerId}</code>} />
          </div>
          <div>
            <FieldRow label="Parent" value={customer.parentName} />
            <FieldRow label="Parent email" value={customer.parentEmail ?? "—"} />
            <FieldRow label="Parent phone" value={customer.parentPhone ?? "—"} />
            <FieldRow label="Parent signed up" value={fmtDate(customer.parentSignupDate)} />
            <FieldRow label="Stripe customer" value={<code className="text-xs">{customer.stripeCustomerId ?? "—"}</code>} />
          </div>
        </CardContent>
      </Card>

      <Card className="py-4">
        <CardHeader className="px-4">
          <CardTitle className="text-base">Subscriptions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 px-4">
          {customer.subscriptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No subscriptions on file.</p>
          ) : (
            customer.subscriptions.map((s) => {
              const isPaused = Boolean(s.pauseStartDate);
              return (
                <div key={s.id} className="rounded-lg border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-medium">{s.subscriptionType}</span>
                    <div className="flex items-center gap-2">
                      {isPaused && <Badge variant="secondary">paused</Badge>}
                      <Badge className={statusBadgeClass(s.status)}>{s.status.replaceAll("_", " ")}</Badge>
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-1 gap-x-8 sm:grid-cols-2">
                    <div>
                      <FieldRow label="Active since" value={fmtDate(s.subscribedAt)} />
                      <FieldRow label="Renews" value={fmtDate(s.renewalAt)} />
                      <FieldRow label="Expires" value={fmtDate(s.expiryAt)} />
                    </div>
                    <div>
                      <FieldRow
                        label="Paused"
                        value={isPaused ? `${fmtDate(s.pauseStartDate)} → ${fmtDate(s.pauseEndDate)}` : "No"}
                      />
                      <FieldRow label="Canceled" value={fmtDate(s.canceledAt)} />
                      <FieldRow
                        label="Price"
                        value={
                          s.lastPaidAmount != null
                            ? `${currencyFmt.format(s.lastPaidAmount)} / cycle`
                            : "No paid invoice yet"
                        }
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card className="py-4">
        <CardHeader className="px-4">
          <CardTitle className="text-base">Courses</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 px-4">
          {customer.courses.length === 0 ? (
            <p className="text-sm text-muted-foreground">No enrollments on file.</p>
          ) : (
            customer.courses.map((c) => (
              <div key={c.enrollmentId} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                <div>
                  <p className="font-medium">{c.className}</p>
                  <p className="text-xs text-muted-foreground">
                    {fmtDate(c.startTimestamp)} – {fmtDate(c.endTimestamp)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {c.pricePerSession != null && (
                    <span className="text-muted-foreground">{currencyFmt.format(c.pricePerSession)}/session</span>
                  )}
                  <Badge variant="secondary">{c.enrollmentStatus}</Badge>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="py-4">
        <CardHeader className="px-4">
          <CardTitle className="text-base">One-off purchases</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 px-4">
          {customer.purchases.length === 0 ? (
            <p className="text-sm text-muted-foreground">No one-off purchases on file.</p>
          ) : (
            customer.purchases.map((p) => (
              <div key={p.purchaseId} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                <div>
                  <p className="font-medium">{p.className ?? "(unknown class)"}</p>
                  <p className="text-xs text-muted-foreground">
                    Purchased {fmtDate(p.purchasedAt)}
                    {p.refundedAt && ` · Refunded ${fmtDate(p.refundedAt)}`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {p.amount != null && <span className="text-muted-foreground">{currencyFmt.format(p.amount)}</span>}
                  <Badge variant="secondary">{p.status}</Badge>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="py-4">
        <CardHeader className="px-4">
          <CardTitle className="text-base">Session history</CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          <SessionHistoryTable sessions={customer.sessionHistory} />
        </CardContent>
      </Card>

      <Card className="py-4">
        <CardHeader className="px-4">
          <CardTitle className="text-base">Billing history</CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          {customer.invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground">No invoices on file.</p>
          ) : (
            <div className="flex flex-col divide-y">
              {customer.invoices.map((i) => (
                <div key={i.invoiceId} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <p>{i.billingReason?.replaceAll("_", " ") ?? "invoice"}</p>
                    <p className="text-xs text-muted-foreground">{dateTimeFmt.format(new Date(i.createdAt))}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="tabular-nums">{currencyFmt.format(i.amountPaid)}</span>
                    <Badge variant="secondary">{i.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
