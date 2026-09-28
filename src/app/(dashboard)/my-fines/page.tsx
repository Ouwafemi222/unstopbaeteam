import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserScope } from "@/lib/auth/scope";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchTeamMembersWithActiveFines } from "@/lib/members/team-fines-roster";
import { MemberMyFinesPanel } from "@/components/members/member-my-fines-panel";
import { TeamFinesRosterPanel } from "@/components/members/team-fines-roster-panel";
import { SuperAdminStar } from "@/components/shared/super-admin-star";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function MyFinesPage() {
  const scope = await getUserScope();
  if (!scope) redirect("/login");

  const isSuperAdmin = scope.roleSlugs.includes("super_admin");
  const member = scope.teamMember;
  const admin = createAdminClient();
  const teamFineRoster = admin ? await fetchTeamMembersWithActiveFines(admin) : [];

  if (!member) {
    return (
      <div className="max-w-lg mx-auto py-16 text-center space-y-4">
        <h1 className="text-xl font-bold text-neutral-900">No team profile linked</h1>
        <p className="text-neutral-500 text-sm">
          {isSuperAdmin
            ? "To see fines issued to you personally, your login must be linked to a team member record (same as other members)."
            : "Your login is not linked to a team member profile yet. Contact your admin."}
        </p>
        {isSuperAdmin && (
          <Link href="/team-members">
            <Button variant="secondary">Open team members</Button>
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        {isSuperAdmin && (
          <p className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1 text-xs font-bold text-amber-800 mb-2">
            <SuperAdminStar size="sm" />
            Your personal fines
          </p>
        )}
        <h1 className="text-2xl font-bold text-neutral-900">My Fines</h1>
        <p className="text-neutral-500 mt-1">
          Disciplinary fines issued to you — separate from team-wide{" "}
          <Link href="/fines" className="text-brand-green font-medium hover:underline">
            Fines &amp; Debts
          </Link>{" "}
          admin view.
        </p>
      </div>
      <MemberMyFinesPanel teamMemberId={member.id} variant="page" />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-base">Team members with active fines</CardTitle>
          <Link
            href="/team-fines"
            className="text-xs font-medium text-brand-green hover:underline shrink-0"
          >
            Full list →
          </Link>
        </CardHeader>
        <CardContent>
          <TeamFinesRosterPanel
            roster={teamFineRoster}
            currentMemberId={member.id}
            variant="embedded"
          />
        </CardContent>
      </Card>
    </div>
  );
}
