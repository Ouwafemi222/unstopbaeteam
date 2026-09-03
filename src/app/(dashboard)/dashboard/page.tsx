import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getUserScope } from "@/lib/auth/scope";
import { getGreeting } from "@/lib/utils";
import { getDateRange, startOfTodayLagosIso } from "@/lib/utils/dates";
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

    return <MemberDashboard member={scope.teamMember} sponsorName={sponsor?.full_name} />;
  }

  const params = await searchParams;
  const filter = (params.filter as "today" | "this_week" | "this_month" | "last_month") || "this_month";
  const dateRange = getDateRange(filter);
  const user = scope.user;
  const supabase = await createClient();
  const todayStartIso = startOfTodayLagosIso();

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
  ]);

  const memberMessageCounts = new Map<string, number>();
  messages?.forEach((m) => {
    memberMessageCounts.set(m.team_member_id, (memberMessageCounts.get(m.team_member_id) || 0) + 1);
  });

  const membersWithMessages = memberMessageCounts.size;
  const membersWithZero = (members?.length ?? 0) - membersWithMessages;

  const topMember = [...memberMessageCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  const topMemberName = topMember ? members?.find((m) => m.id === topMember[0])?.full_name : null;

  const serviceCounts = new Map<string, number>();
  messages?.forEach((m) => {
    if (m.service_id) serviceCounts.set(m.service_id, (serviceCounts.get(m.service_id) || 0) + 1);
  });

  const countryCounts = new Map<string, number>();
  accounts?.forEach((a) => {
    if (a.country_id) countryCounts.set(a.country_id, (countryCounts.get(a.country_id) || 0) + 1);
  });

  const stats = [
    { label: "Total Team Members", value: totalMembers ?? 0, icon: Users, color: "text-brand-green" },
    { label: "Total Fiverr Accounts", value: totalAccounts ?? 0, icon: Briefcase, color: "text-brand-orange" },
    { label: "Accounts Added Today", value: accountsAddedToday ?? 0, icon: Briefcase, color: "text-emerald-600" },
    { label: "Accounts Opened (period)", value: accountsThisMonth ?? 0, icon: TrendingUp, color: "text-blue-600" },
    { label: "Messages This Period", value: messagesThisMonth ?? 0, icon: MessageSquare, color: "text-purple-600" },
    { label: "Members With Messages", value: membersWithMessages, icon: Users, color: "text-emerald-600" },
    { label: "Zero Messages", value: membersWithZero, icon: AlertTriangle, color: "text-red-500" },
  ];

  const zeroMessageMembers = members?.filter((m) => !memberMessageCounts.has(m.id)) ?? [];

  return (
    <div className="space-y-6">
      {/* Team command center hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-neutral-900 via-neutral-800 to-brand-green-dark shadow-xl">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_70%_20%,#16a34a,transparent_50%)]" />
        <div className="relative p-6 md:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-white/60 text-sm font-medium uppercase tracking-wider">Team Command Center</p>
            <h1 className="text-2xl md:text-3xl font-bold text-white mt-1">
              {getGreeting()}, {user?.profile?.preferred_name || user?.profile?.full_name || "there"}
            </h1>
            <p className="text-white/60 mt-2">Here&apos;s what&apos;s happening across UNSTOPPABLE TEAM today.</p>
          </div>
          <Suspense fallback={<div className="h-9 w-72 animate-pulse rounded-lg bg-white/10" />}>
            <DateFilterBar current={filter} />
          </Suspense>
        </div>
      </div>

      <AdminAddMemberCard />

      <AdminFineOnGroundCard />

      <AdminUnpaidFinesPanel variant="dashboard" />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-0 shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <p className="text-2xl font-bold text-neutral-900">{stat.value}</p>
              <p className="text-xs text-neutral-500 mt-1">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {(topMemberName || zeroMessageMembers.length > 0) && (
        <div className="grid md:grid-cols-2 gap-4">
          {topMemberName && (
            <Card className="border-brand-green/20 bg-brand-green/5">
              <CardContent className="p-4 flex items-center gap-3">
                <TrendingUp className="h-8 w-8 text-brand-green" />
                <div>
                  <p className="text-sm text-neutral-500">Top Performing Member</p>
                  <p className="text-lg font-bold text-neutral-900">{topMemberName}</p>
                  <p className="text-sm text-brand-green">{topMember?.[1]} messages</p>
                </div>
              </CardContent>
            </Card>
          )}
          {zeroMessageMembers.length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  <p className="font-semibold text-red-700">No Messages This Period — {zeroMessageMembers.length} Members</p>
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

      <div className="grid lg:grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Messages</CardTitle>
          </CardHeader>
          <CardContent>
            {recentMessages?.length === 0 ? (
              <p className="text-sm text-neutral-500">No messages recorded yet.</p>
            ) : (
              <div className="responsive-table">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-neutral-500">
                      <th className="pb-2 font-medium">Member</th>
                      <th className="pb-2 font-medium">Service</th>
                      <th className="pb-2 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentMessages?.map((msg) => (
                      <tr key={msg.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                        <td className="py-2.5">{(msg.team_member as { full_name: string })?.full_name}</td>
                        <td className="py-2.5">{getMessageServiceLabel(msg)}</td>
                        <td className="py-2.5">{formatDate(msg.received_date)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
