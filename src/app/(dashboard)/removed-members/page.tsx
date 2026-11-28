import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserScope } from "@/lib/auth/scope";
import { Card, CardContent } from "@/components/ui/card";
import { UserX } from "lucide-react";
import { MemberAccessRoster, type AccessRosterMember } from "@/components/members/member-access-roster";
import type { TeamMember } from "@/types/database";

export default async function RemovedMembersPage() {
  const scope = await getUserScope();
  if (!scope?.roleSlugs.includes("super_admin")) redirect("/dashboard");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("team_members")
    .select("*")
    .not("access_removed_at", "is", null)
    .order("full_name");

  const sqlNeeded = Boolean(error?.message.toLowerCase().includes("access_removed"));
  const members = (sqlNeeded ? [] : data) as TeamMember[] | null;

  const { data: accountCounts } = await supabase
    .from("fiverr_accounts")
    .select("team_member_id")
    .is("archived_at", null)
    .neq("status", "reserved");
  const { data: messageCounts } = await supabase.from("messages").select("team_member_id");

  const accountsPerMember = new Map<string, number>();
  accountCounts?.forEach((row) => {
    accountsPerMember.set(row.team_member_id, (accountsPerMember.get(row.team_member_id) || 0) + 1);
  });
  const messagesPerMember = new Map<string, number>();
  messageCounts?.forEach((row) => {
    messagesPerMember.set(row.team_member_id, (messagesPerMember.get(row.team_member_id) || 0) + 1);
  });

  const roster: AccessRosterMember[] = (members ?? []).map((member) => ({
    id: member.id,
    full_name: member.full_name,
    preferred_name: member.preferred_name,
    status: member.status,
    user_id: member.user_id,
    date_joined: member.date_joined,
    email: member.email,
    access_removed_at: member.access_removed_at,
    accounts: accountsPerMember.get(member.id) ?? 0,
    messages: messagesPerMember.get(member.id) ?? 0,
    place: null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Account removed</h1>
        <p className="mt-1 text-neutral-500">
          {roster.length} people cannot sign in. Their Fiverr accounts stay in Reserved until you reactivate them.
        </p>
      </div>

      {sqlNeeded && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Run the account-removed SQL in Supabase, then this list will load.
        </p>
      )}

      {roster.length === 0 && !sqlNeeded ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <UserX className="mb-4 h-12 w-12 text-neutral-300" />
            <p className="text-neutral-500">Nobody is removed right now</p>
          </CardContent>
        </Card>
      ) : (
        <MemberAccessRoster members={roster} mode="removed" />
      )}
    </div>
  );
}
