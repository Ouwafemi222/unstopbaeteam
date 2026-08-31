"use client";

import { useState } from "react";
import { Sidebar, MobileMenuButton } from "./sidebar";
import { GlobalSearch } from "./global-search";
import { Bell } from "lucide-react";
import Link from "next/link";
import type { Profile } from "@/types/database";

interface AppShellProps {
  children: React.ReactNode;
  permissions: string[];
  profile: Profile | null;
}

export function AppShell({ children, permissions, profile }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const initials = profile?.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() ?? "UT";

  return (
    <div className="flex h-screen bg-neutral-50">
      <Sidebar permissions={permissions} collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      {mobileOpen && (
        <Sidebar permissions={permissions} mobile onClose={() => setMobileOpen(false)} />
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center gap-4 border-b border-neutral-200 bg-white px-4 lg:px-6">
          <MobileMenuButton onClick={() => setMobileOpen(true)} />
          <GlobalSearch className="flex-1 max-w-2xl" />
          <div className="flex items-center gap-3">
            <button className="relative rounded-lg p-2 text-neutral-500 hover:bg-neutral-100">
              <Bell className="h-5 w-5" />
            </button>
            <Link href="/profile" className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-neutral-100">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-green to-brand-orange text-xs font-bold text-white">
                {initials}
              </div>
              <span className="hidden md:block text-sm font-medium text-neutral-700">
                {profile?.preferred_name || profile?.full_name || "User"}
              </span>
            </Link>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
