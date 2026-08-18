"use client";

import type { ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function CustomerTabs({ profile, payments }: { profile: ReactNode; payments: ReactNode }) {
  return (
    <Tabs defaultValue="profile" className="gap-4">
      <TabsList>
        <TabsTrigger value="profile">Profile</TabsTrigger>
        <TabsTrigger value="payments">Payments</TabsTrigger>
      </TabsList>
      <TabsContent value="profile">{profile}</TabsContent>
      <TabsContent value="payments">{payments}</TabsContent>
    </Tabs>
  );
}
