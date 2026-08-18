"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function CampaignViewTabs({ enrolledCount, leadsCount }: { enrolledCount: number; leadsCount: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const view = searchParams.get("view") === "leads" ? "leads" : "enrolled";

  function setView(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "enrolled") params.delete("view");
    else params.set("view", next);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <Tabs value={view} onValueChange={setView}>
      <TabsList>
        <TabsTrigger value="enrolled">Clicked &amp; enrolled ({enrolledCount})</TabsTrigger>
        <TabsTrigger value="leads">Clicked, not enrolled ({leadsCount})</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
