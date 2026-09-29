import type { SupabaseClient } from "@supabase/supabase-js";
import type { MemberProspectEntry } from "@/types/database";

export type TeamProspectsMemberRow = {
  memberId: string;
  fullName: string;
  preferredName: string | null;
  totalProspects: number;
  totalOffice: number;
  daysLogged: number;
  entries: MemberProspectEntry[];
};

export async function fetchTeamProspectsMemberRows(
  supabase: SupabaseClient,
  yearMonth: string
): Promise<TeamProspectsMemberRow[]> {
  const monthStart = `${yearMonth}-01`;
  const [y, m] = yearMonth.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const monthEnd = `${yearMonth}-${String(lastDay).padStart(2, "0")}`;

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

  return rows;
}
