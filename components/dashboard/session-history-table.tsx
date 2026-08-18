import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { GOOD_CLASS, BAD_CLASS, NEUTRAL_CLASS } from "@/components/dashboard/status-badge";
import type { SessionHistoryRow } from "@/lib/data-sources/types";

const dateTimeFmt = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" });

function attendanceClass(status: SessionHistoryRow["attendanceStatus"]): string {
  if (status === "Present") return GOOD_CLASS;
  if (status === "Absent") return BAD_CLASS;
  return NEUTRAL_CLASS;
}

export function SessionHistoryTable({ sessions }: { sessions: SessionHistoryRow[] }) {
  if (sessions.length === 0) {
    return <p className="text-sm text-muted-foreground">No past sessions on file yet.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Class</TableHead>
            <TableHead>Session date</TableHead>
            <TableHead>Attendance</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sessions.map((s) => (
            <TableRow key={s.sessionId}>
              <TableCell className="font-medium">{s.classTitle}</TableCell>
              <TableCell className="tabular-nums text-muted-foreground">
                {dateTimeFmt.format(new Date(s.startTimestamp))}
              </TableCell>
              <TableCell>
                <Badge className={attendanceClass(s.attendanceStatus)}>{s.attendanceStatus}</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
