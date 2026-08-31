import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { getDateRange, getPerformanceStatus } from "@/lib/utils/dates";

interface Props {
  searchParams: Promise<{ month?: string; year?: string }>;
}

export default async function PerformancePage({ searchParams }: Props) {
  const params = await searchParams;
  const now = new Date();
  const month = parseInt(params.month ?? String(now.getMonth() + 1));
  const year = parseInt(params.year ?? String(now.getFullYear()));

  const supabase = await createClient();

  const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const nextMonth = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const prevMonth = month === 1 ? `${year - 1}-12-01` : `${year}-${String(month - 1).padStart(2, "0")}-01`;

  const [{ data: members }, { data: accounts }, { data: messages }, { data: services }] = await Promise.all([
    supabase.from("team_members").select("*").eq("status", "active").order("full_name"),
    supabase.from("fiverr_accounts").select("team_member_id").is("archived_at", null),
    supabase.from("messages").select("team_member_id, service_id, received_date"),
    supabase.from("services").select("id, name"),
  ]);

  const statusColors = {
    improving: "success",
    stable: "info",
    needs_attention: "danger",
    no_messages: "neutral",
    new_member: "warning",
  } as const;

  const statusLabels = {
    improving: "Improving",
    stable: "Stable",
    needs_attention: "Needs Attention",
    no_messages: "No Messages",
    new_member: "New Member",
  };

  const rows = members?.map((member) => {
    const memberAccounts = accounts?.filter((a) => a.team_member_id === member.id).length ?? 0;
    const currentMessages = messages?.filter((m) =>
      m.team_member_id === member.id && m.received_date >= monthStart && m.received_date < nextMonth
    ).length ?? 0;
    const previousMessages = messages?.filter((m) =>
      m.team_member_id === member.id && m.received_date >= prevMonth && m.received_date < monthStart
    ).length ?? 0;

    const memberMsgs = messages?.filter((m) =>
      m.team_member_id === member.id && m.received_date >= monthStart && m.received_date < nextMonth
    ) ?? [];
    const serviceCounts = new Map<string, number>();
    memberMsgs.forEach((m) => {
      if (m.service_id) serviceCounts.set(m.service_id, (serviceCounts.get(m.service_id) || 0) + 1);
    });
    const bestServiceId = [...serviceCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    const bestService = services?.find((s) => s.id === bestServiceId)?.name;

    const isNew = member.date_joined && member.date_joined >= monthStart;
    const status = getPerformanceStatus(currentMessages, previousMessages, !!isNew);
    const diff = currentMessages - previousMessages;

    return { member, memberAccounts, currentMessages, previousMessages, diff, bestService, status };
  }) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Monthly Performance</h1>
        <p className="text-neutral-500 mt-1">
          {new Date(year, month - 1).toLocaleString("en", { month: "long", year: "numeric" })}
        </p>
      </div>

      <div className="responsive-table bg-white rounded-xl border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-neutral-500 bg-neutral-50">
              <th className="p-3 font-medium">Member</th>
              <th className="p-3 font-medium">Accounts</th>
              <th className="p-3 font-medium">Messages</th>
              <th className="p-3 font-medium">Previous</th>
              <th className="p-3 font-medium">Difference</th>
              <th className="p-3 font-medium">Best Service</th>
              <th className="p-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ member, memberAccounts, currentMessages, previousMessages, diff, bestService, status }) => (
              <tr key={member.id} className="border-b hover:bg-neutral-50">
                <td className="p-3">
                  <Link href={`/team-members/${member.id}`} className="font-medium text-brand-green hover:underline">
                    {member.full_name}
                  </Link>
                </td>
                <td className="p-3">{memberAccounts}</td>
                <td className="p-3 font-semibold">{currentMessages}</td>
                <td className="p-3">{previousMessages}</td>
                <td className="p-3">
                  <span className={diff >= 0 ? "text-emerald-600" : "text-red-500"}>
                    {diff > 0 ? "+" : ""}{diff}
                  </span>
                </td>
                <td className="p-3">{bestService ?? "—"}</td>
                <td className="p-3">
                  <Badge variant={statusColors[status]}>{statusLabels[status]}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
