"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Loader2, BellRing, X, Pencil, Banknote } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { toast } from "sonner";
import {
  formatFineMoney,
  fineAmountPaid,
  fineRemaining,
  fineTotalAmount,
  obligationLabel,
} from "@/lib/members/fine-on-ground";
import { formatDateTime } from "@/lib/utils";
import type { FineOnGroundEntry } from "@/types/database";

export interface FineEarningAlert {
  id: string;
  team_member_id: string;
  earned_amount: number;
  earned_currency: string;
  fine_amount: number;
  fine_currency: string;
  year_month: string | null;
  week_number: number | null;
  message: string | null;
  admin_seen_at: string | null;
  created_at: string;
  team_member?: { id: string; full_name: string } | null;
}

interface AdminUnpaidFinesPanelProps {
  /** Compact for dashboard; full for /fines page */
  variant?: "dashboard" | "page";
}

export function AdminUnpaidFinesPanel({ variant = "dashboard" }: AdminUnpaidFinesPanelProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [unpaid, setUnpaid] = useState<FineOnGroundEntry[]>([]);
  const [alerts, setAlerts] = useState<FineEarningAlert[]>([]);
  const [popupAlert, setPopupAlert] = useState<FineEarningAlert | null>(null);
  const [editing, setEditing] = useState<FineOnGroundEntry | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editCurrency, setEditCurrency] = useState("NGN");
  const [editReason, setEditReason] = useState("");
  const [editType, setEditType] = useState<"fine" | "debt">("fine");
  const [savingEdit, setSavingEdit] = useState(false);
  const [paying, setPaying] = useState<FineOnGroundEntry | null>(null);
  const [paymentNow, setPaymentNow] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [savingPayment, setSavingPayment] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: fines }, { data: earningAlerts }] = await Promise.all([
      supabase
        .from("fine_on_ground_entries")
        .select("*, team_member:team_members(id, full_name), fiverr_account:fiverr_accounts(id, username)")
        .eq("is_active", true)
        .is("paid_at", null)
        .not("team_member_id", "is", null)
        .order("created_at", { ascending: false }),
      supabase
        .from("fine_earning_alerts")
        .select("*, team_member:team_members(id, full_name)")
        .is("admin_seen_at", null)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    setUnpaid((fines as FineOnGroundEntry[]) ?? []);
    const alertList = (earningAlerts as FineEarningAlert[]) ?? [];
    setAlerts(alertList);
    if (alertList.length > 0) setPopupAlert(alertList[0]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  function openEdit(f: FineOnGroundEntry) {
    setEditing(f);
    setEditAmount(String(f.amount ?? ""));
    setEditCurrency(f.currency ?? "NGN");
    setEditReason(f.reason ?? "");
    setEditType((f.obligation_type as "fine" | "debt") ?? "fine");
  }

  function openPayment(f: FineOnGroundEntry) {
    setPaying(f);
    setPaymentNow("");
    setPaymentNote(f.payment_note ?? "");
  }

  async function saveEdit() {
    if (!editing) return;
    const amount = parseFloat(editAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid amount greater than 0");
      return;
    }

    const alreadyPaid = fineAmountPaid(editing);
    if (amount < alreadyPaid) {
      toast.error(
        `Total cannot be less than already paid (${formatFineMoney(alreadyPaid, editing.currency ?? "NGN")})`
      );
      return;
    }

    setSavingEdit(true);
    const fullyPaid = amount <= alreadyPaid + 0.0001;
    const { error } = await supabase
      .from("fine_on_ground_entries")
      .update({
        amount,
        currency: editCurrency,
        reason: editReason.trim() || null,
        obligation_type: editType,
        seen_at: null,
        ...(fullyPaid
          ? {
              amount_paid: amount,
              paid_at: new Date().toISOString(),
              is_active: false,
              last_payment_at: new Date().toISOString(),
            }
          : {}),
      })
      .eq("id", editing.id);

    if (error) {
      toast.error(
        error.message.includes("row-level security")
          ? "Only a super admin can edit fines"
          : error.message
      );
    } else {
      toast.success(
        fullyPaid
          ? `${obligationLabel(editType)} settled (paid in full)`
          : `${obligationLabel(editType)} updated${amount > Number(editing.amount) ? " (increased)" : ""}`
      );
      setEditing(null);
      await load();
    }
    setSavingEdit(false);
  }

  async function savePayment(options?: { settleFully?: boolean }) {
    if (!paying) return;
    const currency = paying.currency ?? "NGN";
    const total = fineTotalAmount(paying);
    const alreadyPaid = fineAmountPaid(paying);
    const remaining = fineRemaining(paying);

    let nextPaid = alreadyPaid;
    if (options?.settleFully) {
      nextPaid = total;
    } else {
      const received = parseFloat(paymentNow);
      if (!Number.isFinite(received) || received <= 0) {
        toast.error("Enter how much they paid now");
        return;
      }
      nextPaid = Math.min(total, alreadyPaid + received);
    }

    const settled = nextPaid >= total - 0.0001;
    const nowIso = new Date().toISOString();

    setSavingPayment(true);
    const { error } = await supabase
      .from("fine_on_ground_entries")
      .update({
        amount_paid: settled ? total : nextPaid,
        last_payment_at: nowIso,
        payment_note: paymentNote.trim() || null,
        seen_at: null,
        ...(settled
          ? { paid_at: nowIso, is_active: false }
          : { paid_at: null, is_active: true }),
      })
      .eq("id", paying.id);

    if (error) {
      toast.error(
        error.message.includes("row-level security")
          ? "Only a super admin can record payments"
          : error.message
      );
    } else {
      const paidThisTime = nextPaid - alreadyPaid;
      toast.success(
        settled
          ? `Fully settled — ${formatFineMoney(total, currency)}`
          : `Recorded ${formatFineMoney(paidThisTime, currency)}. Remaining ${formatFineMoney(remaining - paidThisTime, currency)}`
      );
      setPaying(null);
      await load();
    }
    setSavingPayment(false);
  }

  async function dismissAlert(id: string) {
    await supabase
      .from("fine_earning_alerts")
      .update({ admin_seen_at: new Date().toISOString() })
      .eq("id", id);
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    setPopupAlert((prev) => (prev?.id === id ? null : prev));
  }

  async function dismissAllAlerts() {
    const ids = alerts.map((a) => a.id);
    if (ids.length === 0) return;
    await supabase
      .from("fine_earning_alerts")
      .update({ admin_seen_at: new Date().toISOString() })
      .in("id", ids);
    setAlerts([]);
    setPopupAlert(null);
  }

  const totalOwed = unpaid.reduce((sum, f) => sum + fineRemaining(f), 0);
  const currency = unpaid[0]?.currency ?? "NGN";
  const limit = variant === "dashboard" ? 8 : 50;
  const shown = unpaid.slice(0, limit);

  return (
    <>
      {popupAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-amber-200 overflow-hidden">
            <div className="bg-amber-500 px-4 py-3 flex items-center justify-between text-white">
              <p className="font-semibold flex items-center gap-2">
                <BellRing className="h-5 w-5" />
                Member made money — remind about fine
              </p>
              <button type="button" onClick={() => dismissAlert(popupAlert.id)} aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-lg font-bold text-neutral-900">
                {(popupAlert.team_member as { full_name?: string } | null)?.full_name ?? "A member"} recorded earnings
              </p>
              <p className="text-sm text-neutral-600">
                Earned{" "}
                <strong>
                  {formatFineMoney(Number(popupAlert.earned_amount), popupAlert.earned_currency)}
                </strong>
                {popupAlert.week_number != null && (
                  <>
                    {" "}
                    (week {popupAlert.week_number}
                    {popupAlert.year_month ? ` · ${popupAlert.year_month}` : ""})
                  </>
                )}
              </p>
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                They still owe{" "}
                <strong>
                  {formatFineMoney(Number(popupAlert.fine_amount), popupAlert.fine_currency)}
                </strong>
                . Remind them: <em>you have fine on ground</em>.
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button onClick={() => dismissAlert(popupAlert.id)}>Got it — I&apos;ll remind them</Button>
                {alerts.length > 1 && (
                  <Button variant="outline" onClick={dismissAllAlerts}>
                    Dismiss all ({alerts.length})
                  </Button>
                )}
                <Link href="/fines">
                  <Button variant="secondary">Open unpaid fines</Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-neutral-200 overflow-hidden">
            <div className="px-5 py-4 border-b flex items-center justify-between bg-neutral-50">
              <div>
                <p className="font-semibold text-neutral-900">Edit fine / debt</p>
                <p className="text-sm text-neutral-500">
                  {(editing.team_member as { full_name?: string } | null)?.full_name ?? editing.input_name}
                </p>
              </div>
              <button type="button" onClick={() => setEditing(null)} aria-label="Close" disabled={savingEdit}>
                <X className="h-5 w-5 text-neutral-500" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-type">Type</Label>
                <Select
                  id="edit-type"
                  value={editType}
                  onChange={(e) => setEditType(e.target.value as "fine" | "debt")}
                >
                  <option value="fine">Fine (disciplinary)</option>
                  <option value="debt">Debt (money borrowed)</option>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="edit-amount">Total amount</Label>
                  <Input
                    id="edit-amount"
                    type="number"
                    min="0"
                    step="any"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-currency">Currency</Label>
                  <Select
                    id="edit-currency"
                    value={editCurrency}
                    onChange={(e) => setEditCurrency(e.target.value)}
                  >
                    <option value="NGN">NGN</option>
                    <option value="GBP">GBP</option>
                    <option value="USD">USD</option>
                  </Select>
                </div>
              </div>
              {fineAmountPaid(editing) > 0 && (
                <p className="text-xs text-neutral-500">
                  Already paid: {formatFineMoney(fineAmountPaid(editing), editing.currency ?? "NGN")} ·
                  Remaining: {formatFineMoney(fineRemaining(editing), editing.currency ?? "NGN")}
                </p>
              )}
              <div className="space-y-2">
                <Label htmlFor="edit-reason">Reason / note</Label>
                <Textarea
                  id="edit-reason"
                  rows={3}
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder="Why this was recorded or updated"
                />
              </div>
              <p className="text-xs text-neutral-500">
                Saving updates what the member sees and shows them the banner again.
              </p>
              <div className="flex gap-2 justify-end pt-1">
                <Button variant="outline" onClick={() => setEditing(null)} disabled={savingEdit}>
                  Cancel
                </Button>
                <Button onClick={saveEdit} disabled={savingEdit}>
                  {savingEdit ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                    </>
                  ) : (
                    "Save changes"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {paying && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-neutral-200 overflow-hidden">
            <div className="px-5 py-4 border-b flex items-center justify-between bg-emerald-50">
              <div>
                <p className="font-semibold text-neutral-900">Record payment</p>
                <p className="text-sm text-neutral-500">
                  {(paying.team_member as { full_name?: string } | null)?.full_name ?? paying.input_name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPaying(null)}
                aria-label="Close"
                disabled={savingPayment}
              >
                <X className="h-5 w-5 text-neutral-500" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl border bg-neutral-50 px-2 py-3">
                  <p className="text-[10px] uppercase tracking-wide text-neutral-500">Total</p>
                  <p className="text-sm font-bold text-neutral-900 mt-1">
                    {formatFineMoney(fineTotalAmount(paying), paying.currency ?? "NGN")}
                  </p>
                </div>
                <div className="rounded-xl border bg-emerald-50 px-2 py-3">
                  <p className="text-[10px] uppercase tracking-wide text-emerald-700">Paid</p>
                  <p className="text-sm font-bold text-emerald-800 mt-1">
                    {formatFineMoney(fineAmountPaid(paying), paying.currency ?? "NGN")}
                  </p>
                </div>
                <div className="rounded-xl border bg-amber-50 px-2 py-3">
                  <p className="text-[10px] uppercase tracking-wide text-amber-700">Left</p>
                  <p className="text-sm font-bold text-amber-900 mt-1">
                    {formatFineMoney(fineRemaining(paying), paying.currency ?? "NGN")}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment-now">Amount paid now</Label>
                <Input
                  id="payment-now"
                  type="number"
                  min="0"
                  step="any"
                  value={paymentNow}
                  onChange={(e) => setPaymentNow(e.target.value)}
                  placeholder={`Up to ${formatFineMoney(fineRemaining(paying), paying.currency ?? "NGN")}`}
                />
                <p className="text-xs text-neutral-500">
                  Enter what they paid today, even if it is less than the full balance.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment-note">Note (optional)</Label>
                <Textarea
                  id="payment-note"
                  rows={2}
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  placeholder="e.g. Paid via transfer — will finish next week"
                />
              </div>

              <div className="flex flex-col gap-2 pt-1">
                <Button onClick={() => savePayment()} disabled={savingPayment}>
                  {savingPayment ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                    </>
                  ) : (
                    <>
                      <Banknote className="h-4 w-4" />
                      Save payment
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => savePayment({ settleFully: true })}
                  disabled={savingPayment}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Mark fully paid
                </Button>
                <Button variant="ghost" onClick={() => setPaying(null)} disabled={savingPayment}>
                  Cancel
                </Button>
              </div>
              <p className="text-xs text-neutral-500 text-center">
                The member will see the updated paid / remaining amounts right away.
              </p>
            </div>
          </div>
        </div>
      )}

      <Card className="border-amber-200/80 bg-gradient-to-r from-white to-amber-50/40">
        <CardContent className="p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold text-neutral-900">Unpaid fines &amp; debts</h2>
                <p className="text-sm text-neutral-500 mt-0.5">
                  Record partial payments, edit amounts, and get alerts when they record earnings.
                </p>
              </div>
            </div>
            {variant === "dashboard" && (
              <Link href="/fines">
                <Button variant="outline" size="sm">
                  View all
                </Button>
              </Link>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border bg-white p-3">
                  <p className="text-xs text-neutral-500 uppercase tracking-wide">Unpaid people</p>
                  <p className="text-2xl font-bold text-neutral-900 mt-1">
                    {new Set(unpaid.map((f) => f.team_member_id)).size}
                  </p>
                </div>
                <div className="rounded-xl border bg-white p-3">
                  <p className="text-xs text-neutral-500 uppercase tracking-wide">Still owed</p>
                  <p className="text-2xl font-bold text-amber-800 mt-1">
                    {formatFineMoney(totalOwed, currency)}
                  </p>
                </div>
                <div className="rounded-xl border bg-white p-3 col-span-2 sm:col-span-1">
                  <p className="text-xs text-neutral-500 uppercase tracking-wide">New earning alerts</p>
                  <p className="text-2xl font-bold text-neutral-900 mt-1">{alerts.length}</p>
                </div>
              </div>

              {alerts.length > 0 && (
                <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 space-y-2">
                  <p className="text-sm font-semibold text-amber-900 flex items-center gap-2">
                    <BellRing className="h-4 w-4" />
                    Recent: members with unpaid fines who recorded money
                  </p>
                  <ul className="space-y-2 text-sm">
                    {alerts.slice(0, variant === "dashboard" ? 3 : 10).map((a) => (
                      <li
                        key={a.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white border px-3 py-2"
                      >
                        <span>
                          <strong>
                            {(a.team_member as { full_name?: string } | null)?.full_name ?? "Member"}
                          </strong>{" "}
                          earned {formatFineMoney(Number(a.earned_amount), a.earned_currency)} · owes{" "}
                          {formatFineMoney(Number(a.fine_amount), a.fine_currency)}
                          <span className="block text-xs text-neutral-400">{formatDateTime(a.created_at)}</span>
                        </span>
                        <Button size="sm" variant="outline" onClick={() => dismissAlert(a.id)}>
                          Seen
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {shown.length === 0 ? (
                <p className="text-sm text-neutral-500 text-center py-6">
                  No unpaid fines right now. Everyone is clear.
                </p>
              ) : (
                <div className="responsive-table rounded-xl border bg-white overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-neutral-500 bg-neutral-50">
                        <th className="p-3 font-medium">Member</th>
                        <th className="p-3 font-medium">Type</th>
                        <th className="p-3 font-medium">Balance</th>
                        <th className="p-3 font-medium">Reason</th>
                        <th className="p-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shown.map((f) => {
                        const paid = fineAmountPaid(f);
                        const remaining = fineRemaining(f);
                        const total = fineTotalAmount(f);
                        return (
                          <tr key={f.id} className="border-b hover:bg-neutral-50">
                            <td className="p-3 font-medium text-neutral-900">
                              {(f.team_member as { full_name?: string } | null)?.full_name ?? f.input_name}
                            </td>
                            <td className="p-3">
                              <span
                                className={
                                  f.obligation_type === "debt"
                                    ? "text-sky-700 font-medium"
                                    : "text-amber-700 font-medium"
                                }
                              >
                                {obligationLabel(f.obligation_type ?? "fine")}
                              </span>
                            </td>
                            <td className="p-3">
                              <p className="font-semibold text-amber-800">
                                {formatFineMoney(remaining, f.currency ?? "NGN")} left
                              </p>
                              <p className="text-xs text-neutral-500 mt-0.5">
                                of {formatFineMoney(total, f.currency ?? "NGN")}
                                {paid > 0 && (
                                  <> · paid {formatFineMoney(paid, f.currency ?? "NGN")}</>
                                )}
                              </p>
                            </td>
                            <td className="p-3 text-neutral-600">
                              {f.reason ?? "—"}
                              {f.payment_note && (
                                <span className="block text-xs text-emerald-700 mt-0.5">
                                  Payment note: {f.payment_note}
                                </span>
                              )}
                            </td>
                            <td className="p-3">
                              <div className="flex flex-wrap gap-2">
                                <Button size="sm" variant="outline" onClick={() => openEdit(f)}>
                                  <Pencil className="h-3.5 w-3.5" />
                                  Edit
                                </Button>
                                <Button size="sm" onClick={() => openPayment(f)}>
                                  <Banknote className="h-3.5 w-3.5" />
                                  Record payment
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {variant === "dashboard" && unpaid.length > limit && (
                <p className="text-xs text-neutral-500 text-center">
                  Showing {limit} of {unpaid.length}.{" "}
                  <Link href="/fines" className="text-brand-green hover:underline">
                    See all unpaid fines
                  </Link>
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </>
  );
}
