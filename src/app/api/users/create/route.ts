import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/services/activity";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: isAdmin } = await supabase.rpc("is_super_admin");
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden — Super Admin only" }, { status: 403 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      {
        error: "Server not configured. Add SUPABASE_SERVICE_ROLE_KEY to .env.local (Supabase → Settings → API → service_role key).",
      },
      { status: 503 }
    );
  }

  const body = await request.json();
  const { email, fullName, password, roleId } = body as {
    email: string;
    fullName: string;
    password: string;
    roleId: string;
  };

  if (!email?.trim() || !fullName?.trim() || !password || !roleId) {
    return NextResponse.json({ error: "Email, full name, password, and role are required" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Create auth user (profile auto-created by trigger)
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: normalizedEmail,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName.trim() },
  });

  if (authError) {
    if (authError.message.includes("already been registered")) {
      return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  const newUserId = authData.user.id;

  // Ensure profile has correct name (trigger may use email as fallback)
  await admin.from("profiles").update({
    full_name: fullName.trim(),
  }).eq("id", newUserId);

  // Assign role
  const { error: roleError } = await admin.from("user_roles").insert({
    user_id: newUserId,
    role_id: roleId,
    assigned_by: user.id,
  });

  if (roleError && !roleError.message.includes("duplicate")) {
    return NextResponse.json({ error: `User created but role assignment failed: ${roleError.message}` }, { status: 500 });
  }

  const { data: role } = await admin.from("roles").select("name").eq("id", roleId).single();

  await logActivity({
    action: "create",
    entityType: "user",
    entityId: newUserId,
    entityLabel: `Created user ${fullName.trim()} (${normalizedEmail}) as ${role?.name ?? "user"}`,
    newValue: { email: normalizedEmail, role_id: roleId },
  });

  return NextResponse.json({
    success: true,
    message: `User ${fullName.trim()} created with ${role?.name ?? "role"} access`,
    userId: newUserId,
  });
}
