import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

const CLAIM_MS = 24 * 60 * 60 * 1000;

type ClaimRow = {
  number: string;
  member_name: string;
  catalog_added: string;
  used_at: string;
  user_id?: string;
};

export type ListedNumber = {
  number: string;
  added: string;
};

function claimsDb(supabase: SupabaseClient) {
  return createAdminClient() ?? supabase;
}

function isFresh(claim: ClaimRow, added: string) {
  const age = Date.now() - new Date(claim.used_at).getTime();
  return age <= CLAIM_MS && String(claim.catalog_added) === String(added);
}

export async function attachUses(supabase: SupabaseClient, rows: ListedNumber[]) {
  const plain = rows.map((row) => ({ number: row.number, usedBy: null as string | null }));
  if (!rows.length) return plain;

  const db = claimsDb(supabase);
  const { data, error } = await db
    .from("phone_number_claims")
    .select("number, member_name, catalog_added, used_at")
    .in(
      "number",
      rows.map((row) => row.number)
    );
  if (error || !data) return plain;

  const claims = new Map((data as ClaimRow[]).map((claim) => [claim.number, claim]));
  const stale: string[] = [];
  const listed = rows.map((row) => {
    const claim = claims.get(row.number);
    if (!claim) return { number: row.number, usedBy: null };
    if (!isFresh(claim, row.added)) {
      stale.push(row.number);
      return { number: row.number, usedBy: null };
    }
    return { number: row.number, usedBy: claim.member_name };
  });

  if (stale.length) {
    await db.from("phone_number_claims").delete().in("number", stale);
  }
  return listed;
}

export async function markNumberUsed(
  supabase: SupabaseClient,
  userId: string,
  number: string,
  added: string,
  memberName: string,
  teamMemberId: string | null
) {
  const db = claimsDb(supabase);
  const { data } = await db
    .from("phone_number_claims")
    .select("number, member_name, catalog_added, used_at, user_id")
    .eq("number", number)
    .maybeSingle();
  const existing = data as ClaimRow | null;
  if (existing && isFresh(existing, added)) {
    return existing.member_name;
  }

  const payload = {
    number,
    team_member_id: teamMemberId,
    user_id: userId,
    member_name: memberName,
    catalog_added: added,
    used_at: new Date().toISOString(),
  };
  const write = existing
    ? await db.from("phone_number_claims").update(payload).eq("number", number)
    : await db.from("phone_number_claims").insert(payload);
  if (!write.error) return memberName;

  if (existing) {
    const removed = await db.from("phone_number_claims").delete().eq("number", number);
    if (!removed.error) {
      const inserted = await db.from("phone_number_claims").insert(payload);
      if (!inserted.error) return memberName;
    }
  }
  throw write.error;
}
