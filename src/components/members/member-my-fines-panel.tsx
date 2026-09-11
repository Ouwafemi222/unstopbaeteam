"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Loader2, UserCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  formatFineMoney,
  fineAmountPaid,
  fineRemaining,
  fineTotalAmount,
  isFineFullySettled,
} from "@/lib/members/fine-on-ground";
import { RelativeTime } from "@/components/shared/relative-time";
import { formatDateTime } from "@/lib/utils";
import type { FineOnGroundEntry } from "@/types/database";

type EntryWithRecorder = FineOnGroundEntry & {
  batch?: { created_by: string | null; profile?: { full_name: string } | null } | null;
};

interface MemberMyFinesPanelProps {
  teamMemberId: string;
  variant?: "dashboard" | "page";
}

export function MemberMyFinesPanel({ teamMemberId, variant = "dashboard" }: MemberMyFinesPanelProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [unpaid, setUnpaid] = useState<EntryWithRecorder[]>([]);
  const [settled, setSettled] = useState<EntryWithRecorder[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("fine_on_ground_entries")
      .select(`
        *,
        batch:fine_on_ground_batches(
          created_by,
          profile:profiles!fine_on_ground_batches_created_by_fkey(full_name)
        )
      `)
      .eq("team_member_id", teamMemberId)
      .eq("obligation_type", "fine")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("MemberMyFinesPanel load error:", error.message);
    }

    const all = (data as EntryWithRecorder[]) ?? [];
    setUnpaid(all.filter((d) => d.is_active && !d.paid_at && fineRemaining(d) > 0));
    setSettled(all.filter((d) => isFineFullySettled(d)));
    setLoading(false);
  }, [supabase, teamMemberId]);

  useEffect(() => {
    load();
  }, [load]);

  const totalOwed = unpaid.reduce((sum, d) => sum + fineRemaining(d), 0);
  const currency = unpaid[0]?.currency ?? settled[0]?.currency ?? "NGN";
  const isFineFree = !loading && unpaid.length === 0;

  function recorderName(entry: EntryWithRecorder) {
    const name = (entry.batch?.profile as { full_name?: string } | null)?.full_name;
    return name ?? "Admin";
  }

  function paymentSummary(d: EntryWithRecorder) {
    const paid = fineAmountPaid(d);
    const remaining = fineRemaining(d);
    const total = fineTotalAmount(d);
    const cur = d.currency ?? "NGN";
    if (paid <= 0) {
      return (
        <>
          <span className="font-semibold">{formatFineMoney(total, cur)}</span>
          <span className="text-xs font-medium text-amber-700 ml-2">Unpaid</span>
        </>
      );
    }
    return (
      <>
        <span className="font-semibold">{formatFineMoney(remaining, cur)} left</span>
        <span className="text-xs text-neutral-500 ml-2">
          of {formatFineMoney(total, cur)} · paid {formatFineMoney(paid, cur)}
        </span>
      </>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
      </div>
    );
  }

  // ── Dashboard compact ──────────────────────────────────────────
  if (variant === "dashboard") {
    if (isFineFree && settled.length === 0) {
      return (
        <div className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-teal-50/50 px-5 py-5">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">My Fines</p>
              <h3 className="font-bold text-neutral-900">No fines — you&apos;re clean! 🙌</h3>
              <p className="text-sm text-neutral-500 mt-0.5">No disciplinary fines recorded against you.</p>
            </div>
            <Link href="/my-fines">
              <Button variant="outline" size="sm" className="shrink-0 border-emerald-200 text-emerald-800">
                View
              </Button>
            </Link>
          </div>
        </div>
      );
    }

    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50/60 px-5 py-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-700" />
            <span className="font-semibold text-neutral-900 text-sm">My Fines</span>
          </div>
          <Link href="/my-fines">
            <Button variant="ghost" size="sm" className="text-amber-700 h-7 text-xs">
              View all →
            </Button>
          </Link>
        </div>

        {isFineFree ? (
          <p className="text-sm text-emerald-700 font-medium">✅ No active fines — you&apos;re clear!</p>
        ) : (
          <>
            <p className="text-sm text-amber-800 font-medium">
              Still owed:{" "}
              <span className="text-xl font-bold text-amber-900">{formatFineMoney(totalOwed, currency)}</span>
            </p>
            <ul className="space-y-2">
              {unpaid.slice(0, 3).map((d) => (
                <li key={d.id} className="flex items-center justify-between text-sm bg-white rounded-lg px-3 py-2.5 border border-amber-100">
                  <div className="min-w-0">
                    <div>{paymentSummary(d)}</div>
                    {d.reason && <span className="text-neutral-500 text-xs">— {d.reason}</span>}
                    {d.payment_note && (
                      <p className="text-xs text-emerald-700 mt-0.5">Update: {d.payment_note}</p>
                    )}
                    <p className="text-xs text-neutral-400 mt-0.5 flex items-center gap-1">
                      <UserCircle2 className="h-3 w-3 shrink-0" />
                      Issued by {recorderName(d)}
                    </p>
                  </div>
                  <RelativeTime
                    iso={d.last_payment_at ?? d.created_at}
                    className="text-xs text-neutral-400 shrink-0 ml-3"
                  />
                </li>
              ))}
            </ul>
            {unpaid.length > 3 && (
              <Link href="/my-fines" className="text-xs text-amber-600 hover:underline">
                + {unpaid.length - 3} more — view all
              </Link>
            )}
          </>
        )}
      </div>
    );
  }

  // ── Page full view ─────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {isFineFree ? (
        <div className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-10 text-center">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_50%_0%,#34d399,transparent_60%)]" />
          <div className="relative">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-neutral-900">No fines — you&apos;re clean! 🙌</h3>
            <p className="text-neutral-600 mt-2 max-w-md mx-auto">
              No disciplinary fines are currently active against you. Keep up the good conduct!
            </p>
            {settled.length > 0 && (
              <p className="text-sm text-neutral-400 mt-4">
                You have {settled.length} settled fine{settled.length === 1 ? "" : "s"} in your history below.
              </p>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <p className="text-sm text-amber-800 font-medium">Still owed</p>
              <p className="text-3xl font-bold text-amber-900 tabular-nums">
                {formatFineMoney(totalOwed, currency)}
              </p>
            </div>
            <p className="text-sm text-amber-700">
              {unpaid.length} active fine{unpaid.length === 1 ? "" : "s"} — partial payments are counted when an admin records them.
            </p>
          </div>

          <ul className="space-y-3">
            {unpaid.map((d) => {
              const paid = fineAmountPaid(d);
              const remaining = fineRemaining(d);
              const total = fineTotalAmount(d);
              const cur = d.currency ?? "NGN";
              return (
                <li
                  key={d.id}
                  className="rounded-xl border border-amber-100 bg-white px-5 py-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-neutral-900 text-lg">
                      {formatFineMoney(remaining, cur)} remaining
                    </p>
                    <p className="text-sm text-neutral-600 mt-0.5">
                      Total {formatFineMoney(total, cur)}
                      {paid > 0 && (
                        <>
                          {" "}
                          · Paid so far{" "}
                          <span className="font-semibold text-emerald-700">
                            {formatFineMoney(paid, cur)}
                          </span>
                        </>
                      )}
                    </p>
                    {d.reason && <p className="text-sm text-neutral-600 mt-1">{d.reason}</p>}
                    {d.payment_note && (
                      <p className="text-sm text-emerald-700 mt-1 rounded-lg bg-emerald-50 px-3 py-2 border border-emerald-100">
                        Payment update: {d.payment_note}
                        {d.last_payment_at && (
                          <span className="block text-xs text-emerald-600 mt-0.5">
                            Last recorded {formatDateTime(d.last_payment_at)}
                          </span>
                        )}
                      </p>
                    )}
                    <p className="text-xs text-neutral-400 mt-2 flex items-center gap-1.5">
                      <UserCircle2 className="h-3.5 w-3.5 shrink-0" />
                      Issued by <span className="font-medium text-neutral-600">{recorderName(d)}</span>
                      {" · "}
                      <RelativeTime iso={d.created_at} />
                      {" · "}
                      {formatDateTime(d.created_at)}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-semibold uppercase tracking-wide px-3 py-1 rounded-full shrink-0 self-start mt-1 ${
                      paid > 0
                        ? "text-emerald-800 bg-emerald-100"
                        : "text-amber-700 bg-amber-100"
                    }`}
                  >
                    {paid > 0 ? "Partially paid" : "Unpaid"}
                  </span>
                </li>
              );
            })}
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
                className="rounded-lg border border-neutral-100 bg-neutral-50 px-4 py-3"
              >
                <div className="flex justify-between items-start gap-2">
                  <span className="text-neutral-500 line-through decoration-neutral-400 text-sm">
                    {formatFineMoney(fineTotalAmount(d), d.currency ?? "NGN")}
                    {d.reason ? ` — ${d.reason}` : ""}
                  </span>
                  <span className="text-emerald-700 text-xs font-medium shrink-0">
                    {d.paid_at ? `Paid ${formatDateTime(d.paid_at)}` : "Closed"}
                  </span>
                </div>
                {fineAmountPaid(d) > 0 && (
                  <p className="text-xs text-emerald-700 mt-1">
                    Total paid: {formatFineMoney(fineAmountPaid(d), d.currency ?? "NGN")}
                  </p>
                )}
                <p className="text-xs text-neutral-400 mt-1 flex items-center gap-1">
                  <UserCircle2 className="h-3 w-3 shrink-0" />
                  Issued by {recorderName(d)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
