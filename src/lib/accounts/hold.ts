import type { SupabaseClient } from "@supabase/supabase-js";

function missingColumn(message: string) {
  return message.toLowerCase().includes("held_status");
}

export function shownAccountName(
  account: { username?: string | null; status?: string | null } | null | undefined
) {
  if (!account?.username || account.status === "reserved") return "";
  return account.username;
}

export async function parkMemberAccounts(db: SupabaseClient, memberIds: string[]) {
  if (memberIds.length === 0) return 0;
  const { data, error } = await db
    .from("fiverr_accounts")
    .select("id, status")
    .in("team_member_id", memberIds)
    .is("archived_at", null)
    .neq("status", "reserved");
  if (error) throw new Error(error.message);

  const byStatus = new Map<string, string[]>();
  for (const row of (data ?? []) as { id: string; status: string | null }[]) {
    const status = row.status || "active";
    const ids = byStatus.get(status) ?? [];
    ids.push(row.id);
    byStatus.set(status, ids);
  }

  let parked = 0;
  for (const [status, ids] of byStatus) {
    const { error: updateError } = await db
      .from("fiverr_accounts")
      .update({ status: "reserved", held_status: status })
      .in("id", ids);
    if (updateError) {
      throw new Error(
        missingColumn(updateError.message)
          ? "Run the reserved-account SQL in Supabase, then remove the member again."
          : updateError.message
      );
    }
    parked += ids.length;
  }
  return parked;
}

export async function releaseMemberAccounts(db: SupabaseClient, memberIds: string[]) {
  if (memberIds.length === 0) return 0;
  const { data, error } = await db
    .from("fiverr_accounts")
    .select("id, held_status")
    .in("team_member_id", memberIds)
    .not("held_status", "is", null);
  if (error) {
    throw new Error(
      missingColumn(error.message)
        ? "Run the reserved-account SQL in Supabase, then bring the member back."
        : error.message
    );
  }

  const byStatus = new Map<string, string[]>();
  for (const row of (data ?? []) as { id: string; held_status: string | null }[]) {
    const status = row.held_status || "active";
    const ids = byStatus.get(status) ?? [];
    ids.push(row.id);
    byStatus.set(status, ids);
  }

  let released = 0;
  for (const [status, ids] of byStatus) {
    const { error: updateError } = await db
      .from("fiverr_accounts")
      .update({ status, held_status: null, archived_at: null })
      .in("id", ids);
    if (updateError) throw new Error(updateError.message);
    released += ids.length;
  }
  return released;
}

export async function releaseReservedAccount(db: SupabaseClient, accountId: string) {
  const { data, error } = await db
    .from("fiverr_accounts")
    .select("id, held_status")
    .eq("id", accountId)
    .eq("status", "reserved")
    .maybeSingle();

  if (error && missingColumn(error.message)) {
    const { error: fallback } = await db
      .from("fiverr_accounts")
      .update({ status: "active", archived_at: null })
      .eq("id", accountId)
      .eq("status", "reserved");
    if (fallback) throw new Error(fallback.message);
    return;
  }
  if (error) throw new Error(error.message);
  if (!data) return;

  const next = (data as { held_status?: string | null }).held_status || "active";
  const { error: updateError } = await db
    .from("fiverr_accounts")
    .update({ status: next, held_status: null, archived_at: null })
    .eq("id", accountId)
    .eq("status", "reserved");
  if (updateError) throw new Error(updateError.message);
}
