"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateInput, TimeInput } from "@/components/shared/date-input";
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
  const [quickMode, setQuickMode] = useState(false);
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
    if (!selectedMember) { setAccounts([]); return; }
    supabase.from("fiverr_accounts")
      .select("*")
      .eq("team_member_id", selectedMember)
      .is("archived_at", null)
      .then(({ data }) => setAccounts(data ?? []));
  }, [selectedMember, supabase]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const { data: { user } } = await supabase.auth.getUser();

    const teamMemberId = (isSelfService
      ? lockedTeamMemberId
      : (form.get("team_member_id") as string)) as string;

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
      const { error } = await supabase.from("messages").insert({
        ...payload,
        message_source: isSelfService ? "member" : "manual",
      });
      if (error) { toast.error(error.message); setLoading(false); return; }
      toast.success("Message recorded");
      if (quickMode) {
        setLoading(false);
        (e.target as HTMLFormElement).querySelector<HTMLInputElement>('[name="gig_name"]')!.value = "";
        (e.target as HTMLFormElement).querySelector<HTMLTextAreaElement>('[name="notes"]')!.value = "";
        return;
      }
      router.push(returnTo ?? "/messages");
    } else if (message) {
      const { error } = await supabase.from("messages").update(payload).eq("id", message.id);
      if (error) { toast.error(error.message); setLoading(false); return; }
      toast.success("Message updated");
      router.push(returnTo ?? "/messages");
    }
    setLoading(false);
  }

  const msg = message;

  return (
    <div className="space-y-4">
      {mode === "create" && (
        <label className="flex items-center gap-2 text-sm text-neutral-600">
          <input type="checkbox" checked={quickMode} onChange={(e) => setQuickMode(e.target.checked)} />
          Quick Entry Mode — keep member & date after saving
        </label>
      )}

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader><CardTitle>Message Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="team_member_id">Team Member *</Label>
              {isSelfService ? (
                <>
                  <p className="text-sm font-medium text-neutral-900 rounded-lg border bg-neutral-50 px-3 py-2.5">
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
                  {members.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                </Select>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="fiverr_account_id">Fiverr Account</Label>
              <Select id="fiverr_account_id" name="fiverr_account_id" defaultValue={msg?.fiverr_account_id ?? ""}>
                <option value="">Select account...</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.username}</option>)}
              </Select>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <DateInput
                id="received_date"
                name="received_date"
                label="Date Received *"
                required
                defaultToday={mode === "create"}
                value={msg?.received_date}
                showQuickButtons
              />
              <TimeInput id="received_time" name="received_time" defaultValue={msg?.received_time?.slice(0, 5) ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="service_id">Service / Gig Category</Label>
              <Select id="service_id" name="service_id" defaultValue={msg?.service_id ?? ""}>
                <option value="">Select service...</option>
                {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gig_name">Gig Name</Label>
                <Input id="gig_name" name="gig_name" defaultValue={msg?.gig_name ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prospect_name">Prospect/Buyer Name</Label>
                <Input id="prospect_name" name="prospect_name" defaultValue={msg?.prospect_name ?? ""} />
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
              <Textarea id="notes" name="notes" rows={2} defaultValue={msg?.notes ?? ""} />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "create" ? (quickMode ? "Add Message" : "Save Message") : "Update Message"}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
