import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { APP_URL, SITE_NAME, sendBrandedEmail } from "@/lib/email/branded-mail";

const TITLE = "Reminder — unpaid debt / fine";

function authorizeCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const auth = request.headers.get("authorization");
  const url = new URL(request.url);
  const querySecret = url.searchParams.get("secret");
  return auth === `Bearer ${secret}` || querySecret === secret;
}

function formatMoney(amount: number, currency = "NGN") {
  try {
    return new Intl.NumberFormat(currency === "NGN" ? "en-NG" : "en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

/**
 * Vercel Cron — Mondays.
 * Emails + in-app notifies members who still have unpaid debt/fines.
 */
export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY not configured" },
      { status: 500 }
    );
  }

  const { data: unpaid, error } = await admin
    .from("fine_on_ground_entries")
    .select("id, team_member_id, amount, currency, obligation_type, reason")
    .eq("is_active", true)
    .is("paid_at", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!unpaid?.length) {
    return NextResponse.json({ ok: true, notified: 0, emailed: 0, reason: "no_unpaid" });
  }

  const byMember = new Map<
    string,
    { debt: number; fine: number; currency: string; reasons: string[] }
  >();

  for (const row of unpaid) {
    const cur = byMember.get(row.team_member_id) ?? {
      debt: 0,
      fine: 0,
      currency: row.currency || "NGN",
      reasons: [] as string[],
    };
    const amt = Number(row.amount ?? 0);
    if (row.obligation_type === "debt") cur.debt += amt;
    else cur.fine += amt;
    if (row.reason) cur.reasons.push(String(row.reason));
    cur.currency = row.currency || cur.currency;
    byMember.set(row.team_member_id, cur);
  }

  const memberIds = [...byMember.keys()];
  const { data: members } = await admin
    .from("team_members")
    .select("id, full_name, preferred_name, user_id, email, status")
    .in("id", memberIds)
    .eq("status", "active");

  const since = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString();
  const { data: recent } = await admin
    .from("user_notifications")
    .select("user_id")
    .eq("title", TITLE)
    .gte("created_at", since);
  const recentlyNotified = new Set((recent ?? []).map((r) => r.user_id));

  let notified = 0;
  let emailed = 0;
  let emailErrors = 0;
  let skipped = 0;

  for (const m of members ?? []) {
    if (!m.user_id) {
      skipped += 1;
      continue;
    }
    if (recentlyNotified.has(m.user_id)) {
      skipped += 1;
      continue;
    }

    const totals = byMember.get(m.id);
    if (!totals) continue;

    const name = m.preferred_name || m.full_name.split(" ")[0] || "there";
    const parts: string[] = [];
    if (totals.debt > 0) parts.push(`debt ${formatMoney(totals.debt, totals.currency)}`);
    if (totals.fine > 0) parts.push(`fine ${formatMoney(totals.fine, totals.currency)}`);
    const summary = parts.join(" and ");

    await admin.from("user_notifications").insert({
      user_id: m.user_id,
      title: TITLE,
      message: `Hi ${name} — you still have unpaid ${summary}. Please settle it and check your dashboard.`,
      link: "/my-debts",
    });
    notified += 1;

    const to = m.email?.trim();
    if (to) {
      const result = await sendBrandedEmail({
        to,
        subject: `Reminder: unpaid ${totals.debt > 0 ? "debt" : "fine"} — ${SITE_NAME}`,
        name,
        headline: "Reminder about your unpaid balance",
        body: `You still have unpaid ${summary} on UNSTOPPABLE TEAM. Please settle what you owe, then check your dashboard for details.`,
        ctaLabel: "Check your dashboard",
        ctaUrl: `${APP_URL}/dashboard`,
      });
      if (result.ok) emailed += 1;
      else emailErrors += 1;
    }
  }

  return NextResponse.json({
    ok: true,
    notified,
    emailed,
    emailErrors,
    skipped,
    membersWithBalance: memberIds.length,
    at: new Date().toISOString(),
  });
}
