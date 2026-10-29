"use client";

import { useEffect, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import type { Incentive, TeamMember } from "@/types/database";

type IncentiveRow = Incentive & { team_member?: { full_name: string } | null };

export function IncentiveManager() {
  const [items, setItems] = useState<IncentiveRow[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  async function load() {
    const [{ data: rows }, { data: people }] = await Promise.all([
      supabase
        .from("incentives")
        .select("*, team_member:team_members(full_name)")
        .is("slot", null)
        .order("created_at", { ascending: false }),
      supabase.from("team_members").select("id, full_name").eq("status", "active").order("full_name"),
    ]);
    setItems((rows ?? []) as IncentiveRow[]);
    setMembers((people ?? []) as TeamMember[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAdd(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const form = new FormData(event.currentTarget);
    const title = ((form.get("title") as string) || "").trim();
    if (!title) {
      toast.error("Name the incentive.");
      setSaving(false);
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const memberId = (form.get("team_member_id") as string) || null;
    const { error } = await supabase.from("incentives").insert({
      title,
      detail: ((form.get("detail") as string) || "").trim() || null,
      team_member_id: memberId || null,
      is_active: true,
      created_by: user?.id ?? null,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Incentive is live on the billboard");
      event.currentTarget.reset();
      await load();
    }
    setSaving(false);
  }

  async function toggle(item: IncentiveRow) {
    const { error } = await supabase
      .from("incentives")
      .update({ is_active: !item.is_active, updated_at: new Date().toISOString() })
      .eq("id", item.id);
    if (error) toast.error(error.message);
    else setItems((current) => current.map((row) => (row.id === item.id ? { ...row, is_active: !row.is_active } : row)));
  }

  async function remove(item: IncentiveRow) {
    const { error } = await supabase.from("incentives").delete().eq("id", item.id);
    if (error) toast.error(error.message);
    else setItems((current) => current.filter((row) => row.id !== item.id));
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleAdd} className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">Extra incentive</h2>
          <p className="mt-1 text-sm text-neutral-500">
            This streams across the team dashboard and drops in when they enter the site.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="title">Incentive</Label>
          <Input id="title" name="title" required placeholder="e.g. ₦50,000 for the most accounts this week" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="detail">How they qualify</Label>
          <Textarea id="detail" name="detail" rows={3} placeholder="What they have to do to win" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="team_member_id">Who sees it</Label>
          <Select id="team_member_id" name="team_member_id" defaultValue="">
            <option value="">Every team member</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.full_name} only
              </option>
            ))}
          </Select>
        </div>
        <Button type="submit" disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Put it on the billboard
        </Button>
      </form>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-[#7b1e3a]" />
        </div>
      ) : items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-300 px-4 py-8 text-center text-sm text-neutral-500">
          No incentives yet. Add one and it will stream on their dashboard.
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id} className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-4 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-neutral-900">{item.title}</p>
                {item.detail && <p className="mt-1 text-sm text-neutral-500">{item.detail}</p>}
                <p className="mt-1 text-xs text-neutral-400">
                  {item.team_member?.full_name ? `Only ${item.team_member.full_name}` : "Whole team"}
                  {item.is_active ? " · On the billboard" : " · Hidden"}
                </p>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => toggle(item)}>
                  {item.is_active ? "Hide" : "Show"}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => remove(item)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
