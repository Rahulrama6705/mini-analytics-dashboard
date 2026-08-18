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
import type { PaginatedResult, StudentRow, StudentSortField } from "@/lib/data-sources/types";

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
  result: PaginatedResult<StudentRow>;
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
        No learners match these filters.
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
                  label="Learner"
                  field="name"
                  basePath={basePath}
                  params={params}
                  currentSort={sortBy}
                  currentDir={sortDir}
                />
              </TableHead>
              <TableHead>Parent</TableHead>
              <TableHead>Parent email</TableHead>
              <TableHead>
                <SortableHeader
                  label="Parent signup date"
                  field="signupDate"
                  basePath={basePath}
                  params={params}
                  currentSort={sortBy}
                  currentDir={sortDir}
                />
              </TableHead>
              <TableHead>Subscription</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((s) => (
              <TableRow key={s.learnerId}>
                <TableCell className="font-medium">
                  <Link href={`/customers?learnerId=${s.learnerId}`} className="hover:underline">
                    {s.name}
                  </Link>
                </TableCell>
                <TableCell>{s.parentName}</TableCell>
                <TableCell className="text-muted-foreground">{s.email ?? "—"}</TableCell>
                <TableCell className="tabular-nums">
                  {s.signupDate ? dateFmt.format(new Date(s.signupDate)) : "—"}
                </TableCell>
                <TableCell>
                  {s.hasActiveSubscription ? (
                    <Badge className="border-transparent bg-[color-mix(in_oklch,var(--color-chart-3)_16%,transparent)] text-[var(--color-chart-3)]">
                      active
                    </Badge>
                  ) : (
                    <Badge variant="secondary">none</Badge>
                  )}
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
