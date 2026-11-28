import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSuperAdmin } from "@/lib/auth/permissions";
import { releaseReservedAccount } from "@/lib/accounts/hold";

/** Super admin restores a reserved Fiverr account back to active. */
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
  const accountId = typeof body.accountId === "string" ? body.accountId : null;
  if (!accountId) {
    return NextResponse.json({ error: "accountId required" }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  try {
    await releaseReservedAccount(admin, accountId);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not restore the account" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
