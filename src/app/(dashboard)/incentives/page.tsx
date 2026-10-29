import { redirect } from "next/navigation";
import { getUserScope } from "@/lib/auth/scope";
import { IncentiveBoard } from "@/components/incentives/incentive-board";
import { IncentiveManager } from "@/components/incentives/incentive-manager";

export default async function IncentivesPage() {
  const scope = await getUserScope();
  if (!scope) redirect("/login");
  if (!scope.roleSlugs.includes("super_admin")) redirect("/dashboard");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Incentives</h1>
        <p className="mt-1 text-neutral-500">
          Put a prize on each space. The billboard streams it, and the bars below show who is ahead.
        </p>
      </div>
      <IncentiveBoard />
      <IncentiveManager />
    </div>
  );
}
