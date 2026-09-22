import { redirect } from "next/navigation";
import { Target } from "lucide-react";
import { getUserScope } from "@/lib/auth/scope";
import { createClient } from "@/lib/supabase/server";
import { currentYearMonthLagos } from "@/lib/members/progress-metrics";
import { formatYearMonthLabel } from "@/lib/utils/dates";
import { MemberProspectsPanel } from "@/components/members/member-prospects-panel";

export default async function MyProspectsPage() {
  const scope = await getUserScope();
  if (!scope?.teamMember) redirect("/login");

  const member = scope.teamMember;
  const yearMonth = currentYearMonthLagos();
  const supabase = await createClient();

  const { data: plan } = await supabase
    .from("member_monthly_plans")
    .select("prospects_target, office_prospects_expected")
    .eq("team_member_id", member.id)
    .eq("year_month", yearMonth)
    .maybeSingle();

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-8">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 flex items-center gap-2">
          <Target className="h-6 w-6 text-brand-green" />
          My Prospects
        </h1>
        <p className="text-neutral-500 mt-1">
          Log how many prospects you got each day for{" "}
          <span className="font-medium text-neutral-700">
            {formatYearMonthLabel(yearMonth)}
          </span>
          . Totals count toward your monthly goal.
        </p>
      </div>

      <MemberProspectsPanel
        teamMemberId={member.id}
        prospectsGoal={plan?.prospects_target != null ? Number(plan.prospects_target) : null}
        officeProspectsGoal={
          plan?.office_prospects_expected != null
            ? Number(plan.office_prospects_expected)
            : null
        }
      />
    </div>
  );
}
