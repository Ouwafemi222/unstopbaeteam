import Link from "next/link";
import { Plus, Briefcase } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MemberAccountsBrowser } from "@/components/accounts/member-accounts-browser";
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

      {list.length === 0 && blocked.length === 0 ? (
        <Card className="border-dashed border-2 border-brand-green/30 bg-brand-green-light/10">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center px-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-green/10 text-brand-green mb-4">
              <Briefcase className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900">No accounts recorded yet</h3>
            <p className="text-sm text-neutral-500 mt-2 max-w-md">
              Open a new Fiverr account? Add the username, email, phone, country, proxy, and
              verification details.
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
        <MemberAccountsBrowser
          accounts={list}
          blocked={blocked}
          basePath={basePath}
          allowBlock={allowBlock}
        />
      )}
    </div>
  );
}
