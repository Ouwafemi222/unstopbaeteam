import { redirect } from "next/navigation";
import { getUserScope } from "@/lib/auth/scope";
import { IncentiveBoard } from "@/components/incentives/incentive-board";
import { IncentiveManager } from "@/components/incentives/incentive-manager";

export default async function IncentivesPage() {
  const scope = await getUserScope();
  if (!scope) redirect("/login");

  const isSuperAdmin = scope.roleSlugs.includes("super_admin");
  const isTeamLeader = scope.roleSlugs.includes("team_leader");
  if (!isSuperAdmin && !isTeamLeader) redirect("/dashboard");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Incentives</h1>
        <p className="mt-1 text-neutral-500">
          {isSuperAdmin
            ? "Put a prize on each space. The billboard streams it, and the bars below show who is ahead."
            : "Watch every incentive and how the team is progressing. Open any month to see who is moving ahead."}
        </p>
      </div>
      <IncentiveBoard readOnly={!isSuperAdmin} />
      {isSuperAdmin && <IncentiveManager />}
    </div>
  );
}
