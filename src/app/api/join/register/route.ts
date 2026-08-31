import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { linkUserToTeamMember } from "@/lib/forecast/import";
import { normalizeMemberName } from "@/data/forecast-members";
import type { MemberStatus } from "@/types/database";

const VALID_TITLES = ["Mr", "Miss"] as const;
const VALID_STATUSES: MemberStatus[] = ["active", "inactive", "on_leave"];

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const body = await request.json();
  const {
    email,
    password,
    title,
    firstName,
    teamMemberId,
    sponsorId,
    status,
  } = body as {
    email: string;
    password: string;
    title: string;
    firstName: string;
    teamMemberId: string;
    sponsorId: string;
    status: MemberStatus;
  };

  if (!email?.trim() || !password || !teamMemberId || !title || !firstName?.trim()) {
    return NextResponse.json({ error: "Please fill in all required fields" }, { status: 400 });
  }

  if (!sponsorId) {
    return NextResponse.json({ error: "Please select your sponsor" }, { status: 400 });
  }

  if (!VALID_TITLES.includes(title as (typeof VALID_TITLES)[number])) {
    return NextResponse.json({ error: "Title must be Mr or Miss" }, { status: 400 });
  }

  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status selected" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const fullName = normalizeMemberName(`${title} ${firstName.trim()}`);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin;
  const profilePath = `/welcome`;
  const redirectTo = `${appUrl}/auth/callback?next=${encodeURIComponent(profilePath)}`;

  const { data: memberCheck } = await supabase
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

  const memberNormalized = normalizeMemberName(memberCheck.full_name);
  if (fullName.toLowerCase() !== memberNormalized.toLowerCase()) {
    return NextResponse.json({
      error: `Your name must match the team list profile: "${memberCheck.full_name}"`,
    }, { status: 400 });
  }

  const { data: sponsorCheck } = await supabase
    .from("team_members")
    .select("id, full_name, status")
    .eq("id", sponsorId)
    .eq("status", "active")
    .single();

  if (!sponsorCheck) {
    return NextResponse.json({ error: "Please select a valid sponsor from the list" }, { status: 400 });
  }

  if (sponsorId === teamMemberId) {
    return NextResponse.json({ error: "You cannot select yourself as your sponsor" }, { status: 400 });
  }

  const signupRes = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/signup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    },
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      password,
      data: {
        full_name: fullName,
        preferred_name: firstName.trim(),
        team_member_id: teamMemberId,
        sponsor_id: sponsorId,
        member_status: status,
      },
      options: {
        emailRedirectTo: redirectTo,
      },
    }),
  });

  const signupData = await signupRes.json();

  if (!signupRes.ok) {
    const message = signupData.msg ?? signupData.error_description ?? signupData.message ?? "Registration failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const userId = signupData.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Account created but user id missing. Contact admin." }, { status: 500 });
  }

  // Fallback link if DB trigger did not run (e.g. older auth hook)
  const admin = createAdminClient();
  if (admin) {
    const { data: linked } = await admin
      .from("team_members")
      .select("user_id")
      .eq("id", teamMemberId)
      .single();

    if (!linked?.user_id) {
      try {
        await admin.from("profiles").update({
          full_name: fullName,
          preferred_name: firstName.trim(),
        }).eq("id", userId);

        await admin.from("team_members").update({
          email: email.trim().toLowerCase(),
          sponsor_id: sponsorId,
          status,
          preferred_name: firstName.trim(),
          date_joined: new Date().toISOString().slice(0, 10),
        }).eq("id", teamMemberId);

        await linkUserToTeamMember(userId, teamMemberId);
      } catch (err) {
        await admin.auth.admin.deleteUser(userId);
        const message = err instanceof Error ? err.message : "Failed to link profile";
        return NextResponse.json({ error: message }, { status: 400 });
      }
    }
  }

  const emailConfirmed = signupData.user?.email_confirmed_at ?? signupData.email_confirmed_at;

  return NextResponse.json({
    success: true,
    requiresEmailConfirmation: !emailConfirmed,
    message: emailConfirmed
      ? `Welcome ${fullName}! Your profile is ready.`
      : `Account created for ${fullName}. Please check your email and click the confirmation link before signing in.`,
    teamMemberId,
    sponsorName: sponsorCheck.full_name,
  });
}

export async function GET() {
  const supabase = await createClient();

  const { data: allMembers, error } = await supabase
    .from("team_members")
    .select("id, full_name, preferred_name, registration_key, user_id, status")
    .eq("status", "active")
    .order("full_name");

  if (error) {
    return NextResponse.json({ members: [], sponsors: [], error: error.message }, { status: 500 });
  }

  const members = (allMembers ?? []).filter((m) => !m.user_id);
  const sponsors = allMembers ?? [];

  return NextResponse.json({ members, sponsors });
}
