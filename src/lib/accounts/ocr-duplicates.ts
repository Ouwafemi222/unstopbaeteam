import type { ParsedAccountFromOcr } from "@/lib/forecast/account-ocr-parse";

export type OcrMatchField = "username" | "email" | "phone" | "verification_code";

export interface ExistingAccountLite {
  id: string;
  username: string | null;
  email: string | null;
  phone: string | null;
  verification_code: string | null;
  team_member_id: string;
  owner_name?: string | null;
}

export interface OcrDuplicateMatch {
  alreadyListed: boolean;
  matchedOn: OcrMatchField[];
  existingAccountId: string | null;
  existingUsername: string | null;
  ownerName: string | null;
  label: string | null;
}

function normEmail(v: string | null | undefined): string | null {
  const t = v?.trim().toLowerCase();
  return t || null;
}

function normUsername(v: string | null | undefined): string | null {
  const t = v?.trim().toLowerCase().replace(/^@/, "");
  return t || null;
}

function normPhone(v: string | null | undefined): string | null {
  if (!v) return null;
  const digits = v.replace(/\D/g, "");
  if (digits.length < 7) return null;
  // Compare last 10 digits to tolerate country-code differences
  return digits.length > 10 ? digits.slice(-10) : digits;
}

function normCode(v: string | null | undefined): string | null {
  const t = v?.trim();
  if (!t) return null;
  const digits = t.replace(/\D/g, "");
  return digits.length === 4 ? digits : t;
}

export function findDuplicateForAccount(
  account: ParsedAccountFromOcr,
  existing: ExistingAccountLite[]
): OcrDuplicateMatch {
  const u = normUsername(account.username);
  const e = normEmail(account.email);
  const p = normPhone(account.phone);
  const c = normCode(account.verification_code);

  let best: ExistingAccountLite | null = null;
  const matchedOn: OcrMatchField[] = [];

  for (const row of existing) {
    const hits: OcrMatchField[] = [];
    if (u && normUsername(row.username) === u) hits.push("username");
    if (e && normEmail(row.email) === e) hits.push("email");
    if (p && normPhone(row.phone) === p) hits.push("phone");
    if (c && normCode(row.verification_code) === c) hits.push("verification_code");

    if (hits.length === 0) continue;
    // Prefer stronger matches (more fields)
    if (!best || hits.length > matchedOn.length) {
      best = row;
      matchedOn.length = 0;
      matchedOn.push(...hits);
    }
  }

  if (!best) {
    return {
      alreadyListed: false,
      matchedOn: [],
      existingAccountId: null,
      existingUsername: null,
      ownerName: null,
      label: null,
    };
  }

  const fieldLabels: Record<OcrMatchField, string> = {
    username: "username",
    email: "email",
    phone: "phone",
    verification_code: "code",
  };
  const via = matchedOn.map((f) => fieldLabels[f]).join(", ");
  const owner = best.owner_name?.trim() || null;
  const label = owner
    ? `Already listed as @${best.username || "account"} (${owner}) — matched ${via}`
    : `Already listed as @${best.username || "account"} — matched ${via}`;

  return {
    alreadyListed: true,
    matchedOn,
    existingAccountId: best.id,
    existingUsername: best.username,
    ownerName: owner,
    label,
  };
}

export function attachDuplicateMatches<T extends ParsedAccountFromOcr>(
  accounts: T[],
  existing: ExistingAccountLite[]
): Array<T & { duplicate: OcrDuplicateMatch }> {
  return accounts.map((account) => ({
    ...account,
    duplicate: findDuplicateForAccount(account, existing),
  }));
}
