"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { Charge, ChurnedSubscription, Refund } from "@/lib/data-sources/types";

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
  failedPayments: Charge[];
  refunds: Refund[];
  churnedSubscriptions: ChurnedSubscription[];
}) {
  return (
    <Tabs defaultValue="failed" className="gap-3">
      <TabsList>
        <TabsTrigger value="failed">Failed payments ({failedPayments.length})</TabsTrigger>
        <TabsTrigger value="refunds">Refunds ({refunds.length})</TabsTrigger>
        <TabsTrigger value="churned">Churned subscriptions ({churnedSubscriptions.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="failed">
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {failedPayments.length === 0 ? (
                <EmptyRow colSpan={4} message="No failed payments in this window." />
              ) : (
                failedPayments.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.customer_name}</TableCell>
                    <TableCell className="text-muted-foreground">{c.description}</TableCell>
                    <TableCell className="tabular-nums">{currencyFmt.format(c.amount)}</TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {dateFmt.format(new Date(c.created_at))}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      <TabsContent value="refunds">
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {refunds.length === 0 ? (
                <EmptyRow colSpan={4} message="No refunds in this window." />
              ) : (
                refunds.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.customer_name}</TableCell>
                    <TableCell className="text-muted-foreground">{r.reason.replaceAll("_", " ")}</TableCell>
                    <TableCell className="tabular-nums">{currencyFmt.format(r.amount)}</TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {dateFmt.format(new Date(r.created_at))}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      <TabsContent value="churned">
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Period end</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {churnedSubscriptions.length === 0 ? (
                <EmptyRow colSpan={4} message="No churned subscriptions in this window." />
              ) : (
                churnedSubscriptions.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.customer_name}</TableCell>
                    <TableCell className="text-muted-foreground">{s.plan}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{s.status}</Badge>
                    </TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {dateFmt.format(new Date(s.current_period_end))}
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
