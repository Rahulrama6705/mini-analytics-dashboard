"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { GOOD_CLASS, WARN_CLASS, BAD_CLASS, NEUTRAL_CLASS } from "@/components/dashboard/status-badge";
import type { TodaysSessionRow } from "@/lib/data-sources/types";

const timeFmt = new Intl.DateTimeFormat("en-US", { timeStyle: "short" });

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function sessionStatusClass(status: TodaysSessionRow["status"]): string {
  if (status === "Ongoing") return GOOD_CLASS;
  if (status === "Upcoming") return WARN_CLASS;
  if (status === "Canceled") return BAD_CLASS;
  return NEUTRAL_CLASS;
}

export function DailyClassesView({ sessions }: { sessions: TodaysSessionRow[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = sessions.find((s) => s.sessionId === selectedId) ?? null;

  if (sessions.length === 0) {
    return <p className="text-sm text-muted-foreground">No classes scheduled today.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Class</TableHead>
              <TableHead>Teacher</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Learners</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.map((s) => (
              <TableRow
                key={s.sessionId}
                className="cursor-pointer"
                data-state={s.sessionId === selectedId ? "selected" : undefined}
                onClick={() => setSelectedId(s.sessionId === selectedId ? null : s.sessionId)}
              >
                <TableCell className="font-medium">{s.classTitle}</TableCell>
                <TableCell className="text-muted-foreground">{s.teacherName}</TableCell>
                <TableCell className="tabular-nums text-muted-foreground">
                  {timeFmt.format(new Date(s.startTimestamp))} – {timeFmt.format(new Date(s.endTimestamp))}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{s.learnerCount}</Badge>
                </TableCell>
                <TableCell>
                  <Badge className={sessionStatusClass(s.status)}>{s.status}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {selected && (
        <div className="rounded-lg border bg-card p-4">
          <h3 className="mb-3 text-sm font-medium">{selected.classTitle}</h3>
          <div className="mb-4 grid grid-cols-1 gap-x-8 rounded-lg border p-3 sm:grid-cols-2">
            <div>
              <DetailRow label="Teacher" value={selected.teacherName} />
              <DetailRow label="Category" value={selected.classCategory} />
              <DetailRow
                label="Time"
                value={`${timeFmt.format(new Date(selected.startTimestamp))} – ${timeFmt.format(new Date(selected.endTimestamp))}`}
              />
            </div>
            <div>
              <DetailRow label="Status" value={<Badge className={sessionStatusClass(selected.status)}>{selected.status}</Badge>} />
              <DetailRow label="Total students" value={selected.learnerCount} />
            </div>
          </div>

          <h4 className="mb-2 text-xs font-medium text-muted-foreground">Enrolled students</h4>
          {selected.learners.length === 0 ? (
            <p className="text-sm text-muted-foreground">No learners enrolled.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Learner</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selected.learners.map((l) => (
                    <TableRow key={l.learnerId}>
                      <TableCell className="font-medium">{l.learnerName}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
