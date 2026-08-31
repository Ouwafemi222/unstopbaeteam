import type { SupabaseClient } from "@supabase/supabase-js";
import { FORECAST_ACCOUNTS } from "@/data/forecast-accounts";
import { FORECAST_MESSAGES } from "@/data/forecast-messages";
import { normalizeMemberName, toRegistrationKey } from "@/data/forecast-members";
import { createAdminClient } from "@/lib/supabase/admin";

export interface ForecastImportResult {
  membersCreated: number;
  membersExisting: number;
  accountsCreated: number;
  accountsSkipped: number;
  errors: string[];
}

export interface ForecastMessageImportResult {
  membersCreated: number;
  membersExisting: number;
  messagesCreated: number;
  messagesSkipped: number;
  errors: string[];
}

/** Prefer service role when configured; otherwise use signed-in super admin session. */
export async function resolveImportClient(authClient: SupabaseClient): Promise<SupabaseClient> {
  const admin = createAdminClient();
  if (admin) return admin;

  const { data: isAdmin } = await authClient.rpc("is_super_admin");
  if (!isAdmin) {
    throw new Error("Super Admin only");
  }

  return authClient;
}

async function ensureTeamMember(
  db: SupabaseClient,
  name: string,
  memberIds: Map<string, string>,
  result: { membersCreated: number; membersExisting: number; errors: string[] }
) {
  if (memberIds.has(name)) return;

  const key = toRegistrationKey(name);
  const { data: existing } = await db
    .from("team_members")
    .select("id")
    .eq("registration_key", key)
    .maybeSingle();

  if (existing) {
    memberIds.set(name, existing.id);
    result.membersExisting++;
    return;
  }

  const { data: byName } = await db
    .from("team_members")
    .select("id")
    .ilike("full_name", name)
    .maybeSingle();

  if (byName) {
    await db.from("team_members").update({ registration_key: key }).eq("id", byName.id);
    memberIds.set(name, byName.id);
    result.membersExisting++;
    return;
  }

  const { data: created, error } = await db
    .from("team_members")
    .insert({
      full_name: name,
      preferred_name: name.split(" ").slice(1).join(" "),
      registration_key: key,
      status: "active",
      role_in_team: "Team Member",
      notes: "Forecast import — awaiting registration via /join",
    })
    .select("id")
    .single();

  if (error) {
    result.errors.push(`Member ${name}: ${error.message}`);
    return;
  }
  memberIds.set(name, created.id);
  result.membersCreated++;
}

async function clearAllMockData(db: SupabaseClient) {
  await db.from("message_notes").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await db.from("account_notes").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await db.from("member_notes").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await db.from("account_services").delete().neq("account_id", "00000000-0000-0000-0000-000000000000");
  await db.from("messages").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await db.from("fiverr_accounts").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await db.from("team_members").delete().is("user_id", null);
}

export async function importForecastData(
  db: SupabaseClient,
  options?: { clearDemo?: boolean }
): Promise<ForecastImportResult> {
  const result: ForecastImportResult = {
    membersCreated: 0,
    membersExisting: 0,
    accountsCreated: 0,
    accountsSkipped: 0,
    errors: [],
  };

  if (options?.clearDemo) {
    await clearAllMockData(db);
  }

  const { data: countries } = await db.from("countries").select("id, code");
  const countryMap = new Map(countries?.map((c) => [c.code, c.id]) ?? []);

  const memberIds = new Map<string, string>();
  const uniqueMembers = [...new Set(FORECAST_ACCOUNTS.map((r) => normalizeMemberName(r.member)))];

  for (const name of uniqueMembers) {
    await ensureTeamMember(db, name, memberIds, result);
  }

  for (const row of FORECAST_ACCOUNTS) {
    const memberName = normalizeMemberName(row.member);
    const memberId = memberIds.get(memberName);
    if (!memberId) {
      result.errors.push(`No member for ${memberName}`);
      continue;
    }

    const email = row.email.toLowerCase().trim();
    const { data: dup } = await db
      .from("fiverr_accounts")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (dup) {
      result.accountsSkipped++;
      continue;
    }

    const username = email.split("@")[0].slice(0, 40);
    const countryId = countryMap.get(row.country) ?? null;

    const { error } = await db.from("fiverr_accounts").insert({
      team_member_id: memberId,
      username,
      email,
      phone: row.phone,
      country_id: countryId,
      opening_date: row.opening_date,
      status: "new",
      source: "forecast",
      notes: "Imported from forecast data",
    });

    if (error) {
      result.errors.push(`Account ${email}: ${error.message}`);
    } else {
      result.accountsCreated++;
    }
  }

  return result;
}

export async function importForecastMessages(
  db: SupabaseClient,
  options?: { replaceExisting?: boolean }
): Promise<ForecastMessageImportResult> {
  const result: ForecastMessageImportResult = {
    membersCreated: 0,
    membersExisting: 0,
    messagesCreated: 0,
    messagesSkipped: 0,
    errors: [],
  };

  if (options?.replaceExisting) {
    await db.from("message_notes").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await db.from("messages").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  }

  const memberIds = new Map<string, string>();
  const uniqueMembers = [...new Set(FORECAST_MESSAGES.map((r) => normalizeMemberName(r.member)))];

  for (const name of uniqueMembers) {
    await ensureTeamMember(db, name, memberIds, result);
  }

  for (const row of FORECAST_MESSAGES) {
    const memberName = normalizeMemberName(row.member);
    const memberId = memberIds.get(memberName);
    if (!memberId) {
      result.errors.push(`No member for ${memberName}`);
      continue;
    }

    const gigName = row.service.trim();
    const count = row.count ?? 1;
    const baseNotes = row.notes?.trim() || null;

    for (let i = 0; i < count; i++) {
      const notes = baseNotes
        ? count > 1
          ? `${baseNotes} (${i + 1}/${count})`
          : baseNotes
        : count > 1
          ? `Forecast import (${i + 1}/${count})`
          : "Imported from forecast data";

      if (!options?.replaceExisting) {
        const { data: dup } = await db
          .from("messages")
          .select("id")
          .eq("team_member_id", memberId)
          .eq("received_date", row.received_date)
          .eq("gig_name", gigName)
          .maybeSingle();

        if (dup) {
          result.messagesSkipped++;
          continue;
        }
      }

      const { error } = await db.from("messages").insert({
        team_member_id: memberId,
        received_date: row.received_date,
        gig_name: gigName,
        message_source: "forecast",
        status: "new",
        notes,
      });

      if (error) {
        result.errors.push(`Message ${memberName} ${gigName}: ${error.message}`);
      } else {
        result.messagesCreated++;
      }
    }
  }

  return result;
}

export async function linkUserToTeamMember(
  userId: string,
  teamMemberId: string,
  authClient?: SupabaseClient
) {
  const db = authClient ? await resolveImportClient(authClient) : createAdminClient();
  if (!db) throw new Error("Admin client not configured");

  const { data: member } = await db
    .from("team_members")
    .select("id, full_name, user_id")
    .eq("id", teamMemberId)
    .single();

  if (!member) throw new Error("Team member not found");
  if (member.user_id && member.user_id !== userId) {
    throw new Error("This team member profile is already linked to another account");
  }

  await db.from("team_members").update({ user_id: userId }).eq("id", teamMemberId);

  const { data: memberRole } = await db.from("roles").select("id").eq("slug", "member").single();
  if (memberRole) {
    await db.from("user_roles").upsert(
      { user_id: userId, role_id: memberRole.id },
      { onConflict: "user_id,role_id" }
    );
  }

  return member;
}
