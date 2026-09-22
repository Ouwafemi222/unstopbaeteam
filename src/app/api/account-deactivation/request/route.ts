import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** Member requests deactivation of their Fiverr accounts — does NOT deactivate. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const reason =
    typeof body.reason === "string" && body.reason.trim()
      ? body.reason.trim().slice(0, 500)
      : null;

  const { data: member } = await supabase
    .from("team_members")
    .select("id, full_name")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!member) {
    return NextResponse.json(
      { error: "No team profile linked to this login" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  const { data: existing } = await admin
    .from("account_deactivation_requests")
    .select("id")
    .eq("team_member_id", member.id)
    .eq("status", "pending")
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "You already have a pending deactivation request under review" },
      { status: 409 }
    );
  }

  const { data: accounts } = await admin
    .from("fiverr_accounts")
    .select("id, username")
    .eq("team_member_id", member.id)
    .is("archived_at", null)
    .neq("status", "reserved");

  const accountIds = (accounts ?? []).map((a) => a.id);
  const usernames = (accounts ?? []).map((a) => `@${a.username}`).join(", ");

  const { data: reqRow, error } = await admin
    .from("account_deactivation_requests")
    .insert({
      user_id: user.id,
      team_member_id: member.id,
      status: "pending",
      reason,
      account_ids: accountIds,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: roles } = await admin.from("roles").select("id").eq("slug", "super_admin");
  const roleId = roles?.[0]?.id;
  if (roleId) {
    const { data: urs } = await admin.from("user_roles").select("user_id").eq("role_id", roleId);
    const adminIds = [...new Set((urs ?? []).map((u) => u.user_id))];
    if (adminIds.length > 0) {
      const accountNote =
        accountIds.length > 0
          ? `${accountIds.length} account(s): ${usernames || "listed"}`
          : "No active Fiverr accounts on file";
      await admin.from("user_notifications").insert(
        adminIds.map((userId) => ({
          user_id: userId,
          title: "Deactivation request",
          message: `${member.full_name} requested to deactivate their account. ${accountNote}. Review before moving to Reserved.`,
          link: `/reserved-accounts?tab=requests`,
        }))
      );
    }
  }

  return NextResponse.json({
    ok: true,
    requestId: reqRow.id,
    accountCount: accountIds.length,
  });
}
