import { redirect } from "next/navigation";
import { getUserScope } from "@/lib/auth/scope";
import { MemberMyDebtPanel } from "@/components/members/member-my-debt-panel";

export default async function MyDebtsPage() {
  const scope = await getUserScope();
  if (!scope) redirect("/login");

  const member = scope.teamMember;
  if (!member) {
    return (
      <div className="max-w-lg mx-auto py-16 text-center">
        <h1 className="text-xl font-bold text-neutral-900">No team profile linked</h1>
        <p className="text-neutral-500 mt-2 text-sm">
          Your login is not linked to a team member profile yet. Contact your admin.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">My Debt</h1>
        <p className="text-neutral-500 mt-1">
          Money admin recorded as borrowed — separate from disciplinary fines.
        </p>
      </div>
      <MemberMyDebtPanel teamMemberId={member.id} variant="page" />
    </div>
  );
}
