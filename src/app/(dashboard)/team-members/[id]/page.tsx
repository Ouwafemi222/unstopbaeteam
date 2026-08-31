import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AccountStatusBadge } from "@/components/shared/status-badges";
import { MEMBER_STATUS_LABELS } from "@/lib/utils/dates";
import { formatDate, formatDateTime } from "@/lib/utils";
import { Edit, Briefcase, MessageSquare, TrendingUp, FileText, Activity } from "lucide-react";
import { MemberTabs } from "@/components/members/member-tabs";
import { getDateRange } from "@/lib/utils/dates";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export default async function TeamMemberDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { tab = "overview" } = await searchParams;
  const supabase = await createClient();

  const { data: member } = await supabase
    .from("team_members")
    .select("*")
    .eq("id", id)
    .single();

  if (!member) notFound();

  const thisMonth = getDateRange("this_month");
  const lastMonth = getDateRange("last_month");

  const [
    { data: accounts },
    { data: messages },
    { count: messagesThisMonth },
    { count: messagesLastMonth },
    { data: notes },
    { data: activity },
  ] = await Promise.all([
    supabase.from("fiverr_accounts")
      .select("*, country:countries(name, flag_emoji)")
      .eq("team_member_id", id).is("archived_at", null).order("created_at", { ascending: false }),
    supabase.from("messages")
      .select("*, service:services(name), fiverr_account:fiverr_accounts(username)")
      .eq("team_member_id", id).order("received_date", { ascending: false }).limit(50),
    supabase.from("messages").select("*", { count: "exact", head: true })
      .eq("team_member_id", id).gte("received_date", thisMonth.from).lte("received_date", thisMonth.to),
    supabase.from("messages").select("*", { count: "exact", head: true })
      .eq("team_member_id", id).gte("received_date", lastMonth.from).lte("received_date", lastMonth.to),
    supabase.from("member_notes").select("*, profile:profiles(full_name)").eq("team_member_id", id).order("created_at", { ascending: false }),
    supabase.from("activity_logs").select("*, profile:profiles(full_name)").eq("entity_id", id).order("created_at", { ascending: false }).limit(20),
  ]);

  const activeAccounts = accounts?.filter((a) => a.status === "active" || a.status === "verified").length ?? 0;
  const inactiveAccounts = (accounts?.length ?? 0) - activeAccounts;
  const totalMessages = messages?.length ?? 0;
  const growth = (messagesLastMonth ?? 0) > 0
    ? Math.round(((messagesThisMonth ?? 0) - (messagesLastMonth ?? 0)) / (messagesLastMonth ?? 1) * 100)
    : (messagesThisMonth ?? 0) > 0 ? 100 : 0;

  const serviceCounts = new Map<string, number>();
  messages?.forEach((m) => {
    const name = (m.service as { name: string })?.name;
    if (name) serviceCounts.set(name, (serviceCounts.get(name) || 0) + 1);
  });
  const bestService = [...serviceCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-green to-brand-orange text-white text-xl font-bold">
            {member.full_name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">{member.full_name}</h1>
            {member.preferred_name && <p className="text-neutral-500">{member.preferred_name}</p>}
            <div className="flex items-center gap-2 mt-2">
              <Badge variant={member.status === "active" ? "success" : "neutral"}>
                {MEMBER_STATUS_LABELS[member.status]}
              </Badge>
              {member.role_in_team && <Badge variant="info">{member.role_in_team}</Badge>}
            </div>
          </div>
        </div>
        <Link href={`/team-members/${id}/edit`}>
          <Button variant="outline"><Edit className="h-4 w-4" /> Edit</Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {[
          { label: "Total Accounts", value: accounts?.length ?? 0, icon: Briefcase },
          { label: "Active", value: activeAccounts, icon: Briefcase },
          { label: "Inactive", value: inactiveAccounts, icon: Briefcase },
          { label: "Messages (Month)", value: messagesThisMonth ?? 0, icon: MessageSquare },
          { label: "All-Time Messages", value: totalMessages, icon: MessageSquare },
          { label: "Growth", value: `${growth > 0 ? "+" : ""}${growth}%`, icon: TrendingUp },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <p className="text-xs text-neutral-400">{stat.label}</p>
              <p className="text-xl font-bold text-neutral-900 mt-1">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <MemberTabs
        memberId={id}
        currentTab={tab}
        member={member}
        accounts={accounts ?? []}
        messages={messages ?? []}
        notes={notes ?? []}
        activity={activity ?? []}
        bestService={bestService}
        messagesThisMonth={messagesThisMonth ?? 0}
        messagesLastMonth={messagesLastMonth ?? 0}
      />
    </div>
  );
}
