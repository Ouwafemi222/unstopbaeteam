import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ParsedAccountFromOcr } from "@/lib/forecast/account-ocr-parse";
import {
  attachDuplicateMatches,
  type ExistingAccountLite,
} from "@/lib/accounts/ocr-duplicates";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const accounts = (body.accounts ?? []) as ParsedAccountFromOcr[];
  if (!Array.isArray(accounts) || accounts.length === 0) {
    return NextResponse.json({ accounts: [] });
  }

  const admin = createAdminClient();
  const db = admin ?? supabase;

  const { data } = await db
    .from("fiverr_accounts")
    .select(
      "id, username, email, phone, verification_code, team_member_id, team_member:team_members(full_name)"
    )
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(2000);

  const existing: ExistingAccountLite[] = (data ?? []).map((row) => {
    const tm = row.team_member as { full_name?: string } | null;
    return {
      id: row.id,
      username: row.username,
      email: row.email,
      phone: row.phone,
      verification_code: row.verification_code,
      team_member_id: row.team_member_id,
      owner_name: tm?.full_name ?? null,
    };
  });

  const withDuplicates = attachDuplicateMatches(accounts, existing);
  return NextResponse.json({
    accounts: withDuplicates,
    alreadyListedCount: withDuplicates.filter((a) => a.duplicate.alreadyListed).length,
  });
}
