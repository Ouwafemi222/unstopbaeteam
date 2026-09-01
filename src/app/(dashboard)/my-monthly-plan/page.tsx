import { redirect } from "next/navigation";
import { getUserScope } from "@/lib/auth/scope";
import { MemberMonthlyPlanPanel } from "@/components/members/member-monthly-plan-panel";

export default async function MyMonthlyPlanPage() {
  const scope = await getUserScope();
  if (!scope?.teamMember) redirect("/login");

  const member = scope.teamMember;

  return (
    <div className="max-w-4xl mx-auto pb-8">
      <MemberMonthlyPlanPanel
        teamMemberId={member.id}
        memberName={member.full_name}
        variant="page"
      />
    </div>
  );
}
