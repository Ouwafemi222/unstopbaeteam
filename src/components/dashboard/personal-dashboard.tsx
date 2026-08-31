import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AccountStatusBadge } from "@/components/shared/status-badges";
import {
  Briefcase,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  Edit,
  Plus,
  Sparkles,
  Globe,
  Calendar,
} from "lucide-react";
import { formatDate, getMessageServiceLabel, getGreeting } from "@/lib/utils";
import { getDateRange, MEMBER_STATUS_LABELS } from "@/lib/utils/dates";
import { MemberCharts } from "@/components/dashboard/member-charts";
import type { FiverrAccount, Message, TeamMember } from "@/types/database";

interface PreloadedData {
  accounts: FiverrAccount[];
  messages: Message[];
  messagesThisMonth: number;
  messagesLastMonth: number;
}

interface PersonalDashboardProps {
  member: TeamMember;
  sponsorName?: string | null;
  showEditLink?: boolean;
  showAddAccount?: boolean;
  /** Link target for add/view accounts (default: team-members profile path) */
  accountsBasePath?: string;
  subtitle?: string;
  preloaded?: PreloadedData;
}

function buildChartData(
  messages: Message[],
  accounts: FiverrAccount[]
) {
  const monthlyMap = new Map<string, number>();
  messages.forEach((m) => {
    const month = m.received_date.substring(0, 7);
    monthlyMap.set(month, (monthlyMap.get(month) || 0) + 1);
  });
  const messagesByMonth = [...monthlyMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-8)
    .map(([month, count]) => ({ month: month.substring(5), count }));

  const serviceCounts = new Map<string, number>();
  messages.forEach((m) => {
    const name = getMessageServiceLabel(m);
    if (name !== "—") serviceCounts.set(name, (serviceCounts.get(name) || 0) + 1);
  });
  const topServices = [...serviceCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const countryCounts = new Map<string, { name: string; count: number; flag?: string | null }>();
  accounts.forEach((a) => {
    const country = a.country as { name?: string; flag_emoji?: string | null } | null;
    const key = country?.name ?? "Unknown";
    const existing = countryCounts.get(key);
    if (existing) existing.count++;
    else countryCounts.set(key, { name: key, count: 1, flag: country?.flag_emoji });
  });
  const accountsByCountry = [...countryCounts.values()].sort((a, b) => b.count - a.count);

  return { messagesByMonth, topServices, accountsByCountry };
}

export async function PersonalDashboard({
  member,
  sponsorName,
  showEditLink,
  showAddAccount,
  accountsBasePath,
  subtitle,
  preloaded,
}: PersonalDashboardProps) {
  const accountsPath = accountsBasePath ?? `/team-members/${member.id}/accounts`;
  const accountsTabHref = accountsBasePath ?? `/team-members/${member.id}?tab=accounts`;
  const supabase = await createClient();
  const thisMonth = getDateRange("this_month");
  const lastMonth = getDateRange("last_month");

  let accounts = preloaded?.accounts;
  let messages = preloaded?.messages;
  let messagesThisMonth = preloaded?.messagesThisMonth;
  let messagesLastMonth = preloaded?.messagesLastMonth;

  if (!preloaded) {
    const [accRes, msgRes, monthRes, lastRes] = await Promise.all([
      supabase
        .from("fiverr_accounts")
        .select("*, country:countries(name, flag_emoji)")
        .eq("team_member_id", member.id)
        .is("archived_at", null)
        .order("opening_date", { ascending: false }),
      supabase
        .from("messages")
        .select("*, service:services(name)")
        .eq("team_member_id", member.id)
        .order("received_date", { ascending: false }),
      supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("team_member_id", member.id)
        .gte("received_date", thisMonth.from)
        .lte("received_date", thisMonth.to),
      supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("team_member_id", member.id)
        .gte("received_date", lastMonth.from)
        .lte("received_date", lastMonth.to),
    ]);
    accounts = accRes.data ?? [];
    messages = msgRes.data ?? [];
    messagesThisMonth = monthRes.count ?? 0;
    messagesLastMonth = lastRes.count ?? 0;
  }

  const accountList = accounts ?? [];
  const messageList = messages ?? [];
  const activeAccounts =
    accountList.filter((a) => a.status === "active" || a.status === "verified").length;
  const growth =
    (messagesLastMonth ?? 0) > 0
      ? Math.round(
          (((messagesThisMonth ?? 0) - (messagesLastMonth ?? 0)) / (messagesLastMonth ?? 1)) * 100
        )
      : (messagesThisMonth ?? 0) > 0
        ? 100
        : 0;

  const initials = member.full_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const chartData = buildChartData(messageList, accountList);
  const recentAccounts = accountList.slice(0, 6);
  const recentMessages = messageList.slice(0, 6);
  const bestService = chartData.topServices[0]?.name;

  const heroStats = [
    { label: "Fiverr Accounts", value: accountList.length, icon: Briefcase },
    { label: "This Month", value: messagesThisMonth ?? 0, icon: MessageSquare },
    { label: "All Messages", value: messageList.length, icon: Sparkles },
    {
      label: "Growth",
      value: `${growth > 0 ? "+" : ""}${growth}%`,
      icon: growth >= 0 ? TrendingUp : TrendingDown,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-green via-[#15803d] to-brand-orange shadow-xl">
        <div className="absolute inset-0 opacity-[0.12] bg-[radial-gradient(circle_at_20%_30%,white,transparent_45%),radial-gradient(circle_at_80%_70%,white,transparent_40%)]" />
        <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -left-4 bottom-0 h-32 w-32 rounded-full bg-brand-orange/30 blur-2xl" />

        <div className="relative p-6 md:p-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 text-2xl font-bold text-white shadow-lg">
                {initials}
              </div>
              <div>
                <p className="text-white/80 text-sm font-medium">{getGreeting()}</p>
                <h1 className="text-2xl md:text-3xl font-bold text-white mt-0.5">{member.full_name}</h1>
                {member.preferred_name && (
                  <p className="text-white/70 text-sm mt-0.5">{member.preferred_name}</p>
                )}
                <p className="text-white/60 text-sm mt-2 max-w-md">
                  {subtitle ?? "Your performance hub — accounts and messages synced from the team sheet."}
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className="inline-flex items-center rounded-full bg-white/20 backdrop-blur px-3 py-1 text-xs font-medium text-white border border-white/20">
                    {MEMBER_STATUS_LABELS[member.status]}
                  </span>
                  {sponsorName && (
                    <span className="inline-flex items-center rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-medium text-white/90 border border-white/15">
                      Sponsor: {sponsorName}
                    </span>
                  )}
                  {bestService && (
                    <span className="inline-flex items-center rounded-full bg-brand-orange/40 backdrop-blur px-3 py-1 text-xs font-medium text-white border border-white/15">
                      Top gig: {bestService}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {showEditLink && (
              <Link href={`/team-members/${member.id}/edit`}>
                <Button variant="secondary" className="bg-white/95 hover:bg-white text-brand-green-dark shadow-md">
                  <Edit className="h-4 w-4" /> Edit Profile
                </Button>
              </Link>
            )}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
            {heroStats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl bg-white/10 backdrop-blur-md border border-white/20 p-4 transition hover:bg-white/15"
              >
                <stat.icon className="h-5 w-5 text-white/80 mb-2" />
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-xs text-white/70 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          {
            label: "Active Accounts",
            value: activeAccounts,
            color: "from-emerald-500/10 to-emerald-500/5",
            iconColor: "text-emerald-600",
          },
          {
            label: "Messages Last Month",
            value: messagesLastMonth ?? 0,
            color: "from-blue-500/10 to-blue-500/5",
            iconColor: "text-blue-600",
          },
          {
            label: "Msgs per Account",
            value: accountList.length > 0 ? (messageList.length / accountList.length).toFixed(1) : "0",
            color: "from-violet-500/10 to-violet-500/5",
            iconColor: "text-violet-600",
          },
        ].map((stat) => (
          <Card key={stat.label} className={`border-0 shadow-sm bg-gradient-to-br ${stat.color}`}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`rounded-lg bg-white p-2 shadow-sm ${stat.iconColor}`}>
                <TrendingUp className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs text-neutral-500">{stat.label}</p>
                <p className="text-xl font-bold text-neutral-900">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <MemberCharts {...chartData} />

      {/* Accounts + Messages */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between border-b border-neutral-100 bg-neutral-50/80">
            <CardTitle className="text-base flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-brand-green" />
              Fiverr Accounts
            </CardTitle>
            <div className="flex items-center gap-3">
              {showAddAccount && (
                <Link href={`${accountsPath}/new`}>
                  <Button size="sm" variant="secondary" className="h-8">
                    <Plus className="h-3.5 w-3.5" />
                    Add Account
                  </Button>
                </Link>
              )}
              <Link
                href={accountsBasePath ?? accountsTabHref}
                className="text-sm font-medium text-brand-green hover:underline"
              >
                View all ({accountList.length})
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {recentAccounts.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-sm text-neutral-500 mb-3">No accounts yet.</p>
                {showAddAccount && (
                  <Link href={`${accountsPath}/new`}>
                    <Button size="sm">Add Your First Account</Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="divide-y divide-neutral-100">
                {recentAccounts.map((acc) => (
                  <div
                    key={acc.id}
                    className="flex items-center justify-between px-5 py-3.5 hover:bg-brand-green-light/20 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-green-light text-brand-green-dark">
                        <Globe className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-neutral-900 truncate">{acc.username}</p>
                        <p className="text-xs text-neutral-400 flex items-center gap-1">
                          {(acc.country as { flag_emoji?: string; name?: string })?.flag_emoji}{" "}
                          {(acc.country as { name?: string })?.name ?? "—"}
                          {acc.opening_date && (
                            <>
                              <span className="text-neutral-300">·</span>
                              <Calendar className="h-3 w-3 inline" />
                              {formatDate(acc.opening_date)}
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                    <AccountStatusBadge status={acc.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between border-b border-neutral-100 bg-neutral-50/80">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-brand-orange" />
              Recent Messages
            </CardTitle>
            <Link
              href={`/team-members/${member.id}?tab=messages`}
              className="text-sm font-medium text-brand-green hover:underline"
            >
              View all ({messageList.length})
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {recentMessages.length === 0 ? (
              <p className="p-6 text-sm text-neutral-500">No messages synced yet.</p>
            ) : (
              <div className="divide-y divide-neutral-100">
                {recentMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className="flex items-center gap-3 px-5 py-3.5 hover:bg-brand-orange-light/30 transition-colors"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-orange-light to-brand-green-light text-xs font-bold text-brand-green-dark">
                      {getMessageServiceLabel(msg).charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-neutral-900 truncate">{getMessageServiceLabel(msg)}</p>
                      <p className="text-xs text-neutral-400">{formatDate(msg.received_date)}</p>
                    </div>
                    <Badge variant="neutral" className="shrink-0 text-[10px]">
                      {msg.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
