import { redirect } from "next/navigation";
import { getUserScope } from "@/lib/auth/scope";
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
          Set what the team can win. It streams on their dashboard, and they tap it open when they enter.
        </p>
      </div>
      <IncentiveManager />
    </div>
  );
}
