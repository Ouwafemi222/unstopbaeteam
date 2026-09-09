import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function requireSuperAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const { data: isAdmin } = await supabase.rpc("is_super_admin");
  if (!isAdmin) {
    return { error: NextResponse.json({ error: "Super Admin only" }, { status: 403 }) };
  }
  const admin = createAdminClient();
  if (!admin) {
    return {
      error: NextResponse.json(
        { error: "SUPABASE_SERVICE_ROLE_KEY is not configured on the server" },
        { status: 503 }
      ),
    };
  }
  return { user, admin };
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const gate = await requireSuperAdmin();
  if ("error" in gate) return gate.error;
  const { admin } = gate;

  const { data: member, error } = await admin
    .from("team_members")
    .select("id, full_name, email, user_id, preferred_name, status")
    .eq("id", id)
    .single();

  if (error || !member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  let authEmail: string | null = null;
  let emailConfirmed = false;
  if (member.user_id) {
    const { data: authUser } = await admin.auth.admin.getUserById(member.user_id);
    authEmail = authUser.user?.email ?? null;
    emailConfirmed = !!authUser.user?.email_confirmed_at;
  }

  const { data: helper } = await admin
    .from("member_login_helpers")
    .select("login_email, temp_password, updated_at")
    .eq("team_member_id", id)
    .maybeSingle();

  const email =
    authEmail ||
    helper?.login_email ||
    member.email ||
    null;

  return NextResponse.json({
    memberId: member.id,
    fullName: member.full_name,
    preferredName: member.preferred_name,
    status: member.status,
    registered: !!member.user_id,
    emailConfirmed,
    email,
    tempPassword: helper?.temp_password ?? null,
    tempPasswordUpdatedAt: helper?.updated_at ?? null,
    note:
      "Supabase never stores the original password in readable form. Only temporary passwords you set here can be shown.",
  });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const gate = await requireSuperAdmin();
  if ("error" in gate) return gate.error;
  const { user, admin } = gate;

  const body = await request.json();
  const password = String(body.password ?? "").trim();
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const { data: member, error } = await admin
    .from("team_members")
    .select("id, full_name, email, user_id")
    .eq("id", id)
    .single();

  if (error || !member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }
  if (!member.user_id) {
    return NextResponse.json(
      { error: "This member has not registered yet — there is no login account to update." },
      { status: 400 }
    );
  }

  const { data: authUser, error: getErr } = await admin.auth.admin.getUserById(member.user_id);
  if (getErr || !authUser.user) {
    return NextResponse.json({ error: getErr?.message ?? "Auth user not found" }, { status: 400 });
  }

  const { error: updateErr } = await admin.auth.admin.updateUserById(member.user_id, {
    password,
  });
  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 400 });
  }

  const loginEmail = authUser.user.email ?? member.email ?? null;

  const { error: upsertErr } = await admin.from("member_login_helpers").upsert(
    {
      team_member_id: id,
      login_email: loginEmail,
      temp_password: password,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "team_member_id" }
  );

  if (upsertErr) {
    return NextResponse.json(
      {
        error: `Password updated in Auth, but could not save helper note: ${upsertErr.message}`,
        tempPassword: password,
        email: loginEmail,
      },
      { status: 500 }
    );
  }

  if (loginEmail && !member.email) {
    await admin.from("team_members").update({ email: loginEmail }).eq("id", id);
  }

  return NextResponse.json({
    ok: true,
    email: loginEmail,
    tempPassword: password,
    message: `Temporary password set for ${member.full_name}. Share it securely — they can sign in and change it later.`,
  });
}
