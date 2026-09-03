"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { HandCoins, Loader2, PartyPopper, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { formatFineMoney } from "@/lib/members/fine-on-ground";
import { RelativeTime } from "@/components/shared/relative-time";
import { formatDateTime } from "@/lib/utils";
import type { FineOnGroundEntry } from "@/types/database";

interface MemberMyDebtPanelProps {
  teamMemberId: string;
  variant?: "dashboard" | "page";
}

export function MemberMyDebtPanel({ teamMemberId, variant = "dashboard" }: MemberMyDebtPanelProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [unpaid, setUnpaid] = useState<FineOnGroundEntry[]>([]);
  const [settled, setSettled] = useState<FineOnGroundEntry[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("fine_on_ground_entries")
      .select("*")
      .eq("team_member_id", teamMemberId)
      .eq("obligation_type", "debt")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("MemberMyDebtPanel load error:", error.message);
    }

    const all = (data as FineOnGroundEntry[]) ?? [];
    setUnpaid(all.filter((d) => d.is_active && !d.paid_at));
    setSettled(all.filter((d) => d.paid_at || !d.is_active));
    setLoading(false);
  }, [supabase, teamMemberId]);

  useEffect(() => {
    load();
  }, [load]);

  const totalOwed = unpaid.reduce((sum, d) => sum + Number(d.amount ?? 0), 0);
  const currency = unpaid[0]?.currency ?? settled[0]?.currency ?? "NGN";
  const isDebtFree = !loading && unpaid.length === 0;

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-sky-500" />
      </div>
    );
  }

  // Dashboard variant — compact
  if (variant === "dashboard") {
    if (isDebtFree && settled.length === 0) {
      return (
        <div className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-teal-50/50 px-5 py-5">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
              <PartyPopper className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">My Debt</p>
              <h3 className="font-bold text-neutral-900">You&apos;re debt free — keep it up! 🎉</h3>
              <p className="text-sm text-neutral-500 mt-0.5">No money borrowed is recorded against you.</p>
            </div>
            <Link href="/my-debts">
              <Button variant="outline" size="sm" className="shrink-0 border-emerald-200 text-emerald-800">
                View
              </Button>
            </Link>
          </div>
        </div>
      );
    }

    return (
      <div className="rounded-2xl border border-sky-200 bg-sky-50/60 px-5 py-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HandCoins className="h-5 w-5 text-sky-700" />
            <span className="font-semibold text-neutral-900 text-sm">My Debt</span>
          </div>
          <Link href="/my-debts">
            <Button variant="ghost" size="sm" className="text-sky-700 h-7 text-xs">
              View all →
            </Button>
          </Link>
        </div>

        {isDebtFree ? (
          <p className="text-sm text-emerald-700 font-medium">✅ No active debts — you&apos;re clear!</p>
        ) : (
          <>
            <p className="text-sm text-sky-800 font-medium">
              Total owed:{" "}
              <span className="text-xl font-bold text-sky-900">{formatFineMoney(totalOwed, currency)}</span>
            </p>
            <ul className="space-y-2">
              {unpaid.slice(0, 3).map((d) => (
                <li key={d.id} className="flex items-center justify-between text-sm bg-white rounded-lg px-3 py-2 border border-sky-100">
                  <div>
                    <span className="font-semibold">{formatFineMoney(Number(d.amount), d.currency ?? "NGN")}</span>
                    {d.reason && <span className="text-neutral-500 ml-2">— {d.reason}</span>}
                  </div>
                  <RelativeTime iso={d.created_at} className="text-xs text-neutral-400 shrink-0 ml-2" />
                </li>
              ))}
            </ul>
            {unpaid.length > 3 && (
              <Link href="/my-debts" className="text-xs text-sky-600 hover:underline">
                + {unpaid.length - 3} more debts — view all
              </Link>
            )}
          </>
        )}
      </div>
    );
  }

  // Page variant — full
  return (
    <div className="space-y-6">
      {isDebtFree ? (
        <div className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-10 text-center">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_50%_0%,#34d399,transparent_60%)]" />
          <div className="relative">
            <Sparkles className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-neutral-900">Debt free — well done! 🎊</h3>
            <p className="text-neutral-600 mt-2 max-w-md mx-auto">
              No money is currently borrowed or owed. Stay on track and keep building your future.
            </p>
            {settled.length > 0 && (
              <p className="text-sm text-neutral-400 mt-4">
                You have {settled.length} settled record{settled.length === 1 ? "" : "s"} in your history below.
              </p>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-sky-200 bg-sky-50 px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <p className="text-sm text-sky-800 font-medium">Total you owe</p>
              <p className="text-3xl font-bold text-sky-900 tabular-nums">
                {formatFineMoney(totalOwed, currency)}
              </p>
            </div>
            <p className="text-sm text-sky-700">
              {unpaid.length} active debt{unpaid.length === 1 ? "" : "s"} — please settle when you can.
            </p>
          </div>

          <ul className="space-y-3">
            {unpaid.map((d) => (
              <li
                key={d.id}
                className="rounded-xl border border-sky-100 bg-white px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
              >
                <div>
                  <p className="font-bold text-neutral-900 text-lg">
                    {formatFineMoney(Number(d.amount), d.currency ?? "NGN")}
                  </p>
                  {d.reason && <p className="text-sm text-neutral-600 mt-0.5">{d.reason}</p>}
                  <p className="text-xs text-neutral-400 mt-1">
                    Recorded <RelativeTime iso={d.created_at} /> · {formatDateTime(d.created_at)}
                  </p>
                </div>
                <span className="text-xs font-semibold uppercase tracking-wide text-sky-700 bg-sky-100 px-3 py-1 rounded-full shrink-0">
                  Owed
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      {settled.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-neutral-200">
          <h3 className="text-sm font-semibold text-neutral-600 uppercase tracking-wide">Settled / paid</h3>
          <ul className="space-y-2">
            {settled.map((d) => (
              <li
                key={d.id}
                className="rounded-lg border border-neutral-100 bg-neutral-50 px-4 py-3 flex justify-between items-center text-sm"
              >
                <span className="text-neutral-500 line-through decoration-neutral-400">
                  {formatFineMoney(Number(d.amount), d.currency ?? "NGN")}
                  {d.reason ? ` — ${d.reason}` : ""}
                </span>
                <span className="text-emerald-700 text-xs font-medium">
                  {d.paid_at ? `Paid ${formatDateTime(d.paid_at)}` : "Closed"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
