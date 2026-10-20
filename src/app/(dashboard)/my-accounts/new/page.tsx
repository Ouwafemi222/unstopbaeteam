import { redirect } from "next/navigation";
import { Briefcase } from "lucide-react";
import { getUserScope } from "@/lib/auth/scope";
import { AccountForm } from "@/components/accounts/account-form";
import { RecordPageShell } from "@/components/shared/record-page-shell";

export default async function MyAccountsNewPage() {
  const scope = await getUserScope();
  if (!scope?.teamMember) redirect("/login");

  const member = scope.teamMember;

  return (
    <RecordPageShell
      backHref="/my-accounts"
      backLabel="Back to My Fiverr Accounts"
      title="Record New Fiverr Account"
      subtitle="Say which service this account is for, then add the login, proxy, and verification."
      icon={Briefcase}
      tone="account"
      maxWidthClass="max-w-3xl"
    >
      <AccountForm
        mode="create"
        lockedTeamMemberId={member.id}
        lockedTeamMemberName={member.full_name}
        returnTo="/my-accounts"
      />
    </RecordPageShell>
  );
}
