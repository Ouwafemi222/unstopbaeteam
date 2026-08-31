import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/services/activity";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: isAdmin } = await supabase.rpc("is_super_admin");
  const { data: permissions } = await supabase.rpc("get_user_permissions");
  const canManage = isAdmin || (permissions ?? []).includes("users.manage_roles");

  if (!canManage) {
    return NextResponse.json({ error: "Forbidden — Super Admin only" }, { status: 403 });
  }

  const body = await request.json();
  const { userId, roleId, action } = body as {
    userId: string;
    roleId: string;
    action: "assign" | "remove";
  };

  if (!userId || !roleId || !action) {
    return NextResponse.json({ error: "Missing userId, roleId, or action" }, { status: 400 });
  }

  if (action === "assign") {
    const { error } = await supabase.from("user_roles").insert({
      user_id: userId,
      role_id: roleId,
      assigned_by: user.id,
    });

    if (error) {
      if (error.message.includes("duplicate") || error.code === "23505") {
        return NextResponse.json({ success: true, message: "Role already assigned" });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const { data: role } = await supabase.from("roles").select("name").eq("id", roleId).single();
    const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", userId).single();

    await logActivity({
      action: "update",
      entityType: "user_role",
      entityId: userId,
      entityLabel: `Assigned ${role?.name} to ${profile?.full_name}`,
      newValue: { role_id: roleId, user_id: userId },
    });

    return NextResponse.json({ success: true, message: "Role assigned" });
  }

  if (action === "remove") {
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .eq("role_id", roleId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await logActivity({
      action: "delete",
      entityType: "user_role",
      entityId: userId,
      entityLabel: "Role removed from user",
    });

    return NextResponse.json({ success: true, message: "Role removed" });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
