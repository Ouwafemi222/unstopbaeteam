import { redirect } from "next/navigation";
import { getUserScope } from "@/lib/auth/scope";
import { MemberAccountsPanel } from "@/components/accounts/member-accounts-panel";

export default async function MyAccountsPage() {
  const scope = await getUserScope();
  if (!scope) redirect("/login");

  const member = scope.teamMember;
  if (!member) {
    return (
      <div className="max-w-lg mx-auto py-16 text-center">
        <h1 className="text-xl font-bold text-neutral-900">No team profile linked</h1>
        <p className="text-neutral-500 mt-2 text-sm">
          Your login is not linked to a team member yet. Ask your admin or complete registration at /join.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">My Fiverr Accounts</h1>
        <p className="text-neutral-500 mt-1">
          Record every account you open — username, email, phone, country, and verification status.
        </p>
      </div>
      <MemberAccountsPanel
        memberId={member.id}
        memberName={member.full_name}
        basePath="/my-accounts"
        showTitle={false}
      />
    </div>
  );
}
