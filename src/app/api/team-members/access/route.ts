import { NextResponse } from "next/server";
import { getUserScope } from "@/lib/auth/scope";
import { parkMemberAccounts, releaseMemberAccounts } from "@/lib/accounts/hold";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const scope = await getUserScope();
  if (!scope?.roleSlugs.includes("super_admin")) {
    return NextResponse.json({ error: "Only a super admin can change access" }, { status: 403 });
  }

  const body = (await request.json()) as { action?: string; memberIds?: string[] };
  const action = body.action;
  const memberIds = [...new Set((body.memberIds ?? []).filter(Boolean))];
  if ((action !== "remove" && action !== "restore") || memberIds.length === 0) {
    return NextResponse.json({ error: "Choose who to update" }, { status: 400 });
  }

  const admin = createAdminClient();
  const db = admin ?? (await createClient());

  const { data: members, error: loadError } = await db
    .from("team_members")
    .select("id, full_name, user_id")
    .in("id", memberIds);

  if (loadError) {
    const missing = loadError.message.toLowerCase().includes("access_removed");
    return NextResponse.json(
      {
        error: missing
          ? "Run the account-removed SQL in Supabase, then try again."
          : loadError.message,
      },
      { status: 500 }
    );
  }

  const rows = members ?? [];
  const linkedIds = rows.map((row) => row.user_id).filter((id): id is string => Boolean(id));
  const superAdminIds = new Set<string>();
  if (linkedIds.length > 0) {
    const { data: roleRows } = await db
      .from("user_roles")
      .select("user_id, role:roles(slug)")
      .in("user_id", linkedIds);
    for (const row of (roleRows ?? []) as { user_id: string; role: { slug: string } | { slug: string }[] | null }[]) {
      const role = Array.isArray(row.role) ? row.role[0] : row.role;
      if (role?.slug === "super_admin") superAdminIds.add(row.user_id);
    }
  }

  const skipped: string[] = [];
  const allowed = rows.filter((row) => {
    const ownProfile = row.id === scope.teamMember?.id;
    const ownLogin = row.user_id === scope.user.id;
    const superAdminLogin = Boolean(row.user_id && superAdminIds.has(row.user_id));
    if (ownProfile || ownLogin || superAdminLogin) {
      skipped.push(row.full_name);
      return false;
    }
    return true;
  });

  if (allowed.length === 0) {
    return NextResponse.json({ error: "A super admin account cannot be removed" }, { status: 400 });
  }

  const allowedIds = allowed.map((row) => row.id);
  let parked = 0;
  let released = 0;
  try {
    if (action === "remove") parked = await parkMemberAccounts(db, allowedIds);
    else released = await releaseMemberAccounts(db, allowedIds);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not move the accounts" },
      { status: 500 }
    );
  }

  const now = new Date().toISOString();
  const { error: updateError } = await db
    .from("team_members")
    .update(
      action === "remove"
        ? { access_removed_at: now, access_removed_by: scope.user.id }
        : { access_removed_at: null, access_removed_by: null }
    )
    .in("id", allowedIds);

  if (updateError) {
    try {
      if (action === "remove") await releaseMemberAccounts(db, allowedIds);
      else await parkMemberAccounts(db, allowedIds);
    } catch {
      // Keep the original save error in the response.
    }
    return NextResponse.json(
      {
        error: updateError.message.toLowerCase().includes("access_removed")
          ? "Run the account-removed SQL in Supabase, then try again."
          : updateError.message,
      },
      { status: 500 }
    );
  }

  const profileIds = allowed.map((row) => row.user_id).filter((id): id is string => Boolean(id));
  if (profileIds.length > 0) {
    await db.from("profiles").update({ is_active: action === "restore" }).in("id", profileIds);
  }

  return NextResponse.json({
    updated: allowed.length,
    skipped,
    parked,
    released,
  });
}
