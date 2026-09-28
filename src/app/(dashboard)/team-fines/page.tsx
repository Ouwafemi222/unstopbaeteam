import Link from "next/link";
import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { getUserScope } from "@/lib/auth/scope";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchTeamMembersWithActiveFines } from "@/lib/members/team-fines-roster";
import { TeamFinesRosterPanel } from "@/components/members/team-fines-roster-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function TeamFinesPage() {
  const scope = await getUserScope();
  if (!scope) redirect("/login");

  const admin = createAdminClient();
  const roster = admin ? await fetchTeamMembersWithActiveFines(admin) : [];

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 flex items-center gap-2">
          <Users className="h-7 w-7 text-[#7b1e3a]" />
          Team members with fines
        </h1>
        <p className="text-neutral-500 mt-1">
          Disciplinary fines only — not debts. This is a name list for transparency; you cannot
          open another member&apos;s fine details.
        </p>
      </div>

      <Card className="border-amber-100/80 bg-amber-50/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-amber-900">What you can see here</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-neutral-700 space-y-1 pt-0">
          <p>• Who on the team has at least one unpaid fine</p>
          <p>• How many active fines they have (count only)</p>
          <p>
            • Your own full breakdown is on{" "}
            <Link href="/my-fines" className="text-brand-green font-medium hover:underline">
              My Fines
            </Link>
          </p>
        </CardContent>
      </Card>

      <TeamFinesRosterPanel roster={roster} currentMemberId={scope.teamMember?.id ?? null} />
    </div>
  );
}
