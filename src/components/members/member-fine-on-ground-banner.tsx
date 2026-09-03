"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, HandCoins, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  formatFineMoney,
  obligationLabel,
  obligationPhrase,
} from "@/lib/members/fine-on-ground";
import type { FineOnGroundEntry } from "@/types/database";

interface MemberFineOnGroundBannerProps {
  teamMemberId: string;
}

export function MemberFineOnGroundBanner({ teamMemberId }: MemberFineOnGroundBannerProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<FineOnGroundEntry[]>([]);
  const [dismissing, setDismissing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("fine_on_ground_entries")
      .select("*, fiverr_account:fiverr_accounts(id, username)")
      .eq("team_member_id", teamMemberId)
      .eq("is_active", true)
      .is("seen_at", null)
      .is("paid_at", null)
      .order("created_at", { ascending: false })
      .limit(10);

    setEntries((data as FineOnGroundEntry[]) ?? []);
    setLoading(false);
  }, [supabase, teamMemberId]);

  useEffect(() => {
    load();
  }, [load]);

  async function markSeen() {
    if (entries.length === 0) return;
    setDismissing(true);
    const ids = entries.map((e) => e.id);
    await supabase
      .from("fine_on_ground_entries")
      .update({ seen_at: new Date().toISOString() })
      .in("id", ids)
      .eq("team_member_id", teamMemberId);
    setEntries([]);
    setDismissing(false);
  }

  if (loading || entries.length === 0) return null;

  const hasDebt = entries.some((e) => e.obligation_type === "debt");
  const hasFine = entries.some((e) => (e.obligation_type ?? "fine") === "fine");
  const total = entries.reduce((sum, e) => sum + Number(e.amount ?? 0), 0);
  const currency = entries[0]?.currency ?? "NGN";
  const reasons = [
    ...new Set(entries.map((e) => e.reason).filter((r): r is string => Boolean(r))),
  ];
  const accountNames = [
    ...new Set(
      entries
        .map((e) => (e.fiverr_account as { username?: string } | null)?.username)
        .filter((u): u is string => Boolean(u))
    ),
  ];

  const headline =
    hasDebt && hasFine
      ? "You have money to settle"
      : hasDebt
        ? "You have a debt to settle"
        : "You owe a disciplinary fine";

  const detailParts = entries.map((e) => {
    const kind = obligationLabel(e.obligation_type ?? "fine");
    return `${kind}: ${formatFineMoney(Number(e.amount), e.currency ?? "NGN")}`;
  });

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border shadow-sm ${
        hasDebt && !hasFine
          ? "border-sky-300 bg-gradient-to-r from-sky-50 via-white to-sky-50"
          : "border-amber-300 bg-gradient-to-r from-amber-50 via-white to-amber-50"
      }`}
    >
      <div
        className={`absolute inset-y-0 left-0 w-1.5 ${
          hasDebt && !hasFine ? "bg-sky-500" : "bg-amber-500"
        }`}
      />
      <div className="p-5 md:p-6 flex flex-col sm:flex-row sm:items-center gap-4">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
            hasDebt && !hasFine ? "bg-sky-100 text-sky-700" : "bg-amber-100 text-amber-700"
          }`}
        >
          {hasDebt && !hasFine ? (
            <HandCoins className="h-6 w-6" />
          ) : (
            <AlertTriangle className="h-6 w-6" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p
            className={`text-xs font-semibold uppercase tracking-wider ${
              hasDebt && !hasFine ? "text-sky-700" : "text-amber-700"
            }`}
          >
            {hasDebt && hasFine
              ? "Fine & debt"
              : hasDebt
                ? "Debt (money borrowed)"
                : "Disciplinary fine"}
          </p>
          <h2 className="text-lg md:text-xl font-bold text-neutral-900 mt-0.5">
            {headline}:{" "}
            <span className={hasDebt && !hasFine ? "text-sky-800" : "text-amber-800"}>
              {formatFineMoney(total, currency)}
            </span>
          </h2>
          <p className="text-sm text-neutral-600 mt-1">
            {detailParts.join(" · ")}
            {reasons.length > 0 && (
              <>
                {" "}
                — note: <strong>{reasons.join("; ")}</strong>
              </>
            )}
            .
            {accountNames.length > 0 && (
              <>
                {" "}
                Related account{accountNames.length === 1 ? "" : "s"}:{" "}
                <strong>@{accountNames.join(", @")}</strong>
              </>
            )}
          </p>
          <p className="text-xs text-neutral-500 mt-1">
            This is recorded as {entries.map((e) => obligationPhrase(e.obligation_type)).join(" / ")}.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className={`shrink-0 ${
            hasDebt && !hasFine
              ? "border-sky-300 text-sky-900 hover:bg-sky-50"
              : "border-amber-300 text-amber-900 hover:bg-amber-50"
          }`}
          onClick={markSeen}
          disabled={dismissing}
        >
          {dismissing ? <Loader2 className="h-4 w-4 animate-spin" /> : "I understand"}
        </Button>
      </div>
    </div>
  );
}
