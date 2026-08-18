import { ChartCard } from "@/components/dashboard/chart-card";
import { CategoryBarChart } from "@/components/dashboard/category-bar-chart";
import { EngagementLeaderboard } from "@/components/dashboard/engagement-leaderboard";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { GOOD_CLASS, WARN_CLASS, BAD_CLASS } from "@/components/dashboard/status-badge";
import {
  getPopularCoursesThisWeek,
  getRequestedTeachersThisWeek,
  getLearnerEngagementThisWeek,
  getUnderbookedClasses,
} from "@/lib/data-sources";

export const dynamic = "force-dynamic";

const percentFmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

function fillRateBadgeClass(fillRate: number) {
  if (fillRate < 0.25) return BAD_CLASS;
  if (fillRate < 0.5) return WARN_CLASS;
  return GOOD_CLASS;
}

export default async function WeeklyPage() {
  const [popularCourses, requestedTeachers, engagement, underbookedClasses] = await Promise.all([
    getPopularCoursesThisWeek(10),
    getRequestedTeachersThisWeek(10),
    getLearnerEngagementThisWeek(25),
    getUnderbookedClasses(0.5, 20),
  ]);

  const popularCoursesChartData = popularCourses.map((c) => ({ label: c.title, value: c.enrollmentCount }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Weekly</h1>
        <p className="text-sm text-muted-foreground">
          What&apos;s popular and who&apos;s engaged this week, at a glance.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Most popular courses" isEmpty={popularCoursesChartData.every((p) => p.value === 0)}>
          <CategoryBarChart data={popularCoursesChartData} layout="horizontal" />
        </ChartCard>

        <div className="rounded-lg border bg-card p-4">
          <h2 className="mb-1 text-sm font-medium">Most requested teachers</h2>
          <p className="mb-3 text-xs text-muted-foreground">
            &quot;Requested&quot; reflects learner saves this week — teacher-request tracking has no dedicated
            signal yet in the schema, so this is the closest honest proxy. Lifetime columns give context.
          </p>
          {requestedTeachers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No teacher data available.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Teacher</TableHead>
                    <TableHead>Saves this week</TableHead>
                    <TableHead className="text-muted-foreground">Sessions taught (lifetime)</TableHead>
                    <TableHead className="text-muted-foreground">Avg. attendance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requestedTeachers.map((t) => (
                    <TableRow key={t.teacherId}>
                      <TableCell className="font-medium">{t.teacherName}</TableCell>
                      <TableCell className="tabular-nums">{t.savesThisWeek}</TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">{t.sessionsTaughtLifetime}</TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">
                        {percentFmt.format(t.avgAttendanceRate)}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <h2 className="mb-1 text-sm font-medium">Learner engagement leaderboard</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Ranked by total session time this week, from real attendance records.
        </p>
        <EngagementLeaderboard rows={engagement} />
      </div>

      <div className="rounded-lg border bg-card p-4">
        <h2 className="mb-1 text-sm font-medium">Underbooked classes</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Classes running under 50% capacity, ranked by lowest fill rate first.
        </p>
        {underbookedClasses.length === 0 ? (
          <p className="text-sm text-muted-foreground">No underbooked classes right now.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Class</TableHead>
                  <TableHead>Teacher</TableHead>
                  <TableHead>Enrolled / Capacity</TableHead>
                  <TableHead>Fill rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {underbookedClasses.map((c) => (
                  <TableRow key={c.batchId}>
                    <TableCell className="font-medium">{c.classTitle}</TableCell>
                    <TableCell>{c.teacherName}</TableCell>
                    <TableCell className="tabular-nums">
                      {c.sizeEnrolled} / {c.sizeMax}
                    </TableCell>
                    <TableCell>
                      <Badge className={fillRateBadgeClass(c.fillRate)}>{percentFmt.format(c.fillRate * 100)}%</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
