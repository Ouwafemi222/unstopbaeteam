"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DateInput } from "@/components/shared/date-input";
import { uploadMemberImage } from "@/lib/storage/member-uploads";

const MAX_BYTES = 5 * 1024 * 1024;

export function FiveStarForm({
  teamMemberId,
  returnTo,
}: {
  teamMemberId: string;
  returnTo: string;
}) {
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      toast.error("Add a screenshot of the 5-star review.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("The evidence has to be an image.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Use an image under 5 MB.");
      return;
    }

    setLoading(true);
    const form = new FormData(event.currentTarget);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const ext = file.name.split(".").pop() || "jpg";
    const path = `five-stars/${teamMemberId}/${Date.now()}.${ext.replace(/[^a-z0-9]/gi, "").toLowerCase() || "jpg"}`;

    try {
      await uploadMemberImage(supabase, file, path);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not upload the screenshot");
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("five_star_reviews").insert({
      team_member_id: teamMemberId,
      received_date: form.get("received_date") as string,
      buyer_name: ((form.get("buyer_name") as string) || "").trim() || null,
      gig_name: ((form.get("gig_name") as string) || "").trim() || null,
      note: ((form.get("note") as string) || "").trim() || null,
      screenshot_path: path,
      recorded_by: user?.id ?? null,
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    toast.success("5-star evidence saved");
    router.push(returnTo);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6">
      <DateInput
        id="star-received-date"
        name="received_date"
        label="Date you received it"
        required
        defaultToday
      />
      <div className="space-y-2">
        <Label htmlFor="buyer_name">Buyer</Label>
        <Input id="buyer_name" name="buyer_name" placeholder="Buyer name on Fiverr" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="gig_name">Gig or order</Label>
        <Input id="gig_name" name="gig_name" placeholder="What they ordered" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="screenshot">Screenshot of the 5 stars</Label>
        <Input
          id="screenshot"
          name="screenshot"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          required
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
        <p className="text-xs text-neutral-500">
          This picture is the evidence. The incentive tracker counts only reviews that have one.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="note">Note</Label>
        <Textarea id="note" name="note" rows={3} placeholder="Optional. What the buyer said." />
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Save 5-star evidence
      </Button>
    </form>
  );
}
