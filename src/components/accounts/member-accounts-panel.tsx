import Link from "next/link";
import { Plus, Pencil, Briefcase } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AccountStatusBadge } from "@/components/shared/status-badges";
import { formatDate } from "@/lib/utils";
import type { FiverrAccount } from "@/types/database";

interface MemberAccountsPanelProps {
  memberId: string;
  memberName: string;
  /** Base path for add/edit routes, e.g. /my-accounts or /team-members/[id]/accounts */
  basePath: string;
  showTitle?: boolean;
}

export async function MemberAccountsPanel({
  memberId,
  memberName,
  basePath,
  showTitle = true,
}: MemberAccountsPanelProps) {
  const supabase = await createClient();
  const { data: accounts } = await supabase
    .from("fiverr_accounts")
    .select("*, country:countries(name, flag_emoji)")
    .eq("team_member_id", memberId)
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  const list = (accounts ?? []) as FiverrAccount[];

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
              opening date, and verification details.
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
                    <Link href={`${basePath}/${acc.id}/edit`}>
                      <Button variant="ghost" size="sm">
                        <Pencil className="h-4 w-4" /> Edit
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
