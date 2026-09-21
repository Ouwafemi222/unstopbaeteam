import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeMemberName, toRegistrationKey } from "@/data/forecast-members";
import { emailRateLimitMessage, isEmailRateLimitError } from "@/lib/auth/email-errors";
import { findAuthUserByEmail } from "@/lib/auth/admin-users";
import { APP_URL, sendBrandedEmail, SITE_NAME } from "@/lib/email/branded-mail";
import type { MemberStatus } from "@/types/database";

const VALID_TITLES = ["Mr", "Miss"] as const;
const VALID_STATUSES: MemberStatus[] = ["active", "inactive", "on_leave"];

type AdminClient = NonNullable<ReturnType<typeof createAdminClient>>;

function isResendDomainRestriction(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("only send testing emails") ||
    m.includes("verify a domain") ||
    m.includes("onboarding@resend.dev") ||
    (m.includes("resend") && m.includes("domain"))
  );
}

async function completeRegistration(opts: {
  userId: string;
  fullName: string;
  firstName: string;
  email: string;
  sponsorId: string;
  status: MemberStatus;
  teamMemberId: string | null;
  admin: AdminClient;
}): Promise<{ teamMemberId: string } | { error: string; status: number }> {
  const { data, error } = await opts.admin.rpc("join_register_member", {
    p_user_id: opts.userId,
    p_full_name: opts.fullName,
    p_preferred_name: opts.firstName,
    p_email: opts.email,
    p_sponsor_id: opts.sponsorId,
    p_status: opts.status,
    p_existing_member_id: opts.teamMemberId,
  });

  if (error) {
    return { error: error.message || "Failed to complete registration", status: 400 };
  }
  if (!data) {
    return { error: "Failed to create team profile", status: 500 };
  }

  return { teamMemberId: data as string };
}

/**
 * Create auth user WITHOUT going through /auth/v1/signup.
 * Signup triggers the Send Email Auth Hook; when Resend rejects the mail
 * (unverified domain / test mode), Auth returns "Unexpected status code … 500"
 * and registration appears broken.
 */
async function createAuthUserAndMaybeConfirmEmail(opts: {
  admin: AdminClient;
  email: string;
  password: string;
  fullName: string;
  preferredName: string;
  existingMemberId: string | null;
  sponsorId: string;
  status: MemberStatus;
  redirectTo: string;
}): Promise<
  | {
      userId: string;
      requiresEmailConfirmation: boolean;
      emailSent: boolean;
      emailNote?: string;
    }
  | { error: string; status: number }
> {
  const { data: created, error: createError } = await opts.admin.auth.admin.createUser({
    email: opts.email,
    password: opts.password,
    email_confirm: false,
    user_metadata: {
      full_name: opts.fullName,
      preferred_name: opts.preferredName,
      team_member_id: opts.existingMemberId,
      sponsor_id: opts.sponsorId,
      member_status: opts.status,
    },
  });

  if (createError || !created.user) {
    const message = createError?.message ?? "Could not create account";
    if (isEmailRateLimitError(message)) {
      return { error: emailRateLimitMessage(), status: 429 };
    }
    return { error: message, status: 400 };
  }

  const userId = created.user.id;

  const { data: linkData, error: linkError } = await opts.admin.auth.admin.generateLink({
    type: "signup",
    email: opts.email,
    options: { redirectTo: opts.redirectTo },
  });

  const actionLink = linkData?.properties?.action_link;

  if (!linkError && actionLink) {
    const mailed = await sendBrandedEmail({
      to: opts.email,
      subject: `Confirm your email — ${SITE_NAME}`,
      name: opts.preferredName || opts.fullName.split(" ")[0] || "there",
      headline: "Confirm your email",
      body: "Welcome to UNSTOPPABLE TEAM. Confirm your email to activate your account and open your dashboard.",
      ctaLabel: "Confirm email",
      ctaUrl: actionLink,
    });

    if (mailed.ok) {
      return { userId, requiresEmailConfirmation: true, emailSent: true };
    }

    // Resend test-mode / unverified domain — auto-confirm so members can still join.
    if (isResendDomainRestriction(mailed.error ?? "")) {
      await opts.admin.auth.admin.updateUserById(userId, { email_confirm: true });
      return {
        userId,
        requiresEmailConfirmation: false,
        emailSent: false,
        emailNote:
          "Confirmation email could not be sent (Resend is still in test mode / domain not verified). Your account was activated so you can sign in now.",
      };
    }

    // Other mail failures: still activate so registration isn't blocked by mail.
    await opts.admin.auth.admin.updateUserById(userId, { email_confirm: true });
    return {
      userId,
      requiresEmailConfirmation: false,
      emailSent: false,
      emailNote: `Account created, but the confirmation email failed (${mailed.error ?? "mail error"}). You can sign in now.`,
    };
  }

  // Could not generate link — activate so they aren't stuck.
  await opts.admin.auth.admin.updateUserById(userId, { email_confirm: true });
  return {
    userId,
    requiresEmailConfirmation: false,
    emailSent: false,
    emailNote:
      "Account created. Confirmation link could not be generated, so your email was activated — you can sign in now.",
  };
}

export async function POST(request: NextRequest) {
  const admin = createAdminClient();

  if (!admin) {
    return NextResponse.json(
      {
        error:
          "Registration is temporarily unavailable (server admin key missing). Ask Mr Femi to check SUPABASE_SERVICE_ROLE_KEY on Vercel.",
      },
      { status: 503 }
    );
  }

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
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? APP_URL ?? request.nextUrl.origin;
  const redirectTo = `${appUrl.replace(/\/$/, "")}/auth/callback?next=${encodeURIComponent("/welcome")}`;

  const { data: sponsorCheck } = await admin
    .from("team_members")
    .select("id, full_name, status")
    .eq("id", sponsorId)
    .eq("status", "active")
    .single();

  if (!sponsorCheck) {
    return NextResponse.json({ error: "Please select a valid sponsor from the list" }, { status: 400 });
  }

  if (existingMemberId) {
    const { data: memberCheck } = await admin
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
    const key = toRegistrationKey(fullName);
    const { data: byKey } = await admin
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

  const existingAuthUser = await findAuthUserByEmail(admin, normalizedEmail);
  if (existingAuthUser?.email_confirmed_at) {
    return NextResponse.json(
      { error: "This email is already registered. Please sign in instead." },
      { status: 409 }
    );
  }

  // Unconfirmed leftover from previous hook-500 failures — finish linking / activate.
  if (existingAuthUser && !existingAuthUser.email_confirmed_at) {
    await admin.auth.admin.updateUserById(existingAuthUser.id, {
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        preferred_name: preferredName,
        team_member_id: existingMemberId,
        sponsor_id: sponsorId,
        member_status: status,
      },
    });

    const linked = await completeRegistration({
      userId: existingAuthUser.id,
      fullName,
      firstName: preferredName,
      email: normalizedEmail,
      sponsorId,
      status,
      teamMemberId: existingMemberId,
      admin,
    });

    if ("error" in linked) {
      return NextResponse.json({ error: linked.error }, { status: linked.status });
    }

    return NextResponse.json({
      success: true,
      requiresEmailConfirmation: false,
      emailSent: false,
      canLoginImmediately: true,
      message: `Account ready for ${fullName}. You can sign in now with your password.`,
      teamMemberId: linked.teamMemberId,
      sponsorName: sponsorCheck.full_name,
    });
  }

  const created = await createAuthUserAndMaybeConfirmEmail({
    admin,
    email: normalizedEmail,
    password,
    fullName,
    preferredName,
    existingMemberId,
    sponsorId,
    status,
    redirectTo,
  });

  if ("error" in created) {
    return NextResponse.json({ error: created.error }, { status: created.status });
  }

  const linked = await completeRegistration({
    userId: created.userId,
    fullName,
    firstName: preferredName,
    email: normalizedEmail,
    sponsorId,
    status,
    teamMemberId: existingMemberId,
    admin,
  });

  if ("error" in linked) {
    return NextResponse.json(
      {
        error: `${linked.error}. Your login may already exist — try signing in, or contact admin.`,
      },
      { status: linked.status }
    );
  }

  return NextResponse.json({
    success: true,
    requiresEmailConfirmation: created.requiresEmailConfirmation,
    emailSent: created.emailSent,
    canLoginImmediately: !created.requiresEmailConfirmation,
    message: created.emailSent
      ? `Account created for ${fullName}. Please check your email and click the confirmation link before signing in.`
      : created.emailNote ??
        `Account created for ${fullName}. You can sign in now.`,
    teamMemberId: linked.teamMemberId,
    sponsorName: sponsorCheck.full_name,
  });
}

export async function GET() {
  const supabase = await createClient();
  const admin = createAdminClient();
  const reader = admin ?? supabase;

  const { data: allMembers, error } = await reader
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
