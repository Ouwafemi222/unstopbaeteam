import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserScope } from "@/lib/auth/scope";
import { MemberTabs } from "@/components/members/member-tabs";
import { PersonalDashboard } from "@/components/dashboard/personal-dashboard";
import { getMessageServiceLabel } from "@/lib/utils";
import { getDateRange } from "@/lib/utils/dates";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; confirmed?: string }>;
}

export default async function TeamMemberDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { tab = "overview", confirmed } = await searchParams;
  const scope = await getUserScope();
  if (!scope) redirect("/login");

  if (scope.isScopedMember && scope.teamMember?.id !== id) {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  const { data: member } = await supabase
    .from("team_members")
    .select("*")
    .eq("id", id)
    .single();

  if (!member) notFound();

  const { data: sponsor } = member.sponsor_id
    ? await supabase.from("team_members").select("id, full_name").eq("id", member.sponsor_id).single()
    : { data: null };

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
      .eq("team_member_id", id).order("received_date", { ascending: false }),
    supabase.from("messages").select("*", { count: "exact", head: true })
      .eq("team_member_id", id).gte("received_date", thisMonth.from).lte("received_date", thisMonth.to),
    supabase.from("messages").select("*", { count: "exact", head: true })
      .eq("team_member_id", id).gte("received_date", lastMonth.from).lte("received_date", lastMonth.to),
    supabase.from("member_notes").select("*, profile:profiles(full_name)").eq("team_member_id", id).order("created_at", { ascending: false }),
    supabase.from("activity_logs").select("*, profile:profiles(full_name)").eq("entity_id", id).order("created_at", { ascending: false }).limit(20),
  ]);

  const serviceCounts = new Map<string, number>();
  messages?.forEach((m) => {
    const name = getMessageServiceLabel(m);
    if (name !== "—") serviceCounts.set(name, (serviceCounts.get(name) || 0) + 1);
  });
  const bestService = [...serviceCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

  const isOwnProfile = scope.teamMember?.id === id;

  return (
    <div className="space-y-8">
      {confirmed === "1" && (
        <div className="rounded-xl border border-green-200 bg-gradient-to-r from-green-50 to-brand-green-light/30 px-5 py-4 text-sm text-green-800 shadow-sm">
          Welcome! Your email is confirmed and your accounts &amp; messages are synced to this profile.
        </div>
      )}

      <PersonalDashboard
        member={member}
        sponsorName={sponsor?.full_name}
        showEditLink={!scope.isScopedMember}
        showAddAccount={isOwnProfile}
        accountsBasePath={isOwnProfile ? "/my-accounts" : undefined}
        subtitle={
          isOwnProfile
            ? scope.isScopedMember
              ? "Your dashboard — add Fiverr accounts and track your messages here."
              : "Your team profile — all Fiverr accounts and messages synced to your name."
            : undefined
        }
        preloaded={{
          accounts: accounts ?? [],
          messages: messages ?? [],
          messagesThisMonth: messagesThisMonth ?? 0,
          messagesLastMonth: messagesLastMonth ?? 0,
        }}
      />

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
        canManageAccounts={isOwnProfile}
      />
    </div>
  );
}
