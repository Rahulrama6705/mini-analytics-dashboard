import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import type { CampaignEnrollmentRow, PaginatedResult } from "@/lib/data-sources/types";

const dateFmt = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

function buildHref(basePath: string, params: URLSearchParams, updates: Record<string, string | null>) {
  const next = new URLSearchParams(params.toString());
  for (const [k, v] of Object.entries(updates)) {
    if (v === null) next.delete(k);
    else next.set(k, v);
  }
  return `${basePath}?${next.toString()}`;
}

export function CampaignEnrollmentsTable({
  result,
  basePath,
  params,
}: {
  result: PaginatedResult<CampaignEnrollmentRow>;
  basePath: string;
  params: URLSearchParams;
}) {
  const { rows, total, page, pageSize } = result;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (rows.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border text-sm text-muted-foreground">
        No campaign-attributed enrollments match these filters.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Learner</TableHead>
              <TableHead>Parent</TableHead>
              <TableHead>Parent email</TableHead>
              <TableHead>Campaign</TableHead>
              <TableHead>Enrollment date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ad signup date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.enrollmentId}>
                <TableCell className="font-medium">
                  <Link href={`/customers?learnerId=${r.learnerId}`} className="hover:underline">
                    {r.learnerName}
                  </Link>
                </TableCell>
                <TableCell>{r.parentName}</TableCell>
                <TableCell className="text-muted-foreground">{r.parentEmail ?? "—"}</TableCell>
                <TableCell className="max-w-[220px] truncate" title={r.campaignName ?? undefined}>
                  {r.campaignName ?? <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell className="tabular-nums">
                  {r.enrollmentDate ? dateFmt.format(new Date(r.enrollmentDate)) : "—"}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{r.enrollmentStatus}</Badge>
                </TableCell>
                <TableCell className="tabular-nums text-muted-foreground">
                  {r.campaignSignupAt ? dateFmt.format(new Date(r.campaignSignupAt)) : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} of {total}
        </p>
        <Pagination className="mx-0 w-auto">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href={buildHref(basePath, params, { page: String(Math.max(1, page - 1)) })}
                aria-disabled={page <= 1}
                className={page <= 1 ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
            <PaginationItem>
              <PaginationLink isActive>{page}</PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <span className="px-2 text-xs text-muted-foreground">of {totalPages}</span>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                href={buildHref(basePath, params, { page: String(Math.min(totalPages, page + 1)) })}
                aria-disabled={page >= totalPages}
                className={page >= totalPages ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
}
