import Link from "next/link";
import { Briefcase, Clock3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import { AccountStatusBadge } from "@/components/shared/status-badges";
import type { AccountStatus } from "@/types/database";

export interface AccountActivityItem {
  id: string;
  username: string;
  status: AccountStatus | string;
  created_at: string;
  opening_date?: string | null;
  team_member?: { full_name: string; id?: string } | null;
  country?: { name: string; flag_emoji: string } | null;
}

function relativeWhenAdded(iso: string): string {
  const created = new Date(iso);
  const now = new Date();
  const lagosNow = new Date(now.toLocaleString("en-US", { timeZone: "Africa/Lagos" }));
  const lagosCreated = new Date(created.toLocaleString("en-US", { timeZone: "Africa/Lagos" }));

  const startToday = new Date(lagosNow);
  startToday.setHours(0, 0, 0, 0);
  const startYesterday = new Date(startToday);
  startYesterday.setDate(startYesterday.getDate() - 1);

  if (lagosCreated >= startToday) return "today";
  if (lagosCreated >= startYesterday) return "yesterday";

  return lagosCreated.toLocaleDateString("en-NG", {
    timeZone: "Africa/Lagos",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface AdminAccountActivityFeedProps {
  todayAccounts: AccountActivityItem[];
  recentAccounts: AccountActivityItem[];
}

export function AdminAccountActivityFeed({
  todayAccounts,
  recentAccounts,
}: AdminAccountActivityFeedProps) {
  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card className="border-brand-green/25 bg-gradient-to-br from-brand-green-light/20 to-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-brand-green" />
            Accounts added today
            {todayAccounts.length > 0 && (
              <Badge variant="success" className="ml-1">
                {todayAccounts.length}
              </Badge>
            )}
          </CardTitle>
          <p className="text-sm text-neutral-500 font-normal">
            Real date/time each team member saved an account on this website (Lagos time).
          </p>
        </CardHeader>
        <CardContent>
          {todayAccounts.length === 0 ? (
            <p className="text-sm text-neutral-500 py-4">
              Nobody has added a Fiverr account on the website today yet.
            </p>
          ) : (
            <ul className="space-y-3">
              {todayAccounts.map((acc) => {
                const name = (acc.team_member as { full_name?: string } | null)?.full_name ?? "A member";
                return (
                  <li
                    key={acc.id}
                    className="rounded-xl border border-brand-green/20 bg-white px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                  >
                    <div>
                      <p className="text-sm font-semibold text-neutral-900">
                        {name} added account{" "}
                        <Link href={`/accounts/${acc.id}`} className="text-brand-green hover:underline">
                          @{acc.username}
                        </Link>{" "}
                        today
                      </p>
                      <p className="text-xs text-neutral-500 mt-1 flex items-center gap-1.5">
                        <Clock3 className="h-3.5 w-3.5" />
                        {formatDateTime(acc.created_at)}
                        {acc.country && (
                          <span className="ml-1">
                            · {(acc.country as { flag_emoji?: string }).flag_emoji}{" "}
                            {(acc.country as { name?: string }).name}
                          </span>
                        )}
                      </p>
                    </div>
                    <AccountStatusBadge status={acc.status as AccountStatus} />
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Recent accounts on the website</CardTitle>
          <p className="text-sm text-neutral-500 font-normal">
            Latest accounts members recorded — by when they were added here.
          </p>
        </CardHeader>
        <CardContent>
          {recentAccounts.length === 0 ? (
            <p className="text-sm text-neutral-500">No accounts yet.</p>
          ) : (
            <div className="responsive-table">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-neutral-500">
                    <th className="pb-2 font-medium">Activity</th>
                    <th className="pb-2 font-medium">When added</th>
                    <th className="pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentAccounts.map((acc) => {
                    const name =
                      (acc.team_member as { full_name?: string } | null)?.full_name ?? "A member";
                    const when = relativeWhenAdded(acc.created_at);
                    return (
                      <tr key={acc.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                        <td className="py-2.5">
                          <Link href={`/accounts/${acc.id}`} className="text-neutral-900 hover:text-brand-green">
                            <span className="font-medium">{name}</span> added{" "}
                            <span className="text-brand-green">@{acc.username}</span> {when}
                          </Link>
                          {acc.country && (
                            <span className="block text-xs text-neutral-500 mt-0.5">
                              {(acc.country as { flag_emoji?: string }).flag_emoji}{" "}
                              {(acc.country as { name?: string }).name}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 text-neutral-600 whitespace-nowrap">
                          {formatDateTime(acc.created_at)}
                        </td>
                        <td className="py-2.5">
                          <AccountStatusBadge status={acc.status as AccountStatus} />
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
    </div>
  );
}
