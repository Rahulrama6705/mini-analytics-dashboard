import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CsvExportButton } from "@/components/dashboard/csv-export-button";
import { WARN_CLASS, BAD_CLASS } from "@/components/dashboard/status-badge";
import type { AtRiskLearnerRow } from "@/lib/data-sources/types";

const dateFmt = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

export function AtRiskLearnersTable({ rows }: { rows: AtRiskLearnerRow[] }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-medium">Learners at risk</h2>
          <p className="text-xs text-muted-foreground">
            Flagged inactive, or with no session activity in 14+ days.
          </p>
        </div>
        <CsvExportButton
          filename="coral-academy-learners-at-risk.csv"
          rows={rows.map((r) => ({
            learner: r.learnerName,
            temporarily_inactive: r.isTemporarilyInactive ? "yes" : "no",
            last_active: r.lastActiveAt ?? "",
            days_inactive: r.daysInactive ?? "",
            active_enrollments: r.activeEnrollmentCount,
          }))}
        />
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No at-risk learners right now.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Learner</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last active</TableHead>
                <TableHead>Days inactive</TableHead>
                <TableHead>Active enrollments</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.learnerId}>
                  <TableCell className="font-medium">{r.learnerName}</TableCell>
                  <TableCell>
                    <Badge className={r.isTemporarilyInactive ? BAD_CLASS : WARN_CLASS}>
                      {r.isTemporarilyInactive ? "Inactive" : "No recent activity"}
                    </Badge>
                  </TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {r.lastActiveAt ? dateFmt.format(new Date(r.lastActiveAt)) : "—"}
                  </TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">{r.daysInactive ?? "—"}</TableCell>
                  <TableCell className="tabular-nums">{r.activeEnrollmentCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
