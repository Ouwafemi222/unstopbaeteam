"use client";

import { useState } from "react";
import { Sidebar, MobileMenuButton } from "./sidebar";
import { GlobalSearch } from "./global-search";
import { NotificationBell } from "./notification-bell";
import Link from "next/link";
import type { Profile } from "@/types/database";

interface AppShellProps {
  children: React.ReactNode;
  permissions: string[];
  profile: Profile | null;
  teamMemberId?: string | null;
  isScopedMember?: boolean;
  displayName?: string;
}

export function AppShell({ children, permissions, profile, teamMemberId, isScopedMember, displayName }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const initials = (displayName || profile?.full_name)
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() ?? "UT";

  return (
    <div className="flex h-screen bg-neutral-50">
      <Sidebar
        permissions={permissions}
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
        teamMemberId={teamMemberId}
        isScopedMember={isScopedMember}
      />
      {mobileOpen && (
        <Sidebar
          permissions={permissions}
          mobile
          onClose={() => setMobileOpen(false)}
          teamMemberId={teamMemberId}
          isScopedMember={isScopedMember}
        />
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center gap-4 border-b border-neutral-200 bg-white px-4 lg:px-6">
          <MobileMenuButton onClick={() => setMobileOpen(true)} />
          {!isScopedMember && <GlobalSearch className="flex-1 max-w-2xl" />}
          {isScopedMember && <div className="flex-1" />}
          <div className="flex items-center gap-3">
            <NotificationBell />
            <Link href="/profile" className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-neutral-100">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-green to-brand-orange text-xs font-bold text-white">
                {initials}
              </div>
              <span className="hidden md:block text-sm font-medium text-neutral-700">
                {displayName || profile?.preferred_name || profile?.full_name || "User"}
              </span>
            </Link>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
