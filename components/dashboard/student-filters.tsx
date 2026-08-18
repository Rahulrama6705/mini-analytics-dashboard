"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export function StudentFiltersBar() {
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

  const hasFilters = ["subscription", "from", "to"].some((k) => searchParams.get(k));

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={searchParams.get("subscription") ?? "all"}
        onValueChange={(v) => setParam("subscription", v === "all" ? null : v)}
      >
        <SelectTrigger className="h-8 w-[170px] text-xs">
          <SelectValue placeholder="Subscription" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All learners</SelectItem>
          <SelectItem value="active">Active subscription</SelectItem>
          <SelectItem value="inactive">No active subscription</SelectItem>
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
        <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => router.push(pathname)}>
          <X className="h-3 w-3" />
          Clear
        </Button>
      )}
    </div>
  );
}
