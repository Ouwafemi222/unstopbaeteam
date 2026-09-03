import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** Notify super admins when a team member adds a Fiverr account on the website. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const accountId = typeof body.accountId === "string" ? body.accountId : null;
  const username = typeof body.username === "string" ? body.username : null;

  if (!accountId || !username) {
    return NextResponse.json({ error: "accountId and username required" }, { status: 400 });
  }

  const { data: member } = await supabase
    .from("team_members")
    .select("id, full_name")
    .eq("user_id", user.id)
    .maybeSingle();

  const memberName = member?.full_name ?? "A team member";
  const message = `${memberName} added Fiverr account @${username} on the website today. Check it out.`;

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ ok: true, notified: false, reason: "no_service_role" });
  }

  const { data: roles } = await admin.from("roles").select("id").eq("slug", "super_admin");
  const roleId = roles?.[0]?.id;
  if (!roleId) {
    return NextResponse.json({ ok: true, notified: false, reason: "no_super_admin_role" });
  }

  const { data: urs } = await admin.from("user_roles").select("user_id").eq("role_id", roleId);
  const adminIds = [...new Set((urs ?? []).map((u) => u.user_id))];

  if (adminIds.length === 0) {
    return NextResponse.json({ ok: true, notified: false, reason: "no_admins" });
  }

  await admin.from("user_notifications").insert(
    adminIds.map((userId) => ({
      user_id: userId,
      title: "New account added today",
      message,
      link: `/accounts/${accountId}`,
    }))
  );

  return NextResponse.json({ ok: true, notified: true, count: adminIds.length });
}
