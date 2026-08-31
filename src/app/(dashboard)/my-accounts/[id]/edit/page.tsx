import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getUserScope } from "@/lib/auth/scope";
import { AccountForm } from "@/components/accounts/account-form";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function MyAccountsEditPage({ params }: Props) {
  const { id } = await params;
  const scope = await getUserScope();
  if (!scope?.teamMember) redirect("/login");

  const supabase = await createClient();
  const { data: account } = await supabase
    .from("fiverr_accounts")
    .select("*")
    .eq("id", id)
    .single();

  if (!account) notFound();
  if (account.team_member_id !== scope.teamMember.id) redirect("/my-accounts");

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link
        href="/my-accounts"
        className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-brand-green"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to My Fiverr Accounts
      </Link>
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Edit Fiverr Account</h1>
        <p className="text-neutral-500 mt-1">Update your account details.</p>
      </div>
      <AccountForm
        mode="edit"
        account={account}
        lockedTeamMemberId={scope.teamMember.id}
        lockedTeamMemberName={scope.teamMember.full_name}
        returnTo="/my-accounts"
      />
    </div>
  );
}
