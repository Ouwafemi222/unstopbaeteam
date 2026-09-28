import { redirect } from "next/navigation";
import { UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getUserScope } from "@/lib/auth/scope";
import { currentYearMonth, formatYearMonthLabel } from "@/lib/utils/dates";
import { WeeklyActivityMonthPicker } from "@/components/admin/weekly-activity-month-picker";
import {
  TeamProspectsTable,
  type TeamProspectsMemberRow,
} from "@/components/admin/team-prospects-table";
import type { MemberProspectEntry } from "@/types/database";

interface Props {
  searchParams: Promise<{ month?: string }>;
}

export default async function TeamProspectsPage({ searchParams }: Props) {
  const scope = await getUserScope();
  if (!scope) redirect("/login");
  if (scope.isScopedMember) redirect("/my-prospects");
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

  const monthStart = `${yearMonth}-01`;
  const [y, m] = yearMonth.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const monthEnd = `${yearMonth}-${String(lastDay).padStart(2, "0")}`;

  const supabase = await createClient();

  const [{ data: members }, { data: prospectRows }] = await Promise.all([
    supabase
      .from("team_members")
      .select("id, full_name, preferred_name, status")
      .eq("status", "active")
      .order("full_name"),
    supabase
      .from("member_prospect_entries")
      .select("*")
      .gte("logged_date", monthStart)
      .lte("logged_date", monthEnd)
      .order("logged_date", { ascending: false }),
  ]);

  const entriesByMember = new Map<string, MemberProspectEntry[]>();
  for (const row of (prospectRows ?? []) as MemberProspectEntry[]) {
    if (!row.team_member_id) continue;
    const list = entriesByMember.get(row.team_member_id) ?? [];
    list.push(row);
    entriesByMember.set(row.team_member_id, list);
  }

  const rows: TeamProspectsMemberRow[] = (members ?? []).map((m) => {
    const entries = entriesByMember.get(m.id) ?? [];
    entries.sort((a, b) => b.logged_date.localeCompare(a.logged_date));
    return {
      memberId: m.id,
      fullName: m.full_name,
      preferredName: m.preferred_name,
      totalProspects: entries.reduce((s, e) => s + Number(e.prospects_count ?? 0), 0),
      totalOffice: entries.reduce((s, e) => s + Number(e.office_prospects_count ?? 0), 0),
      daysLogged: entries.length,
      entries,
    };
  });

  rows.sort((a, b) => {
    if (a.daysLogged > 0 && b.daysLogged === 0) return -1;
    if (a.daysLogged === 0 && b.daysLogged > 0) return 1;
    if (b.totalProspects !== a.totalProspects) return b.totalProspects - a.totalProspects;
    return a.fullName.localeCompare(b.fullName);
  });

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 flex items-center gap-2">
            <UserPlus className="h-7 w-7 text-brand-green" />
            Team prospects
          </h1>
          <p className="text-neutral-500 mt-1">
            Daily prospect logs from every member for{" "}
            <span className="font-medium text-neutral-700">
              {formatYearMonthLabel(yearMonth)}
            </span>
            . Expand a row to see each day they recorded.
          </p>
        </div>
        <WeeklyActivityMonthPicker value={yearMonth} basePath="/team-prospects" />
      </div>

      <TeamProspectsTable rows={rows} yearMonth={yearMonth} />
    </div>
  );
}
