import Link from "next/link";
import type { ReactNode } from "react";
import {
  Users,
  Briefcase,
  MessageSquare,
  ClipboardList,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  TrendingUp,
  Radio,
  Plus,
} from "lucide-react";
import { getGreeting } from "@/lib/utils";
import { formatYearMonthLabel } from "@/lib/utils/dates";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LiveTeamPulse } from "@/components/dashboard/live-team-pulse";

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
  filterSlot?: ReactNode;
}

const quickLinks = [
  { href: "/team-members", label: "Team", icon: Users, tone: "green" as const },
  { href: "/weekly-activity", label: "Weekly", icon: ClipboardList, tone: "orange" as const },
  { href: "/accounts", label: "Accounts", icon: Briefcase, tone: "green" as const },
  { href: "/messages", label: "Messages", icon: MessageSquare, tone: "orange" as const },
  { href: "/fines", label: "Fines", icon: AlertTriangle, tone: "orange" as const },
  { href: "/performance", label: "Stats", icon: TrendingUp, tone: "green" as const },
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
    <section className="relative overflow-hidden rounded-[1.75rem] border border-brand-green/20 shadow-lg shadow-brand-green/5">
      {/* Full-bleed brand atmosphere */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-950 via-brand-green-dark to-emerald-800" />
      <div className="pointer-events-none absolute -right-20 -top-24 h-80 w-80 rounded-full bg-brand-orange/25 blur-3xl" />
      <div className="pointer-events-none absolute -left-16 bottom-0 h-64 w-64 rounded-full bg-brand-green/40 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_70%_0%,rgba(255,255,255,0.18),transparent_50%)]" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.35) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      <div className="relative p-5 sm:p-7 lg:p-9 space-y-6">
        <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-6">
          <div className="max-w-2xl text-white">
            <div className="flex flex-wrap items-center gap-2">
              <p className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-100 backdrop-blur">
                <Sparkles className="h-3.5 w-3.5 text-brand-orange" />
                Unstoppable Team
              </p>
              {isSuperAdmin && (
                <span className="inline-flex items-center rounded-full bg-brand-orange px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
                  Super Admin
                </span>
              )}
            </div>

            <h1 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.05]">
              {getGreeting()}, {firstName}
            </h1>
            <p className="mt-3 text-sm sm:text-base text-emerald-50/85 max-w-xl leading-relaxed">
              Command center for{" "}
              <span className="font-semibold text-white">{formatYearMonthLabel(yearMonth)}</span>
              — watch the live stream, chase missing weekly logs, and keep the team moving.
            </p>

            <div className="mt-5 flex flex-wrap gap-2.5">
              <Link href="/weekly-activity">
                <Button className="bg-white text-brand-green-dark hover:bg-emerald-50 font-semibold shadow-md">
                  Review weekly activity
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
              <Link href="/messages/new">
                <Button
                  variant="outline"
                  className="border-white/35 bg-white/5 text-white hover:bg-white/15 hover:text-white"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Record message
                </Button>
              </Link>
              <Link href="/team-members">
                <Button
                  variant="outline"
                  className="border-white/35 bg-white/5 text-white hover:bg-white/15 hover:text-white"
                >
                  Browse team
                </Button>
              </Link>
            </div>
          </div>

          {filterSlot && (
            <div className="shrink-0 self-start rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md p-2 shadow-lg">
              <p className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-100/80">
                Period
              </p>
              {filterSlot}
            </div>
          )}
        </div>

        {/* Live stream — first viewport focus */}
        <div className="rounded-2xl border border-white/15 bg-black/20 backdrop-blur-md p-3 sm:p-4 space-y-2.5 admin-hero-live-enter">
          <div className="flex items-center justify-between gap-2 px-0.5">
            <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-100">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-orange opacity-70" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-orange" />
              </span>
              <Radio className="h-3.5 w-3.5" />
              Live team stream
            </p>
            <p className="text-[11px] text-emerald-100/70 hidden sm:block">
              Messages &amp; accounts slide through here in real time
            </p>
          </div>
          <div className="[&_.live-pulse-empty]:border-white/20 [&_.live-pulse-empty]:bg-white/5 [&_.live-pulse-empty]:text-emerald-50/80">
            <LiveTeamPulse variant="embedded" />
          </div>
        </div>

        {/* Snapshot metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Snapshot
            label="Active members"
            value={totals.members}
            hint="on the team"
            icon={Users}
            delay={0}
          />
          <Snapshot
            label="Fiverr accounts"
            value={totals.accounts}
            hint={`${totals.accountsToday} added today`}
            icon={Briefcase}
            delay={1}
          />
          <Snapshot
            label="Messages"
            value={totals.messagesThisPeriod}
            hint="this period"
            icon={MessageSquare}
            delay={2}
          />
          <Snapshot
            label="Weekly logs"
            value={totals.weeklySubmitted}
            hint={`${totals.weeklyMissing} still missing`}
            icon={ClipboardList}
            delay={3}
            alert={totals.weeklyMissing > 0}
          />
        </div>

        {/* Quick links */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-100/70 mb-2.5 px-0.5">
            Jump to
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {quickLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-white/15 bg-white/10 px-2 py-3 text-center text-white backdrop-blur hover:bg-white hover:text-brand-green-dark transition-all duration-200 hover:-translate-y-0.5"
              >
                <item.icon
                  className={cn(
                    "h-5 w-5 transition-colors",
                    item.tone === "orange" ? "text-brand-orange group-hover:text-brand-orange-dark" : "text-emerald-200 group-hover:text-brand-green"
                  )}
                />
                <span className="text-xs font-semibold truncate w-full">{item.label}</span>
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
  icon: Icon,
  delay,
  alert,
}: {
  label: string;
  value: number;
  hint: string;
  icon: typeof Users;
  delay: number;
  alert?: boolean;
}) {
  return (
    <div
      className={cn(
        "admin-hero-stat rounded-2xl border border-white/15 bg-white/10 backdrop-blur px-4 py-4 text-white shadow-sm",
        alert && "ring-1 ring-brand-orange/50"
      )}
      style={{ animationDelay: `${delay * 70}ms` }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-100/75">{label}</p>
        <Icon className="h-4 w-4 text-emerald-200/80 shrink-0" />
      </div>
      <p className="text-3xl md:text-4xl font-extrabold tabular-nums mt-2 tracking-tight">{value}</p>
      <p className={cn("text-xs mt-1", alert ? "text-brand-orange font-medium" : "text-emerald-100/70")}>
        {hint}
      </p>
    </div>
  );
}
