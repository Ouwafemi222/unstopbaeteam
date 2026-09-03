"use client";

import { useState, useEffect } from "react";
import { Sidebar, MobileMenuButton } from "./sidebar";
import { GlobalSearch } from "./global-search";
import { NotificationBell } from "./notification-bell";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types/database";

const BUCKET = "attachments";

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
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const supabase = createClient();

  const initials = (displayName || profile?.full_name)
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() ?? "UT";

  // Load avatar from storage when profile has an avatar_url
  useEffect(() => {
    async function loadAvatar() {
      if (!profile?.avatar_url) return;
      if (profile.avatar_url.startsWith("http")) {
        setAvatarUrl(profile.avatar_url);
        return;
      }
      const { data } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(profile.avatar_url, 3600);
      if (data?.signedUrl) setAvatarUrl(data.signedUrl);
    }
    loadAvatar();
  }, [profile?.avatar_url, supabase]);

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
            <Link
              href="/profile"
              className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-neutral-100 transition-colors group"
            >
              {/* Avatar */}
              <div className="relative h-9 w-9 shrink-0">
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt={displayName ?? "Profile"}
                    fill
                    className="rounded-full object-cover border-2 border-white shadow-sm ring-1 ring-brand-green/20 group-hover:ring-brand-green/40 transition"
                    sizes="36px"
                  />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-green to-brand-orange text-xs font-bold text-white border-2 border-white shadow-sm">
                    {initials}
                  </div>
                )}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-semibold text-neutral-800 leading-tight">
                  {displayName || profile?.preferred_name || profile?.full_name || "User"}
                </p>
                <p className="text-xs text-neutral-400 leading-tight">View profile</p>
              </div>
            </Link>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
