import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getTeachersOverview } from "@/lib/data-sources";

export const dynamic = "force-dynamic";

const currencyFmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const percentFmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

export default async function TeachersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const highlightId = sp.teacherId;
  const teachers = await getTeachersOverview(200);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Teachers</h1>
        <p className="text-sm text-muted-foreground">
          Workload, attendance, and lifetime earnings for every teacher, ranked by sessions taught.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Teacher</TableHead>
              <TableHead>Sessions taught</TableHead>
              <TableHead>Learners taught</TableHead>
              <TableHead>Avg. attendance</TableHead>
              <TableHead>Lifetime earnings</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teachers.map((t) => (
              <TableRow key={t.teacherId} className={t.teacherId === highlightId ? "bg-accent" : undefined}>
                <TableCell className="font-medium">{t.teacherName}</TableCell>
                <TableCell className="tabular-nums">{t.sessionsTaught}</TableCell>
                <TableCell className="tabular-nums">{t.learnersTaught}</TableCell>
                <TableCell className="tabular-nums">{percentFmt.format(t.avgAttendanceRate)}%</TableCell>
                <TableCell className="tabular-nums">{currencyFmt.format(t.lifetimeEarnings)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
