import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  ACCEPTED_OCR_TYPES,
  MAX_OCR_FILE_BYTES,
  callOcrSpace,
} from "@/lib/forecast/ocr-extract";
import { parseAccountsFromOcrText, MAX_ACCOUNTS_PER_OCR } from "@/lib/forecast/account-ocr-parse";
import {
  attachDuplicateMatches,
  type ExistingAccountLite,
} from "@/lib/accounts/ocr-duplicates";

async function loadExistingAccountsForMatch(
  values: {
    usernames: string[];
    emails: string[];
    phones: string[];
    codes: string[];
  }
): Promise<ExistingAccountLite[]> {
  const admin = createAdminClient();
  const db = admin ?? (await createClient());

  const parts: string[] = [];
  if (values.usernames.length) {
    parts.push(`username.in.(${values.usernames.map((v) => `"${v.replace(/"/g, "")}"`).join(",")})`);
  }
  if (values.emails.length) {
    parts.push(`email.in.(${values.emails.map((v) => `"${v.replace(/"/g, "")}"`).join(",")})`);
  }
  if (values.phones.length) {
    parts.push(`phone.in.(${values.phones.map((v) => `"${v.replace(/"/g, "")}"`).join(",")})`);
  }
  if (values.codes.length) {
    parts.push(
      `verification_code.in.(${values.codes.map((v) => `"${v.replace(/"/g, "")}"`).join(",")})`
    );
  }

  // Always load a broader recent set as fallback when filters are empty / phone formatting differs
  let query = db
    .from("fiverr_accounts")
    .select(
      "id, username, email, phone, verification_code, team_member_id, team_member:team_members(full_name)"
    )
    .is("archived_at", null)
    .limit(2000);

  if (parts.length > 0) {
    query = query.or(parts.join(","));
  }

  const { data, error } = await query;
  if (error || !data) {
    // Fallback: fetch recent accounts without or-filter (still useful for small teams)
    const { data: fallback } = await db
      .from("fiverr_accounts")
      .select(
        "id, username, email, phone, verification_code, team_member_id, team_member:team_members(full_name)"
      )
      .is("archived_at", null)
      .order("created_at", { ascending: false })
      .limit(500);
    return ((fallback ?? []) as Array<Record<string, unknown>>).map(mapExistingRow);
  }

  return (data as Array<Record<string, unknown>>).map(mapExistingRow);
}

function mapExistingRow(row: Record<string, unknown>): ExistingAccountLite {
  const tm = row.team_member as { full_name?: string } | null;
  return {
    id: String(row.id),
    username: (row.username as string | null) ?? null,
    email: (row.email as string | null) ?? null,
    phone: (row.phone as string | null) ?? null,
    verification_code: (row.verification_code as string | null) ?? null,
    team_member_id: String(row.team_member_id),
    owner_name: tm?.full_name ?? null,
  };
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Please upload an image" }, { status: 400 });
  }

  if (!ACCEPTED_OCR_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Use PNG, JPG, or WEBP images" }, { status: 400 });
  }

  if (file.size > MAX_OCR_FILE_BYTES) {
    return NextResponse.json(
      { error: "Image must be under 5MB. Compress or crop the photo." },
      { status: 400 }
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const rawText = await callOcrSpace(buffer, file.name, file.type, { mode: "goals" });
    const accounts = parseAccountsFromOcrText(rawText, MAX_ACCOUNTS_PER_OCR);

    const usernames = [
      ...new Set(accounts.map((a) => a.username?.trim().toLowerCase()).filter(Boolean) as string[]),
    ];
    const emails = [
      ...new Set(accounts.map((a) => a.email?.trim().toLowerCase()).filter(Boolean) as string[]),
    ];
    const phones = [...new Set(accounts.map((a) => a.phone?.trim()).filter(Boolean) as string[])];
    const codes = [
      ...new Set(
        accounts
          .map((a) => a.verification_code?.trim())
          .filter((c): c is string => !!c && c.length >= 4)
      ),
    ];

    let existing = await loadExistingAccountsForMatch({
      usernames,
      emails,
      phones,
      codes,
    });

    // If phone formats differ, ensure we still have enough rows by merging a recent dump
    if (phones.length > 0 && existing.length < 5) {
      const more = await loadExistingAccountsForMatch({
        usernames: [],
        emails: [],
        phones: [],
        codes: [],
      });
      const byId = new Map(existing.map((e) => [e.id, e]));
      for (const row of more) byId.set(row.id, row);
      existing = [...byId.values()];
    }

    const withDuplicates = attachDuplicateMatches(accounts, existing);
    const alreadyListedCount = withDuplicates.filter((a) => a.duplicate.alreadyListed).length;

    return NextResponse.json({
      rawText,
      accounts: withDuplicates,
      parsed: withDuplicates[0] ?? null,
      maxAccounts: MAX_ACCOUNTS_PER_OCR,
      alreadyListedCount,
      checkedAgainst: existing.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "OCR extraction failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
