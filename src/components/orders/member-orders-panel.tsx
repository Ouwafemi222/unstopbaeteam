"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Plus, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { RelativeTime } from "@/components/shared/relative-time";
import { formatDate } from "@/lib/utils";
import type { OrderReceived } from "@/types/database";

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

interface MemberOrdersPanelProps {
  teamMemberId: string;
  newHref?: string;
}

export function MemberOrdersPanel({
  teamMemberId,
  newHref = "/my-orders/new",
}: MemberOrdersPanelProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<OrderReceived[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("orders_received")
      .select("*, fiverr_account:fiverr_accounts(id, username)")
      .eq("team_member_id", teamMemberId)
      .order("received_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) console.error(error.message);
    setOrders((data as OrderReceived[]) ?? []);
    setLoading(false);
  }, [supabase, teamMemberId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-brand-orange" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-brand-orange/30 bg-gradient-to-br from-brand-orange-light/40 via-white to-brand-green-light/30 px-6 py-12 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-orange text-white shadow-lg shadow-brand-orange/30">
          <Trophy className="h-7 w-7" />
        </div>
        <h3 className="mt-4 text-xl font-bold text-neutral-900">No orders yet</h3>
        <p className="text-sm text-neutral-500 mt-1 max-w-sm mx-auto">
          When a Fiverr order lands, record it here — your team will celebrate with you on the live
          stream.
        </p>
        <Link href={newHref} className="inline-block mt-5">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Record first order
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {orders.map((o) => (
        <div
          key={o.id}
          className="rounded-2xl border border-brand-orange/15 bg-white px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm"
        >
          <div className="min-w-0">
            <p className="font-bold text-neutral-900">
              {o.gig_name || "Order received"}
              {o.order_amount != null && (
                <span className="ml-2 text-brand-orange">
                  {formatMoney(Number(o.order_amount), o.currency || "USD")}
                </span>
              )}
            </p>
            <p className="text-sm text-neutral-500 mt-0.5">
              {formatDate(o.received_date)}
              {o.fiverr_account?.username ? ` · @${o.fiverr_account.username}` : ""}
              {o.buyer_name ? ` · ${o.buyer_name}` : ""}
            </p>
            {o.notes && <p className="text-xs text-neutral-400 mt-1">{o.notes}</p>}
          </div>
          <RelativeTime iso={o.created_at} className="text-xs text-neutral-400 shrink-0" />
        </div>
      ))}
    </div>
  );
}
