"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, UserPlus, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

export function AdminAddMemberCard() {
  const [fullName, setFullName] = useState("");
  const [preferredName, setPreferredName] = useState("");
  const [status, setStatus] = useState("active");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error("Full name is required");
      return;
    }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("team_members")
      .insert({
        full_name: fullName.trim(),
        preferred_name: preferredName.trim() || null,
        status,
        created_by: user?.id,
      })
      .select("id, full_name")
      .single();

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    toast.success(`${data.full_name} added to team list`);
    setFullName("");
    setPreferredName("");
    setStatus("active");
    setLoading(false);
    router.refresh();
  }

  return (
    <Card className="border-brand-green/20 bg-gradient-to-r from-white to-brand-green-light/20">
      <CardContent className="p-5">
        <div className="flex flex-col lg:flex-row lg:items-start gap-6">
          <div className="flex items-start gap-3 shrink-0">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-green/10 text-brand-green">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold text-neutral-900">Add Team Member</h2>
              <p className="text-sm text-neutral-500 mt-0.5 max-w-sm">
                Add a name to the team list so they can register at /join.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 grid sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
            <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
              <Label htmlFor="admin-member-name">Full name *</Label>
              <Input
                id="admin-member-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Mr Bright"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="admin-member-nickname">Preferred name</Label>
              <Input
                id="admin-member-nickname"
                value={preferredName}
                onChange={(e) => setPreferredName(e.target.value)}
                placeholder="Bright"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="admin-member-status">Status</Label>
              <Select
                id="admin-member-status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="on_leave">On Leave</option>
              </Select>
            </div>
            <div className="flex gap-2 sm:col-span-2 lg:col-span-1">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Member"}
              </Button>
              <Link href="/team-members/new">
                <Button type="button" variant="outline" title="Full form with email, phone, notes">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
