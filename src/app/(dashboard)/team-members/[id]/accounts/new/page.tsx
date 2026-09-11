import { notFound, redirect } from "next/navigation";
import { Briefcase } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getUserScope } from "@/lib/auth/scope";
import { AccountForm } from "@/components/accounts/account-form";
import { RecordPageShell } from "@/components/shared/record-page-shell";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function MemberNewAccountPage({ params }: Props) {
  const { id } = await params;
  const scope = await getUserScope();
  if (!scope) redirect("/login");

  if (scope.isScopedMember && scope.teamMember?.id !== id) {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const { data: member } = await supabase
    .from("team_members")
    .select("id, full_name")
    .eq("id", id)
    .single();

  if (!member) notFound();

  return (
    <RecordPageShell
      backHref={`/team-members/${id}?tab=accounts`}
      backLabel="Back to accounts"
      title="Add Fiverr Account"
      subtitle={`Register a new Fiverr account for ${member.full_name} — clear sections, faster entry.`}
      icon={Briefcase}
      tone="account"
      maxWidthClass="max-w-3xl"
    >
      <AccountForm
        mode="create"
        lockedTeamMemberId={member.id}
        lockedTeamMemberName={member.full_name}
        returnTo={`/team-members/${id}?tab=accounts`}
      />
    </RecordPageShell>
  );
}
