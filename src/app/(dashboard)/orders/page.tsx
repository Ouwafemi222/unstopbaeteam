import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getUserScope } from "@/lib/auth/scope";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { OrderForm } from "@/components/orders/order-form";

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(currency === "NGN" ? "en-NG" : "en-US", {
      style: "currency",
      currency,
    }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

export default async function OrdersAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const scope = await getUserScope();
  if (!scope) redirect("/login");
  if (scope.isScopedMember) redirect("/my-orders");

  const params = await searchParams;
  const showForm = params.new === "1";
  const supabase = await createClient();

  const { data: orders } = await supabase
    .from("orders_received")
    .select(
      "*, team_member:team_members(id, full_name), fiverr_account:fiverr_accounts(id, username)"
    )
    .order("received_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(80);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-brand-orange">Team wins</p>
          <h1 className="text-2xl font-extrabold text-neutral-900 mt-1 flex items-center gap-2">
            <Trophy className="h-6 w-6 text-brand-orange" />
            Orders Received
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Every order feeds the weekly activity report and the live dashboard stream.
          </p>
        </div>
        <Link href={showForm ? "/orders" : "/orders?new=1"}>
          <Button variant={showForm ? "outline" : "default"} className="gap-2">
            <Plus className="h-4 w-4" />
            {showForm ? "Hide form" : "Record order"}
          </Button>
        </Link>
      </div>

      {showForm && (
        <div className="max-w-2xl">
          <OrderForm returnTo="/orders" />
        </div>
      )}

      <div className="rounded-2xl border bg-white overflow-hidden">
        <div className="responsive-table">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-neutral-500 bg-neutral-50">
                <th className="p-3 font-medium">Member</th>
                <th className="p-3 font-medium">Gig</th>
                <th className="p-3 font-medium">Account</th>
                <th className="p-3 font-medium">Amount</th>
                <th className="p-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {(orders ?? []).length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-neutral-500">
                    No orders recorded yet.
                  </td>
                </tr>
              ) : (
                (orders ?? []).map((o) => (
                  <tr key={o.id} className="border-b hover:bg-neutral-50">
                    <td className="p-3 font-medium">
                      {(o.team_member as { full_name?: string } | null)?.full_name ?? "—"}
                    </td>
                    <td className="p-3">{o.gig_name ?? "—"}</td>
                    <td className="p-3 text-neutral-500">
                      {(o.fiverr_account as { username?: string } | null)?.username
                        ? `@${(o.fiverr_account as { username: string }).username}`
                        : "—"}
                    </td>
                    <td className="p-3 font-semibold text-brand-orange">
                      {o.order_amount != null
                        ? formatMoney(Number(o.order_amount), o.currency || "USD")
                        : "—"}
                    </td>
                    <td className="p-3 text-neutral-500">{formatDate(o.received_date)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
