import type { SupabaseClient } from "@supabase/supabase-js";

export function memberIsRemoved(
  member: { access_removed_at?: string | null } | null | undefined
) {
  return Boolean(member?.access_removed_at);
}

export async function loadRemovedMemberIds(db: SupabaseClient) {
  const { data, error } = await db
    .from("team_members")
    .select("id")
    .not("access_removed_at", "is", null);
  if (error) return new Set<string>();
  return new Set((data ?? []).map((row) => row.id as string));
}

export async function memberIdIsRemoved(db: SupabaseClient, id: string | null | undefined) {
  if (!id) return false;
  const { data, error } = await db
    .from("team_members")
    .select("access_removed_at")
    .eq("id", id)
    .maybeSingle();
  if (error) return false;
  return Boolean(data?.access_removed_at);
}

export function liveEventIsPublic(
  event: { team_member_id?: string | null },
  removed: Set<string>
) {
  if (!event.team_member_id) return true;
  return !removed.has(event.team_member_id);
}
