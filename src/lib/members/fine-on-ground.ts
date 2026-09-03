import { normalizeMemberName, toRegistrationKey } from "@/data/forecast-members";

export interface FineMatchCandidate {
  teamMemberId: string;
  memberName: string;
  accountId?: string | null;
  accountUsername?: string | null;
  matchLabel: string;
}

export interface ParsedFineLine {
  inputName: string;
  amount: number | null;
  rawLine: string;
}

export interface FineMatchResult extends ParsedFineLine {
  matched: boolean;
  candidate: FineMatchCandidate | null;
}

function normalizeLoose(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/^(mr|mrs|miss|ms)\.?\s+/i, "")
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Match an uploaded name/username to a team member who owns Fiverr accounts.
 */
export function matchFineOnGroundName(
  input: string,
  members: { id: string; full_name: string; preferred_name?: string | null }[],
  accounts: {
    id: string;
    team_member_id: string;
    username: string;
    display_name?: string | null;
  }[]
): Omit<FineMatchResult, "amount" | "rawLine"> {
  const raw = input.trim();
  if (!raw) {
    return { inputName: raw, matched: false, candidate: null };
  }

  const normalized = normalizeMemberName(raw);
  const key = toRegistrationKey(raw);
  const loose = normalizeLoose(raw);
  const rawLower = raw.toLowerCase();

  for (const m of members) {
    if (
      toRegistrationKey(m.full_name) === key ||
      normalizeMemberName(m.full_name) === normalized ||
      normalizeLoose(m.full_name) === loose
    ) {
      return {
        inputName: raw,
        matched: true,
        candidate: {
          teamMemberId: m.id,
          memberName: m.full_name,
          matchLabel: `Owner: ${m.full_name}`,
        },
      };
    }
    if (m.preferred_name && normalizeLoose(m.preferred_name) === loose) {
      return {
        inputName: raw,
        matched: true,
        candidate: {
          teamMemberId: m.id,
          memberName: m.full_name,
          matchLabel: `Owner: ${m.full_name} (preferred name)`,
        },
      };
    }
  }

  const usernameKey = raw.replace(/^@/, "").toLowerCase();
  for (const acc of accounts) {
    if (
      acc.username.toLowerCase() === usernameKey ||
      (acc.display_name && normalizeLoose(acc.display_name) === loose)
    ) {
      const owner = members.find((m) => m.id === acc.team_member_id);
      if (!owner) continue;
      return {
        inputName: raw,
        matched: true,
        candidate: {
          teamMemberId: owner.id,
          memberName: owner.full_name,
          accountId: acc.id,
          accountUsername: acc.username,
          matchLabel: `Account @${acc.username} → owner ${owner.full_name}`,
        },
      };
    }
  }

  const firstHits = members.filter((m) => {
    const parts = m.full_name.split(/\s+/);
    const first = parts[parts.length - 1] ?? "";
    return normalizeLoose(first) === loose || first.toLowerCase() === rawLower;
  });
  if (firstHits.length === 1) {
    const m = firstHits[0];
    return {
      inputName: raw,
      matched: true,
      candidate: {
        teamMemberId: m.id,
        memberName: m.full_name,
        matchLabel: `Owner: ${m.full_name} (name match)`,
      },
    };
  }

  return { inputName: raw, matched: false, candidate: null };
}

/**
 * Parse lines like:
 * - Mr Femi
 * - Mr Femi, 50
 * - Mr Femi | $50
 * - Mr Femi 50 USD
 * - @username - 25
 */
export function parseFineLine(line: string, defaultAmount: number | null): ParsedFineLine | null {
  const rawLine = line.trim().replace(/^[-•*]\s*/, "");
  if (!rawLine) return null;

  const amountMatch = rawLine.match(
    /(?:[,|:-]\s*|\s+)\$?\s*([\d]+(?:\.\d{1,2})?)\s*(?:usd|ngn|gbp|eur)?\s*$/i
  );

  if (amountMatch) {
    const amount = parseFloat(amountMatch[1]);
    const namePart = rawLine.slice(0, amountMatch.index).trim().replace(/[,|:-]\s*$/, "");
    if (!namePart || Number.isNaN(amount)) {
      return { inputName: rawLine, amount: defaultAmount, rawLine };
    }
    return { inputName: namePart, amount, rawLine };
  }

  return { inputName: rawLine, amount: defaultAmount, rawLine };
}

export function parseFineOnGroundLines(
  text: string,
  defaultAmount: number | null = null
): ParsedFineLine[] {
  const seen = new Set<string>();
  const lines: ParsedFineLine[] = [];
  for (const line of text.split(/\r?\n/)) {
    const parsed = parseFineLine(line, defaultAmount);
    if (!parsed) continue;
    const key = parsed.inputName.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    lines.push(parsed);
  }
  return lines;
}

export function formatFineMoney(amount: number, currency = "NGN") {
  const locale = currency === "NGN" ? "en-NG" : "en-US";
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount);
}

export type ObligationType = "fine" | "debt";

export function obligationLabel(type: ObligationType | string | null | undefined): string {
  return type === "debt" ? "Debt" : "Fine";
}

export function obligationPhrase(type: ObligationType | string | null | undefined): string {
  return type === "debt" ? "debt (money borrowed)" : "disciplinary fine";
}
