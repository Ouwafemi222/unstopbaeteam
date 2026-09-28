import type { SupabaseClient } from "@supabase/supabase-js";
import { fineRemaining } from "@/lib/members/fine-on-ground";

export type TeamMemberFineRosterRow = {
  teamMemberId: string;
  fullName: string;
  activeFineCount: number;
};

/**
 * Members who currently have at least one unpaid disciplinary fine (not debt).
 * Returns names + counts only — no amounts, reasons, or entry ids.
 */
export async function fetchTeamMembersWithActiveFines(
  admin: SupabaseClient
): Promise<TeamMemberFineRosterRow[]> {
  const { data: entries, error } = await admin
    .from("fine_on_ground_entries")
    .select("team_member_id, amount, amount_paid, paid_at, is_active, obligation_type")
    .eq("obligation_type", "fine")
    .not("team_member_id", "is", null);

  if (error || !entries?.length) return [];

  const countByMember = new Map<string, number>();
  for (const row of entries) {
    if (!row.team_member_id) continue;
    if (fineRemaining(row) <= 0) continue;
    countByMember.set(
      row.team_member_id,
      (countByMember.get(row.team_member_id) ?? 0) + 1
    );
  }

  const memberIds = [...countByMember.keys()];
  if (memberIds.length === 0) return [];

  const { data: members } = await admin
    .from("team_members")
    .select("id, full_name, preferred_name, status")
    .in("id", memberIds)
    .eq("status", "active");

  const rows: TeamMemberFineRosterRow[] = (members ?? []).map((m) => ({
    teamMemberId: m.id,
    fullName: m.preferred_name?.trim() || m.full_name,
    activeFineCount: countByMember.get(m.id) ?? 0,
  }));

  rows.sort((a, b) => a.fullName.localeCompare(b.fullName, undefined, { sensitivity: "base" }));
  return rows.filter((r) => r.activeFineCount > 0);
}
