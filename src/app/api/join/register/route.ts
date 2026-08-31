import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { linkUserToTeamMember } from "@/lib/forecast/import";
import { normalizeMemberName } from "@/data/forecast-accounts";

export async function POST(request: NextRequest) {
  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Registration service unavailable" }, { status: 503 });
  }

  const body = await request.json();
  const { email, password, fullName, teamMemberId } = body as {
    email: string;
    password: string;
    fullName: string;
    teamMemberId: string;
  };

  if (!email?.trim() || !password || !teamMemberId) {
    return NextResponse.json({ error: "Email, password, and team member selection are required" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const { data: memberCheck } = await admin
    .from("team_members")
    .select("id, full_name, user_id")
    .eq("id", teamMemberId)
    .single();

  if (!memberCheck) {
    return NextResponse.json({ error: "Invalid team member selection" }, { status: 400 });
  }

  if (memberCheck.user_id) {
    return NextResponse.json({ error: "This profile is already registered. Please login instead." }, { status: 409 });
  }

  if (fullName?.trim()) {
    const normalized = normalizeMemberName(fullName);
    const memberNormalized = normalizeMemberName(memberCheck.full_name);
    if (normalized.toLowerCase() !== memberNormalized.toLowerCase()) {
      return NextResponse.json({
        error: `Name must match your profile: "${memberCheck.full_name}"`,
      }, { status: 400 });
    }
  }

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: email.trim().toLowerCase(),
    password,
    email_confirm: true,
    user_metadata: { full_name: memberCheck.full_name },
  });

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  const userId = authData.user.id;

  await admin.from("profiles").update({
    full_name: memberCheck.full_name,
    preferred_name: memberCheck.full_name.split(" ").slice(1).join(" ") || null,
  }).eq("id", userId);

  try {
    await linkUserToTeamMember(userId, teamMemberId);
  } catch (err) {
    await admin.auth.admin.deleteUser(userId);
    const message = err instanceof Error ? err.message : "Failed to link profile";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    message: `Welcome ${memberCheck.full_name}! Your accounts are now synced to your profile.`,
    teamMemberId,
  });
}

export async function GET() {
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ members: [] });

  const { data } = await admin
    .from("team_members")
    .select("id, full_name, preferred_name, registration_key")
    .is("user_id", null)
    .eq("status", "active")
    .order("full_name");

  return NextResponse.json({ members: data ?? [] });
}
