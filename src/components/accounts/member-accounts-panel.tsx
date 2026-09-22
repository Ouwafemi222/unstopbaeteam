import Link from "next/link";
import { Plus, Pencil, Briefcase, Ban } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AccountStatusBadge } from "@/components/shared/status-badges";
import {
  BlockAccountButton,
  RestoreAccountButton,
} from "@/components/accounts/block-account-button";
import { formatDate } from "@/lib/utils";
import type { FiverrAccount } from "@/types/database";

interface MemberAccountsPanelProps {
  memberId: string;
  memberName: string;
  /** Base path for add/edit routes, e.g. /my-accounts or /team-members/[id]/accounts */
  basePath: string;
  showTitle?: boolean;
  /** Skip a second DB round-trip when the parent already loaded accounts. */
  initialAccounts?: FiverrAccount[];
  /** When true, member can block/restore their own accounts. */
  allowBlock?: boolean;
}

export async function MemberAccountsPanel({
  memberId,
  memberName,
  basePath,
  showTitle = true,
  initialAccounts,
  allowBlock = true,
}: MemberAccountsPanelProps) {
  const supabase = await createClient();

  let list = initialAccounts ?? [];
  let blocked: FiverrAccount[] = [];

  if (!initialAccounts) {
    const { data: accounts } = await supabase
      .from("fiverr_accounts")
      .select("*, country:countries(name, flag_emoji)")
      .eq("team_member_id", memberId)
      .is("archived_at", null)
      .neq("status", "reserved")
      .order("created_at", { ascending: false });
    list = (accounts ?? []) as FiverrAccount[];
  } else {
    list = list.filter((a) => a.status !== "reserved");
  }

  if (allowBlock) {
    const { data: blockedRows } = await supabase
      .from("fiverr_accounts")
      .select("*, country:countries(name, flag_emoji)")
      .eq("team_member_id", memberId)
      .eq("status", "blocked")
      .not("archived_at", "is", null)
      .order("archived_at", { ascending: false });
    blocked = (blockedRows ?? []) as FiverrAccount[];
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {showTitle && (
          <div>
            <h2 className="text-lg font-semibold text-neutral-900 flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-brand-green" />
              Fiverr Accounts
            </h2>
            <p className="text-sm text-neutral-500 mt-0.5">
              Add and manage accounts under {memberName}
            </p>
          </div>
        )}
        <Link href={`${basePath}/new`} className={showTitle ? "" : "ml-auto"}>
          <Button size="lg" className="w-full sm:w-auto shadow-sm">
            <Plus className="h-4 w-4" />
            Add Fiverr Account
          </Button>
        </Link>
      </div>

      {list.length === 0 ? (
        <Card className="border-dashed border-2 border-brand-green/30 bg-brand-green-light/10">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center px-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-green/10 text-brand-green mb-4">
              <Briefcase className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900">No accounts recorded yet</h3>
            <p className="text-sm text-neutral-500 mt-2 max-w-md">
              Open a new Fiverr account? Tap below and fill in your username, email, phone, country,
              secret question, opening date, and verification details.
            </p>
            <Link href={`${basePath}/new`} className="mt-6">
              <Button size="lg">
                <Plus className="h-4 w-4" />
                Record Your First Account
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="responsive-table bg-white rounded-xl border shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-neutral-500 bg-neutral-50">
                <th className="p-3 font-medium">Username</th>
                <th className="p-3 font-medium">Email</th>
                <th className="p-3 font-medium">Phone</th>
                <th className="p-3 font-medium">Country</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Verification</th>
                <th className="p-3 font-medium">Opened</th>
                <th className="p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((acc) => (
                <tr key={acc.id} className="border-b hover:bg-neutral-50">
                  <td className="p-3 font-medium text-neutral-900">{acc.username}</td>
                  <td className="p-3">{acc.email ?? "—"}</td>
                  <td className="p-3">{acc.phone ?? "—"}</td>
                  <td className="p-3">
                    {(acc.country as { flag_emoji?: string; name?: string })?.flag_emoji}{" "}
                    {(acc.country as { name?: string })?.name ?? "—"}
                  </td>
                  <td className="p-3">
                    <AccountStatusBadge status={acc.status} />
                  </td>
                  <td className="p-3 text-xs">
                    {acc.verification_code ? (
                      <span className="font-mono font-medium">{acc.verification_code}</span>
                    ) : (
                      <span className="text-neutral-400">—</span>
                    )}
                    {(acc.verification_screenshot_paths?.length ?? 0) > 0 && (
                      <span className="block text-neutral-500 mt-0.5">
                        {acc.verification_screenshot_paths.length} screenshot
                        {acc.verification_screenshot_paths.length === 1 ? "" : "s"}
                      </span>
                    )}
                  </td>
                  <td className="p-3">{formatDate(acc.opening_date)}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap items-center gap-1">
                      <Link href={`${basePath}/${acc.id}/edit`}>
                        <Button variant="ghost" size="sm">
                          <Pencil className="h-4 w-4" /> Edit
                        </Button>
                      </Link>
                      {allowBlock && (
                        <BlockAccountButton accountId={acc.id} username={acc.username} />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {allowBlock && blocked.length > 0 && (
        <div className="space-y-2 pt-2">
          <h3 className="text-sm font-semibold text-neutral-700 flex items-center gap-2 px-1">
            <Ban className="h-4 w-4 text-red-500" />
            Blocked accounts ({blocked.length})
          </h3>
          <p className="text-xs text-neutral-500 px-1">
            These stay off your active list. Restore one if Fiverr unblocks it.
          </p>
          <div className="responsive-table bg-neutral-50 rounded-xl border border-neutral-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-neutral-500">
                  <th className="p-3 font-medium">Username</th>
                  <th className="p-3 font-medium">Email</th>
                  <th className="p-3 font-medium">Status</th>
                  <th className="p-3 font-medium">Blocked</th>
                  <th className="p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {blocked.map((acc) => (
                  <tr key={acc.id} className="border-b border-neutral-200">
                    <td className="p-3 font-medium text-neutral-700">{acc.username}</td>
                    <td className="p-3 text-neutral-500">{acc.email ?? "—"}</td>
                    <td className="p-3">
                      <AccountStatusBadge status={acc.status} />
                    </td>
                    <td className="p-3 text-neutral-500">{formatDate(acc.archived_at)}</td>
                    <td className="p-3">
                      <RestoreAccountButton accountId={acc.id} username={acc.username} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
