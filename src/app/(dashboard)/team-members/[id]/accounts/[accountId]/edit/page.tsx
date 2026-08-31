import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getUserScope } from "@/lib/auth/scope";
import { AccountForm } from "@/components/accounts/account-form";

interface Props {
  params: Promise<{ id: string; accountId: string }>;
}

export default async function MemberEditAccountPage({ params }: Props) {
  const { id, accountId } = await params;
  const scope = await getUserScope();
  if (!scope) redirect("/login");

  if (scope.isScopedMember && scope.teamMember?.id !== id) {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  const [{ data: member }, { data: account }] = await Promise.all([
    supabase.from("team_members").select("id, full_name").eq("id", id).single(),
    supabase.from("fiverr_accounts").select("*").eq("id", accountId).single(),
  ]);

  if (!member || !account) notFound();

  if (account.team_member_id !== member.id) {
    redirect("/dashboard");
  }

  if (scope.isScopedMember && scope.teamMember?.id !== account.team_member_id) {
    redirect("/dashboard");
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link
        href={`/team-members/${id}?tab=accounts`}
        className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-brand-green"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to your accounts
      </Link>
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Edit Fiverr Account</h1>
        <p className="text-neutral-500 mt-1">Update your account details if something changed or was entered wrong.</p>
      </div>
      <AccountForm
        mode="edit"
        account={account}
        lockedTeamMemberId={member.id}
        lockedTeamMemberName={member.full_name}
        returnTo={`/team-members/${id}?tab=accounts`}
      />
    </div>
  );
}
