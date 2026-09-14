"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { DateInput, TimeInput } from "@/components/shared/date-input";
import { OrderCelebration } from "@/components/orders/order-celebration";
import { publishLiveEvent } from "@/lib/live/publish-live-event";
import { toast } from "sonner";
import type { FiverrAccount, TeamMember } from "@/types/database";

interface OrderFormProps {
  lockedTeamMemberId?: string;
  lockedTeamMemberName?: string;
  returnTo?: string;
}

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

export function OrderForm({
  lockedTeamMemberId,
  lockedTeamMemberName,
  returnTo,
}: OrderFormProps) {
  const isSelfService = !!lockedTeamMemberId;
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [accounts, setAccounts] = useState<FiverrAccount[]>([]);
  const [selectedMember, setSelectedMember] = useState(lockedTeamMemberId ?? "");
  const [celebrate, setCelebrate] = useState<{
    name: string;
    gig: string | null;
    amount: string | null;
  } | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    if (isSelfService) return;
    supabase
      .from("team_members")
      .select("*")
      .eq("status", "active")
      .order("full_name")
      .then(({ data }) => setMembers((data as TeamMember[]) ?? []));
  }, [supabase, isSelfService]);

  useEffect(() => {
    if (lockedTeamMemberId) setSelectedMember(lockedTeamMemberId);
  }, [lockedTeamMemberId]);

  useEffect(() => {
    if (!selectedMember) {
      setAccounts([]);
      return;
    }
    supabase
      .from("fiverr_accounts")
      .select("*")
      .eq("team_member_id", selectedMember)
      .is("archived_at", null)
      .then(({ data }) => setAccounts((data as FiverrAccount[]) ?? []));
  }, [selectedMember, supabase]);

  function resolveName(teamMemberId: string) {
    if (isSelfService) return lockedTeamMemberName ?? "A member";
    return members.find((m) => m.id === teamMemberId)?.full_name ?? "A member";
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const teamMemberId = (isSelfService
      ? lockedTeamMemberId
      : (form.get("team_member_id") as string)) as string;

    const amountRaw = (form.get("order_amount") as string)?.trim();
    const amount = amountRaw ? parseFloat(amountRaw) : null;
    if (amountRaw && (!Number.isFinite(amount) || (amount ?? 0) < 0)) {
      toast.error("Enter a valid order amount");
      setLoading(false);
      return;
    }

    const currency = (form.get("currency") as string) || "USD";
    const gigName = ((form.get("gig_name") as string) || "").trim() || null;
    const payload = {
      team_member_id: teamMemberId,
      fiverr_account_id: (form.get("fiverr_account_id") as string) || null,
      received_date: form.get("received_date") as string,
      received_time: (form.get("received_time") as string) || null,
      gig_name: gigName,
      buyer_name: ((form.get("buyer_name") as string) || "").trim() || null,
      order_amount: amount,
      currency,
      notes: ((form.get("notes") as string) || "").trim() || null,
      recorded_by: user?.id ?? null,
    };

    const { error } = await supabase.from("orders_received").insert(payload);
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    const actor = resolveName(teamMemberId);
    publishLiveEvent({
      kind: "order",
      actorName: actor,
      summary: "got an order",
      href: isSelfService ? "/my-orders" : "/orders",
    });

    const amountLabel =
      amount != null && amount > 0 ? formatMoney(amount, currency) : null;

    setCelebrate({ name: actor, gig: gigName, amount: amountLabel });
    toast.success("Order recorded — celebrate!");
    setLoading(false);
  }

  function finishCelebration() {
    setCelebrate(null);
    router.push(returnTo ?? (isSelfService ? "/my-orders" : "/orders"));
    router.refresh();
  }

  return (
    <>
      <OrderCelebration
        open={!!celebrate}
        memberName={celebrate?.name ?? ""}
        gigName={celebrate?.gig}
        amountLabel={celebrate?.amount}
        onClose={finishCelebration}
      />

      <form onSubmit={handleSubmit} className="space-y-4">
        <section className="form-section-enter rounded-2xl border border-brand-orange/25 bg-gradient-to-br from-white via-white to-brand-orange-light/40 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b bg-gradient-to-r from-brand-orange-light/60 to-transparent flex items-center gap-2">
            <Trophy className="h-4 w-4 text-brand-orange-dark" />
            <h2 className="text-sm font-semibold text-neutral-900">Who got the order</h2>
          </div>
          <div className="p-5 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="team_member_id">Team Member *</Label>
              {isSelfService ? (
                <>
                  <p className="text-sm font-medium text-neutral-900 rounded-xl border border-brand-orange/25 bg-brand-orange-light/40 px-3.5 py-2.5">
                    {lockedTeamMemberName ?? "Your profile"}
                  </p>
                  <input type="hidden" name="team_member_id" value={lockedTeamMemberId} />
                </>
              ) : (
                <Select
                  id="team_member_id"
                  name="team_member_id"
                  required
                  value={selectedMember}
                  onChange={(e) => setSelectedMember(e.target.value)}
                >
                  <option value="">Select member...</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name}
                    </option>
                  ))}
                </Select>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="fiverr_account_id">Fiverr Account</Label>
              <Select id="fiverr_account_id" name="fiverr_account_id" defaultValue="">
                <option value="">Select account...</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    @{a.username}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </section>

        <section className="form-section-enter form-section-enter-delay-1 rounded-2xl border border-neutral-200/80 bg-white/95 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b bg-gradient-to-r from-brand-green-light/40 to-transparent flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-brand-green" />
            <h2 className="text-sm font-semibold text-neutral-900">Order details</h2>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <DateInput
                id="received_date"
                name="received_date"
                label="Date received *"
                required
                defaultToday
                showQuickButtons
              />
              <TimeInput id="received_time" name="received_time" />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gig_name">Gig / service</Label>
                <Input id="gig_name" name="gig_name" placeholder="Optional" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="buyer_name">Buyer name</Label>
                <Input id="buyer_name" name="buyer_name" placeholder="Optional" />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="order_amount">Order amount</Label>
                <Input
                  id="order_amount"
                  name="order_amount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select id="currency" name="currency" defaultValue="USD">
                  <option value="USD">USD</option>
                  <option value="NGN">NGN</option>
                  <option value="GBP">GBP</option>
                  <option value="EUR">EUR</option>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" rows={2} placeholder="Anything useful for the win board" />
            </div>
          </div>
        </section>

        <div className="sticky bottom-3 z-10 rounded-2xl border border-brand-orange/30 bg-white/95 backdrop-blur px-4 py-3 shadow-lg flex flex-wrap gap-3 items-center justify-between">
          <p className="text-xs text-neutral-500">
            Saving triggers a win celebration for you, and a gift-box surprise on every teammate
            dashboard — it opens automatically, then shows again after 30 minutes.
          </p>
          <div className="flex gap-2 ml-auto">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="min-w-[150px] gap-2">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Trophy className="h-4 w-4" />
                  Record order
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </>
  );
}
