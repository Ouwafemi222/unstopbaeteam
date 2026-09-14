import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Trophy } from "lucide-react";
import { getUserScope } from "@/lib/auth/scope";
import { Button } from "@/components/ui/button";
import { MemberOrdersPanel } from "@/components/orders/member-orders-panel";

export default async function MyOrdersPage() {
  const scope = await getUserScope();
  if (!scope?.teamMember) redirect("/login");

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-brand-orange/25 bg-gradient-to-br from-emerald-950 via-brand-green-dark to-emerald-800 text-white px-6 py-8 shadow-lg">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-brand-orange/30 blur-3xl" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-orange text-white shadow-md">
              <Trophy className="h-6 w-6" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-100">
                Wins board
              </p>
              <h1 className="text-2xl sm:text-3xl font-extrabold mt-1">Orders Received</h1>
              <p className="text-emerald-50/85 text-sm mt-1 max-w-md">
                Log every order you close. It feeds your weekly report and lights up the team live
                stream.
              </p>
            </div>
          </div>
          <Link href="/my-orders/new">
            <Button className="bg-white text-brand-green-dark hover:bg-emerald-50 font-semibold gap-2 shrink-0">
              <Plus className="h-4 w-4" />
              Record order
            </Button>
          </Link>
        </div>
      </div>

      <MemberOrdersPanel teamMemberId={scope.teamMember.id} />
    </div>
  );
}
