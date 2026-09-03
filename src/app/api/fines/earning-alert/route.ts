import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatFineMoney } from "@/lib/members/fine-on-ground";

/**
 * Called after a member records weekly earnings.
 * If they have unpaid disciplinary fines, alert super admins to remind them.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: member } = await supabase
    .from("team_members")
    .select("id, full_name")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!member) {
    return NextResponse.json({ error: "No team profile linked" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const earnedAmount = Number(body.earnedAmount ?? 0);
  const earnedCurrency = typeof body.earnedCurrency === "string" ? body.earnedCurrency : "USD";
  const yearMonth = typeof body.yearMonth === "string" ? body.yearMonth : null;
  const weekNumber = body.weekNumber != null ? Number(body.weekNumber) : null;

  if (!earnedAmount || earnedAmount <= 0) {
    return NextResponse.json({ ok: true, alerted: false, reason: "no_earnings" });
  }

  const { data: unpaidFines } = await supabase
    .from("fine_on_ground_entries")
    .select("id, amount, currency, reason")
    .eq("team_member_id", member.id)
    .eq("is_active", true)
    .is("paid_at", null)
    .order("created_at", { ascending: false });

  if (!unpaidFines || unpaidFines.length === 0) {
    return NextResponse.json({ ok: true, alerted: false, reason: "no_unpaid_fine" });
  }

  const fineTotal = unpaidFines.reduce((sum, f) => sum + Number(f.amount ?? 0), 0);
  const fineCurrency = unpaidFines[0]?.currency ?? "NGN";
  const primaryFine = unpaidFines[0];

  const message = `${member.full_name} recorded ${formatFineMoney(earnedAmount, earnedCurrency)} earnings and still owes ${formatFineMoney(fineTotal, fineCurrency)} (fine/debt). Remind them to settle what they owe.`;

  // Insert alert (member can insert own row via RLS)
  const { data: alert, error: alertError } = await supabase
    .from("fine_earning_alerts")
    .insert({
      team_member_id: member.id,
      fine_entry_id: primaryFine.id,
      earned_amount: earnedAmount,
      earned_currency: earnedCurrency,
      year_month: yearMonth,
      week_number: Number.isFinite(weekNumber) ? weekNumber : null,
      fine_amount: fineTotal,
      fine_currency: fineCurrency,
      message,
    })
    .select("id")
    .single();

  if (alertError) {
    return NextResponse.json({ error: alertError.message }, { status: 500 });
  }

  // Notify all super admins (service role)
  const admin = createAdminClient();
  if (admin) {
    let adminIds: string[] = [];
    const { data: roles } = await admin.from("roles").select("id").eq("slug", "super_admin");
    const roleId = roles?.[0]?.id;
    if (roleId) {
      const { data: urs } = await admin.from("user_roles").select("user_id").eq("role_id", roleId);
      adminIds = (urs ?? []).map((u) => u.user_id);
    }

    adminIds = [...new Set(adminIds)];

    if (adminIds.length > 0) {
      await admin.from("user_notifications").insert(
        adminIds.map((userId) => ({
          user_id: userId,
          title: "Fine reminder — member made money",
          message,
          link: "/fines",
        }))
      );
    }
  }

  return NextResponse.json({
    ok: true,
    alerted: true,
    alertId: alert.id,
    unpaidFineTotal: fineTotal,
    fineCurrency,
  });
}
