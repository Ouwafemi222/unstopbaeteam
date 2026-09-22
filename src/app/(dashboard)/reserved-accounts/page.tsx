import { redirect } from "next/navigation";
import { Archive, Inbox } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserScope } from "@/lib/auth/scope";
import { isSuperAdmin } from "@/lib/auth/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AccountStatusBadge } from "@/components/shared/status-badges";
import { formatDate } from "@/lib/utils";
import {
  DeactivationRequestsPanel,
  ReservedAccountsRestoreButton,
  ReservedAccountsTabs,
  type DeactivationRequestRow,
} from "@/components/admin/reserved-accounts-panels";

interface Props {
  searchParams: Promise<{ tab?: string }>;
}

export default async function ReservedAccountsPage({ searchParams }: Props) {
  const scope = await getUserScope();
  if (!scope) redirect("/login");

  const superAdmin = await isSuperAdmin();
  if (!superAdmin) redirect("/dashboard");

  const { tab: tabParam } = await searchParams;
  const tab = tabParam === "reserved" ? "reserved" : "requests";

  const admin = createAdminClient();
  const supabase = admin ?? (await createClient());

  const [{ data: pending }, { data: reserved }] = await Promise.all([
    supabase
      .from("account_deactivation_requests")
      .select(
        "id, status, reason, account_ids, requested_at, review_note, team_member:team_members(id, full_name)"
      )
      .eq("status", "pending")
      .order("requested_at", { ascending: false }),
    supabase
      .from("fiverr_accounts")
      .select(
        "id, username, email, phone, status, opening_date, team_member:team_members(full_name), country:countries(name, flag_emoji)"
      )
      .eq("status", "reserved")
      .is("archived_at", null)
      .order("created_at", { ascending: false }),
  ]);

  const requests = (pending ?? []) as unknown as DeactivationRequestRow[];
  const reservedList = reserved ?? [];

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Reserved Accounts</h1>
        <p className="text-neutral-500 mt-1">
          Review deactivation requests and manage the reserved Fiverr account pool. Approving a
          request moves accounts here — they are not deactivated.
        </p>
      </div>

      <ReservedAccountsTabs
        tab={tab}
        pendingCount={requests.length}
        reservedCount={reservedList.length}
      />

      {tab === "requests" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Inbox className="h-5 w-5 text-[#7b1e3a]" />
              Pending deactivation requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DeactivationRequestsPanel requests={requests} />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Archive className="h-5 w-5 text-[#7b1e3a]" />
              Reserved pool
            </CardTitle>
          </CardHeader>
          <CardContent>
            {reservedList.length === 0 ? (
              <p className="text-sm text-neutral-500 py-8 text-center">
                No reserved accounts yet.
              </p>
            ) : (
              <div className="responsive-table">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-neutral-500 bg-neutral-50">
                      <th className="p-3 font-medium">Username</th>
                      <th className="p-3 font-medium">Former member</th>
                      <th className="p-3 font-medium">Country</th>
                      <th className="p-3 font-medium">Opened</th>
                      <th className="p-3 font-medium">Status</th>
                      <th className="p-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reservedList.map((acc) => {
                      const memberRel = acc.team_member as
                        | { full_name: string }
                        | { full_name: string }[]
                        | null;
                      const memberName = Array.isArray(memberRel)
                        ? memberRel[0]?.full_name
                        : memberRel?.full_name;
                      const countryRel = acc.country as
                        | { flag_emoji?: string; name?: string }
                        | { flag_emoji?: string; name?: string }[]
                        | null;
                      const country = Array.isArray(countryRel) ? countryRel[0] : countryRel;
                      return (
                        <tr key={acc.id} className="border-b hover:bg-neutral-50">
                          <td className="p-3 font-medium">@{acc.username}</td>
                          <td className="p-3">{memberName ?? "—"}</td>
                          <td className="p-3">
                            {country?.flag_emoji ?? ""} {country?.name ?? "—"}
                          </td>
                          <td className="p-3">{formatDate(acc.opening_date)}</td>
                          <td className="p-3">
                            <AccountStatusBadge status="reserved" />
                          </td>
                          <td className="p-3">
                            <ReservedAccountsRestoreButton accountId={acc.id} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
