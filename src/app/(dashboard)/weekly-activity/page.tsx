import { redirect } from "next/navigation";
import { ClipboardList, CheckCircle2, AlertCircle, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getUserScope } from "@/lib/auth/scope";
import { currentYearMonth, formatYearMonthLabel } from "@/lib/utils/dates";
import { getWeeksInMonth } from "@/lib/members/week-utils";
import { hasWeekActivity } from "@/lib/members/progress-metrics";
import { WeeklyActivityMonthPicker } from "@/components/admin/weekly-activity-month-picker";
import {
  WeeklyActivityTable,
  type WeeklyActivityMemberRow,
} from "@/components/admin/weekly-activity-table";
import type { MemberWeeklyEarning } from "@/types/database";

interface Props {
  searchParams: Promise<{ month?: string }>;
}

export default async function WeeklyActivityPage({ searchParams }: Props) {
  const scope = await getUserScope();
  if (!scope) redirect("/login");
  if (scope.isScopedMember) redirect("/dashboard");
  if (
    !scope.permissions.includes("reports.view") &&
    !scope.permissions.some((p) => p.includes("super"))
  ) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const monthParam = params.month;
  const yearMonth =
    monthParam && /^\d{4}-\d{2}$/.test(monthParam) ? monthParam : currentYearMonth();

  const supabase = await createClient();
  const weeks = getWeeksInMonth(yearMonth);
  const weekNumbers = weeks.map((w) => w.week);

  const [{ data: members }, { data: earnings }] = await Promise.all([
    supabase
      .from("team_members")
      .select("id, full_name, preferred_name, status")
      .eq("status", "active")
      .order("full_name"),
    supabase
      .from("member_weekly_earnings")
      .select("*")
      .eq("year_month", yearMonth)
      .order("week_number", { ascending: true }),
  ]);

  const earningsList = (earnings ?? []) as MemberWeeklyEarning[];
  const byMember = new Map<string, MemberWeeklyEarning[]>();
  for (const e of earningsList) {
    if (!hasWeekActivity(e)) continue;
    const list = byMember.get(e.team_member_id) ?? [];
    list.push(e);
    byMember.set(e.team_member_id, list);
  }

  const rows: WeeklyActivityMemberRow[] = (members ?? []).map((m) => {
    const entries = byMember.get(m.id) ?? [];
    return {
      memberId: m.id,
      fullName: m.full_name,
      preferredName: m.preferred_name,
      weeksLogged: entries.length,
      weeksTotal: weeks.length,
      income: entries.reduce((s, e) => s + Number(e.amount), 0),
      prospects: entries.reduce((s, e) => s + Number(e.prospects_count ?? 0), 0),
      officeProspects: entries.reduce(
        (s, e) => s + Number(e.office_prospects_count ?? 0),
        0
      ),
      contacts: entries.reduce((s, e) => s + Number(e.contacts_count ?? 0), 0),
      personalPv: entries.reduce((s, e) => s + Number(e.personal_pv ?? 0), 0),
      groupPv: entries.reduce((s, e) => s + Number(e.group_pv ?? 0), 0),
      entries,
    };
  });

  // Members with submissions first, then alphabetical within groups
  rows.sort((a, b) => {
    if (a.weeksLogged > 0 && b.weeksLogged === 0) return -1;
    if (a.weeksLogged === 0 && b.weeksLogged > 0) return 1;
    return a.fullName.localeCompare(b.fullName);
  });

  const submittedCount = rows.filter((r) => r.weeksLogged > 0).length;
  const missingCount = rows.length - submittedCount;
  const totalWeekSubs = rows.reduce((s, r) => s + r.weeksLogged, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-brand-green" />
            Weekly Activity
          </h1>
          <p className="text-neutral-500 mt-1">
            All member weekly evaluation submissions for{" "}
            <span className="font-medium text-neutral-700">
              {formatYearMonthLabel(yearMonth)}
            </span>
            . Click a row to see activities and notes.
          </p>
        </div>
        <WeeklyActivityMonthPicker value={yearMonth} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          icon={<Users className="h-4 w-4 text-sky-600" />}
          iconBg="bg-sky-100"
          label="Active members"
          value={String(rows.length)}
        />
        <SummaryCard
          icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
          iconBg="bg-emerald-100"
          label="Submitted this month"
          value={String(submittedCount)}
        />
        <SummaryCard
          icon={<AlertCircle className="h-4 w-4 text-amber-600" />}
          iconBg="bg-amber-100"
          label="No submission yet"
          value={String(missingCount)}
        />
        <SummaryCard
          icon={<ClipboardList className="h-4 w-4 text-violet-600" />}
          iconBg="bg-violet-100"
          label="Week entries logged"
          value={String(totalWeekSubs)}
        />
      </div>

      <WeeklyActivityTable rows={rows} weekNumbers={weekNumbers} />
    </div>
  );
}

function SummaryCard({
  icon,
  iconBg,
  label,
  value,
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-neutral-100 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-extrabold text-neutral-900 mt-1 tabular-nums">{value}</p>
        </div>
        <div className={`h-9 w-9 rounded-lg ${iconBg} flex items-center justify-center`}>{icon}</div>
      </div>
    </div>
  );
}
