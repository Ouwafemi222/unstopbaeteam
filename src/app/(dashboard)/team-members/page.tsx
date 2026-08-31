import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Users } from "lucide-react";
import { MEMBER_STATUS_LABELS } from "@/lib/utils/dates";
import { formatDate } from "@/lib/utils";

export default async function TeamMembersPage() {
  const supabase = await createClient();

  const { data: members, error } = await supabase
    .from("team_members")
    .select("*")
    .order("full_name");

  if (error) {
    console.error("team_members fetch error:", error.message);
  }

  const { data: accountCounts } = await supabase
    .from("fiverr_accounts")
    .select("team_member_id")
    .is("archived_at", null);

  const { data: messageCounts } = await supabase
    .from("messages")
    .select("team_member_id");

  const accountsPerMember = new Map<string, number>();
  accountCounts?.forEach((a) => {
    accountsPerMember.set(a.team_member_id, (accountsPerMember.get(a.team_member_id) || 0) + 1);
  });

  const messagesPerMember = new Map<string, number>();
  messageCounts?.forEach((m) => {
    messagesPerMember.set(m.team_member_id, (messagesPerMember.get(m.team_member_id) || 0) + 1);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Team Members</h1>
          <p className="text-neutral-500 mt-1">
            {members?.length ?? 0} members in your team
            {(members?.filter((m) => m.user_id).length ?? 0) > 0 && (
              <span className="text-brand-green"> · {members?.filter((m) => m.user_id).length} registered</span>
            )}
          </p>
        </div>
        <Link href="/team-members/new">
          <Button><Plus className="h-4 w-4" /> Add Member</Button>
        </Link>
      </div>

      {members?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Users className="h-12 w-12 text-neutral-300 mb-4" />
            <p className="text-neutral-500 mb-4">No team members yet</p>
            <Link href="/team-members/new"><Button>Add First Member</Button></Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {members?.map((member) => (
            <Link key={member.id} href={`/team-members/${member.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-green to-brand-orange text-white font-bold">
                      {member.full_name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-neutral-900 truncate">{member.full_name}</h3>
                      {member.preferred_name && (
                        <p className="text-sm text-neutral-500">{member.preferred_name}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <Badge variant={member.status === "active" ? "success" : "neutral"}>
                          {MEMBER_STATUS_LABELS[member.status]}
                        </Badge>
                        {member.user_id ? (
                          <Badge variant="info">Registered</Badge>
                        ) : (
                          <Badge variant="neutral">Awaiting signup</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-neutral-100">
                    <div>
                      <p className="text-xs text-neutral-400">Accounts</p>
                      <p className="text-lg font-bold text-neutral-900">{accountsPerMember.get(member.id) ?? 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-400">Messages</p>
                      <p className="text-lg font-bold text-neutral-900">{messagesPerMember.get(member.id) ?? 0}</p>
                    </div>
                  </div>
                  {member.date_joined && (
                    <p className="text-xs text-neutral-400 mt-3">Joined {formatDate(member.date_joined)}</p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
