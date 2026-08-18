"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { CustomerSearchResult } from "@/lib/data-sources/types";

function AvailabilityDot({ available, label }: { available: boolean; label: string }) {
  return (
    <span
      title={available ? `${label}: available` : `${label}: none on file`}
      className={cn("inline-flex items-center gap-1 text-[11px]", available ? "text-[var(--color-chart-3)]" : "text-muted-foreground/40")}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", available ? "bg-[var(--color-chart-3)]" : "bg-muted-foreground/30")} />
      {label}
    </span>
  );
}

function LearnerLink({ result }: { result: CustomerSearchResult }) {
  return (
    <Link href={`/customers?learnerId=${result.learnerId}`}>
      <Card className="py-3 transition-colors hover:bg-accent">
        <CardContent className="flex items-center justify-between px-4">
          <div>
            <p className="text-sm font-medium">{result.learnerName}</p>
            <p className="text-xs text-muted-foreground">
              Parent: {result.parentName} {result.parentEmail && `· ${result.parentEmail}`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <AvailabilityDot available={result.hasCourses} label="Courses" />
            <AvailabilityDot available={result.hasSessionHistory} label="Sessions" />
            <AvailabilityDot available={result.hasPayments} label="Payments" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function ParentGroup({
  parentName,
  parentEmail,
  learners,
}: {
  parentName: string;
  parentEmail: string | null;
  learners: CustomerSearchResult[];
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-lg border bg-card px-4 py-3 text-left transition-colors hover:bg-accent"
      >
        <div className="flex items-center gap-2">
          {open ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <div>
            <p className="text-sm font-medium">{parentName}</p>
            <p className="text-xs text-muted-foreground">
              {parentEmail && `${parentEmail} · `}
              {learners.length} learners
            </p>
          </div>
        </div>
      </button>
      {open && (
        <div className="flex flex-col gap-2 pl-6">
          {learners.map((l) => (
            <LearnerLink key={l.learnerId} result={l} />
          ))}
        </div>
      )}
    </div>
  );
}

export function CustomerSearchResults({ results, query }: { results: CustomerSearchResult[]; query: string }) {
  if (results.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-lg border text-sm text-muted-foreground">
        No learners or parents match &ldquo;{query}&rdquo;.
      </div>
    );
  }

  // Group by parent email rather than the internal parentId — the more
  // "human" identity key, so any parent records that happen to share an
  // email (data merges, re-signups, etc.) still get grouped as one family
  // instead of splitting into separate entries. Falls back to parentId
  // only when a parent has no email on file, so those don't all collapse
  // into a single giant "no email" group.
  const groups = new Map<string, CustomerSearchResult[]>();
  for (const r of results) {
    const key = r.parentEmail ?? r.parentId;
    const existing = groups.get(key);
    if (existing) existing.push(r);
    else groups.set(key, [r]);
  }

  return (
    <div className="flex flex-col gap-2">
      {Array.from(groups.values()).map((learners) =>
        learners.length === 1 ? (
          <LearnerLink key={learners[0].learnerId} result={learners[0]} />
        ) : (
          <ParentGroup
            key={learners[0].parentEmail ?? learners[0].parentId}
            parentName={learners[0].parentName}
            parentEmail={learners[0].parentEmail}
            learners={learners}
          />
        )
      )}
    </div>
  );
}
