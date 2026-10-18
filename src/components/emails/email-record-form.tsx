"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { DateInput, TimeInput } from "@/components/shared/date-input";
import type { EmailRecord, TeamMember } from "@/types/database";

interface EmailRecordFormProps {
  mode: "create" | "edit";
  record?: EmailRecord;
  lockedTeamMemberId?: string;
  returnTo: string;
}

export function EmailRecordForm({
  mode,
  record,
  lockedTeamMemberId,
  returnTo,
}: EmailRecordFormProps) {
  const isSelfService = !!lockedTeamMemberId;
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<TeamMember[]>([]);
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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const form = new FormData(event.currentTarget);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const subject = ((form.get("subject") as string) || "").trim();
    if (!subject) {
      toast.error("Add a subject.");
      setLoading(false);
      return;
    }

    const senderEmail = ((form.get("sender_email") as string) || "").trim();
    if (senderEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(senderEmail)) {
      toast.error("Enter a valid sender email, or leave it blank.");
      setLoading(false);
      return;
    }

    const teamMemberId = (
      isSelfService ? lockedTeamMemberId : (form.get("team_member_id") as string)
    ) as string;

    if (!teamMemberId) {
      toast.error("Choose the team member.");
      setLoading(false);
      return;
    }

    const payload = {
      team_member_id: teamMemberId,
      received_date: form.get("received_date") as string,
      received_time: (form.get("received_time") as string) || null,
      sender_name: ((form.get("sender_name") as string) || "").trim() || null,
      sender_email: senderEmail || null,
      subject,
      notes: ((form.get("notes") as string) || "").trim() || null,
      updated_at: new Date().toISOString(),
    };

    if (mode === "create") {
      const { error } = await supabase.from("email_records").insert({
        ...payload,
        recorded_by: user?.id ?? null,
      });
      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }
      toast.success("Email recorded");
      router.push(returnTo);
      router.refresh();
      return;
    }

    if (record) {
      const { error } = await supabase.from("email_records").update(payload).eq("id", record.id);
      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }
      toast.success("Email updated");
      router.push(returnTo);
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6">
      {!isSelfService && (
        <div className="space-y-2">
          <Label htmlFor="team_member_id">Team member</Label>
          <Select
            id="team_member_id"
            name="team_member_id"
            required
            defaultValue={record?.team_member_id ?? ""}
          >
            <option value="">Select member</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.full_name}
              </option>
            ))}
          </Select>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <DateInput
          id="email-received-date"
          name="received_date"
          label="Date"
          value={record?.received_date}
          required
          defaultToday={mode === "create"}
        />
        <TimeInput
          id="email-received-time"
          name="received_time"
          label="Time (optional)"
          defaultValue={record?.received_time?.slice(0, 5)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="sender_name">Who sent it</Label>
        <Input
          id="sender_name"
          name="sender_name"
          placeholder="Sender name"
          defaultValue={record?.sender_name ?? ""}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="sender_email">Sender email</Label>
        <Input
          id="sender_email"
          name="sender_email"
          type="email"
          placeholder="name@email.com"
          defaultValue={record?.sender_email ?? ""}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="subject">Subject</Label>
        <Input
          id="subject"
          name="subject"
          required
          placeholder="What the email was about"
          defaultValue={record?.subject ?? ""}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Note</Label>
        <Textarea
          id="notes"
          name="notes"
          rows={4}
          placeholder="Optional. What you did with it, or what it said."
          defaultValue={record?.notes ?? ""}
        />
      </div>

      <Button type="submit" disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {mode === "create" ? "Save email" : "Update email"}
      </Button>
    </form>
  );
}
