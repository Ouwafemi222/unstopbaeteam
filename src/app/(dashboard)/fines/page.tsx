import { getUserScope } from "@/lib/auth/scope";
import { redirect } from "next/navigation";
import { AdminFineOnGroundCard } from "@/components/dashboard/admin-fine-on-ground-card";
import { AdminUnpaidFinesPanel } from "@/components/dashboard/admin-unpaid-fines-panel";

export default async function FinesPage() {
  const scope = await getUserScope();
  if (!scope) redirect("/login");
  if (scope.isScopedMember) redirect("/dashboard");

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Fines &amp; Debts</h1>
        <p className="text-neutral-500 mt-1">
          Assign fines or debts (money borrowed), track who hasn&apos;t paid, and get alerts when they
          record earnings so you can remind them.
        </p>
      </div>

      <AdminUnpaidFinesPanel variant="page" />
      <AdminFineOnGroundCard />
    </div>
  );
}
