import { FORECAST_ACCOUNTS, normalizeMemberName, toRegistrationKey } from "@/data/forecast-accounts";
import { createAdminClient } from "@/lib/supabase/admin";

export interface ForecastImportResult {
  membersCreated: number;
  membersExisting: number;
  accountsCreated: number;
  accountsSkipped: number;
  errors: string[];
}

async function clearAllMockData(admin: NonNullable<ReturnType<typeof createAdminClient>>) {
  await admin.from("message_notes").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await admin.from("account_notes").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await admin.from("member_notes").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await admin.from("account_services").delete().neq("account_id", "00000000-0000-0000-0000-000000000000");
  await admin.from("messages").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await admin.from("fiverr_accounts").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await admin.from("team_members").delete().is("user_id", null);
}

export async function importForecastData(options?: { clearDemo?: boolean }): Promise<ForecastImportResult> {
  const admin = createAdminClient();
  if (!admin) throw new Error("Admin client not configured");

  const result: ForecastImportResult = {
    membersCreated: 0,
    membersExisting: 0,
    accountsCreated: 0,
    accountsSkipped: 0,
    errors: [],
  };

  if (options?.clearDemo) {
    await clearAllMockData(admin);
  }

  const { data: countries } = await admin.from("countries").select("id, code");
  const countryMap = new Map(countries?.map((c) => [c.code, c.id]) ?? []);

  const memberIds = new Map<string, string>();
  const uniqueMembers = [...new Set(FORECAST_ACCOUNTS.map((r) => normalizeMemberName(r.member)))];

  for (const name of uniqueMembers) {
    const key = toRegistrationKey(name);
    const { data: existing } = await admin
      .from("team_members")
      .select("id")
      .eq("registration_key", key)
      .maybeSingle();

    if (existing) {
      memberIds.set(name, existing.id);
      result.membersExisting++;
      continue;
    }

    const { data: byName } = await admin
      .from("team_members")
      .select("id")
      .ilike("full_name", name)
      .maybeSingle();

    if (byName) {
      await admin.from("team_members").update({ registration_key: key }).eq("id", byName.id);
      memberIds.set(name, byName.id);
      result.membersExisting++;
      continue;
    }

    const { data: created, error } = await admin
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
      continue;
    }
    memberIds.set(name, created.id);
    result.membersCreated++;
  }

  for (const row of FORECAST_ACCOUNTS) {
    const memberName = normalizeMemberName(row.member);
    const memberId = memberIds.get(memberName);
    if (!memberId) {
      result.errors.push(`No member for ${memberName}`);
      continue;
    }

    const email = row.email.toLowerCase().trim();
    const { data: dup } = await admin
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

    const { error } = await admin.from("fiverr_accounts").insert({
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

export async function linkUserToTeamMember(userId: string, teamMemberId: string) {
  const admin = createAdminClient();
  if (!admin) throw new Error("Admin client not configured");

  const { data: member } = await admin
    .from("team_members")
    .select("id, full_name, user_id")
    .eq("id", teamMemberId)
    .single();

  if (!member) throw new Error("Team member not found");
  if (member.user_id && member.user_id !== userId) {
    throw new Error("This team member profile is already linked to another account");
  }

  await admin.from("team_members").update({ user_id: userId }).eq("id", teamMemberId);

  const { data: memberRole } = await admin.from("roles").select("id").eq("slug", "member").single();
  if (memberRole) {
    await admin.from("user_roles").upsert(
      { user_id: userId, role_id: memberRole.id },
      { onConflict: "user_id,role_id" }
    );
  }

  return member;
}
