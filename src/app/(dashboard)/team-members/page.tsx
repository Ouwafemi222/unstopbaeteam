import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUserScope } from "@/lib/auth/scope";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Users } from "lucide-react";
import { MemberAccessRoster, type AccessRosterMember } from "@/components/members/member-access-roster";
import type { TeamMember } from "@/types/database";

export default async function TeamMembersPage() {
  const scope = await getUserScope();
  const supabase = await createClient();
  const isSuperAdmin = scope?.roleSlugs.includes("super_admin") ?? false;

  const filtered = await supabase
    .from("team_members")
    .select("*")
    .is("access_removed_at", null)
    .order("full_name");

  let members = filtered.data as TeamMember[] | null;
  let sqlNeeded = false;
  if (filtered.error?.message.toLowerCase().includes("access_removed")) {
    sqlNeeded = true;
    const fallback = await supabase.from("team_members").select("*").order("full_name");
    members = fallback.data as TeamMember[] | null;
  } else if (filtered.error) {
    console.error("team_members fetch error:", filtered.error.message);
  }

  const { data: presenceRows } = await supabase
    .from("member_presence_locations")
    .select("team_member_id, city, country, flag, last_seen_at");

  const presenceByMember = new Map(
    (presenceRows ?? []).map((p) => [p.team_member_id, p])
  );

  const { data: accountCounts } = await supabase
    .from("fiverr_accounts")
    .select("team_member_id")
    .is("archived_at", null)
    .neq("status", "reserved");

  const { data: messageCounts } = await supabase.from("messages").select("team_member_id");

  const accountsPerMember = new Map<string, number>();
  accountCounts?.forEach((a) => {
    accountsPerMember.set(a.team_member_id, (accountsPerMember.get(a.team_member_id) || 0) + 1);
  });

  const messagesPerMember = new Map<string, number>();
  messageCounts?.forEach((m) => {
    messagesPerMember.set(m.team_member_id, (messagesPerMember.get(m.team_member_id) || 0) + 1);
  });

  const roster: AccessRosterMember[] = (members ?? []).map((member) => {
    const presence = presenceByMember.get(member.id);
    const place = presence
      ? `${presence.flag ?? ""} ${presence.city || presence.country || ""}`.trim()
      : null;
    return {
      id: member.id,
      full_name: member.full_name,
      preferred_name: member.preferred_name,
      status: member.status,
      user_id: member.user_id,
      date_joined: member.date_joined,
      email: member.email,
      accounts: accountsPerMember.get(member.id) ?? 0,
      messages: messagesPerMember.get(member.id) ?? 0,
      place,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Team Members</h1>
          <p className="text-neutral-500 mt-1">
            {roster.length} members in your team
            {roster.filter((member) => member.user_id).length > 0 && (
              <span className="text-brand-green"> · {roster.filter((member) => member.user_id).length} registered</span>
            )}
          </p>
        </div>
        <Link href="/team-members/new">
          <Button><Plus className="h-4 w-4" /> Add Member</Button>
        </Link>
      </div>

      {sqlNeeded && isSuperAdmin && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Run the account-removed SQL in Supabase before Remove will save.
        </p>
      )}

      {roster.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Users className="h-12 w-12 text-neutral-300 mb-4" />
            <p className="text-neutral-500 mb-4">No team members yet</p>
            <Link href="/team-members/new"><Button>Add First Member</Button></Link>
          </CardContent>
        </Card>
      ) : (
        <MemberAccessRoster members={roster} mode="active" canManage={isSuperAdmin} />
      )}
    </div>
  );
}
