import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn, formatDate, getMessageServiceLabel } from "@/lib/utils";
import { getDateRange, MESSAGE_STATUS_LABELS } from "@/lib/utils/dates";
import type { DateFilter } from "@/types/database";

type Period = "this_week" | "last_week" | "this_month";

const PERIODS: { value: Period; label: string; short: string }[] = [
  { value: "this_week", label: "This week", short: "This week" },
  { value: "last_week", label: "Last week", short: "Last week" },
  { value: "this_month", label: "This month", short: "This month" },
];

function isPeriod(value: string | undefined): value is Period {
  return value === "this_week" || value === "last_week" || value === "this_month";
}

interface Props {
  params: Promise<{ memberId: string }>;
  searchParams: Promise<{ period?: string }>;
}

export default async function MessageActivityPage({ params, searchParams }: Props) {
  const { memberId } = await params;
  const { period: periodParam } = await searchParams;
  const period: Period = isPeriod(periodParam) ? periodParam : "this_week";
  const range = getDateRange(period as DateFilter);

  const supabase = await createClient();

  const { data: member } = await supabase
    .from("team_members")
    .select("id, full_name, preferred_name")
    .eq("id", memberId)
    .maybeSingle();

  if (!member) notFound();

  const displayName = member.preferred_name || member.full_name;

  const [
    { data: messages },
    { count: thisWeekCount },
    { count: lastWeekCount },
    { count: thisMonthCount },
  ] = await Promise.all([
    supabase
      .from("messages")
      .select("*, service:services(name), fiverr_account:fiverr_accounts(username)")
      .eq("team_member_id", memberId)
      .gte("received_date", range.from)
      .lte("received_date", range.to)
      .order("received_date", { ascending: false }),
    supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("team_member_id", memberId)
      .gte("received_date", getDateRange("this_week").from)
      .lte("received_date", getDateRange("this_week").to),
    supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("team_member_id", memberId)
      .gte("received_date", getDateRange("last_week").from)
      .lte("received_date", getDateRange("last_week").to),
    supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("team_member_id", memberId)
      .gte("received_date", getDateRange("this_month").from)
      .lte("received_date", getDateRange("this_month").to),
  ]);

  const list = messages ?? [];
  const totals: Record<Period, number> = {
    this_week: thisWeekCount ?? 0,
    last_week: lastWeekCount ?? 0,
    this_month: thisMonthCount ?? 0,
  };

  const activeLabel = PERIODS.find((p) => p.value === period)?.label ?? "This week";

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <p className="text-sm font-medium text-[#7b1e3a]">Message activity</p>
        <h1 className="text-2xl font-bold text-neutral-900 mt-1">
          Messages {displayName} received
        </h1>
        <p className="text-neutral-500 mt-1">
          All Fiverr messages recorded for this member — filter by week or month.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {PERIODS.map((p) => (
          <Link
            key={p.value}
            href={`/message-activity/${memberId}?period=${p.value}`}
            className={cn(
              "rounded-xl border px-4 py-3 transition-colors",
              period === p.value
                ? "border-[#7b1e3a] bg-[#7b1e3a]/5 shadow-sm"
                : "border-neutral-200 bg-white hover:border-[#7b1e3a]/40"
            )}
          >
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              {p.label}
            </p>
            <p className="mt-1 text-2xl font-bold text-neutral-900">{totals[p.value]}</p>
            <p className="text-xs text-neutral-500 mt-0.5">
              message{totals[p.value] === 1 ? "" : "s"} received
            </p>
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap gap-1 rounded-lg border border-neutral-200 bg-white p-1 w-fit">
        {PERIODS.map((p) => (
          <Link
            key={p.value}
            href={`/message-activity/${memberId}?period=${p.value}`}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              period === p.value
                ? "bg-[#7b1e3a] text-white"
                : "text-neutral-600 hover:bg-neutral-100"
            )}
          >
            {p.short}
          </Link>
        ))}
      </div>

      <div>
        <h2 className="text-lg font-semibold text-neutral-900 flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-[#7b1e3a]" />
          {activeLabel}
          <span className="text-sm font-normal text-neutral-500">
            · {list.length} listed
          </span>
        </h2>
      </div>

      {list.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-14 text-center px-6">
            <MessageSquare className="h-10 w-10 text-neutral-300 mb-3" />
            <p className="font-medium text-neutral-900">No messages in this period</p>
            <p className="text-sm text-neutral-500 mt-1">
              Try another filter to see messages {displayName} has received.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="responsive-table bg-white rounded-xl border shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-neutral-500 bg-neutral-50">
                <th className="p-3 font-medium">Date</th>
                <th className="p-3 font-medium">Account</th>
                <th className="p-3 font-medium">Service / Gig</th>
                <th className="p-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {list.map((msg) => (
                <tr key={msg.id} className="border-b hover:bg-neutral-50">
                  <td className="p-3">{formatDate(msg.received_date)}</td>
                  <td className="p-3">
                    {(msg.fiverr_account as { username: string } | null)?.username ?? "—"}
                  </td>
                  <td className="p-3 font-medium text-neutral-900">
                    {getMessageServiceLabel(msg)}
                  </td>
                  <td className="p-3">
                    <Badge variant="neutral">{MESSAGE_STATUS_LABELS[msg.status]}</Badge>
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
