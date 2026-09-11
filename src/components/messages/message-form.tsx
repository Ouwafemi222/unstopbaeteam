"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Loader2, MessageSquare, Sparkles, UserRound, Zap } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { DateInput, TimeInput } from "@/components/shared/date-input";
import { publishLiveEvent } from "@/lib/live/publish-live-event";
import { toast } from "sonner";
import type { TeamMember, FiverrAccount, Service, Message } from "@/types/database";

interface MessageFormProps {
  mode: "create" | "edit";
  message?: Message;
  lockedTeamMemberId?: string;
  lockedTeamMemberName?: string;
  returnTo?: string;
}

export function MessageForm({
  mode,
  message,
  lockedTeamMemberId,
  lockedTeamMemberName,
  returnTo,
}: MessageFormProps) {
  const isSelfService = !!lockedTeamMemberId;
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [accounts, setAccounts] = useState<FiverrAccount[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedMember, setSelectedMember] = useState(
    lockedTeamMemberId ?? message?.team_member_id ?? ""
  );
  const [quickMode, setQuickMode] = useState(mode === "create");
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const [{ data: m }, { data: s }] = await Promise.all([
        isSelfService
          ? Promise.resolve({ data: null })
          : supabase.from("team_members").select("*").eq("status", "active").order("full_name"),
        supabase.from("services").select("*").eq("is_active", true).order("name"),
      ]);
      if (m) setMembers(m ?? []);
      setServices(s ?? []);
    }
    load();
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
      .then(({ data }) => setAccounts(data ?? []));
  }, [selectedMember, supabase]);

  function resolveActorName(teamMemberId: string) {
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

    const teamMemberId = (
      isSelfService ? lockedTeamMemberId : (form.get("team_member_id") as string)
    ) as string;

    const payload = {
      team_member_id: teamMemberId,
      fiverr_account_id: (form.get("fiverr_account_id") as string) || null,
      service_id: (form.get("service_id") as string) || null,
      received_date: form.get("received_date") as string,
      received_time: (form.get("received_time") as string) || null,
      gig_name: (form.get("gig_name") as string) || null,
      prospect_name: (form.get("prospect_name") as string) || null,
      status: (form.get("status") as string) || "new",
      notes: (form.get("notes") as string) || null,
      recorded_by: user?.id,
    };

    if (mode === "create") {
      const { data, error } = await supabase
        .from("messages")
        .insert({
          ...payload,
          message_source: isSelfService ? "member" : "manual",
        })
        .select("id")
        .single();

      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }

      publishLiveEvent({
        kind: "message",
        actorName: resolveActorName(teamMemberId),
        summary: "got a message",
        href: isSelfService ? "/my-messages" : "/messages",
      });

      toast.success("Message recorded — team stream updated");
      if (quickMode) {
        setLoading(false);
        const gig = (e.target as HTMLFormElement).querySelector<HTMLInputElement>('[name="gig_name"]');
        const notes = (e.target as HTMLFormElement).querySelector<HTMLTextAreaElement>('[name="notes"]');
        const prospect = (e.target as HTMLFormElement).querySelector<HTMLInputElement>(
          '[name="prospect_name"]'
        );
        if (gig) gig.value = "";
        if (notes) notes.value = "";
        if (prospect) prospect.value = "";
        return;
      }
      void data;
      router.push(returnTo ?? (isSelfService ? "/my-messages" : "/messages"));
    } else if (message) {
      const { error } = await supabase.from("messages").update(payload).eq("id", message.id);
      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }
      toast.success("Message updated");
      router.push(returnTo ?? (isSelfService ? "/my-messages" : "/messages"));
    }
    setLoading(false);
  }

  const msg = message;

  return (
    <div className="space-y-5">
      {mode === "create" && (
        <button
          type="button"
          onClick={() => setQuickMode((v) => !v)}
          className={`form-section-enter w-full flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all ${
            quickMode
              ? "border-brand-orange/40 bg-gradient-to-r from-brand-orange-light/80 to-white shadow-sm"
              : "border-neutral-200 bg-white hover:border-brand-orange/30"
          }`}
        >
          <span
            className={`flex h-10 w-10 items-center justify-center rounded-xl ${
              quickMode ? "bg-brand-orange text-white" : "bg-neutral-100 text-neutral-500"
            }`}
          >
            <Zap className="h-5 w-5" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-semibold text-neutral-900">Quick Entry Mode</span>
            <span className="block text-xs text-neutral-500 mt-0.5">
              {quickMode
                ? "On — after save, stay here and keep member & date for the next message"
                : "Off — save once and return to your message list"}
            </span>
          </span>
          <span
            className={`text-xs font-bold uppercase tracking-wide px-2.5 py-1 rounded-full ${
              quickMode ? "bg-brand-orange text-white" : "bg-neutral-100 text-neutral-500"
            }`}
          >
            {quickMode ? "On" : "Off"}
          </span>
        </button>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <section className="form-section-enter form-section-enter-delay-1 rounded-2xl border border-neutral-200/80 bg-white/95 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b bg-gradient-to-r from-brand-green-light/40 to-transparent flex items-center gap-2">
            <UserRound className="h-4 w-4 text-brand-green" />
            <h2 className="text-sm font-semibold text-neutral-900">Who received it</h2>
          </div>
          <div className="p-5 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="team_member_id">Team Member *</Label>
              {isSelfService ? (
                <>
                  <p className="text-sm font-medium text-neutral-900 rounded-xl border border-brand-green/20 bg-brand-green-light/30 px-3.5 py-2.5">
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
              <Select
                id="fiverr_account_id"
                name="fiverr_account_id"
                defaultValue={msg?.fiverr_account_id ?? ""}
              >
                <option value="">Select account...</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.username}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </section>

        <section className="form-section-enter form-section-enter-delay-2 rounded-2xl border border-neutral-200/80 bg-white/95 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b bg-gradient-to-r from-brand-orange-light/50 to-transparent flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-brand-orange-dark" />
            <h2 className="text-sm font-semibold text-neutral-900">When it came in</h2>
          </div>
          <div className="p-5 grid sm:grid-cols-2 gap-4">
            <DateInput
              id="received_date"
              name="received_date"
              label="Date Received *"
              required
              defaultToday={mode === "create"}
              value={msg?.received_date}
              showQuickButtons
            />
            <TimeInput
              id="received_time"
              name="received_time"
              defaultValue={msg?.received_time?.slice(0, 5) ?? ""}
            />
          </div>
        </section>

        <section className="form-section-enter form-section-enter-delay-3 rounded-2xl border border-neutral-200/80 bg-white/95 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b bg-gradient-to-r from-emerald-50 to-transparent flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-emerald-700" />
            <h2 className="text-sm font-semibold text-neutral-900">Message details</h2>
          </div>
          <div className="p-5 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="service_id">Service / Gig Category</Label>
              <Select id="service_id" name="service_id" defaultValue={msg?.service_id ?? ""}>
                <option value="">Select service...</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gig_name">Gig Name</Label>
                <Input id="gig_name" name="gig_name" defaultValue={msg?.gig_name ?? ""} placeholder="Optional" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prospect_name">Prospect / Buyer Name</Label>
                <Input
                  id="prospect_name"
                  name="prospect_name"
                  defaultValue={msg?.prospect_name ?? ""}
                  placeholder="Optional"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Message Status</Label>
              <Select id="status" name="status" defaultValue={msg?.status ?? "new"}>
                <option value="new">New</option>
                <option value="replied">Replied</option>
                <option value="qualified">Qualified</option>
                <option value="not_qualified">Not Qualified</option>
                <option value="converted_to_order">Converted To Order</option>
                <option value="follow_up">Follow-Up</option>
                <option value="closed">Closed</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                rows={2}
                defaultValue={msg?.notes ?? ""}
                placeholder="Anything useful for follow-up"
              />
            </div>
          </div>
        </section>

        <div className="sticky bottom-3 z-10 rounded-2xl border border-neutral-200 bg-white/95 backdrop-blur px-4 py-3 shadow-lg flex flex-wrap gap-3 items-center justify-between">
          <p className="text-xs text-neutral-500 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-brand-orange" />
            Saving also lights up the live team stream on everyone&apos;s dashboard.
          </p>
          <div className="flex gap-2 ml-auto">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="min-w-[140px]">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : mode === "create" ? (
                quickMode ? (
                  "Add Message"
                ) : (
                  "Save Message"
                )
              ) : (
                "Update Message"
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
