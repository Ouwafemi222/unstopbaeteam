import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getUserScope } from "@/lib/auth/scope";
import { AccountForm } from "@/components/accounts/account-form";

export default async function MyAccountsNewPage() {
  const scope = await getUserScope();
  if (!scope?.teamMember) redirect("/login");

  const member = scope.teamMember;

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
        <h1 className="text-2xl font-bold text-neutral-900">Record New Fiverr Account</h1>
        <p className="text-neutral-500 mt-1">
          Fill in all details for the account you opened on Fiverr.
        </p>
      </div>
      <AccountForm
        mode="create"
        lockedTeamMemberId={member.id}
        lockedTeamMemberName={member.full_name}
        returnTo="/my-accounts"
      />
    </div>
  );
}
