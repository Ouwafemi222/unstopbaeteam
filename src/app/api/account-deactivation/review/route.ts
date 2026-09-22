import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSuperAdmin } from "@/lib/auth/permissions";

/**
 * Super admin reviews a deactivation request.
 * Approve → move member's Fiverr accounts to status `reserved` (NOT deactivated / archived).
 * Reject → leave accounts as-is.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const superAdmin = await isSuperAdmin();
  if (!superAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const requestId = typeof body.requestId === "string" ? body.requestId : null;
  const action = body.action === "approve" || body.action === "reject" ? body.action : null;
  const reviewNote =
    typeof body.reviewNote === "string" && body.reviewNote.trim()
      ? body.reviewNote.trim().slice(0, 500)
      : null;

  if (!requestId || !action) {
    return NextResponse.json(
      { error: "requestId and action (approve|reject) are required" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  const { data: reqRow, error: fetchErr } = await admin
    .from("account_deactivation_requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle();

  if (fetchErr || !reqRow) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  if (reqRow.status !== "pending") {
    return NextResponse.json({ error: "Request already reviewed" }, { status: 409 });
  }

  let movedCount = 0;

  if (action === "approve") {
    // Move to reserved — do NOT set archived_at, do NOT disable login
    const { data: moved, error: moveErr } = await admin
      .from("fiverr_accounts")
      .update({ status: "reserved" })
      .eq("team_member_id", reqRow.team_member_id)
      .is("archived_at", null)
      .neq("status", "reserved")
      .select("id");

    if (moveErr) {
      return NextResponse.json({ error: moveErr.message }, { status: 500 });
    }
    movedCount = moved?.length ?? 0;
  }

  const { error: updateErr } = await admin
    .from("account_deactivation_requests")
    .update({
      status: action === "approve" ? "approved" : "rejected",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      review_note: reviewNote,
    })
    .eq("id", requestId);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  // Notify the member of the decision
  await admin.from("user_notifications").insert({
    user_id: reqRow.user_id,
    title:
      action === "approve"
        ? "Accounts moved to Reserved"
        : "Deactivation request declined",
    message:
      action === "approve"
        ? `${movedCount} Fiverr account(s) were moved to Reserved (not deactivated). Your login stays active.`
        : reviewNote ||
          "Your account deactivation request was reviewed and not approved. Your accounts stay active.",
    link: action === "approve" ? "/my-accounts" : "/profile",
  });

  return NextResponse.json({ ok: true, action, movedCount });
}
