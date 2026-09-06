import Link from "next/link";
import {
  Users,
  Briefcase,
  MessageSquare,
  ClipboardList,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { getGreeting } from "@/lib/utils";
import { formatYearMonthLabel } from "@/lib/utils/dates";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AdminWelcomeHeroProps {
  displayName: string;
  isSuperAdmin?: boolean;
  yearMonth: string;
  totals: {
    members: number;
    accounts: number;
    messagesThisPeriod: number;
    accountsToday: number;
    weeklySubmitted: number;
    weeklyMissing: number;
  };
  filterSlot?: React.ReactNode;
}

const quickLinks = [
  { href: "/team-members", label: "Team Members", icon: Users },
  { href: "/weekly-activity", label: "Weekly Activity", icon: ClipboardList },
  { href: "/accounts", label: "Accounts", icon: Briefcase },
  { href: "/messages", label: "Messages", icon: MessageSquare },
  { href: "/fines", label: "Fines & Debts", icon: AlertTriangle },
  { href: "/performance", label: "Performance", icon: TrendingUp },
];

export function AdminWelcomeHero({
  displayName,
  isSuperAdmin,
  yearMonth,
  totals,
  filterSlot,
}: AdminWelcomeHeroProps) {
  const firstName = displayName.split(" ")[0] || displayName;

  return (
    <section className="relative overflow-hidden rounded-3xl border border-brand-green/15 bg-gradient-to-br from-brand-green-light/50 via-white to-brand-orange-light/40 shadow-sm">
      {/* Soft atmosphere */}
      <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-brand-green/10 blur-3xl" />
      <div className="pointer-events-none absolute -left-10 bottom-0 h-48 w-48 rounded-full bg-brand-orange/15 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.35] bg-[radial-gradient(circle_at_80%_20%,rgba(22,163,74,0.12),transparent_45%)]" />

      <div className="relative p-6 md:p-8 lg:p-10 space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-brand-green-dark">
              <Sparkles className="h-3.5 w-3.5 text-brand-orange" />
              UNSTOPPABLE TEAM
            </p>
            <h1 className="mt-3 text-3xl md:text-4xl lg:text-[2.75rem] font-extrabold tracking-tight text-neutral-900 leading-tight">
              {getGreeting()}, {firstName}
            </h1>
            <p className="mt-3 text-base md:text-lg text-neutral-600 max-w-xl leading-relaxed">
              Welcome back
              {isSuperAdmin ? " — you're running the show as Super Admin" : ""}.
              Here&apos;s a calm look at your team for{" "}
              <span className="font-semibold text-neutral-800">
                {formatYearMonthLabel(yearMonth)}
              </span>
              .
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href="/weekly-activity">
                <Button className="shadow-sm">
                  Review weekly activity
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
              <Link href="/team-members">
                <Button variant="outline">Browse team</Button>
              </Link>
            </div>
          </div>

          {filterSlot && (
            <div className="shrink-0 rounded-xl border border-white/80 bg-white/70 backdrop-blur p-1.5 shadow-sm">
              {filterSlot}
            </div>
          )}
        </div>

        {/* Snapshot metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Snapshot
            label="Active members"
            value={totals.members}
            hint="on the team"
            tone="green"
          />
          <Snapshot
            label="Fiverr accounts"
            value={totals.accounts}
            hint={`${totals.accountsToday} added today`}
            tone="orange"
          />
          <Snapshot
            label="Messages"
            value={totals.messagesThisPeriod}
            hint="this period"
            tone="green"
          />
          <Snapshot
            label="Weekly logs"
            value={totals.weeklySubmitted}
            hint={`${totals.weeklyMissing} still missing`}
            tone="orange"
          />
        </div>

        {/* Quick links */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-3">
            Jump to
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {quickLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group flex items-center gap-2 rounded-xl border border-neutral-100 bg-white/80 px-3 py-2.5 text-sm font-medium text-neutral-700 hover:border-brand-green/30 hover:bg-white hover:text-brand-green-dark transition-colors shadow-sm"
              >
                <item.icon className="h-4 w-4 text-brand-green shrink-0 group-hover:scale-110 transition-transform" />
                <span className="truncate">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Snapshot({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: number;
  hint: string;
  tone: "green" | "orange";
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border bg-white/80 backdrop-blur px-4 py-3.5 shadow-sm",
        tone === "green" ? "border-brand-green/15" : "border-brand-orange/20"
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
        {label}
      </p>
      <p className="text-2xl md:text-3xl font-extrabold tabular-nums text-neutral-900 mt-1">
        {value}
      </p>
      <p className="text-xs text-neutral-500 mt-0.5">{hint}</p>
    </div>
  );
}
