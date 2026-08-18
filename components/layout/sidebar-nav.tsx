"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  GraduationCap,
  DollarSign,
  Megaphone,
  Waves,
  UserSearch,
  CalendarRange,
  CalendarDays,
  Presentation,
  Target,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/daily", label: "Daily", icon: CalendarDays },
  { href: "/enrollment", label: "Enrollment", icon: GraduationCap },
  { href: "/revenue", label: "Revenue", icon: DollarSign },
  { href: "/marketing", label: "Marketing", icon: Megaphone },
  { href: "/meta-ads-enrollments", label: "Meta Ads", icon: Target },
  { href: "/customers", label: "Customers", icon: UserSearch },
  { href: "/teachers", label: "Teachers", icon: Presentation },
  { href: "/weekly", label: "Weekly", icon: CalendarRange },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-56 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground md:flex">
      <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
        <Waves className="h-5 w-5 text-primary" />
        <span className="font-[family-name:var(--font-wordmark)] text-lg font-medium tracking-tight lowercase">
          <span className="text-[#d84c1c]">coral</span>{" "}
          <span className="text-[#1f8299]">academy</span>
        </span>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-2">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-sidebar-border p-3 text-xs text-sidebar-foreground/50">
        Internal analytics &middot; preprod data
      </div>
    </aside>
  );
}
