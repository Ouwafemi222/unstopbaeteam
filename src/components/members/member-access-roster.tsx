"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, Loader2, RotateCcw, UserX } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MEMBER_STATUS_LABELS } from "@/lib/utils/dates";
import { formatDate } from "@/lib/utils";
import type { MemberStatus } from "@/types/database";

export interface AccessRosterMember {
  id: string;
  full_name: string;
  preferred_name: string | null;
  status: MemberStatus;
  user_id: string | null;
  date_joined: string | null;
  email: string | null;
  access_removed_at?: string | null;
  accounts: number;
  messages: number;
  place: string | null;
}

export function MemberAccessRoster({
  members,
  mode,
  canManage = true,
}: {
  members: AccessRosterMember[];
  mode: "active" | "removed";
  canManage?: boolean;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  }

  async function updateAccess(action: "remove" | "restore", memberIds: string[]) {
    if (memberIds.length === 0) {
      toast.error(action === "remove" ? "Choose the people to remove" : "Choose who to bring back");
      return;
    }
    setBusy(true);
    const response = await fetch("/api/team-members/access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, memberIds }),
    });
    const body = (await response.json()) as {
      error?: string;
      updated?: number;
      skipped?: string[];
      parked?: number;
      released?: number;
    };
    setBusy(false);
    if (!response.ok) {
      toast.error(body.error ?? "Could not update access");
      return;
    }
    const skipped = body.skipped?.length ? ` Left in place: ${body.skipped.join(", ")}.` : "";
    const parked =
      action === "remove" && (body.parked ?? 0) > 0
        ? ` ${body.parked} Fiverr account${body.parked === 1 ? "" : "s"} moved to Reserved.`
        : "";
    const released =
      action === "restore" && (body.released ?? 0) > 0
        ? ` ${body.released} Fiverr account${body.released === 1 ? "" : "s"} back on the site.`
        : "";
    toast.success(
      action === "remove"
        ? `${body.updated ?? memberIds.length} moved to Account removed.${parked}${skipped}`
        : `${body.updated ?? memberIds.length} can sign in again.${released}${skipped}`
    );
    setSelected([]);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {canManage && (
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-neutral-500">
          {selected.length > 0 ? `${selected.length} selected` : "Select people, then continue"}
        </p>
        {mode === "active" ? (
          <Button
            type="button"
            variant="destructive"
            disabled={busy || selected.length === 0}
            onClick={() => updateAccess("remove", selected)}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserX className="h-4 w-4" />}
            Remove
          </Button>
        ) : (
          <Button
            type="button"
            disabled={busy || selected.length === 0}
            onClick={() => updateAccess("restore", selected)}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
            Reactivate
          </Button>
        )}
      </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {members.map((member) => {
          const checked = selected.includes(member.id);
          return (
            <Card key={member.id} className="flex h-full flex-col transition-shadow hover:shadow-md">
              <CardContent className="flex flex-1 flex-col p-5">
                {canManage && (
                <label className="mb-3 flex items-center gap-2 text-sm font-medium text-neutral-700">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(member.id)}
                    className="h-4 w-4 accent-[#7b1e3a]"
                  />
                  {mode === "active" ? "Remove" : "Reactivate"}
                </label>
                )}
                <Link href={`/team-members/${member.id}`} className="block flex-1">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-green to-brand-orange font-bold text-white">
                      {member.full_name
                        .split(" ")
                        .map((part) => part[0])
                        .join("")
                        .slice(0, 2)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-semibold text-neutral-900">{member.full_name}</h3>
                      {member.preferred_name && (
                        <p className="text-sm text-neutral-500">{member.preferred_name}</p>
                      )}
                      {member.place && <p className="mt-1 truncate text-xs text-sky-700">{member.place}</p>}
                      {member.email && <p className="truncate text-xs text-neutral-400">{member.email}</p>}
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Badge variant={member.status === "active" ? "success" : "neutral"}>
                          {MEMBER_STATUS_LABELS[member.status]}
                        </Badge>
                        {member.user_id ? (
                          <Badge variant="info">Registered</Badge>
                        ) : (
                          <Badge variant="neutral">Awaiting signup</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 border-t border-neutral-100 pt-4">
                    <div>
                      <p className="text-xs text-neutral-400">Accounts</p>
                      <p className="text-lg font-bold text-neutral-900">{member.accounts}</p>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-400">Messages</p>
                      <p className="text-lg font-bold text-neutral-900">{member.messages}</p>
                    </div>
                  </div>
                  {member.date_joined && (
                    <p className="mt-3 text-xs text-neutral-400">Joined {formatDate(member.date_joined)}</p>
                  )}
                  {member.access_removed_at && (
                    <p className="mt-1 text-xs text-[#7b1e3a]">
                      Removed {formatDate(member.access_removed_at)}
                    </p>
                  )}
                </Link>
                {canManage && (
                <div className="mt-4 flex gap-2 border-t border-neutral-100 pt-3">
                  <Link
                    href={`/team-members/${member.id}#member-login-details`}
                    className="inline-flex h-8 flex-1 items-center justify-center gap-2 rounded-md border border-neutral-200 px-3 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                  >
                    <Eye className="h-4 w-4" />
                    View
                  </Link>
                  <Button
                    type="button"
                    size="sm"
                    variant={mode === "active" ? "destructive" : "default"}
                    className="flex-1"
                    disabled={busy}
                    onClick={() => updateAccess(mode === "active" ? "remove" : "restore", [member.id])}
                  >
                    {mode === "active" ? "Remove" : "Reactivate"}
                  </Button>
                </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
