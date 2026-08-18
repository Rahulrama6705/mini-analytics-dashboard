import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { EngagementRow } from "@/lib/data-sources/types";

const dateFmt = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours === 0 && minutes === 0) return "0m";
  return `${hours > 0 ? `${hours}h ` : ""}${minutes}m`;
}

export function EngagementLeaderboard({ rows }: { rows: EngagementRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No session attendance recorded this week yet — this leaderboard is based on a small number of real
        attendance records and will fill in as usage grows.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">#</TableHead>
            <TableHead>Learner</TableHead>
            <TableHead>Time this week</TableHead>
            <TableHead>Sessions attended</TableHead>
            <TableHead>Courses completed</TableHead>
            <TableHead>Last active</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={r.learnerId}>
              <TableCell className="tabular-nums text-muted-foreground">{i + 1}</TableCell>
              <TableCell className="font-medium">{r.learnerName}</TableCell>
              <TableCell className="tabular-nums">{formatDuration(r.totalSecondsThisWeek)}</TableCell>
              <TableCell className="tabular-nums">{r.sessionsAttendedThisWeek}</TableCell>
              <TableCell className="tabular-nums">{r.coursesCompletedTotal}</TableCell>
              <TableCell className="tabular-nums text-muted-foreground">
                {r.lastActiveAt ? dateFmt.format(new Date(r.lastActiveAt)) : "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
