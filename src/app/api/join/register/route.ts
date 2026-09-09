import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeMemberName, toRegistrationKey } from "@/data/forecast-members";
import { emailRateLimitMessage, isEmailRateLimitError } from "@/lib/auth/email-errors";
import { findAuthUserByEmail, parseAuthApiError } from "@/lib/auth/admin-users";
import type { MemberStatus } from "@/types/database";

const VALID_TITLES = ["Mr", "Miss"] as const;
const VALID_STATUSES: MemberStatus[] = ["active", "inactive", "on_leave"];

type AdminClient = NonNullable<ReturnType<typeof createAdminClient>>;

async function completeRegistration(
  opts: {
    userId: string;
    fullName: string;
    firstName: string;
    email: string;
    sponsorId: string;
    status: MemberStatus;
    teamMemberId: string | null;
    admin: AdminClient | null;
    supabase: Awaited<ReturnType<typeof createClient>>;
  }
): Promise<{ teamMemberId: string } | { error: string; status: number }> {
  const payload = {
    p_user_id: opts.userId,
    p_full_name: opts.fullName,
    p_preferred_name: opts.firstName,
    p_email: opts.email,
    p_sponsor_id: opts.sponsorId,
    p_status: opts.status,
    p_existing_member_id: opts.teamMemberId,
  };

  // Prefer admin RPC when available; otherwise anon/authenticated RPC (SECURITY DEFINER).
  const db = opts.admin ?? opts.supabase;
  const { data, error } = await db.rpc("join_register_member", payload);

  if (error) {
    return { error: error.message || "Failed to complete registration", status: 400 };
  }
  if (!data) {
    return { error: "Failed to create team profile", status: 500 };
  }

  return { teamMemberId: data as string };
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const admin = createAdminClient();

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
    teamMemberId?: string | null;
    sponsorId: string;
    status: MemberStatus;
  };

  if (!email?.trim() || !password || !title || !firstName?.trim()) {
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
  const preferredName = firstName.trim();
  const normalizedEmail = email.trim().toLowerCase();
  const existingMemberId = teamMemberId?.trim() || null;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin;
  const redirectTo = `${appUrl}/auth/callback?next=${encodeURIComponent("/welcome")}`;

  const reader = admin ?? supabase;

  const { data: sponsorCheck } = await reader
    .from("team_members")
    .select("id, full_name, status")
    .eq("id", sponsorId)
    .eq("status", "active")
    .single();

  if (!sponsorCheck) {
    return NextResponse.json({ error: "Please select a valid sponsor from the list" }, { status: 400 });
  }

  if (existingMemberId) {
    const { data: memberCheck } = await reader
      .from("team_members")
      .select("id, full_name, user_id")
      .eq("id", existingMemberId)
      .single();

    if (!memberCheck) {
      return NextResponse.json({ error: "Invalid team member selection" }, { status: 400 });
    }
    if (memberCheck.user_id) {
      return NextResponse.json(
        { error: "This profile is already registered. Please login instead." },
        { status: 409 }
      );
    }
    const memberNormalized = normalizeMemberName(memberCheck.full_name);
    if (fullName.toLowerCase() !== memberNormalized.toLowerCase()) {
      return NextResponse.json(
        { error: `Your name must match the team list profile: "${memberCheck.full_name}"` },
        { status: 400 }
      );
    }
    if (sponsorId === existingMemberId) {
      return NextResponse.json({ error: "You cannot select yourself as your sponsor" }, { status: 400 });
    }
  } else {
    // Soft check: if this preferred name is already taken by a registered member
    const key = toRegistrationKey(fullName);
    const { data: byKey } = await reader
      .from("team_members")
      .select("id, full_name, user_id")
      .eq("registration_key", key)
      .maybeSingle();
    if (byKey?.user_id) {
      return NextResponse.json(
        {
          error: `"${byKey.full_name}" is already registered. Please sign in, or use a different preferred name.`,
        },
        { status: 409 }
      );
    }
  }

  if (admin) {
    const existingAuthUser = await findAuthUserByEmail(admin, normalizedEmail);
    if (existingAuthUser?.email_confirmed_at) {
      return NextResponse.json(
        { error: "This email is already registered. Please sign in instead." },
        { status: 409 }
      );
    }
    if (existingAuthUser && !existingAuthUser.email_confirmed_at) {
      return NextResponse.json({
        success: true,
        requiresEmailConfirmation: true,
        alreadyRegistered: true,
        message: `An account for ${fullName} already exists. Check ${normalizedEmail} for the confirmation link — do not register again (that uses up email quota).`,
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
        preferred_name: preferredName,
        team_member_id: existingMemberId,
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
    const rawMessage = String(
      signupData.msg ?? signupData.error_description ?? signupData.message ?? signupData.error ?? "Registration failed"
    );
    const rawCode = signupData.code ?? signupData.error_code;
    const rateLimited = isEmailRateLimitError(rawMessage, rawCode);

    // Never auto-confirm accounts — email confirmation is required for every signup.
    return NextResponse.json(
      { error: rateLimited ? emailRateLimitMessage() : parseAuthApiError(signupData).message },
      { status: rateLimited ? 429 : 400 }
    );
  }

  const userId = signupData.user?.id as string | undefined;
  if (!userId) {
    return NextResponse.json({ error: "Account created but user id missing. Contact admin." }, { status: 500 });
  }

  const linked = await completeRegistration({
    userId,
    fullName,
    firstName: preferredName,
    email: normalizedEmail,
    sponsorId,
    status,
    teamMemberId: existingMemberId,
    admin,
    supabase,
  });

  if ("error" in linked) {
    return NextResponse.json(
      {
        error: `${linked.error}. If you got a confirmation email, confirm it then try signing in. If not, contact admin.`,
      },
      { status: linked.status }
    );
  }

  return NextResponse.json({
    success: true,
    requiresEmailConfirmation: true,
    skipEmailConfirmation: false,
    message: `Account created for ${fullName}. Please check your email and click the confirmation link before signing in.`,
    teamMemberId: linked.teamMemberId,
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
