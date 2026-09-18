"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

interface BlockAccountButtonProps {
  accountId: string;
  username: string;
}

/** Mark a Fiverr account as blocked and hide it from the member's active list. */
export function BlockAccountButton({ accountId, username }: BlockAccountButtonProps) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  async function handleBlock() {
    const ok = window.confirm(
      `Mark @${username} as blocked and remove it from your list?\n\nYou can restore it later from Blocked accounts.`
    );
    if (!ok) return;

    setLoading(true);
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("fiverr_accounts")
      .update({
        status: "blocked",
        archived_at: now,
        updated_at: now,
      })
      .eq("id", accountId);

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    toast.success(`@${username} marked as blocked and removed from your list`);
    router.refresh();
    setLoading(false);
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={handleBlock}
      disabled={loading}
      className="text-red-600 hover:text-red-700 hover:bg-red-50"
      title="Mark as blocked"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
      Block
    </Button>
  );
}

interface RestoreAccountButtonProps {
  accountId: string;
  username: string;
}

/** Restore a blocked account back to the active list. */
export function RestoreAccountButton({ accountId, username }: RestoreAccountButtonProps) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  async function handleRestore() {
    const ok = window.confirm(`Restore @${username} back to your active accounts list?`);
    if (!ok) return;

    setLoading(true);
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("fiverr_accounts")
      .update({
        status: "active",
        archived_at: null,
        updated_at: now,
      })
      .eq("id", accountId);

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    toast.success(`@${username} restored to your list`);
    router.refresh();
    setLoading(false);
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={handleRestore}
      disabled={loading}
      className="text-brand-green hover:bg-brand-green/10"
      title="Restore account"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
      Restore
    </Button>
  );
}
