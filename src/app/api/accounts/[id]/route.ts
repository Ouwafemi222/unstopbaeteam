import { NextResponse } from "next/server";
import { getUserScope } from "@/lib/auth/scope";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const EDITABLE = [
  "display_name",
  "username",
  "email",
  "phone",
  "country_id",
  "opening_date",
  "opening_time",
  "status",
  "archived_at",
  "rate_amount",
  "rate_currency",
  "rate_notes",
  "phone_verified",
  "email_verified",
  "verification_code",
  "verification_notes",
  "verification_screenshot_paths",
  "secret_question",
  "secret_answer",
  "proxy_host",
  "proxy_port",
  "proxy_username",
  "proxy_code",
  "written_service",
  "service_id",
  "info_supplied_by",
  "notes",
] as const;

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const scope = await getUserScope();
  if (!scope?.user) {
    return NextResponse.json({ error: "Sign in to edit an account" }, { status: 401 });
  }

  const supabase = await createClient();
  const { data: account, error: loadError } = await supabase
    .from("fiverr_accounts")
    .select("id, team_member_id, status")
    .eq("id", id)
    .maybeSingle();

  if (loadError) return NextResponse.json({ error: loadError.message }, { status: 500 });
  if (!account || account.status === "reserved") {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  const owns = scope.teamMember?.id === account.team_member_id;
  const canEditAny = scope.roleSlugs.includes("super_admin") || scope.permissions.includes("accounts.edit");
  if (!owns && !canEditAny) {
    return NextResponse.json({ error: "You can only edit accounts you recorded" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body.username !== "string" || !body.username.trim()) {
    return NextResponse.json({ error: "Username is required" }, { status: 400 });
  }

  const changes: Record<string, unknown> = {
    updated_by: scope.user.id,
    updated_at: new Date().toISOString(),
  };
  for (const key of EDITABLE) {
    if (key in body) changes[key] = body[key];
  }
  changes.username = body.username.trim();
  if (owns && !canEditAny) changes.team_member_id = account.team_member_id;

  const admin = createAdminClient();
  const db = admin ?? supabase;
  const { data: updated, error } = await db
    .from("fiverr_accounts")
    .update(changes)
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!updated) {
    return NextResponse.json(
      { error: "The account could not be saved. Run the account-edit SQL in Supabase, then try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
