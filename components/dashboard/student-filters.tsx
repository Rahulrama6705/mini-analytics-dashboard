"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface StudentFiltersBarProps {
  courses: { id: string; name: string }[];
  referralSources: string[];
}

const STATUS_OPTIONS = ["active", "inactive", "trial"] as const;

export function StudentFiltersBar({ courses, referralSources }: StudentFiltersBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  const hasFilters = ["status", "courseId", "referralSource", "from", "to"].some((k) =>
    searchParams.get(k)
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={searchParams.get("status") ?? "all"}
        onValueChange={(v) => setParam("status", v === "all" ? null : v)}
      >
        <SelectTrigger className="h-8 w-[130px] text-xs">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {STATUS_OPTIONS.map((s) => (
            <SelectItem key={s} value={s}>
              {s[0].toUpperCase() + s.slice(1)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get("courseId") ?? "all"}
        onValueChange={(v) => setParam("courseId", v === "all" ? null : v)}
      >
        <SelectTrigger className="h-8 w-[190px] text-xs">
          <SelectValue placeholder="Course" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All courses</SelectItem>
          {courses.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get("referralSource") ?? "all"}
        onValueChange={(v) => setParam("referralSource", v === "all" ? null : v)}
      >
        <SelectTrigger className="h-8 w-[170px] text-xs">
          <SelectValue placeholder="Referral source" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All sources</SelectItem>
          {referralSources.map((r) => (
            <SelectItem key={r} value={r}>
              {r}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        type="date"
        className="h-8 w-[140px] text-xs"
        value={searchParams.get("from") ?? ""}
        onChange={(e) => setParam("from", e.target.value || null)}
      />
      <span className="text-xs text-muted-foreground">to</span>
      <Input
        type="date"
        className="h-8 w-[140px] text-xs"
        value={searchParams.get("to") ?? ""}
        onChange={(e) => setParam("to", e.target.value || null)}
      />

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs"
          onClick={() => router.push(pathname)}
        >
          <X className="h-3 w-3" />
          Clear
        </Button>
      )}
    </div>
  );
}
