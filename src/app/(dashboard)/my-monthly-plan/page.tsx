import { redirect } from "next/navigation";
import { getUserScope } from "@/lib/auth/scope";
import { MemberMonthlyPlanPanel } from "@/components/members/member-monthly-plan-panel";

export default async function MyMonthlyPlanPage() {
  const scope = await getUserScope();
  if (!scope?.teamMember) redirect("/login");

  const member = scope.teamMember;

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Monthly Goals &amp; Evaluation</h1>
        <p className="text-neutral-500 mt-1">
          Set your targets for the month and review how you performed — add a photo of your written goals or evaluation if you like.
        </p>
      </div>
      <MemberMonthlyPlanPanel
        teamMemberId={member.id}
        memberName={member.full_name}
      />
    </div>
  );
}
