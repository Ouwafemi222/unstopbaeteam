import type { SupabaseClient } from "@supabase/supabase-js";

export interface SponsoredMemberSummary {
  id: string;
  full_name: string;
  preferred_name: string | null;
  status: string;
  email: string | null;
  accountCount: number;
  messageCount: number;
}

export async function getSponsoredMembers(
  supabase: SupabaseClient,
  sponsorTeamMemberId: string
): Promise<{ members: SponsoredMemberSummary[]; error?: string }> {
  const { data: members, error } = await supabase
    .from("team_members")
    .select("id, full_name, preferred_name, status, email")
    .eq("sponsor_id", sponsorTeamMemberId)
    .order("full_name");

  if (error) {
    return { members: [], error: error.message };
  }

  if (!members?.length) return { members: [] };

  const ids = members.map((m) => m.id);

  const [{ data: accounts }, { data: messages }] = await Promise.all([
    supabase.from("fiverr_accounts").select("team_member_id").in("team_member_id", ids).is("archived_at", null),
    supabase.from("messages").select("team_member_id").in("team_member_id", ids),
  ]);

  const accountCounts = new Map<string, number>();
  accounts?.forEach((a) => {
    accountCounts.set(a.team_member_id, (accountCounts.get(a.team_member_id) || 0) + 1);
  });

  const messageCounts = new Map<string, number>();
  messages?.forEach((m) => {
    messageCounts.set(m.team_member_id, (messageCounts.get(m.team_member_id) || 0) + 1);
  });

  return {
    members: members.map((m) => ({
      ...m,
      accountCount: accountCounts.get(m.id) || 0,
      messageCount: messageCounts.get(m.id) || 0,
    })),
  };
}

export function canViewMemberProfile(
  viewerTeamMemberId: string | undefined,
  targetMember: { id: string; sponsor_id?: string | null },
  isAdmin: boolean
): "own" | "sponsor" | "admin" | null {
  if (isAdmin) return "admin";
  if (!viewerTeamMemberId) return null;
  if (viewerTeamMemberId === targetMember.id) return "own";
  if (targetMember.sponsor_id === viewerTeamMemberId) return "sponsor";
  return null;
}
