"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CsvExportButton } from "@/components/dashboard/csv-export-button";
import type { ChurnedSubscriptionRow, FailedPayment, RefundRow } from "@/lib/data-sources/types";

const dateFmt = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });
const currencyFmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function EmptyRow({ colSpan, message }: { colSpan: number; message: string }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="h-24 text-center text-sm text-muted-foreground">
        {message}
      </TableCell>
    </TableRow>
  );
}

export function RevenueTables({
  failedPayments,
  refunds,
  churnedSubscriptions,
}: {
  failedPayments: FailedPayment[];
  refunds: RefundRow[];
  churnedSubscriptions: ChurnedSubscriptionRow[];
}) {
  return (
    <Tabs defaultValue="failed" className="gap-3">
      <TabsList>
        <TabsTrigger value="failed">Failed payments ({failedPayments.length})</TabsTrigger>
        <TabsTrigger value="refunds">Refunds ({refunds.length})</TabsTrigger>
        <TabsTrigger value="churned">Churned subscriptions ({churnedSubscriptions.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="failed">
        <div className="mb-2 flex justify-end">
          <CsvExportButton
            filename="coral-academy-failed-payments.csv"
            rows={failedPayments.map((c) => ({
              learner: c.learnerName,
              failure_reason: c.failureReason ?? "",
              date: c.createdAt,
            }))}
          />
        </div>
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Learner</TableHead>
                <TableHead>Failure reason</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {failedPayments.length === 0 ? (
                <EmptyRow colSpan={3} message="No failed payments in this window." />
              ) : (
                failedPayments.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.learnerName}</TableCell>
                    <TableCell className="text-muted-foreground">{c.failureReason ?? "—"}</TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {dateFmt.format(new Date(c.createdAt))}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      <TabsContent value="refunds">
        <div className="mb-2 flex justify-end">
          <CsvExportButton
            filename="coral-academy-refunds.csv"
            rows={refunds.map((r) => ({
              parent: r.parentName,
              course: r.courseName,
              amount: r.amount,
              date: r.refundedAt,
              source: r.source,
            }))}
          />
        </div>
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Parent</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {refunds.length === 0 ? (
                <EmptyRow colSpan={5} message="No refunds in this window." />
              ) : (
                refunds.map((r) => (
                  <TableRow key={r.purchaseId}>
                    <TableCell className="font-medium">{r.parentName}</TableCell>
                    <TableCell className="text-muted-foreground">{r.courseName}</TableCell>
                    <TableCell className="tabular-nums">{currencyFmt.format(r.amount)}</TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {dateFmt.format(new Date(r.refundedAt))}
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.source === "stripe_refund" ? "default" : "secondary"}>
                        {r.source === "stripe_refund" ? "Stripe" : "Course purchase"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      <TabsContent value="churned">
        <div className="mb-2 flex justify-end">
          <CsvExportButton
            filename="coral-academy-churned-subscriptions.csv"
            rows={churnedSubscriptions.map((s) => ({
              learner: s.learnerName,
              plan: s.subscriptionType,
              subscribed_at: s.subscribedAt ?? "",
              canceled_at: s.canceledAt ?? "",
            }))}
          />
        </div>
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Learner</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Subscribed</TableHead>
                <TableHead>Canceled</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {churnedSubscriptions.length === 0 ? (
                <EmptyRow colSpan={4} message="No churned subscriptions in this window." />
              ) : (
                churnedSubscriptions.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.learnerName}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{s.subscriptionType}</Badge>
                    </TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {s.subscribedAt ? dateFmt.format(new Date(s.subscribedAt)) : "—"}
                    </TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {s.canceledAt ? dateFmt.format(new Date(s.canceledAt)) : "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </TabsContent>
    </Tabs>
  );
}
