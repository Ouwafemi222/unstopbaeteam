import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { linkUserToTeamMember } from "@/lib/forecast/import";
import { normalizeMemberName } from "@/data/forecast-members";
import { emailRateLimitMessage, isEmailRateLimitError } from "@/lib/auth/email-errors";
import { findAuthUserByEmail, parseAuthApiError } from "@/lib/auth/admin-users";
import type { MemberStatus } from "@/types/database";

const VALID_TITLES = ["Mr", "Miss"] as const;
const VALID_STATUSES: MemberStatus[] = ["active", "inactive", "on_leave"];

async function linkTeamMemberProfile(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  userId: string,
  opts: {
    fullName: string;
    firstName: string;
    email: string;
    teamMemberId: string;
    sponsorId: string;
    status: MemberStatus;
  }
) {
  await admin.from("profiles").update({
    full_name: opts.fullName,
    preferred_name: opts.firstName,
  }).eq("id", userId);

  await admin.from("team_members").update({
    email: opts.email.trim().toLowerCase(),
    sponsor_id: opts.sponsorId,
    status: opts.status,
    preferred_name: opts.firstName,
    date_joined: new Date().toISOString().slice(0, 10),
  }).eq("id", opts.teamMemberId);

  await linkUserToTeamMember(userId, opts.teamMemberId);
}

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

  const normalizedEmail = email.trim().toLowerCase();
  const admin = createAdminClient();

  if (admin) {
    const existingAuthUser = await findAuthUserByEmail(admin, normalizedEmail);
    if (existingAuthUser?.email_confirmed_at) {
      return NextResponse.json({ error: "This email is already registered. Please sign in instead." }, { status: 409 });
    }
    if (existingAuthUser && !existingAuthUser.email_confirmed_at) {
      return NextResponse.json({
        success: true,
        requiresEmailConfirmation: true,
        alreadyRegistered: true,
        message: `An account for ${fullName} already exists. Check ${normalizedEmail} for the confirmation link — do not register again (that uses up email quota).`,
        teamMemberId,
        sponsorName: sponsorCheck.full_name,
      });
    }
  }

  const signupRes = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/signup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    },
    body: JSON.stringify({
      email: normalizedEmail,
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
    const rawMessage = signupData.msg ?? signupData.error_description ?? signupData.message ?? "Registration failed";
    const rawCode = signupData.code as string | undefined;
    const rateLimited = isEmailRateLimitError(rawMessage, rawCode);

    if (rateLimited && admin) {
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email: normalizedEmail,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          preferred_name: firstName.trim(),
          team_member_id: teamMemberId,
          sponsor_id: sponsorId,
          member_status: status,
        },
      });

      if (!createError && created.user) {
        try {
          await linkTeamMemberProfile(admin, created.user.id, {
            fullName,
            firstName: firstName.trim(),
            email: normalizedEmail,
            teamMemberId,
            sponsorId,
            status,
          });
        } catch (err) {
          await admin.auth.admin.deleteUser(created.user.id);
          const linkMessage = err instanceof Error ? err.message : "Failed to link profile";
          return NextResponse.json({ error: linkMessage }, { status: 400 });
        }

        return NextResponse.json({
          success: true,
          requiresEmailConfirmation: false,
          skipEmailConfirmation: true,
          message: `Welcome ${fullName}! Your account is ready — sign in now with your email and password (no confirmation email needed).`,
          teamMemberId,
          sponsorName: sponsorCheck.full_name,
        });
      }

      if (createError?.message.toLowerCase().includes("already been registered")) {
        return NextResponse.json({
          success: true,
          requiresEmailConfirmation: true,
          alreadyRegistered: true,
          message: `Account already exists for ${normalizedEmail}. Check your inbox for the confirmation link, or sign in if you already confirmed.`,
          teamMemberId,
          sponsorName: sponsorCheck.full_name,
        });
      }
    }

    return NextResponse.json(
      { error: rateLimited ? emailRateLimitMessage() : parseAuthApiError(signupData).message },
      { status: rateLimited ? 429 : 400 }
    );
  }

  const userId = signupData.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Account created but user id missing. Contact admin." }, { status: 500 });
  }

  if (admin) {
    const { data: linked } = await admin
      .from("team_members")
      .select("user_id, sponsor_id")
      .eq("id", teamMemberId)
      .single();

    if (!linked?.user_id) {
      try {
        await linkTeamMemberProfile(admin, userId, {
          fullName,
          firstName: firstName.trim(),
          email: normalizedEmail,
          teamMemberId,
          sponsorId,
          status,
        });
      } catch (err) {
        await admin.auth.admin.deleteUser(userId);
        const linkMessage = err instanceof Error ? err.message : "Failed to link profile";
        return NextResponse.json({ error: linkMessage }, { status: 400 });
      }
    } else if (!linked.sponsor_id) {
      await admin.from("team_members").update({ sponsor_id: sponsorId }).eq("id", teamMemberId);
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
