import Link from "next/link";
import { redirect } from "next/navigation";
import { Users, Briefcase, MessageSquare, ChevronRight } from "lucide-react";
import { getUserScope } from "@/lib/auth/scope";
import { getSponsoredMembers } from "@/lib/auth/sponsor-access";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MEMBER_STATUS_LABELS } from "@/lib/utils/dates";

export default async function MyTeamPage() {
  const scope = await getUserScope();
  if (!scope) redirect("/login");

  const member = scope.teamMember;
  if (!member) {
    return (
      <div className="max-w-lg mx-auto py-16 text-center">
        <h1 className="text-xl font-bold text-neutral-900">No team profile linked</h1>
        <p className="text-neutral-500 mt-2 text-sm">Complete registration at /join to link your profile.</p>
      </div>
    );
  }

  const supabase = await createClient();
  const team = await getSponsoredMembers(supabase, member.id);

  const totalAccounts = team.reduce((s, m) => s + m.accountCount, 0);
  const totalMessages = team.reduce((s, m) => s + m.messageCount, 0);

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 flex items-center gap-2">
          <Users className="h-7 w-7 text-brand-green" />
          My Team
        </h1>
        <p className="text-neutral-500 mt-1">
          Members who chose <strong>{member.full_name}</strong> as their sponsor — read-only view of their accounts and messages.
        </p>
      </div>

      {team.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-neutral-500">Team members</p>
              <p className="text-2xl font-bold text-neutral-900">{team.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-neutral-500">Their accounts</p>
              <p className="text-2xl font-bold text-neutral-900">{totalAccounts}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-neutral-500">Their messages</p>
              <p className="text-2xl font-bold text-neutral-900">{totalMessages}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {team.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center px-6">
            <Users className="h-12 w-12 text-neutral-300 mb-4" />
            <h2 className="text-lg font-semibold text-neutral-900">No team members yet</h2>
            <p className="text-sm text-neutral-500 mt-2 max-w-md">
              When someone registers on /join and selects you as their sponsor, they will appear here with their accounts and messages.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {team.map((person) => (
            <Link key={person.id} href={`/team-members/${person.id}?tab=overview`}>
              <Card className="transition-all hover:border-brand-green/40 hover:shadow-md cursor-pointer">
                <CardContent className="p-5 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-neutral-900">{person.full_name}</h3>
                      <Badge variant="neutral">{MEMBER_STATUS_LABELS[person.status as keyof typeof MEMBER_STATUS_LABELS] ?? person.status}</Badge>
                    </div>
                    {person.email && (
                      <p className="text-sm text-neutral-500 mt-0.5 truncate">{person.email}</p>
                    )}
                    <div className="flex gap-4 mt-2 text-sm text-neutral-600">
                      <span className="flex items-center gap-1">
                        <Briefcase className="h-3.5 w-3.5 text-brand-green" />
                        {person.accountCount} account{person.accountCount === 1 ? "" : "s"}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-3.5 w-3.5 text-brand-orange" />
                        {person.messageCount} message{person.messageCount === 1 ? "" : "s"}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-neutral-400 shrink-0" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
