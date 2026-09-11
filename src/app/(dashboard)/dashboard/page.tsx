import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getUserScope } from "@/lib/auth/scope";
import { getDateRange, startOfTodayLagosIso, currentYearMonth } from "@/lib/utils/dates";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Briefcase, MessageSquare, AlertTriangle, TrendingUp } from "lucide-react";
import Link from "next/link";
import { formatDate, getMessageServiceLabel } from "@/lib/utils";
import { DashboardCharts } from "@/components/dashboard/dashboard-charts";
import { DateFilterBar } from "@/components/dashboard/date-filter-bar";
import { MemberDashboard } from "@/components/dashboard/member-dashboard";
import { AdminAddMemberCard } from "@/components/dashboard/admin-add-member-card";
import { AdminFineOnGroundCard } from "@/components/dashboard/admin-fine-on-ground-card";
import { AdminUnpaidFinesPanel } from "@/components/dashboard/admin-unpaid-fines-panel";
import { AdminAccountActivityFeed } from "@/components/dashboard/admin-account-activity-feed";
import { AdminWelcomeHero } from "@/components/dashboard/admin-welcome-hero";
import { CurrencyRatesWidget } from "@/components/shared/currency-rates-widget";
import { LocationCard } from "@/components/shared/location-card";
import { hasWeekActivity } from "@/lib/members/progress-metrics";
import type { MemberWeeklyEarning } from "@/types/database";

interface DashboardPageProps {
  searchParams: Promise<{ filter?: string }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const scope = await getUserScope();
  if (!scope) return null;

  if (scope.isScopedMember && scope.teamMember) {
    const supabase = await createClient();
    const { data: sponsor } = scope.teamMember.sponsor_id
      ? await supabase.from("team_members").select("full_name").eq("id", scope.teamMember.sponsor_id).single()
      : { data: null };

    return (
      <MemberDashboard
        member={scope.teamMember}
        sponsorName={sponsor?.full_name}
        isSuperAdmin={scope.roleSlugs.includes("super_admin")}
      />
    );
  }

  const params = await searchParams;
  const filter = (params.filter as "today" | "this_week" | "this_month" | "last_month") || "this_month";
  const dateRange = getDateRange(filter);
  const user = scope.user;
  const supabase = await createClient();
  const todayStartIso = startOfTodayLagosIso();
  const yearMonth = currentYearMonth();

  const displayName =
    scope.teamMember?.preferred_name ||
    scope.teamMember?.full_name ||
    user?.profile?.preferred_name ||
    user?.profile?.full_name ||
    "there";

  const [
    { count: totalMembers },
    { count: totalAccounts },
    { count: accountsThisMonth },
    { count: messagesThisMonth },
    { count: accountsAddedToday },
    { data: todayAccounts },
    { data: recentAccounts },
    { data: recentMessages },
    { data: members },
    { data: messages },
    { data: accounts },
    { data: countries },
    { data: weeklyEarnings },
  ] = await Promise.all([
    supabase.from("team_members").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("fiverr_accounts").select("*", { count: "exact", head: true }).is("archived_at", null),
    supabase.from("fiverr_accounts").select("*", { count: "exact", head: true })
      .gte("opening_date", dateRange.from).lte("opening_date", dateRange.to),
    supabase.from("messages").select("*", { count: "exact", head: true })
      .gte("received_date", dateRange.from).lte("received_date", dateRange.to),
    supabase
      .from("fiverr_accounts")
      .select("*", { count: "exact", head: true })
      .is("archived_at", null)
      .gte("created_at", todayStartIso),
    supabase
      .from("fiverr_accounts")
      .select("id, username, status, created_at, opening_date, team_member:team_members(id, full_name), country:countries(name, flag_emoji)")
      .is("archived_at", null)
      .gte("created_at", todayStartIso)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("fiverr_accounts")
      .select("id, username, status, created_at, opening_date, team_member:team_members(id, full_name), country:countries(name, flag_emoji)")
      .is("archived_at", null)
      .order("created_at", { ascending: false })
      .limit(12),
    supabase.from("messages")
      .select("*, team_member:team_members(full_name), service:services(name), fiverr_account:fiverr_accounts(username)")
      .order("received_date", { ascending: false }).limit(5),
    supabase.from("team_members").select("id, full_name").eq("status", "active"),
    supabase.from("messages").select("team_member_id, service_id, received_date")
      .gte("received_date", dateRange.from).lte("received_date", dateRange.to),
    supabase.from("fiverr_accounts").select("country_id, team_member_id").is("archived_at", null),
    supabase.from("countries").select("id, name, flag_emoji"),
    supabase
      .from("member_weekly_earnings")
      .select("team_member_id, week_number, amount, prospects_count, office_prospects_count, contacts_count, personal_pv, group_pv, activities_done, skills_progress, year_month")
      .eq("year_month", yearMonth),
  ]);

  const memberMessageCounts = new Map<string, number>();
  messages?.forEach((m) => {
    memberMessageCounts.set(m.team_member_id, (memberMessageCounts.get(m.team_member_id) || 0) + 1);
  });

  const membersWithMessages = memberMessageCounts.size;
  const membersWithZero = (members?.length ?? 0) - membersWithMessages;

  const topMember = [...memberMessageCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  const topMemberName = topMember ? members?.find((m) => m.id === topMember[0])?.full_name : null;

  const countryCounts = new Map<string, number>();
  accounts?.forEach((a) => {
    if (a.country_id) countryCounts.set(a.country_id, (countryCounts.get(a.country_id) || 0) + 1);
  });

  const weeklyList = (weeklyEarnings ?? []) as MemberWeeklyEarning[];
  const membersWithWeekly = new Set(
    weeklyList.filter(hasWeekActivity).map((e) => e.team_member_id)
  );
  const weeklySubmitted = membersWithWeekly.size;
  const weeklyMissing = Math.max(0, (members?.length ?? 0) - weeklySubmitted);

  const stats = [
    { label: "Total Team Members", value: totalMembers ?? 0, icon: Users, color: "text-brand-green" },
    { label: "Total Fiverr Accounts", value: totalAccounts ?? 0, icon: Briefcase, color: "text-brand-orange" },
    { label: "Accounts Added Today", value: accountsAddedToday ?? 0, icon: Briefcase, color: "text-emerald-600" },
    { label: "Accounts Opened (period)", value: accountsThisMonth ?? 0, icon: TrendingUp, color: "text-blue-600" },
    { label: "Messages This Period", value: messagesThisMonth ?? 0, icon: MessageSquare, color: "text-violet-600" },
    { label: "Members With Messages", value: membersWithMessages, icon: Users, color: "text-emerald-600" },
    { label: "Zero Messages", value: membersWithZero, icon: AlertTriangle, color: "text-red-500" },
  ];

  const zeroMessageMembers = members?.filter((m) => !memberMessageCounts.has(m.id)) ?? [];

  return (
    <div className="space-y-6">
      <AdminWelcomeHero
        displayName={displayName}
        isSuperAdmin={scope.roleSlugs.includes("super_admin")}
        yearMonth={yearMonth}
        totals={{
          members: totalMembers ?? 0,
          accounts: totalAccounts ?? 0,
          messagesThisPeriod: messagesThisMonth ?? 0,
          accountsToday: accountsAddedToday ?? 0,
          weeklySubmitted,
          weeklyMissing,
        }}
        filterSlot={
          <Suspense fallback={<div className="h-9 w-72 animate-pulse rounded-lg bg-white/20" />}>
            <DateFilterBar current={filter} />
          </Suspense>
        }
      />

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <CurrencyRatesWidget variant="banner" />
        </div>
        <LocationCard />
      </div>

      <AdminAddMemberCard />

      <AdminFineOnGroundCard />

      <AdminUnpaidFinesPanel variant="dashboard" />

      <div>
        <div className="flex items-end justify-between gap-3 mb-3 px-0.5">
          <div>
            <h2 className="text-base font-semibold text-neutral-900">Period deep dive</h2>
            <p className="text-sm text-neutral-500">Extra counts for the selected filter</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          {stats.map((stat) => (
            <Card
              key={stat.label}
              className="border-neutral-100/80 bg-gradient-to-b from-white to-neutral-50/80 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-100">
                    <stat.icon className={`h-4.5 w-4.5 ${stat.color}`} />
                  </div>
                </div>
                <p className="text-2xl font-extrabold text-neutral-900 tabular-nums">{stat.value}</p>
                <p className="text-xs text-neutral-500 mt-1 leading-snug">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {(topMemberName || zeroMessageMembers.length > 0) && (
        <div className="grid md:grid-cols-2 gap-4">
          {topMemberName && (
            <Card className="overflow-hidden border-brand-green/25 bg-gradient-to-br from-brand-green-light/40 via-white to-white shadow-sm">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-green text-white shadow-md shadow-brand-green/30">
                  <TrendingUp className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-brand-green-dark">
                    Top performer
                  </p>
                  <p className="text-xl font-extrabold text-neutral-900 mt-0.5">{topMemberName}</p>
                  <p className="text-sm text-brand-green font-medium">{topMember?.[1]} messages this period</p>
                </div>
              </CardContent>
            </Card>
          )}
          {zeroMessageMembers.length > 0 && (
            <Card className="overflow-hidden border-red-200 bg-gradient-to-br from-red-50 via-white to-white shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-600">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-bold text-red-700">Needs a nudge</p>
                    <p className="text-xs text-red-600/80">
                      {zeroMessageMembers.length} members with zero messages
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {zeroMessageMembers.map((m) => (
                    <Link key={m.id} href={`/team-members/${m.id}`}>
                      <Badge variant="danger">{m.full_name}</Badge>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <DashboardCharts
        messages={messages ?? []}
        members={members ?? []}
        countries={countries ?? []}
        countryCounts={Object.fromEntries(countryCounts)}
      />

      <AdminAccountActivityFeed
        todayAccounts={(todayAccounts as never) ?? []}
        recentAccounts={(recentAccounts as never) ?? []}
      />

      <Card className="overflow-hidden border-brand-orange/20 shadow-sm">
        <CardHeader className="bg-gradient-to-r from-brand-orange-light/50 to-white border-b border-brand-orange/10">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-brand-orange-dark" />
            Recent messages
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {recentMessages?.length === 0 ? (
            <p className="text-sm text-neutral-500 p-5">No messages recorded yet.</p>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {recentMessages?.map((msg) => (
                <li
                  key={msg.id}
                  className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 hover:bg-brand-orange-light/20 transition-colors"
                >
                  <div>
                    <p className="font-semibold text-neutral-900">
                      {(msg.team_member as { full_name: string })?.full_name}
                    </p>
                    <p className="text-sm text-neutral-500">{getMessageServiceLabel(msg)}</p>
                  </div>
                  <p className="text-xs font-medium text-neutral-400 tabular-nums">
                    {formatDate(msg.received_date)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
