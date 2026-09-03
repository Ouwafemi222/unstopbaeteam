import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PersonalDashboard } from "@/components/dashboard/personal-dashboard";
import { MemberAccountsPanel } from "@/components/accounts/member-accounts-panel";
import { MemberMessagesPanel } from "@/components/messages/member-messages-panel";
import { MemberVerificationPanel } from "@/components/accounts/member-verification-panel";
import { MemberMonthlyPlanPanel } from "@/components/members/member-monthly-plan-panel";
import { MemberFineOnGroundBanner } from "@/components/members/member-fine-on-ground-banner";
import { MemberActivityFeed } from "@/components/members/member-activity-feed";
import { buildMemberActivityFeed } from "@/lib/members/activity-feed";
import { getSponsoredMembers } from "@/lib/auth/sponsor-access";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Users, ChevronRight, MessageSquare } from "lucide-react";
import type { MemberWeeklyEarning, MemberMonthlyPlan, TeamMember } from "@/types/database";

interface MemberDashboardProps {
  member: Pick<TeamMember, "id" | "full_name" | "preferred_name" | "status"> & Partial<TeamMember>;
  sponsorName?: string | null;
}

export async function MemberDashboard({ member, sponsorName }: MemberDashboardProps) {
  const supabase = await createClient();
  const { data: fullMember } = await supabase
    .from("team_members")
    .select("*")
    .eq("id", member.id)
    .single();

  const profile = fullMember ?? (member as TeamMember);
  const { members: team } = await getSponsoredMembers(supabase, profile.id);

  const [{ data: accounts }, { data: messages }, { data: earnings }, { data: monthlyPlans }] =
    await Promise.all([
      supabase.from("fiverr_accounts").select("*").eq("team_member_id", profile.id).is("archived_at", null),
      supabase.from("messages").select("*").eq("team_member_id", profile.id),
      supabase.from("member_weekly_earnings").select("*").eq("team_member_id", profile.id).order("updated_at", { ascending: false }).limit(50),
      supabase.from("member_monthly_plans").select("*").eq("team_member_id", profile.id),
    ]);

  const memberActivity = buildMemberActivityFeed({
    accounts: accounts ?? [],
    messages: messages ?? [],
    earnings: (earnings ?? []) as MemberWeeklyEarning[],
    monthlyPlans: (monthlyPlans ?? []) as MemberMonthlyPlan[],
    limit: 12,
  });

  return (
    <div className="space-y-8">
      <MemberFineOnGroundBanner teamMemberId={profile.id} />

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-xl border border-brand-green/20 bg-gradient-to-r from-brand-green-light/40 to-white p-5 shadow-sm">
          <div>
            <p className="text-sm font-medium text-brand-green-dark">Quick action</p>
            <h2 className="text-lg font-bold text-neutral-900 mt-0.5">Add Fiverr account</h2>
            <p className="text-sm text-neutral-600 mt-1">Record an account you opened.</p>
          </div>
          <Link href="/my-accounts/new">
            <Button size="lg" className="w-full sm:w-auto shrink-0">
              <Plus className="h-4 w-4" />
              Add Account
            </Button>
          </Link>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-xl border border-brand-orange/20 bg-gradient-to-r from-brand-orange-light/40 to-white p-5 shadow-sm">
          <div>
            <p className="text-sm font-medium text-brand-orange-dark">Quick action</p>
            <h2 className="text-lg font-bold text-neutral-900 mt-0.5">Record a message</h2>
            <p className="text-sm text-neutral-600 mt-1">Log a Fiverr message you received.</p>
          </div>
          <Link href="/my-messages/new">
            <Button size="lg" variant="secondary" className="w-full sm:w-auto shrink-0">
              <MessageSquare className="h-4 w-4" />
              Record Message
            </Button>
          </Link>
        </div>
      </div>

      {team.length > 0 && (
        <Card className="border-brand-green/20 bg-gradient-to-r from-white to-brand-green-light/20">
          <CardContent className="p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-start gap-3">
                <Users className="h-6 w-6 text-brand-green shrink-0 mt-0.5" />
                <div>
                  <h2 className="font-semibold text-neutral-900">My Team ({team.length})</h2>
                  <p className="text-sm text-neutral-500 mt-0.5">
                    {team.map((t) => t.full_name).join(", ")} — view their accounts &amp; messages
                  </p>
                </div>
              </div>
              <Link href="/my-team">
                <Button variant="outline" className="shrink-0">
                  View team
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      <PersonalDashboard
        member={profile}
        sponsorName={sponsorName}
        showAddAccount
        showAddMessage
        accountsBasePath="/my-accounts"
        messagesBasePath="/my-messages"
        subtitle="Your personal command center — add Fiverr accounts and track your messages."
      />

      <MemberAccountsPanel
        memberId={profile.id}
        memberName={profile.full_name}
        basePath="/my-accounts"
      />

      <MemberVerificationPanel teamMemberId={profile.id} />

      <MemberMessagesPanel
        memberId={profile.id}
        memberName={profile.full_name}
        basePath="/my-messages"
      />

      <MemberMonthlyPlanPanel
        teamMemberId={profile.id}
        memberName={profile.full_name}
      />

      {memberActivity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <MemberActivityFeed items={memberActivity} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
