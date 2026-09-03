"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
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

  const accountNames = [
    ...new Set(
      entries
        .map((e) => (e.fiverr_account as { username?: string } | null)?.username)
        .filter((u): u is string => Boolean(u))
    ),
  ];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-emerald-300 bg-gradient-to-r from-emerald-50 via-white to-emerald-50 shadow-sm">
      <div className="absolute inset-y-0 left-0 w-1.5 bg-emerald-500" />
      <div className="p-5 md:p-6 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
            Clearance update
          </p>
          <h2 className="text-lg md:text-xl font-bold text-neutral-900 mt-0.5 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            You are fine on ground
          </h2>
          <p className="text-sm text-neutral-600 mt-1">
            Admin confirmed your name matches an account owner who is fine on ground.
            {accountNames.length > 0 && (
              <>
                {" "}
                Related account{accountNames.length === 1 ? "" : "s"}:{" "}
                <strong>@{accountNames.join(", @")}</strong>
              </>
            )}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 border-emerald-300 text-emerald-800 hover:bg-emerald-50"
          onClick={markSeen}
          disabled={dismissing}
        >
          {dismissing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Got it"}
        </Button>
      </div>
    </div>
  );
}
