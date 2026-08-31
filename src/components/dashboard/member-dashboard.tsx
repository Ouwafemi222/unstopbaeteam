import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Briefcase, MessageSquare, TrendingUp } from "lucide-react";
import { formatDate, getMessageServiceLabel } from "@/lib/utils";
import { getDateRange } from "@/lib/utils/dates";
import { MEMBER_STATUS_LABELS } from "@/lib/utils/dates";
import type { TeamMember } from "@/types/database";

interface MemberDashboardProps {
  member: Pick<TeamMember, "id" | "full_name" | "preferred_name" | "status">;
  sponsorName?: string | null;
}

export async function MemberDashboard({ member, sponsorName }: MemberDashboardProps) {
  const supabase = await createClient();
  const thisMonth = getDateRange("this_month");

  const [
    { data: accounts, count: accountCount },
    { data: messages, count: messageCount },
    { count: messagesThisMonth },
  ] = await Promise.all([
    supabase
      .from("fiverr_accounts")
      .select("*, country:countries(name, flag_emoji)", { count: "exact" })
      .eq("team_member_id", member.id)
      .is("archived_at", null)
      .order("opening_date", { ascending: false })
      .limit(5),
    supabase
      .from("messages")
      .select("*, service:services(name)", { count: "exact" })
      .eq("team_member_id", member.id)
      .order("received_date", { ascending: false })
      .limit(5),
    supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("team_member_id", member.id)
      .gte("received_date", thisMonth.from)
      .lte("received_date", thisMonth.to),
  ]);

  const stats = [
    { label: "My Fiverr Accounts", value: accountCount ?? accounts?.length ?? 0, icon: Briefcase },
    { label: "Messages This Month", value: messagesThisMonth ?? 0, icon: MessageSquare },
    { label: "All Messages", value: messageCount ?? messages?.length ?? 0, icon: TrendingUp },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">{member.full_name}</h1>
        <p className="text-neutral-500 mt-1">Your personal dashboard — only your synced accounts and messages.</p>
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <Badge variant={member.status === "active" ? "success" : "neutral"}>
            {MEMBER_STATUS_LABELS[member.status]}
          </Badge>
          {sponsorName && <Badge variant="neutral">Sponsor: {sponsorName}</Badge>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <stat.icon className="h-5 w-5 text-brand-green mb-2" />
              <p className="text-2xl font-bold text-neutral-900">{stat.value}</p>
              <p className="text-xs text-neutral-500 mt-1">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">My Fiverr Accounts</CardTitle>
            {member.id && (
              <Link href={`/team-members/${member.id}?tab=accounts`} className="text-sm text-brand-green hover:underline">
                View all
              </Link>
            )}
          </CardHeader>
          <CardContent>
            {accounts?.length === 0 ? (
              <p className="text-sm text-neutral-500">No accounts synced yet.</p>
            ) : (
              <div className="space-y-3">
                {accounts?.map((acc) => (
                  <div key={acc.id} className="flex items-center justify-between border-b border-neutral-100 pb-2 last:border-0">
                    <div>
                      <p className="font-medium text-neutral-900">{acc.username}</p>
                      <p className="text-xs text-neutral-400">
                        {(acc.country as { flag_emoji?: string; name?: string })?.flag_emoji}{" "}
                        {(acc.country as { name?: string })?.name ?? "—"}
                      </p>
                    </div>
                    <Badge variant="neutral">{acc.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">My Recent Messages</CardTitle>
            {member.id && (
              <Link href={`/team-members/${member.id}?tab=messages`} className="text-sm text-brand-green hover:underline">
                View all
              </Link>
            )}
          </CardHeader>
          <CardContent>
            {messages?.length === 0 ? (
              <p className="text-sm text-neutral-500">No messages synced yet.</p>
            ) : (
              <div className="space-y-3">
                {messages?.map((msg) => (
                  <div key={msg.id} className="flex items-center justify-between border-b border-neutral-100 pb-2 last:border-0">
                    <div>
                      <p className="font-medium text-neutral-900">{getMessageServiceLabel(msg)}</p>
                      <p className="text-xs text-neutral-400">{formatDate(msg.received_date)}</p>
                    </div>
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
