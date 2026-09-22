"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Check, Loader2, X } from "lucide-react";
import { formatDate } from "@/lib/utils";

export interface DeactivationRequestRow {
  id: string;
  status: string;
  reason: string | null;
  account_ids: string[] | null;
  requested_at: string;
  review_note: string | null;
  team_member: { id: string; full_name: string } | null;
}

export function DeactivationRequestsPanel({
  requests,
}: {
  requests: DeactivationRequestRow[];
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function review(requestId: string, action: "approve" | "reject") {
    setPendingId(requestId);
    try {
      const res = await fetch("/api/account-deactivation/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Could not review request");
        return;
      }
      if (action === "approve") {
        toast.success(
          `Approved — ${data.movedCount ?? 0} account(s) moved to Reserved (not deactivated)`
        );
      } else {
        toast.success("Request rejected — accounts stay active");
      }
      startTransition(() => router.refresh());
    } catch {
      toast.error("Network error");
    } finally {
      setPendingId(null);
    }
  }

  if (requests.length === 0) {
    return (
      <p className="text-sm text-neutral-500 py-8 text-center">
        No pending deactivation requests.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((req) => {
        const busy = pendingId === req.id || isPending;
        return (
          <div
            key={req.id}
            className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 space-y-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-neutral-900">
                  {req.team_member?.full_name ?? "Unknown member"}
                </p>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Requested {formatDate(req.requested_at)} ·{" "}
                  {(req.account_ids ?? []).length} account(s) listed
                </p>
              </div>
              <Badge variant="warning">Pending review</Badge>
            </div>
            {req.reason ? (
              <p className="text-sm text-neutral-700 bg-white/70 rounded-lg px-3 py-2 border">
                “{req.reason}”
              </p>
            ) : (
              <p className="text-sm text-neutral-500 italic">No reason given</p>
            )}
            <p className="text-xs text-neutral-500">
              Approving moves their Fiverr accounts to <strong>Reserved</strong> — they are not
              deactivated or archived. Login access stays on.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                disabled={busy}
                onClick={() => review(req.id, "approve")}
                className="gap-1.5"
              >
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                Approve → Reserved
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => review(req.id, "reject")}
                className="gap-1.5"
              >
                <X className="h-3.5 w-3.5" />
                Reject
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ReservedAccountsRestoreButton({ accountId }: { accountId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function restore() {
    setBusy(true);
    try {
      const res = await fetch("/api/account-deactivation/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Could not restore");
        return;
      }
      toast.success("Account restored to active");
      router.refresh();
    } catch {
      toast.error("Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button size="sm" variant="outline" disabled={busy} onClick={restore}>
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Restore to active"}
    </Button>
  );
}

/** Client tab switcher for reserved page */
export function ReservedAccountsTabs({
  tab,
  pendingCount,
  reservedCount,
}: {
  tab: string;
  pendingCount: number;
  reservedCount: number;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState(tab);

  useEffect(() => {
    setCurrent(tab);
  }, [tab]);

  function go(next: string) {
    setCurrent(next);
    router.push(`/reserved-accounts?tab=${next}`);
  }

  return (
    <div className="flex gap-1 rounded-lg border border-neutral-200 bg-white p-1 w-fit">
      <button
        type="button"
        onClick={() => go("requests")}
        className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
          current === "requests"
            ? "bg-[#7b1e3a] text-white"
            : "text-neutral-600 hover:bg-neutral-100"
        }`}
      >
        Pending requests ({pendingCount})
      </button>
      <button
        type="button"
        onClick={() => go("reserved")}
        className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
          current === "reserved"
            ? "bg-[#7b1e3a] text-white"
            : "text-neutral-600 hover:bg-neutral-100"
        }`}
      >
        Reserved pool ({reservedCount})
      </button>
    </div>
  );
}
