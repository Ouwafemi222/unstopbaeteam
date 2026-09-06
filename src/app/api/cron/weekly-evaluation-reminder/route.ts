import { NextResponse } from "next/server";
import { toZonedTime } from "date-fns-tz";
import { createAdminClient } from "@/lib/supabase/admin";
import { currentYearMonthLagos, hasWeekActivity } from "@/lib/members/progress-metrics";
import { getWeeksInMonth } from "@/lib/members/week-utils";
import type { MemberWeeklyEarning } from "@/types/database";

const TZ = "Africa/Lagos";
const TITLE = "Sunday reminder — weekly evaluation";

function authorizeCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // Allow Vercel Cron without secret only if unset (same pattern as keep-alive)
    return true;
  }
  const auth = request.headers.get("authorization");
  const url = new URL(request.url);
  const querySecret = url.searchParams.get("secret");
  return auth === `Bearer ${secret}` || querySecret === secret;
}

function currentWeekNumberLagos(yearMonth: string, now = new Date()): number {
  const local = toZonedTime(now, TZ);
  const day = local.getDate();
  const weeks = getWeeksInMonth(yearMonth);
  const match = weeks.find((w) => day >= w.start && day <= w.end);
  return match?.week ?? weeks[weeks.length - 1]?.week ?? 1;
}

/**
 * Vercel Cron — every Sunday.
 * Reminds registered team members to submit their weekly evaluation
 * for admin review (skips members who already logged this week).
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

  const yearMonth = currentYearMonthLagos();
  const weekNumber = currentWeekNumberLagos(yearMonth);
  const nowLagos = toZonedTime(new Date(), TZ);

  // Only run on Sundays in Africa/Lagos (cron is UTC; double-check timezone day)
  if (nowLagos.getDay() !== 0) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "not_sunday_in_lagos",
      lagosDay: nowLagos.getDay(),
      at: new Date().toISOString(),
    });
  }

  const { data: members, error: membersError } = await admin
    .from("team_members")
    .select("id, full_name, preferred_name, user_id")
    .eq("status", "active")
    .not("user_id", "is", null);

  if (membersError) {
    return NextResponse.json({ error: membersError.message }, { status: 500 });
  }

  const registered = (members ?? []).filter((m) => !!m.user_id);
  if (registered.length === 0) {
    return NextResponse.json({ ok: true, notified: 0, reason: "no_registered_members" });
  }

  const memberIds = registered.map((m) => m.id);
  const { data: earnings } = await admin
    .from("member_weekly_earnings")
    .select("*")
    .eq("year_month", yearMonth)
    .eq("week_number", weekNumber)
    .in("team_member_id", memberIds);

  const submittedIds = new Set(
    ((earnings ?? []) as MemberWeeklyEarning[])
      .filter(hasWeekActivity)
      .map((e) => e.team_member_id)
  );

  // Simpler: notifications created in last 20 hours with this title
  const since = new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString();
  const { data: recent } = await admin
    .from("user_notifications")
    .select("user_id")
    .eq("title", TITLE)
    .gte("created_at", since);

  const alreadyNotified = new Set((recent ?? []).map((r) => r.user_id));

  const toNotify = registered.filter(
    (m) =>
      m.user_id &&
      !submittedIds.has(m.id) &&
      !alreadyNotified.has(m.user_id)
  );

  if (toNotify.length === 0) {
    return NextResponse.json({
      ok: true,
      notified: 0,
      yearMonth,
      weekNumber,
      alreadySubmitted: submittedIds.size,
      reason: "everyone_done_or_already_notified",
      at: new Date().toISOString(),
    });
  }

  const rows = toNotify.map((m) => {
    const name = m.preferred_name || m.full_name.split(" ")[0] || "there";
    return {
      user_id: m.user_id as string,
      title: TITLE,
      message: `Hi ${name} — don't forget to submit your Week ${weekNumber} team evaluation for ${yearMonth} so admin can review it. Open Monthly Goals and fill in this week's activity.`,
      link: "/my-monthly-plan",
    };
  });

  const { error: insertError } = await admin.from("user_notifications").insert(rows);
  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    notified: rows.length,
    yearMonth,
    weekNumber,
    skippedSubmitted: submittedIds.size,
    skippedDuplicate: alreadyNotified.size,
    dayStartIso,
    at: new Date().toISOString(),
  });
}
