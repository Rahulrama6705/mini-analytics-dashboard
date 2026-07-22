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
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import type { PaginatedResult, Student, StudentSortField } from "@/lib/data-sources/types";

const STATUS_VARIANT: Record<Student["status"], string> = {
  active: "border-transparent bg-[color-mix(in_oklch,var(--color-chart-3)_16%,transparent)] text-[var(--color-chart-3)]",
  trial: "border-transparent bg-[color-mix(in_oklch,var(--color-chart-4)_18%,transparent)] text-[var(--color-chart-4)]",
  inactive: "border-transparent bg-muted text-muted-foreground",
};

const dateFmt = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

function buildHref(basePath: string, params: URLSearchParams, updates: Record<string, string | null>) {
  const next = new URLSearchParams(params.toString());
  for (const [k, v] of Object.entries(updates)) {
    if (v === null) next.delete(k);
    else next.set(k, v);
  }
  return `${basePath}?${next.toString()}`;
}

function SortableHeader({
  label,
  field,
  basePath,
  params,
  currentSort,
  currentDir,
}: {
  label: string;
  field: StudentSortField;
  basePath: string;
  params: URLSearchParams;
  currentSort: string;
  currentDir: string;
}) {
  const isActive = currentSort === field;
  const nextDir = isActive && currentDir === "asc" ? "desc" : "asc";
  const href = buildHref(basePath, params, { sortBy: field, sortDir: nextDir, page: null });

  const Icon = isActive ? (currentDir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;

  return (
    <Link href={href} className="inline-flex items-center gap-1 hover:text-foreground">
      {label}
      <Icon className="h-3 w-3" />
    </Link>
  );
}

export function StudentsTable({
  result,
  basePath,
  params,
  sortBy,
  sortDir,
}: {
  result: PaginatedResult<Student>;
  basePath: string;
  params: URLSearchParams;
  sortBy: StudentSortField;
  sortDir: string;
}) {
  const { rows, total, page, pageSize } = result;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (rows.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border text-sm text-muted-foreground">
        No students match these filters.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <SortableHeader
                  label="Name"
                  field="name"
                  basePath={basePath}
                  params={params}
                  currentSort={sortBy}
                  currentDir={sortDir}
                />
              </TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Course</TableHead>
              <TableHead>
                <SortableHeader
                  label="Signup date"
                  field="signup_date"
                  basePath={basePath}
                  params={params}
                  currentSort={sortBy}
                  currentDir={sortDir}
                />
              </TableHead>
              <TableHead>
                <SortableHeader
                  label="Status"
                  field="status"
                  basePath={basePath}
                  params={params}
                  currentSort={sortBy}
                  currentDir={sortDir}
                />
              </TableHead>
              <TableHead>Referral source</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell className="text-muted-foreground">{s.email}</TableCell>
                <TableCell>{s.course_name}</TableCell>
                <TableCell className="tabular-nums">{dateFmt.format(new Date(s.signup_date))}</TableCell>
                <TableCell>
                  <Badge className={STATUS_VARIANT[s.status]}>{s.status}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{s.referral_source}</TableCell>
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
