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
  AlertTriangle,
  Target,
  HandCoins,
  ClipboardList,
  Trophy,
  Banknote,
  UserPlus,
  Archive,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  permission?: string;
  /** Only visible to super admins */
  superOnly?: boolean;
  /** Match pathname exactly (no prefix match for children) */
  exact?: boolean;
};

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/team-members", label: "All Team Members", icon: Users, permission: "team_members.view" },
  { href: "/accounts", label: "Fiverr Accounts", icon: Briefcase, permission: "accounts.view" },
  { href: "/messages", label: "Messages", icon: MessageSquare, permission: "messages.view" },
  { href: "/orders", label: "Orders Received", icon: Trophy, permission: "messages.view" },
  { href: "/services", label: "Services", icon: Wrench },
  { href: "/performance", label: "Monthly Performance", icon: TrendingUp, permission: "reports.view" },
  { href: "/weekly-activity", label: "Weekly Activity", icon: ClipboardList, permission: "reports.view" },
  { href: "/money", label: "Money Made", icon: Banknote, superOnly: true },
  { href: "/reserved-accounts", label: "Reserved Accounts", icon: Archive, superOnly: true },
  { href: "/reports", label: "Reports", icon: FileText, permission: "reports.view" },
  { href: "/fines", label: "Fines & Debts", icon: AlertTriangle, permission: "team_members.view" },
  { href: "/search", label: "Search", icon: Search },
  { href: "/import", label: "Import Accounts", icon: Upload, permission: "accounts.import" },
  { href: "/activity", label: "Activity", icon: Activity, permission: "activity.view" },
  { href: "/users", label: "Users & Roles", icon: Shield, permission: "users.view" },
  { href: "/settings", label: "Settings", icon: Settings, permission: "settings.manage" },
  { href: "/profile", label: "Account Settings", icon: User },
];

const memberNavItems = (teamMemberId: string): NavItem[] => [
  { href: "/dashboard", label: "My Dashboard", icon: LayoutDashboard },
  { href: "/my-accounts", label: "My Fiverr Accounts", icon: Briefcase },
  { href: "/my-messages", label: "My Messages", icon: MessageSquare },
  { href: "/my-orders", label: "Orders Received", icon: Trophy },
  { href: "/my-prospects", label: "My Prospects", icon: UserPlus },
  { href: "/my-fines", label: "My Fines", icon: AlertTriangle },
  { href: "/my-debts", label: "My Debt", icon: HandCoins },
  { href: "/my-monthly-plan", label: "Monthly Goals", icon: Target },
  { href: "/my-team", label: "My Team", icon: Users },
  { href: `/team-members/${teamMemberId}`, label: "My Profile", icon: UserCircle, exact: true },
  { href: "/profile", label: "Account Settings", icon: User },
];

function buildNavItems(teamMemberId?: string | null, isScopedMember?: boolean): NavItem[] {
  if (isScopedMember && teamMemberId) {
    return memberNavItems(teamMemberId);
  }

  const items = [...navItems];
  if (teamMemberId) {
    items.splice(1, 0, {
      href: "/my-accounts",
      label: "My Fiverr Accounts",
      icon: Briefcase,
    });
    items.splice(2, 0, {
      href: "/my-messages",
      label: "My Messages",
      icon: MessageSquare,
    });
    items.splice(3, 0, {
      href: "/my-orders",
      label: "Orders Received",
      icon: Trophy,
    });
    items.splice(4, 0, {
      href: "/my-prospects",
      label: "My Prospects",
      icon: UserPlus,
    });
    items.splice(5, 0, {
      href: "/my-monthly-plan",
      label: "Monthly Goals",
      icon: Target,
    });
    items.splice(6, 0, {
      href: "/my-team",
      label: "My Team",
      icon: Users,
    });
    items.splice(7, 0, {
      href: `/team-members/${teamMemberId}`,
      label: "My Profile",
      icon: UserCircle,
      exact: true,
    });
  }
  return items;
}

/** Pick the single best (longest) matching nav href so /team-members and /team-members/:id don't both highlight. */
function isNavActive(pathname: string, item: NavItem, allItems: NavItem[]): boolean {
  if (item.exact) {
    return pathname === item.href;
  }

  const candidates = allItems.filter((other) => {
    if (other.exact) return pathname === other.href;
    return pathname === other.href || pathname.startsWith(other.href + "/");
  });

  if (candidates.length === 0) return false;
  const best = [...candidates].sort((a, b) => b.href.length - a.href.length)[0];
  return best.href === item.href;
}

interface SidebarProps {
  permissions: string[];
  collapsed?: boolean;
  onToggle?: () => void;
  mobile?: boolean;
  onClose?: () => void;
  teamMemberId?: string | null;
  isScopedMember?: boolean;
  isSuperAdmin?: boolean;
}

export function Sidebar({
  permissions,
  collapsed,
  onToggle,
  mobile,
  onClose,
  teamMemberId,
  isScopedMember,
  isSuperAdmin,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const filteredNav = buildNavItems(teamMemberId, isScopedMember).filter((item) => {
    if (isScopedMember) return true;
    if (item.superOnly) return Boolean(isSuperAdmin);
    const permission = item.permission;
    if (!permission) return true;
    return permissions.includes(permission) || permissions.some((p) => p.includes("super"));
  });

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const content = (
    <div className="flex h-full flex-col bg-white">
      <div
        className={cn(
          "flex items-center gap-3 border-b border-[#7b1e3a]/15 px-4 py-4",
          collapsed && !mobile && "justify-center px-2"
        )}
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#7b1e3a] shadow-md shadow-[#7b1e3a]/25">
          <div className="relative">
            <Laptop className="h-4 w-4 text-white" />
            <Smartphone className="absolute -bottom-1 -right-1 h-2.5 w-2.5 text-rose-200" />
          </div>
        </div>
        {(!collapsed || mobile) && (
          <div className="min-w-0">
            <p className="text-sm font-bold text-[#5c1228] leading-tight tracking-wide">UNSTOPPABLE</p>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7b1e3a]">
              TEAM
            </p>
          </div>
        )}
        {mobile && (
          <Button variant="ghost" size="icon" className="ml-auto text-[#7b1e3a]" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {filteredNav.map((item) => {
          const Icon = item.icon;
          const isActive = isNavActive(pathname, item, filteredNav);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                isActive
                  ? "bg-[#7b1e3a] text-white shadow-sm shadow-[#7b1e3a]/25"
                  : "text-[#5c1228]/70 hover:bg-[#f6e8ec] hover:text-[#5c1228]",
                collapsed && !mobile && "justify-center px-2"
              )}
              title={collapsed && !mobile ? item.label : undefined}
            >
              <Icon className={cn("h-5 w-5 shrink-0", isActive ? "text-white" : "text-[#7b1e3a]")} />
              {(!collapsed || mobile) && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-[#7b1e3a]/12 p-3 space-y-1 bg-[#faf8f9]">
        <button
          onClick={handleLogout}
          className={cn(
            "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[#5c1228]/70 hover:bg-[#f6e8ec] hover:text-[#7b1e3a] transition-colors",
            collapsed && !mobile && "justify-center px-2"
          )}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {(!collapsed || mobile) && <span>Logout</span>}
        </button>
        {!mobile && onToggle && (
          <button
            onClick={onToggle}
            className="flex w-full items-center justify-center rounded-xl p-2 text-[#7b1e3a]/50 hover:bg-[#f6e8ec] hover:text-[#7b1e3a]"
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
        <div className="absolute inset-0 bg-[#2a0a14]/50" onClick={onClose} />
        <aside className="absolute left-0 top-0 h-full w-72 bg-white shadow-2xl border-r border-[#7b1e3a]/10">
          {content}
        </aside>
      </div>
    );
  }

  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col border-r border-[#7b1e3a]/12 bg-white transition-all duration-300",
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
