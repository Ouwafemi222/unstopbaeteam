"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  MessageSquare,
  Wrench,
  TrendingUp,
  FileText,
  Search,
  Activity,
  Shield,
  Settings,
  User,
  UserCircle,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Upload,
  Menu,
  X,
  Laptop,
  Smartphone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/team-members", label: "Team Members", icon: Users, permission: "team_members.view" },
  { href: "/accounts", label: "Fiverr Accounts", icon: Briefcase, permission: "accounts.view" },
  { href: "/messages", label: "Messages", icon: MessageSquare, permission: "messages.view" },
  { href: "/services", label: "Services", icon: Wrench },
  { href: "/performance", label: "Monthly Performance", icon: TrendingUp, permission: "reports.view" },
  { href: "/reports", label: "Reports", icon: FileText, permission: "reports.view" },
  { href: "/search", label: "Search", icon: Search },
  { href: "/import", label: "Import Accounts", icon: Upload, permission: "accounts.import" },
  { href: "/activity", label: "Activity", icon: Activity, permission: "activity.view" },
  { href: "/users", label: "Users & Roles", icon: Shield, permission: "users.view" },
  { href: "/settings", label: "Settings", icon: Settings, permission: "settings.manage" },
  { href: "/profile", label: "Profile", icon: User },
];

function buildNavItems(teamMemberId?: string | null) {
  const items = [...navItems];
  if (teamMemberId) {
    items.splice(1, 0, {
      href: `/team-members/${teamMemberId}`,
      label: "My Team Profile",
      icon: UserCircle,
    });
  }
  return items;
}

interface SidebarProps {
  permissions: string[];
  collapsed?: boolean;
  onToggle?: () => void;
  mobile?: boolean;
  onClose?: () => void;
  teamMemberId?: string | null;
}

export function Sidebar({ permissions, collapsed, onToggle, mobile, onClose, teamMemberId }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const filteredNav = buildNavItems(teamMemberId).filter((item) => {
    if (!item.permission) return true;
    return permissions.includes(item.permission) || permissions.some((p) => p.includes("super"));
  });

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const content = (
    <div className="flex h-full flex-col">
      <div className={cn("flex items-center gap-3 border-b border-neutral-200 p-4", collapsed && !mobile && "justify-center")}>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-green to-brand-orange">
          <div className="relative">
            <Laptop className="h-4 w-4 text-white" />
            <Smartphone className="absolute -bottom-1 -right-1 h-2.5 w-2.5 text-white" />
          </div>
        </div>
        {(!collapsed || mobile) && (
          <div className="min-w-0">
            <p className="text-sm font-bold text-neutral-900 leading-tight">UNSTOPPABLE</p>
            <p className="text-xs font-semibold text-brand-green">TEAM</p>
          </div>
        )}
        {mobile && (
          <Button variant="ghost" size="icon" className="ml-auto" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {filteredNav.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-brand-green/10 text-brand-green-dark"
                  : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900",
                collapsed && !mobile && "justify-center px-2"
              )}
              title={collapsed && !mobile ? item.label : undefined}
            >
              <Icon className={cn("h-5 w-5 shrink-0", isActive && "text-brand-green")} />
              {(!collapsed || mobile) && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-neutral-200 p-3 space-y-1">
        <button
          onClick={handleLogout}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-600 hover:bg-red-50 hover:text-red-600 transition-colors",
            collapsed && !mobile && "justify-center px-2"
          )}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {(!collapsed || mobile) && <span>Logout</span>}
        </button>
        {!mobile && onToggle && (
          <button
            onClick={onToggle}
            className="flex w-full items-center justify-center rounded-lg p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        )}
      </div>
    </div>
  );

  if (mobile) {
    return (
      <div className="fixed inset-0 z-50 lg:hidden">
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />
        <aside className="absolute left-0 top-0 h-full w-72 bg-white shadow-xl">{content}</aside>
      </div>
    );
  }

  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col border-r border-neutral-200 bg-white transition-all duration-300",
        collapsed ? "w-[68px]" : "w-64"
      )}
    >
      {content}
    </aside>
  );
}

export function MobileMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="ghost" size="icon" className="lg:hidden" onClick={onClick}>
      <Menu className="h-5 w-5" />
    </Button>
  );
}
