import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PersonalDashboard } from "@/components/dashboard/personal-dashboard";
import { MemberAccountsPanel } from "@/components/accounts/member-accounts-panel";
import { MemberMessagesPanel } from "@/components/messages/member-messages-panel";
import { MemberVerificationPanel } from "@/components/accounts/member-verification-panel";
import { MemberMonthlyPlanPanel } from "@/components/members/member-monthly-plan-panel";
import { MemberFineOnGroundBanner } from "@/components/members/member-fine-on-ground-banner";
import { MemberMyDebtPanel } from "@/components/members/member-my-debt-panel";
import { MemberMyFinesPanel } from "@/components/members/member-my-fines-panel";
import { CurrencyRatesWidget } from "@/components/shared/currency-rates-widget";
import { CurrencyConverter } from "@/components/shared/currency-converter";
import { LocationCard } from "@/components/shared/location-card";
import { MemberActivityFeed } from "@/components/members/member-activity-feed";
import { MemberProgressActivityBars } from "@/components/members/member-progress-activity-bars";
import { buildMemberActivityFeed } from "@/lib/members/activity-feed";
import {
  buildMemberProgressMetrics,
  currentYearMonthLagos,
} from "@/lib/members/progress-metrics";
import { getSponsoredMembers } from "@/lib/auth/sponsor-access";
import { getDateRange } from "@/lib/utils/dates";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Plus,
  Users,
  ChevronRight,
  MessageSquare,
  Briefcase,
  TrendingUp,
  Star,
  Target,
} from "lucide-react";
import { getGreeting } from "@/lib/utils";
import type { MemberWeeklyEarning, MemberMonthlyPlan, TeamMember } from "@/types/database";

interface MemberDashboardProps {
  member: Pick<TeamMember, "id" | "full_name" | "preferred_name" | "status"> & Partial<TeamMember>;
  sponsorName?: string | null;
  isSuperAdmin?: boolean;
}

export async function MemberDashboard({ member, sponsorName, isSuperAdmin }: MemberDashboardProps) {
  const supabase = await createClient();
  const { data: fullMember } = await supabase
    .from("team_members")
    .select("*")
    .eq("id", member.id)
    .single();

  const profile = fullMember ?? (member as TeamMember);
  const { members: team } = await getSponsoredMembers(supabase, profile.id);
  const thisMonth = getDateRange("this_month");
  const lastMonth = getDateRange("last_month");
  const yearMonth = currentYearMonthLagos();

  const [
    { data: accounts },
    { data: messages },
    { data: earnings },
    { data: monthlyPlans },
    { count: totalAccounts },
    { count: totalMessages },
    { count: messagesThisMonth },
    { count: messagesLastMonth },
  ] = await Promise.all([
    supabase.from("fiverr_accounts").select("*").eq("team_member_id", profile.id).is("archived_at", null),
    supabase.from("messages").select("*").eq("team_member_id", profile.id),
    supabase.from("member_weekly_earnings").select("*").eq("team_member_id", profile.id).order("updated_at", { ascending: false }).limit(50),
    supabase.from("member_monthly_plans").select("*").eq("team_member_id", profile.id),
    supabase.from("fiverr_accounts").select("id", { count: "exact", head: true }).eq("team_member_id", profile.id).is("archived_at", null),
    supabase.from("messages").select("id", { count: "exact", head: true }).eq("team_member_id", profile.id),
    supabase.from("messages").select("id", { count: "exact", head: true }).eq("team_member_id", profile.id).gte("received_date", thisMonth.from).lte("received_date", thisMonth.to),
    supabase.from("messages").select("id", { count: "exact", head: true }).eq("team_member_id", profile.id).gte("received_date", lastMonth.from).lte("received_date", lastMonth.to),
  ]);

  const memberActivity = buildMemberActivityFeed({
    accounts: accounts ?? [],
    messages: messages ?? [],
    earnings: (earnings ?? []) as MemberWeeklyEarning[],
    monthlyPlans: (monthlyPlans ?? []) as MemberMonthlyPlan[],
    limit: 12,
  });

  const displayName = profile.preferred_name ?? profile.full_name?.split(" ")[0] ?? "there";
  const greeting = getGreeting();

  // Latest monthly plan for earning overview
  const latestPlan = (monthlyPlans ?? []).sort(
    (a, b) => new Date((b as MemberMonthlyPlan).year_month + "-01").getTime() - new Date((a as MemberMonthlyPlan).year_month + "-01").getTime()
  )[0] as MemberMonthlyPlan | undefined;

  const currentPlan =
    ((monthlyPlans ?? []) as MemberMonthlyPlan[]).find((p) => p.year_month === yearMonth) ??
    latestPlan ??
    null;

  const progressMetrics = buildMemberProgressMetrics({
    yearMonth,
    plan: currentPlan,
    earnings: (earnings ?? []) as MemberWeeklyEarning[],
    messagesThisMonth: messagesThisMonth ?? 0,
    messagesLastMonth: messagesLastMonth ?? 0,
  });

  const activeAccounts = (accounts ?? []).filter(
    (a) => a.status === "active" || a.status === "verified"
  ).length;

  return (
    <div className="space-y-8">
      {/* Alerts */}
      <MemberFineOnGroundBanner teamMemberId={profile.id} />

      {/* Hero header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-green via-brand-green-dark to-emerald-900 text-white px-6 py-8 md:px-10 md:py-10 shadow-lg">
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-40 h-40 rounded-full bg-white/5 translate-y-1/2 -translate-x-1/4" />

        <div className="relative flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
          <div>
            <p className="text-emerald-200 text-sm font-medium uppercase tracking-widest">
              {greeting}
            </p>
            <h1 className="text-3xl md:text-4xl font-extrabold mt-1">
              {displayName} 👋
            </h1>
            <p className="text-emerald-100/80 mt-2 text-sm md:text-base max-w-lg">
              Welcome to your dashboard — track your accounts, earnings, and goals all in one place.
            </p>
            {profile.status && (
              <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold bg-white/15 text-white rounded-full px-3 py-1 border border-white/20">
                <Star className="h-3 w-3" />
                {profile.status.charAt(0).toUpperCase() + profile.status.slice(1)} member
              </span>
            )}
          </div>

          <div className="flex gap-3 flex-wrap sm:flex-nowrap">
            <Link href="/my-accounts/new">
              <Button size="sm" className="bg-white text-brand-green hover:bg-emerald-50 font-semibold shadow">
                <Plus className="h-4 w-4 mr-1" />
                Add Account
              </Button>
            </Link>
            <Link href="/my-messages/new">
              <Button size="sm" variant="outline" className="border-white/40 text-white hover:bg-white/10">
                <MessageSquare className="h-4 w-4 mr-1" />
                Record Message
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <MemberProgressActivityBars metrics={progressMetrics} />

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/my-accounts" className="block group">
          <div className="rounded-xl border border-neutral-100 bg-white p-4 shadow-sm hover:shadow-md hover:border-brand-green/30 transition-all">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">Accounts</p>
                <p className="text-3xl font-extrabold text-neutral-900 mt-1">{totalAccounts ?? 0}</p>
                <p className="text-xs text-neutral-400 mt-0.5">{activeAccounts} active</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-brand-green/10 flex items-center justify-center group-hover:bg-brand-green/20 transition-colors">
                <Briefcase className="h-5 w-5 text-brand-green" />
              </div>
            </div>
          </div>
        </Link>

        <Link href="/my-messages" className="block group">
          <div className="rounded-xl border border-neutral-100 bg-white p-4 shadow-sm hover:shadow-md hover:border-brand-orange/30 transition-all">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">Messages</p>
                <p className="text-3xl font-extrabold text-neutral-900 mt-1">{totalMessages ?? 0}</p>
                <p className="text-xs text-neutral-400 mt-0.5">all time</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-brand-orange/10 flex items-center justify-center group-hover:bg-brand-orange/20 transition-colors">
                <MessageSquare className="h-5 w-5 text-brand-orange" />
              </div>
            </div>
          </div>
        </Link>

        <Link href="/my-monthly-plan" className="block group">
          <div className="rounded-xl border border-neutral-100 bg-white p-4 shadow-sm hover:shadow-md hover:border-violet-200 transition-all">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">Monthly Goal</p>
                <p className="text-3xl font-extrabold text-neutral-900 mt-1">
                  {latestPlan ? `₦${Number(latestPlan.income_goal ?? 0).toLocaleString()}` : "—"}
                </p>
                <p className="text-xs text-neutral-400 mt-0.5">this month</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-violet-100 flex items-center justify-center group-hover:bg-violet-200 transition-colors">
                <Target className="h-5 w-5 text-violet-600" />
              </div>
            </div>
          </div>
        </Link>

        <Link href="/my-team" className="block group">
          <div className="rounded-xl border border-neutral-100 bg-white p-4 shadow-sm hover:shadow-md hover:border-sky-200 transition-all">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">My Team</p>
                <p className="text-3xl font-extrabold text-neutral-900 mt-1">{team.length}</p>
                <p className="text-xs text-neutral-400 mt-0.5">
                  {team.length === 0 ? "no members yet" : team.length === 1 ? "member" : "members"}
                </p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-sky-100 flex items-center justify-center group-hover:bg-sky-200 transition-colors">
                <Users className="h-5 w-5 text-sky-600" />
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Live exchange rates + detected location */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <CurrencyRatesWidget variant="banner" />
        </div>
        <LocationCard />
      </div>

      {/* Fines panel */}
      <MemberMyFinesPanel teamMemberId={profile.id} variant="dashboard" />

      {/* Debt panel */}
      <MemberMyDebtPanel teamMemberId={profile.id} variant="dashboard" />

      {/* Team card (if has team) */}
      {team.length > 0 && (
        <Card className="border-sky-100 bg-gradient-to-r from-sky-50/60 to-white">
          <CardContent className="p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-xl bg-sky-100 flex items-center justify-center shrink-0">
                  <Users className="h-5 w-5 text-sky-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-neutral-900">My Team ({team.length})</h2>
                  <p className="text-sm text-neutral-500 mt-0.5">
                    {team.map((t) => t.full_name).join(", ")}
                  </p>
                </div>
              </div>
              <Link href="/my-team">
                <Button variant="outline" size="sm" className="shrink-0">
                  View team
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sponsor info */}
      {sponsorName && (
        <div className="text-sm text-neutral-500 px-1">
          Sponsored by <span className="font-semibold text-neutral-700">{sponsorName}</span>
        </div>
      )}

      {/* Personal stats + charts */}
      <PersonalDashboard
        member={profile}
        sponsorName={sponsorName}
        showAddAccount
        showAddMessage
        accountsBasePath="/my-accounts"
        messagesBasePath="/my-messages"
        subtitle="Your earnings overview and performance charts."
        isSuperAdmin={isSuperAdmin}
        showProgressBars={false}
        preloaded={{
          accounts: accounts ?? [],
          messages: messages ?? [],
          messagesThisMonth: messagesThisMonth ?? 0,
          messagesLastMonth: messagesLastMonth ?? 0,
          monthlyPlan: currentPlan,
          earnings: (earnings ?? []) as MemberWeeklyEarning[],
        }}
      />

      {/* Accounts */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="font-semibold text-neutral-900 flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-brand-green" />
            My Fiverr Accounts
          </h2>
          <Link href="/my-accounts/new">
            <Button size="sm" variant="ghost" className="text-brand-green text-xs h-7">
              <Plus className="h-3.5 w-3.5 mr-1" /> Add
            </Button>
          </Link>
        </div>
        <MemberAccountsPanel
          memberId={profile.id}
          memberName={profile.full_name}
          basePath="/my-accounts"
        />
      </div>

      {/* Verification */}
      <MemberVerificationPanel teamMemberId={profile.id} />

      {/* Messages */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="font-semibold text-neutral-900 flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-brand-orange" />
            My Messages
          </h2>
          <Link href="/my-messages/new">
            <Button size="sm" variant="ghost" className="text-brand-orange text-xs h-7">
              <Plus className="h-3.5 w-3.5 mr-1" /> Record
            </Button>
          </Link>
        </div>
        <MemberMessagesPanel
          memberId={profile.id}
          memberName={profile.full_name}
          basePath="/my-messages"
        />
      </div>

      {/* Monthly Plan */}
      <div className="space-y-2">
        <div className="flex items-center px-1 gap-2">
          <TrendingUp className="h-4 w-4 text-violet-600" />
          <h2 className="font-semibold text-neutral-900">Monthly Goals & Earnings</h2>
        </div>
        <MemberMonthlyPlanPanel
          teamMemberId={profile.id}
          memberName={profile.full_name}
        />
      </div>

      {/* Currency tools */}
      <div className="grid sm:grid-cols-2 gap-4">
        <CurrencyRatesWidget variant="card" />
        <CurrencyConverter />
      </div>

      {/* Activity */}
      {memberActivity.length > 0 && (
        <Card className="border-neutral-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-500" />
              Your Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MemberActivityFeed items={memberActivity} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
