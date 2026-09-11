"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  FileText,
  FolderKanban,
  Landmark,
  LayoutDashboard,
  Receipt,
  Users,
  PieChart,
} from "lucide-react";
import { OrgSwitcher } from "@/components/org-switcher";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/organisations", label: "Organisations", icon: Landmark },
  { href: "/branches", label: "Branches", icon: Building2 },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/employees", label: "Employees", icon: Users },
  { href: "/expenses", label: "Expenses", icon: Receipt },
  { href: "/invoices", label: "Invoices", icon: FileText },
  { href: "/reports", label: "P&L Reports", icon: PieChart },
];

export function AppSidebar({
  organisations,
  selectedOrgId,
}: {
  organisations: { id: number; name: string; currency: string }[];
  selectedOrgId: number | null;
}) {
  const pathname = usePathname();
  return (
    <aside className="flex w-full flex-col border-b bg-sidebar text-sidebar-foreground md:h-screen md:w-60 md:border-r md:border-b-0">
      <div className="px-3 py-4">
        <Link href="/" className="block rounded-lg bg-black p-2">
          <Image
            src="/eficenspnglogo.png"
            alt="eficens"
            width={360}
            height={120}
            className="h-10 w-auto object-contain"
            priority
          />
        </Link>
      </div>
      <div className="px-3 pb-3">
        <OrgSwitcher organisations={organisations} selectedId={selectedOrgId} />
      </div>
      <nav className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:overflow-visible">
        {NAV.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm whitespace-nowrap hover:bg-sidebar-accent",
                active && "bg-sidebar-accent font-medium",
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
