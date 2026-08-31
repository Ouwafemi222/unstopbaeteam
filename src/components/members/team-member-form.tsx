"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateInput } from "@/components/shared/date-input";
import { toast } from "sonner";
import type { TeamMember } from "@/types/database";

interface TeamMemberFormProps {
  mode: "create" | "edit";
  member?: TeamMember;
}

export function TeamMemberForm({ mode, member }: TeamMemberFormProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const { data: { user } } = await supabase.auth.getUser();

    const payload = {
      full_name: form.get("full_name") as string,
      preferred_name: (form.get("preferred_name") as string) || null,
      phone: (form.get("phone") as string) || null,
      email: (form.get("email") as string) || null,
      role_in_team: (form.get("role_in_team") as string) || null,
      date_joined: (form.get("date_joined") as string) || null,
      status: (form.get("status") as string) || "active",
      notes: (form.get("notes") as string) || null,
      updated_by: user?.id,
    };

    if (mode === "create") {
      const { data, error } = await supabase.from("team_members").insert({
        ...payload,
        created_by: user?.id,
      }).select().single();
      if (error) { toast.error(error.message); setLoading(false); return; }
      toast.success("Team member created");
      router.push(`/team-members/${data.id}`);
    } else if (member) {
      const { error } = await supabase.from("team_members").update(payload).eq("id", member.id);
      if (error) { toast.error(error.message); setLoading(false); return; }
      toast.success("Team member updated");
      router.push(`/team-members/${member.id}`);
    }
    setLoading(false);
  }

  const m = member;

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader><CardTitle>Member Information</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name *</Label>
              <Input id="full_name" name="full_name" required defaultValue={m?.full_name ?? ""} placeholder="Mr. Femi" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="preferred_name">Preferred Name</Label>
              <Input id="preferred_name" name="preferred_name" defaultValue={m?.preferred_name ?? ""} placeholder="Femi" />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" defaultValue={m?.email ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" defaultValue={m?.phone ?? ""} />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="role_in_team">Role in Team</Label>
              <Input id="role_in_team" name="role_in_team" defaultValue={m?.role_in_team ?? ""} />
            </div>
            <DateInput id="date_joined" name="date_joined" label="Date Joined" defaultToday={mode === "create"} value={m?.date_joined ?? undefined} showQuickButtons />
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select id="status" name="status" defaultValue={m?.status ?? "active"}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="on_leave">On Leave</option>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={3} defaultValue={m?.notes ?? ""} />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "create" ? "Create Member" : "Save Changes"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
